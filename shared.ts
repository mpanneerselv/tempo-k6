import { SharedArray } from "k6/data";

let _writeIndex = 0;

export const TEMPO_URL = __ENV.TEMPO_URL!;
export const TENANT_ID = __ENV.TENANT_ID || "K6-NEO";
export const PROFILE_NAME = (__ENV.PROFILE || "medium").toLowerCase();

export const RECENT_TRACES = new SharedArray("recent_traces", () =>
  Array(50_000).fill(null),
);

export function getWriteIndex(): number {
  return _writeIndex;
}

export function incrementWriteIndex(): number {
  _writeIndex++;
  return _writeIndex;
}
