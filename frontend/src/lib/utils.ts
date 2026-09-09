import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatHealthFactor(hf: number): string {
  return hf.toFixed(2)
}

export function formatUsd(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : value
  if (isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

export function getProtocolLabel(protocol: string): string {
  const map: Record<string, string> = {
    'aave-v3':      'Aave V3',
    'compound-v3':  'Compound V3',
    'morpho-blue':  'Morpho Blue',
  }
  return map[protocol] ?? protocol
}

export function truncateHash(hash: string, chars = 8): string {
  if (!hash || hash.length < chars * 2) return hash
  return `${hash.slice(0, chars)}...${hash.slice(-4)}`
}
