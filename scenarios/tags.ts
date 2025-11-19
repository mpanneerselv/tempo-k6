// scenarios/tags.ts
import http from "k6/http";
import { check } from "k6";
import { randomIntBetween } from "../lib/utils.js";

import { TEMPO_URL, TENANT_ID } from "../shared.js";

const TAG_ENDPOINTS = [
  "/api/search/tags",
  "/api/search/tag/service.name/values",
  "/api/search/tag/http.method/values",
  "/api/search/tag/http.status_code/values",
  "/api/search/tag/http.route/values",
];

export function tagDiscovery() {
  const path = TAG_ENDPOINTS[randomIntBetween(0, TAG_ENDPOINTS.length - 1)];
  const url = `${TEMPO_URL}${path}`;

  const res = http.get(url, {
    headers: { "X-Scope-OrgID": TENANT_ID },
  });

  check(res, {
    "tag endpoint 200": (r) => r.status === 200,
    "tag endpoint fast p95<600ms": (r) => r.timings.duration < 600,
  });
}
