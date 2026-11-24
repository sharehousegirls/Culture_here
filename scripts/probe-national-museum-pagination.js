import { safeText } from "./probe-utils.js";

const API_KEY = process.env.NATIONAL_MUSEUM_API_KEY;
const ENDPOINT = "https://api.kcisa.kr/openapi/service/CNV/API_CNV_043/request";
const PAGE_NO = 1;
const ROWS = 1;
const ACCEPTED_CODES = new Set(["00", "0000", "INFO-0", "0", "NORMAL_CODE"]);

function safe(value, limit = 180) {
  return safeText(value, limit, API_KEY);
}
function getItems(json) {
  const root = json?.response ?? json;
  const body = root?.body ?? json?.body ?? root;
  const candidate = body?.items?.item ?? body?.items ?? root?.items?.item ?? root?.items ?? json?.items?.item ?? json?.items ?? [];
  return Array.isArray(candidate) ? candidate : candidate ? [candidate] : [];
}
function getMeta(json) {
  const root = json?.response ?? json;
  const body = root?.body ?? json?.body ?? root;
  const header = root?.header ?? json?.header ?? {};
  return {
    totalCount: body?.totalCount ?? root?.totalCount ?? json?.totalCount ?? null,
    pageNo: body?.pageNo ?? root?.pageNo ?? json?.pageNo ?? null,
    numOfRows: body?.numOfRows ?? root?.numOfRows ?? json?.numOfRows ?? null,
    resultCode: header?.resultCode ?? root?.resultCode ?? json?.resultCode ?? null,
    resultMsg: safe(header?.resultMsg ?? root?.resultMsg ?? json?.resultMsg ?? "")
  };
}
function sample(item) {
  if (!item) return null;
  return {
    title: safe(item.title, 100),
    museum: safe(item.creater || item.publisher, 100),
    period: safe(item.period, 120),
    eventSite: safe(item.eventSite || item.spatialCoverage, 120)
  };
}
function classify(httpStatus, text, json, parsed) {
  if (httpStatus === 429 || /quota exceeded|reach the limit/i.test(text)) return "API_QUOTA_EXCEEDED";
  if (httpStatus === 401 || httpStatus === 403) return "AUTH_OR_PERMISSION";
  if (httpStatus >= 500) return /from data is null at assign/i.test(text) ? "API_SERVER_ASSIGN_NULL" : "API_SERVER_ERROR";
  if (!parsed) return "RESPONSE_PARSE_ERROR";
  const metadata = getMeta(json);
  if (metadata.resultCode && !ACCEPTED_CODES.has(String(metadata.resultCode))) return "API_RESULT_ERROR";
  if (!getItems(json).length) return "EMPTY_RESPONSE";
  if (httpStatus < 200 || httpStatus >= 300) return "HTTP_ERROR";
  return "SUCCESS";
}
async function main() {
  if (!API_KEY) throw new Error("NATIONAL_MUSEUM_API_KEY is missing; the secret value is never printed.");
  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("pageNo", String(PAGE_NO));
  url.searchParams.set("numOfRows", String(ROWS));
  const started = Date.now();
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    const parsed = Boolean(json);
    const items = parsed ? getItems(json) : [];
    const metadata = parsed ? getMeta(json) : {};
    const classification = classify(response.status, text, json, parsed);
    const report = {
      probeCount: 1,
      request: { pageNo: PAGE_NO, numOfRows: ROWS },
      httpStatus: response.status,
      contentType: response.headers.get("content-type") || "",
      responseBytes: Buffer.byteLength(text, "utf8"),
      elapsedMs: Date.now() - started,
      parsedAsJson: parsed,
      itemCount: items.length,
      metadata,
      sample: sample(items[0]),
      classification
    };
    console.log("NATIONAL MUSEUM API LIMITED STATUS PROBE (secret and URL omitted):");
    console.log(JSON.stringify(report));
    if (classification !== "SUCCESS") process.exitCode = 1;
  } catch (error) {
    const classification = error?.name === "TimeoutError" || error?.name === "AbortError" ? "NETWORK_TIMEOUT" : "NETWORK_OR_DNS_ERROR";
    console.error(JSON.stringify({ probeCount: 1, request: { pageNo: PAGE_NO, numOfRows: ROWS }, classification, errorName: safe(error?.name), errorMessage: safe(error?.message), elapsedMs: Date.now() - started }));
    process.exitCode = 1;
  }
}
main().catch(error => {
  console.error("PROBE FAILED:", safe(error?.message || error));
  process.exitCode = 1;
});
