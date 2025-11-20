// scenarios/ingestion.ts
import http from 'k6/http';
import { check } from 'k6';
import { randomIntBetween, randomString } from '../lib/utils.ts';
import crypto from 'k6/crypto';
import { TEMPO_URL, TENANT_ID } from '../shared.js';
import { tracesPushed, ingestionErrors } from '../lib/metrics.ts';
import { incrementWriteIndex, RECENT_TRACES } from '../shared.ts';

export function ingestTraces() {
  const traceId = crypto.randomBytes(16);
  const traceIdHex = Array.from(new Uint8Array(traceId))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const spanCount = randomIntBetween(5, 35);
  const spans = [];

  const now = Date.now() * 1_000_000; // nanoseconds

  for (let i = 0; i < spanCount; i++) {
    const spanId = crypto.randomBytes(8);
    const start = now + i * 1_000_000;
    const duration = randomIntBetween(10_000_000, 400_000_000); // 10ms–400ms

    spans.push({
      traceId: traceIdHex,
      spanId: Array.from(new Uint8Array(spanId))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      name: `span-${randomString(8)}`,
      startTimeUnixNano: String(start),
      endTimeUnixNano: String(start + duration),
      kind: 2, // SPAN_KIND_INTERNAL
      attributes: [
        { key: 'http.method', value: { stringValue: ['GET','POST','PUT','DELETE'][randomIntBetween(0,3)] } },
        { key: 'http.status_code', value: { stringValue: Math.random() < 0.96 ? '200' : '500' } },
        { key: 'service.name', value: { stringValue: 'k6-json-loadtest' } },
        { key: 'http.route', value: { stringValue: `/api/v${randomIntBetween(1,3)}/${randomString(10)}` } },
      ],
    });
  }

  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'k6-json-loadtest' } },
          ],
        },
        scopeSpans: [
          {
            spans,
          },
        ],
      },
    ],
  };

  const res = http.post(`${TEMPO_URL}/api/traces`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'X-Scope-OrgID': TENANT_ID,
    },
  });

  const ok = check(res, {
    'ingestion 2xx': r => r.status === 200 || r.status === 202,
  });

  if (ok) {
    tracesPushed.add(1);
    RECENT_TRACES[incrementWriteIndex() % RECENT_TRACES.length] = traceIdHex;
  } else {
    ingestionErrors.add(1);
  }
}