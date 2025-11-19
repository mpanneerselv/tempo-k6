// lib/protobuf.ts
import { load } from 'k6/x/protobuf';
import crypto from 'k6/crypto';
import { randomIntBetween, randomString } from './utils.js';

const proto = load('lib/otlp.proto');  // path relative to script.ts

const ExportRequest = proto.lookupType('opentelemetry.proto.trace.v1.ExportTraceServiceRequest');

export function buildDynamicTrace() {
  const traceId = crypto.randomBytes(16);
  const spans = [];

  const spanCount = randomIntBetween(5, 35);
  for (let i = 0; i < spanCount; i++) {
    spans.push({
      traceId,
      spanId: crypto.randomBytes(8),
      name: `span-${randomString(6)}`,
      kind: 2, // SPAN_KIND_INTERNAL
      startTimeUnixNano: Number(BigInt(Date.now()) * 1_000_000n),
      endTimeUnixNano: Number(BigInt(Date.now()) * 1_000_000n + BigInt(randomIntBetween(10_000_000, 4_000_000_000))),
      attributes: [
        { key: 'http.method', value: { stringValue: ['GET','POST','PUT','DELETE'][randomIntBetween(0,3)] } },
        { key: 'http.status_code', value: { stringValue: Math.random() < 0.96 ? '200' : '500' } },
        { key: 'service.name', value: { stringValue: 'k6-real-proto' } },
      ],
    });
  }

  const message = ExportRequest.create({
    resourceSpans: [{
      resource: { attributes: [{ key: 'service.name', value: { stringValue: 'k6-real-proto' } }] },
      scopeSpans: [{ spans }],
    }],
  });

  const payload = ExportRequest.encode(message).finish();

  return {
    payload: payload.buffer as ArrayBuffer,
    traceIdHex: Array.from(new Uint8Array(traceId))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''),
  };
}