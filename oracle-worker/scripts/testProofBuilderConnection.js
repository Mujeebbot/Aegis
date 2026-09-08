// Step 0 for the Backend/Worker Engineer + Integration Lead:
// prove @gluwa/usc-sdk can reach the CC3 proof builder before writing
// any real Merkle/continuity proof generation logic.
//
// Run: npm run test-connection

require("dotenv").config();

async function main() {
  const proofBuilderUrl = process.env.CREDITCOIN_PROOF_BUILDER_URL;
  const rpcUrl = process.env.CREDITCOIN_RPC_URL;

  if (!proofBuilderUrl || !rpcUrl) {
    console.error("Missing CREDITCOIN_PROOF_BUILDER_URL or CREDITCOIN_RPC_URL in .env");
    process.exit(1);
  }

  console.log("Checking proof builder reachability:", proofBuilderUrl);

  try {
    // TODO: replace with actual @gluwa/usc-sdk client init once package is confirmed installed
    // const { UscClient } = require("@gluwa/usc-sdk");
    // const client = new UscClient({ proofBuilderUrl, rpcUrl });
    // const health = await client.ping();

    const res = await fetch(proofBuilderUrl);
    console.log("Proof builder responded with status:", res.status);
  } catch (err) {
    console.error("Could not reach proof builder:", err.message);
    process.exit(1);
  }
}

main();
