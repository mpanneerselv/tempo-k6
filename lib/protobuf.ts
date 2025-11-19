import crypto from "k6/crypto";
import { randomIntBetween, randomString, bytesToHex } from "../lib/utils.js";

export function buildDynamicTrace() {
  const traceIdHex = bytesToHex(crypto.randomBytes(16));
  const spanCount = randomIntBetween(5, 35);
  let spansHex = "";

  for (let i = 0; i < spanCount; i++) {
    const spanIdHex = bytesToHex(crypto.randomBytes(8));
    const durationMs = randomIntBetween(10, 4000);
    const startNs = BigInt(Date.now()) * 1_000_000n;
    const endNs = startNs + BigInt(durationMs) * 1_000_000n;

    const method = ["GET", "POST", "PUT", "DELETE"][randomIntBetween(0, 3)];
    const status =
      Math.random() < 0.95 ? "200" : Math.random() < 0.05 ? "500" : "404";

    spansHex += [
      "0a20",
      "08" + traceIdHex,
      "10" + spanIdHex,
      "1a10" + str(`span-${randomString(6)}`),
      "2001",
      "2a08" + varint(startNs),
      "3208" + varint(endNs),
      "3a60" +
        kv("http.method", method) +
        kv("http.status_code", status) +
        kv(
          "http.route",
          `/api/v${randomIntBetween(1, 3)}/${randomString(10)}`,
        ) +
        kv("service.name", "k6-tempo-loadtest"),
    ].join("");
  }

  const resource = "0a40" + kv("service.name", "k6-tempo-loadtest");
  const payloadHex =
    "0a" + len(resource + "1200" + spansHex) + resource + "1200" + spansHex;

  return { payload: hexToBytes(payloadHex).buffer, traceIdHex };
}

// Helpers
const str = (s: string) =>
  Array.from(s, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
const kv = (k: string, v: string) =>
  "0a" + len(str(k)) + str(k) + "12" + len(str(v)) + str(v);
const len = (h: string) => (h.length / 2).toString(16).padStart(2, "0");
const varint = (n: bigint) => {
  let h = "";
  while (n > 127n) {
    h += (Number(n & 127n) | 128).toString(16).padStart(2, "0");
    n >>= 7n;
  }
  return h + Number(n).toString(16).padStart(2, "0");
};
const hexToBytes = (hex: string) => {
  const b = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    b[i / 2] = parseInt(hex.substr(i, 2), 16);
  return b;
};
