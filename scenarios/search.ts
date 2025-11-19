import http from "k6/http";
import { check } from "k6";
import { randomIntBetween } from "../lib/utils.js";

import { TEMPO_URL, TENANT_ID } from "../shared.js";
import { searchResults } from "../lib/metrics.js";

const SEARCH_QUERIES = [
  `{ .service.name = "k6-modular" }`,
  `{ .service.name = "k6-modular" } | duration > 100ms`,
  `{ .service.name = "k6-modular" } | http.status_code = 500`,
  `{ .service.name = "k6-modular" } | http.method = "POST"`,
  `{ .service.name = "k6-modular" } | http.route =~ "/api/*"`,
];

export function searchRecent() {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 1800; // last 30 minutes
  const q = SEARCH_QUERIES[randomIntBetween(0, SEARCH_QUERIES.length - 1)];

  const url = `${TEMPO_URL}/api/search?start=${start}&end=${now}&limit=50&q=${encodeURIComponent(q)}`;

  const res = http.get(url, {
    headers: { "X-Scope-OrgID": TENANT_ID },
  });

  let traceCount = 0;

  if (res.status === 200) {
    try {
      const body = res.json();
      if (body && typeof body === "object") {
        if (Array.isArray(body.traces)) {
          traceCount = body.traces.length;
        } else if (body.metrics && Array.isArray(body.traces)) {
          traceCount = body.traces.length;
        }
        // else: traceCount stays 0 (perfectly valid when no traces match)
      }
    } catch (e) {
      // JSON parse failed → ignore, count remains 0
    }
  }

  searchResults.add(traceCount);

  check(res, {
    "search 200": (r) => r.status === 200,
    "search no 5xx": (r) => r.status < 500,
  });
}
