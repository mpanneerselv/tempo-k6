import { Options } from "k6/options";
import { PROFILE_NAME } from "../shared.js";

interface Profile {
  push: number;
  query: number;
  search: number;
  tags: number;
  duration: string;
}

const PROFILES: Record<string, Profile> = {
  smoke: { push: 50, query: 80, search: 30, tags: 20, duration: "5m" },
  medium: { push: 800, query: 1200, search: 400, tags: 150, duration: "30m" },
  high: { push: 2000, query: 3000, search: 800, tags: 300, duration: "30m" },
  chaos: { push: 5000, query: 5000, search: 1200, tags: 500, duration: "45m" },
  soak: { push: 1200, query: 1800, search: 600, tags: 200, duration: "8h" },
};

const profile = PROFILES[PROFILE_NAME] || PROFILES.medium;

export const options: Options = {
  scenarios: {
    ingestion: {
      executor: "constant-arrival-rate",
      rate: profile.push,
      timeUnit: "1s",
      duration: profile.duration,
      preAllocatedVUs: 1000,
      maxVUs: 2000,
      exec: "ingestTraces",
    },
    trace_by_id: {
      executor: "constant-arrival-rate",
      rate: profile.query,
      timeUnit: "1s",
      duration: profile.duration,
      startTime: "2m",
      preAllocatedVUs: 800,
      maxVUs: 1500,
      exec: "queryTraceById",
    },
    search_recent: {
      executor: "constant-arrival-rate",
      rate: profile.search,
      timeUnit: "1s",
      duration: profile.duration,
      startTime: "3m",
      preAllocatedVUs: 400,
      maxVUs: 1000,
      exec: "searchRecent",
    },
    tag_discovery: {
      executor: "constant-arrival-rate",
      rate: profile.tags,
      timeUnit: "1s",
      duration: profile.duration,
      startTime: "3m",
      preAllocatedVUs: 100,
      maxVUs: 400,
      exec: "tagDiscovery",
    },
  },
  thresholds: {
    ingestion_errors: ["rate<0.01"],
    "http_req_duration{scenario:ingestion}": ["p(95)<250"],
  },
};
