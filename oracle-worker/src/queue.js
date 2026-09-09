"use strict";

/**
 * In-memory job queue with de-duplication, bounded concurrency and retry.
 *
 * Why a queue at all: alert delivery from ai-monitor is at-least-once and a
 * single incident can produce several alerts, while proof submission costs gas
 * and is irreversible. The queue is what makes an at-least-once input safe to
 * act on exactly once.
 *
 *   De-duplication - by alertId, remembered for dedupeTtlMs. A redelivered
 *                    alert returns the original job instead of starting a new
 *                    submission.
 *   In-flight lock - by position (user:chainId). Two different alerts for the
 *                    same position must not race two submissions.
 *   Retry          - exponential backoff with jitter, but ONLY for errors
 *                    marked retriable. A "Position safe" revert is a correct
 *                    answer, not a transient fault.
 *
 * In-memory is a deliberate hackathon trade-off: jobs do not survive a restart.
 * The seam to swap in Redis/BullMQ is `#store` plus the two Maps below.
 */

const crypto = require("node:crypto");

const JobState = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  DUPLICATE: "duplicate",
});

class JobQueue {
  /**
   * @param {object} deps
   * @param {object} deps.config config.queue
   * @param {object} deps.logger
   * @param {(job:object)=>Promise<any>} deps.handler
   */
  constructor({ config, logger, handler }) {
    this.config = config;
    this.logger = logger.child({ module: "queue" });
    this.handler = handler;

    /** jobId -> job */
    this.jobs = new Map();
    /** alertId -> { jobId, at } for de-duplication */
    this.seenAlerts = new Map();
    /** "user:chainId" -> jobId currently being processed */
    this.inFlightPositions = new Map();

    this.pending = [];
    this.activeCount = 0;
    this.stats = { enqueued: 0, deduped: 0, succeeded: 0, failed: 0, retried: 0 };
  }

  /**
   * Add an alert to the queue.
   * @param {object} alert
   * @returns {{job: object, duplicate: boolean}}
   */
  enqueue(alert) {
    this.pruneSeen();

    const alertId = alert.alertId || deriveAlertId(alert);

    const seen = this.seenAlerts.get(alertId);
    if (seen) {
      this.stats.deduped += 1;
      this.logger.info("duplicate alert ignored", { alertId, existingJobId: seen.jobId });
      return { job: this.jobs.get(seen.jobId), duplicate: true };
    }

    const job = {
      id: `job_${crypto.randomBytes(8).toString("hex")}`,
      alertId,
      alert,
      positionKey: positionKey(alert.user, alert.chainId),
      state: JobState.QUEUED,
      attempts: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      result: null,
      error: null,
      history: [],
    };

    this.jobs.set(job.id, job);
    this.seenAlerts.set(alertId, { jobId: job.id, at: Date.now() });
    this.pending.push(job.id);
    this.stats.enqueued += 1;

    this.logger.info("alert enqueued", {
      jobId: job.id,
      alertId,
      user: alert.user,
      chainId: alert.chainId,
      queueDepth: this.pending.length,
    });

    this.drain();
    return { job, duplicate: false };
  }

  /** Start as many pending jobs as concurrency allows. */
  drain() {
    while (this.activeCount < this.config.concurrency && this.pending.length > 0) {
      const jobId = this.pending.shift();
      const job = this.jobs.get(jobId);
      if (!job || job.state !== JobState.QUEUED) continue;

      // Serialise per position: a second alert for the same user waits rather
      // than racing a submission already in progress.
      if (this.inFlightPositions.has(job.positionKey)) {
        this.logger.debug("position busy; deferring job", {
          jobId,
          positionKey: job.positionKey,
          blockedBy: this.inFlightPositions.get(job.positionKey),
        });
        // Re-queue behind whatever else is waiting.
        this.pending.push(jobId);
        // Everything left may be blocked by the same position; stop looping to
        // avoid spinning, and let the finishing job re-drain.
        if (this.pending.every((id) => this.inFlightPositions.has(this.jobs.get(id)?.positionKey))) {
          return;
        }
        continue;
      }

      this.activeCount += 1;
      this.inFlightPositions.set(job.positionKey, job.id);
      this.run(job).finally(() => {
        this.activeCount -= 1;
        this.inFlightPositions.delete(job.positionKey);
        this.drain();
      });
    }
  }

  async run(job) {
    job.state = JobState.RUNNING;
    job.attempts += 1;
    job.startedAt = job.startedAt ?? new Date().toISOString();

    const log = this.logger.child({ jobId: job.id, attempt: job.attempts });
    const startedAt = Date.now();

    try {
      const result = await this.handler(job, log);
      job.state = JobState.SUCCEEDED;
      job.result = result;
      job.finishedAt = new Date().toISOString();
      job.history.push({ attempt: job.attempts, ok: true, durationMs: Date.now() - startedAt });
      this.stats.succeeded += 1;
      log.info("job succeeded", { durationMs: Date.now() - startedAt, txHash: result?.txHash });
      return result;
    } catch (err) {
      const retriable = err.retriable !== false && job.attempts < this.config.maxAttempts;
      job.history.push({
        attempt: job.attempts,
        ok: false,
        error: err.message,
        durationMs: Date.now() - startedAt,
      });

      if (retriable) {
        this.stats.retried += 1;
        const delay = this.backoffFor(job.attempts);
        job.state = JobState.QUEUED;
        log.warn("job failed; scheduling retry", {
          error: err.message,
          retryInMs: delay,
          attemptsRemaining: this.config.maxAttempts - job.attempts,
        });
        const timer = setTimeout(() => {
          this.pending.push(job.id);
          this.drain();
        }, delay);
        timer.unref?.();
        return null;
      }

      job.state = JobState.FAILED;
      job.error = { message: err.message, retriable: err.retriable !== false };
      job.finishedAt = new Date().toISOString();
      this.stats.failed += 1;
      log.error("job failed permanently", {
        error: err.message,
        attempts: job.attempts,
        permanent: err.retriable === false,
      });
      return null;
    }
  }

  /** Exponential backoff with full jitter, capped. */
  backoffFor(attempt) {
    const ceiling = Math.min(this.config.baseBackoffMs * 2 ** (attempt - 1), this.config.maxBackoffMs);
    return Math.floor(Math.random() * ceiling);
  }

  /** Drop de-dup records past their TTL so the map does not grow forever. */
  pruneSeen() {
    const cutoff = Date.now() - this.config.dedupeTtlMs;
    for (const [alertId, entry] of this.seenAlerts) {
      if (entry.at < cutoff) this.seenAlerts.delete(alertId);
    }
  }

  get(jobId) {
    return this.jobs.get(jobId) ?? null;
  }

  list(limit = 50) {
    return [...this.jobs.values()]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit)
      .map(serializeJob);
  }

  get depth() {
    return this.pending.length;
  }
}

/** Public view of a job - the alert is summarised, not echoed wholesale. */
function serializeJob(job) {
  return {
    jobId: job.id,
    alertId: job.alertId,
    state: job.state,
    attempts: job.attempts,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    user: job.alert?.user,
    chainId: job.alert?.chainId,
    healthFactor: job.alert?.healthFactor,
    result: job.result,
    error: job.error,
    history: job.history,
  };
}

function positionKey(user, chainId) {
  return `${String(user).toLowerCase()}:${chainId}`;
}

/**
 * Fallback id for an alert that arrived without one (a hand-crafted curl, a
 * different producer). Derived from content so retries still de-duplicate.
 */
function deriveAlertId(alert) {
  const material = [
    alert.user,
    alert.chainId,
    alert.healthFactorWad ?? alert.healthFactor,
    alert.observedAt ?? "",
  ].join("|");
  return `alert_${crypto.createHash("sha256").update(material).digest("hex").slice(0, 32)}`;
}

module.exports = { JobQueue, JobState, serializeJob, deriveAlertId, positionKey };
