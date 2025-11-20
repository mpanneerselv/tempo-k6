// state.ts
import { Counter } from 'k6/metrics';

// Atomic counter shared across all VUs
export const traceWriteCounter = new Counter('internal_trace_write_counter');

// Per-VU local ring buffer (fast + no contention)
export const localTraceBuffer: string[] = [];

// Initialize buffer once per VU
export function initLocalBuffer() {
  for (let i = 0; i < 2000; i++) {
    localTraceBuffer[i] = '';
  }
}

// Get a recent trace ID (favor newer ones)
export function getRecentTraceId(): string | null {
  const total = traceWriteCounter.count;
  if (total < 50) return null;

  const lookback = Math.max(0, total - 5000);
  const offset = Math.floor(Math.random() * (total - lookback)) + lookback;
  const index = offset % 2000;

  return localTraceBuffer[index] || null;
}