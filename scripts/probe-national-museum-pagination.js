import { createHash } from "node:crypto";

const API_KEY = process.env.NATIONAL_MUSEUM_API_KEY;
const ENDPOINT = "https://api.kcisa.kr/openapi/service/CNV/API_CNV_043/request";
const PAGE_NUMBERS = [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 115, 116, 117, 118];

function itemsFromJson(json) {
  const root = json?.response ?? json;
  const body = root?.body ?? json?.body ?? root;
  const candidate = body?.items?.item ?? body?.items ?? root?.items?.item ?? root?.items ?? json?.items?.item ?? json?.items ?? [];
  return Array.isArray(candidate) ? candidate : candidate ? [candidate] : [];
}
function meta(json) {
  const root = json?.response ?? json;
  const body = root?.body ?? json?.body ?? root;
  return {
    totalCount: body?.totalCount ?? root?.totalCount ?? json?.totalCount ?? null,
    pageNo: body?.pageNo ?? root?.pageNo ?? json?.pageNo ?? null,
    numOfRows: body?.numOfRows ?? root?.numOfRows ?? json?.numOfRows ?? null,
    resultCode: root?.header?.resultCode ?? root?.resultCode ?? json?.resultCode ?? null,
    resultMsg: root?.header?.resultMsg ?? root?.resultMsg ?? json?.resultMsg ?? null
  };
}
function hashItems(items) {
  const ids = items.map(x => x.localId || x.url || [x.title || "", x.creater || "", x.period || ""].join("|"));
  return createHash("sha256").update(ids.join("\n")).digest("hex").slice(0, 20);
}
function sample(items) {
  return items.slice(0, 3).map(x => ({
    localId: x.localId || null,
    title: String(x.title || "").replace(/[\r\n\t]+/g, " ").slice(0, 100),
    museum: x.creater || x.publisher || null,
    period: x.period || null,
    eventSite: x.eventSite || x.spatialCoverage || null,
    url: x.url || null
  }));
}
async function probe(pageNo, numOfRows) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  const started = Date.now();
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    const items = json ? itemsFromJson(json) : [];
    const metadata = json ? meta(json) : {};
    return {
      requested: { pageNo, numOfRows },
      httpStatus: response.status,
      contentType,
      elapsedMs: Date.now() - started,
      parsedAsJson: Boolean(json),
      itemCount: items.length,
      fingerprint: items.length ? hashItems(items) : null,
      metadata,
      samples: sample(items),
      errorBodyPreview: (!response.ok || !json || !items.length) ? text.slice(0, 220).replace(/[\r\n\t]+/g, " ") : null
    };
  } catch (error) {
    return {
      requested: { pageNo, numOfRows },
      errorType: error?.name || "FetchError",
      errorMessage: String(error?.message || error).slice(0, 240),
      elapsedMs: Date.now() - started
    };
  }
}
async function main() {
  if (!API_KEY) throw new Error("NATIONAL_MUSEUM_API_KEY is missing; secret value is never printed.");
  const probes = [];
  for (const pageNo of PAGE_NUMBERS) probes.push(await probe(pageNo, 100));
  probes.push(await probe(1, 1000));
  probes.push(await probe(69, 1000));
  probes.push(await probe(116, 1000));
  const byFingerprint = new Map();
  for (const result of probes) {
    if (!result.fingerprint) continue;
    const prior = byFingerprint.get(result.fingerprint);
    result.duplicateOf = prior || null;
    if (!prior) byFingerprint.set(result.fingerprint, result.requested);
  }
  console.log("PAGINATION DIAGNOSTIC (no API key or request URL logged):");
  for (const result of probes) console.log(JSON.stringify(result));
  const successful = probes.filter(x => x.httpStatus === 200 && x.parsedAsJson);
  console.log("SUMMARY:", JSON.stringify({probeCount: probes.length, successfulJsonResponses: successful.length, distinctFingerprints: byFingerprint.size, duplicatePageResults: probes.filter(x => x.duplicateOf).map(x => ({requested:x.requested, duplicateOf:x.duplicateOf})), allResultsAreDiagnosticsOnly:true}));
}
main().catch(error => { console.error("PROBE FAILED:", error.message); process.exit(1); });
