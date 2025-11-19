import http from "k6/http";
import { check } from "k6";
import { buildDynamicTrace } from "../lib/protobuf.js";
import {
  TEMPO_URL,
  TENANT_ID,
  RECENT_TRACES,
  getWriteIndex,
  incrementWriteIndex,
} from "../shared.js";
import { tracesPushed, ingestionErrors } from "../lib/metrics.js";

export function ingestTraces() {
  const { payload, traceIdHex } = buildDynamicTrace();

  const res = http.post(`${TEMPO_URL}/api/traces`, payload, {
    headers: {
      "Content-Type": "application/x-protobuf",
      "X-Scope-OrgID": TENANT_ID,
    },
  });

  if (check(res, { "push 200": (r) => r.status === 200 })) {
    tracesPushed.add(1);
    RECENT_TRACES[getWriteIndex() % RECENT_TRACES.length] = traceIdHex;
    incrementWriteIndex();
  } else {
    ingestionErrors.add(1);
  }
}
