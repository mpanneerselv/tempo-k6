// scenarios/traceById.ts
import http from "k6/http";
import { check } from "k6";
import { randomIntBetween } from "../lib/utils.js";

import {
  TEMPO_URL,
  TENANT_ID,
  RECENT_TRACES,
  getWriteIndex,
} from "../shared.js";
import { tracesFound, queryErrors } from "../lib/metrics.js";

export function queryTraceById() {
  const currentIndex = getWriteIndex();
  // Wait until we have some traces
  if (currentIndex < 100) return;

  // Look back in the last ~15k pushed traces (covers typical 10–60s ingestion lag)
  const lookback = Math.max(0, currentIndex - 15_000);
  const randomPos =
    randomIntBetween(lookback, currentIndex - 1) % RECENT_TRACES.length;
  const traceId = RECENT_TRACES[randomPos];

  if (!traceId) return;

  const res = http.get(`${TEMPO_URL}/api/traces/${traceId}`, {
    headers: {
      Accept: "application/json",
      "X-Scope-OrgID": TENANT_ID,
    },
  });

  if (res.status === 200) {
    tracesFound.add(1);
  } else if (res.status >= 500) {
    queryErrors.add(1);
  }

  check(res, {
    "trace_by_id no 5xx": (r) => r.status < 500,
    "trace_by_id 200 or 404": (r) => r.status === 200 || r.status === 404,
  });
}
