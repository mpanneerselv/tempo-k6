import { Options } from "k6/options";
import { PROFILE_NAME } from "../shared.js";

interface Stage {
  duration: string;
  target: number; // target arrival rate (traces/sec)
}

interface RampingProfile {
  push: Stage[];
  query: Stage[];
  search: Stage[];
  tags: Stage[];
  totalDuration: string;
}

const PROFILES: Record<string, RampingProfile> = {
  // 1. Classic ramp-up + sustain + ramp-down
  ramp_sustain: {
    totalDuration: "45m",
    push: [
      { duration: "5m", target: 200 }, // warm-up
      { duration: "10m", target: 2000 }, // ramp to peak
      { duration: "20m", target: 2000 }, // sustain
      { duration: "10m", target: 0 }, // graceful ramp-down
    ],
    query: [
      { duration: "10m", target: 0 },
      { duration: "10m", target: 3000 },
      { duration: "15m", target: 3000 },
      { duration: "10m", target: 0 },
    ],
    search: [
      { duration: "15m", target: 0 },
      { duration: "10m", target: 800 },
      { duration: "10m", target: 800 },
      { duration: "10m", target: 0 },
    ],
    tags: [
      { duration: "20m", target: 0 },
      { duration: "15m", target: 300 },
      { duration: "10m", target: 0 },
    ],
  },

  // 2. Spike profile
  spike: {
    totalDuration: "30m",
    push: [
      { duration: "2m", target: 500 },
      { duration: "3m", target: 8000 }, // sudden spike
      { duration: "10m", target: 8000 },
      { duration: "5m", target: 1000 },
      { duration: "10m", target: 0 },
    ],
    query: [
      { duration: "5m", target: 0 },
      { duration: "5m", target: 12000 },
      { duration: "10m", target: 12000 },
      { duration: "10m", target: 0 },
    ],
    search: [
      { duration: "8m", target: 0 },
      { duration: "12m", target: 2000 },
      { duration: "10m", target: 0 },
    ],
    tags: [
      { duration: "10m", target: 0 },
      { duration: "10m", target: 800 },
      { duration: "10m", target: 0 },
    ],
  },

  // 3. Canary / gradual rollout
  canary: {
    totalDuration: "2h",
    push: [
      { duration: "30m", target: 100 },
      { duration: "30m", target: 800 },
      { duration: "1h", target: 2500 },
    ],
    query: [
      { duration: "35m", target: 0 },
      { duration: "30m", target: 1200 },
      { duration: "55m", target: 4000 },
    ],
    search: [
      { duration: "40m", target: 0 },
      { duration: "80m", target: 600 },
    ],
    tags: [
      { duration: "45m", target: 0 },
      { duration: "75m", target: 200 },
    ],
  },
};

const profile = PROFILES[PROFILE_NAME] || PROFILES.ramp_sustain;

export const options: Options = {
  scenarios: {
    ingestion: {
      executor: "ramping-arrival-rate",
      preAllocatedVUs: 500,
      maxVUs: 3000,
      stages: profile.push,
      exec: "ingestTraces",
    },
    trace_by_id: {
      executor: "ramping-arrival-rate",
      preAllocatedVUs: 800,
      maxVUs: 4000,
      stages: profile.query,
      exec: "queryTraceById",
    },
    search_recent: {
      executor: "ramping-arrival-rate",
      preAllocatedVUs: 300,
      maxVUs: 1500,
      stages: profile.search,
      exec: "searchRecent",
    },
    tag_discovery: {
      executor: "ramping-arrival-rate",
      preAllocatedVUs: 100,
      maxVUs: 600,
      stages: profile.tags,
      exec: "tagDiscovery",
    },
  },
  thresholds: {
    ingestion_errors: ["rate<0.005"],
    "http_req_duration{scenario:ingestion}": ["p(95)<300"],
    "http_req_failed{scenario:*}": ["rate<0.01"],
  },
};
