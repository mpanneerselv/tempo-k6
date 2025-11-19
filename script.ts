import { options as staticOptions } from "./config/profiles-static.js";
import { options as rampingOptions } from "./config/profiles-ramping.js";
import { ingestTraces } from "./scenarios/ingestion.js";
import { queryTraceById } from "./scenarios/traceById.js";
import { searchRecent } from "./scenarios/search.js";
import { tagDiscovery } from "./scenarios/tags.js";

const USE_RAMPING = __ENV.USE_RAMPING === "true" || false;

export const options = USE_RAMPING ? rampingOptions : staticOptions;

// mTLS support
if (__ENV.TLS_CERT && __ENV.TLS_KEY) {
  options.tlsConfig = {
    cert: open(__ENV.TLS_CERT),
    key: open(__ENV.TLS_KEY),
  };
}

export { ingestTraces, queryTraceById, searchRecent, tagDiscovery };
