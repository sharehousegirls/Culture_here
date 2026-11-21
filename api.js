/**
 * Culture Here API collection framework
 * Strategy: API-centric, not region-centric.
 *
 * Source adapters should set queryScope:
 * - "nationwide": fetch the entire dataset without regional loops.
 * - "region-required": repeat requests over regions only if the API requires it.
 * - "unknown": verify the API's scope before implementing the adapter.
 *
 * No real endpoints or credentials are included until verified.
 */

export const REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
];

export const API_STATUS = Object.freeze({
  DISCOVERED: "DISCOVERED",
  REVIEWED: "REVIEWED",
  APPLICATION: "APPLICATION",
  WAITING: "WAITING",
  APPROVED: "APPROVED",
  IMPLEMENTED: "IMPLEMENTED",
  TESTED: "TESTED",
  ACTIVE: "ACTIVE",
  FAILED: "FAILED",
  DISABLED: "DISABLED"
});

/**
 * Shared normalized event/program shape.
 * Missing source fields remain null; never fabricate data.
 */
export function normalizeProgram(raw, source) {
  return {
    id: raw?.id ?? raw?.programId ?? raw?.eventId ?? null,
    title: raw?.title ?? raw?.name ?? raw?.programName ?? raw?.eventName ?? "",
    category: raw?.category ?? raw?.type ?? source?.defaultCategory ?? "기타",
    description: raw?.description ?? raw?.contents ?? raw?.summary ?? "",
    organization: raw?.organization ?? raw?.institution ?? raw?.host ?? "",
    region: raw?.region ?? raw?.area ?? raw?.addressRegion ?? "",
    district: raw?.district ?? raw?.sigungu ?? raw?.addressLocality ?? "",
    address: raw?.address ?? raw?.placeAddress ?? raw?.location ?? "",
    latitude: raw?.latitude ?? raw?.lat ?? null,
    longitude: raw?.longitude ?? raw?.lng ?? raw?.lon ?? null,
    startDate: raw?.startDate ?? raw?.start ?? raw?.eventStartDate ?? null,
    endDate: raw?.endDate ?? raw?.end ?? raw?.eventEndDate ?? null,
    applicationStart: raw?.applicationStart ?? raw?.recruitStart ?? null,
    applicationEnd: raw?.applicationEnd ?? raw?.recruitEnd ?? null,
    fee: raw?.fee ?? raw?.price ?? null,
    imageUrl: raw?.imageUrl ?? raw?.image ?? raw?.thumbnail ?? null,
    detailUrl: raw?.detailUrl ?? raw?.url ?? raw?.homepage ?? "",
    applicationUrl: raw?.applicationUrl ?? raw?.applyUrl ?? "",
    sourceName: source?.name ?? "unknown",
    sourceId: raw?.sourceId ?? raw?.id ?? raw?.programId ?? null,
    collectedAt: new Date().toISOString()
  };
}

export function createApiSource(config) {
  const validScopes = ["nationwide", "region-required", "unknown"];
  if (!config?.name || typeof config.fetch !== "function") {
    throw new TypeError("API source requires a name and fetch function.");
  }
  if (!validScopes.includes(config.queryScope ?? "unknown")) {
    throw new TypeError("queryScope must be nationwide, region-required, or unknown.");
  }
  return {
    name: config.name,
    status: config.status ?? API_STATUS.DISCOVERED,
    queryScope: config.queryScope ?? "unknown",
    defaultCategory: config.defaultCategory ?? "기타",
    fetch: config.fetch,
    regions: config.regions ?? REGIONS
  };
}

/**
 * Collect from a source with its verified query scope.
 * Nationwide sources are called once.
 * Region-required sources are called once per region.
 * Unknown scope is intentionally not auto-expanded; verify first.
 */
export async function collectSource(source, options = {}) {
  const signal = options.signal;
  if (source.status !== API_STATUS.APPROVED &&
      source.status !== API_STATUS.IMPLEMENTED &&
      source.status !== API_STATUS.TESTED &&
      source.status !== API_STATUS.ACTIVE) {
    return { source: source.name, skipped: true, reason: "API is not approved/ready", records: [], errors: [] };
  }

  const requests = source.queryScope === "nationwide"
    ? [{ region: null }]
    : source.queryScope === "region-required"
      ? source.regions.map(region => ({ region }))
      : [];

  if (!requests.length) {
    return { source: source.name, skipped: true, reason: "Query scope is unknown; verify API documentation first.", records: [], errors: [] };
  }

  const records = [];
  const errors = [];

  for (const request of requests) {
    try {
      const rawItems = await source.fetch({ region: request.region, ...options, signal });
      const items = Array.isArray(rawItems) ? rawItems : (rawItems?.items ?? rawItems?.data ?? []);
      if (!Array.isArray(items)) throw new TypeError("API response did not contain an item array.");
      records.push(...items.map(item => normalizeProgram(item, source)));
    } catch (error) {
      errors.push({
        region: request.region,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    source: source.name,
    skipped: false,
    requestedScope: source.queryScope,
    requestCount: requests.length,
    recordCount: records.length,
    records: deduplicatePrograms(records),
    errors
  };
}

/**
 * Conservative duplicate detection:
 * exact source identity first; then normalized title + dates + region.
 */
export function deduplicatePrograms(records) {
  const seen = new Set();
  return records.filter(item => {
    const sourceIdentity = item.sourceName && item.sourceId
      ? `source:${item.sourceName}:${item.sourceId}`
      : null;
    const fallback = [
      "fallback",
      normalizeText(item.title),
      item.startDate ?? "",
      item.endDate ?? "",
      normalizeText(item.region),
      normalizeText(item.district)
    ].join("|");
    const key = sourceIdentity || fallback;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeText(value) {
  return String(value ?? "").replace(/\\s+/g, " ").trim().toLowerCase();
}

/**
 * Example adapter template only. Replace URL, parameters and parser after
 * verifying official API documentation. Do not place secret API keys in browser code.
 */
export function createFetchAdapter({ endpoint, buildUrl, parseResponse }) {
  if (!endpoint || typeof buildUrl !== "function" || typeof parseResponse !== "function") {
    throw new TypeError("Adapter requires endpoint, buildUrl, and parseResponse.");
  }
  return async ({ region, signal, apiKey }) => {
    const url = buildUrl({ endpoint, region, apiKey });
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseResponse(await response.json());
  };
}
