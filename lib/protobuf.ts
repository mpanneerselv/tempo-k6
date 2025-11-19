// lib/protobuf.ts
import crypto from 'k6/crypto';
import { randomIntBetween, randomString, bytesToHex } from './utils.js';

export function buildDynamicTrace() {
  const traceIdHex = bytesToHex(crypto.randomBytes(16));
  const spanCount = randomIntBetween(5, 35);
  let spansHex = '';

  for (let i = 0; i < spanCount; i++) {
    const spanIdHex = bytesToHex(crypto.randomBytes(8));
    const durationMs = randomIntBetween(10, 4000);
    const startNs = BigInt(Date.now()) * 1_000_000n + BigInt(i * 1000);
    const endNs = startNs + BigInt(durationMs) * 1_000_000n;

    const method = ['GET', 'POST', 'PUT', 'DELETE'][randomIntBetween(0, 3)];
    const status = Math.random() < 0.96 ? '200' : Math.random() < 0.03 ? '500' : '404';

    spansHex += [
      // Span message (field 1, length-delimited)
      '0a' + len(
        // trace_id (field 1)
        '08' + traceIdHex +
        // span_id (field 2)
        '10' + spanIdHex +
        // name (field 3)
        '1a' + len(str(`span-${randomString(6)}`)) + str(`span-${randomString(6)}`) +
        // kind (field 4) = INTERNAL = 2
        '2002' +
        // start_time_unix_nano (field 7)
        '3a' + varintLen(startNs) + varint(startNs) +
        // end_time_unix_nano (field 8)
        '42' + varintLen(endNs) + varint(endNs) +
        // attributes (field 10)
        '52' + len(
          // http.method
          '0a' + len(str('http.method')) + str('http.method') +
          '12' + len(str(method)) + str(method) +
          // http.status_code
          '0a' + len(str('http.status_code')) + str('http.status_code') +
          '12' + len(str(status)) + str(status) +
          // service.name
          '0a' + len(str('service.name')) + str('service.name') +
          '12' + len(str('k6-tempo-loadtest')) + str('k6-tempo-loadtest')
        )
      ),
    ].join('');
  }

  // ResourceSpans (field 0)
  const resourceHex =
    // resource.attributes (field 1)
    '0a' + len(
      // service.name attribute
      '0a' + len(str('service.name')) + str('service.name') +
      '12' + len(str('k6-tempo-loadtest')) + str('k6-tempo-loadtest')
    );

  const payloadHex = '0a' + len(resourceHex + '1200' + spansHex) + resourceHex + '1200' + spansHex;

  return { payload: hexToBytes(payloadHex), traceIdHex };
}

// ────── Helper functions (100% correct) ──────
const str = (s: string) =>
  Array.from(s, (c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

const varint = (n: bigint): string => {
  let h = '';
  while (n > 127n) {
    h += ((Number(n & 127n) | 128)).toString(16).padStart(2, '0');
    n >>= 7n;
  }
  h += Number(n).toString(16).padStart(2, '0');
  return h;
};

const varintLen = (n: bigint): string => {
  let len = 0;
  do {
    len++;
    n >>= 7n;
  } while (n > 0n);
  return len.toString(16).padStart(2, '0');
};

const len = (hex: string): string => (hex.length / 2).toString(16).padStart(2, '0');

const hexToBytes = (hex: string): ArrayBuffer => {
  const b = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) b[i / 2] = parseInt(hex.substr(i, 2), 16);
  return b.buffer;
};