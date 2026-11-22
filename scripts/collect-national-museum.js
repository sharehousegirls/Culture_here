import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const API_KEY = process.env.NATIONAL_MUSEUM_API_KEY;
const ENDPOINT = "https://api.kcisa.kr/openapi/service/CNV/API_CNV_043/request";
const PAGE_SIZE = 100;
const MAX_PAGES = 200;
const SOURCE = "국립지방박물관 문화행사 통합정보";

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .trim();
}
function xmlTag(xml, tag) {
  const match = xml.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return match ? decodeXml(match[1]) : "";
}
function parseXmlItems(xml) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m => {
    const block = m[1], fields = {};
    for (const name of ["publisher","collectionDb","creater","title","sourceTitle","sourceAgency","collectedDate","description","localId","url","subDescription","viewCount","imageObject","videoObject","spatialCoverage","eventSite","type","audience","charge","contactPoint","period","sizing"]) {
      fields[name] = xmlTag(block, name);
    }
    return fields;
  });
}
function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function parseResponse(text, contentType) {
  if (contentType.includes("json") || text.trim().startsWith("{")) {
    const json = JSON.parse(text);
    const root = json?.response ?? json;
    const body = root?.body ?? json?.body ?? root;
    const header = root?.header ?? json?.header ?? {};
    const candidate = body?.items?.item ?? body?.items ?? root?.items?.item ?? root?.items ?? json?.items?.item ?? json?.items ?? [];
    const items = Array.isArray(candidate) ? candidate : candidate ? [candidate] : [];
    return {
      items,
      totalCount: toNumber(body?.totalCount ?? root?.totalCount ?? json?.totalCount),
      pageNo: toNumber(body?.pageNo ?? root?.pageNo ?? json?.pageNo),
      numOfRows: toNumber(body?.numOfRows ?? root?.numOfRows ?? json?.numOfRows),
      resultCode: header?.resultCode ?? root?.resultCode ?? json?.resultCode ?? "",
      resultMsg: header?.resultMsg ?? root?.resultMsg ?? json?.resultMsg ?? ""
    };
  }
  const resultCode = xmlTag(text, "resultCode");
  const resultMsg = xmlTag(text, "resultMsg");
  const accepted = ["0000","INFO-0","00","0","NORMAL_CODE"];
  if (resultCode && !accepted.includes(resultCode)) throw new Error("API result code " + resultCode + ": " + resultMsg);
  return {
    items: parseXmlItems(text),
    totalCount: toNumber(xmlTag(text, "totalCount")),
    pageNo: toNumber(xmlTag(text, "pageNo")),
    numOfRows: toNumber(xmlTag(text, "numOfRows")),
    resultCode,
    resultMsg
  };
}
function regionFromCoverage(coverage, museum) {
  const text = (coverage + " " + museum).replace(/\s/g, "");
  const map = [
    ["국립중앙박물관","서울"],
    ["국립춘천박물관","강원"],["국립경주박물관","경북"],["국립대구박물관","대구"],
    ["국립진주박물관","경남"],["국립청주박물관","충북"],
    ["국립공주박물관","충남"],["국립부여박물관","충남"],["국립전주박물관","전북"],
    ["국립제주박물관","제주"],["국립광주박물관","광주"],["국립익산박물관","전북"],
    ["국립김해박물관","경남"],["국립나주박물관","전남"]
  ];
  for (const [name, region] of map) if (text.includes(name)) return region;
  const provinces = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
  return provinces.find(r => text.includes(r)) || "";
}
function normalize(x, i) {
  const museum = x.creater || x.publisher || "";
  const dates = [...String(x.period || "").matchAll(/(20\d{2})[-./]?(\d{1,2})[-./]?(\d{1,2})/g)];
  const formatDate = m => m ? m[1] + "-" + m[2].padStart(2,"0") + "-" + m[3].padStart(2,"0") : "";
  const startDate = formatDate(dates[0]);
  const endDate = formatDate(dates[1]) || startDate;
  const place = x.eventSite || x.spatialCoverage || museum;
  const stableKey = x.localId || x.url || [x.title || "", museum, x.period || ""].join("|");
  const id = x.localId ? "museum-" + x.localId : "museum-" + createHash("sha1").update(stableKey).digest("hex");
  return {
    id,
    title: x.title || "",
    category: x.type || "박물관 문화행사",
    description: [x.description, x.subDescription].filter(Boolean).join("\n"),
    organization: museum,
    region: regionFromCoverage(place, museum),
    district: "",
    address: place,
    latitude: null,
    longitude: null,
    startDate,
    endDate,
    applicationStart: "",
    applicationEnd: "",
    fee: x.charge || "",
    imageUrl: x.imageObject || "",
    detailUrl: x.url || "",
    applicationUrl: "",
    sourceName: SOURCE,
    sourceId: String(stableKey),
    audience: x.audience || "",
    collectedAt: new Date().toISOString(),
    rawPeriod: x.period || "",
    museumMetadata: { publisher: x.publisher || "", sourceAgency: x.sourceAgency || "", collectedDate: x.collectedDate || "", contactPoint: x.contactPoint || "" }
  };
}
async function requestPage(pageNo) {
  const candidates = [
    { label: "basic-json", params: { numOfRows: String(PAGE_SIZE), pageNo: String(pageNo) }, accept: "application/json" },
    { label: "blank-keyword-json", params: { numOfRows: String(PAGE_SIZE), pageNo: String(pageNo), keyword: "" }, accept: "application/json" },
    { label: "blank-keyword-xml", params: { numOfRows: String(PAGE_SIZE), pageNo: String(pageNo), keyword: "" }, accept: "application/xml" }
  ];
  const failures = [];
  for (const candidate of candidates) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("serviceKey", API_KEY);
    for (const [key, value] of Object.entries(candidate.params)) url.searchParams.set(key, value);
    try {
      const response = await fetch(url, { headers: { Accept: candidate.accept }, signal: AbortSignal.timeout(30000) });
      const text = await response.text();
      if (!response.ok) {
        failures.push(candidate.label + ": HTTP " + response.status + " - " + text.slice(0, 250));
        continue;
      }
      const parsed = parseResponse(text, response.headers.get("content-type") || candidate.accept);
      if (!parsed.items.length && pageNo === 1) {
        failures.push(candidate.label + ": HTTP " + response.status + " but no item records parsed; body=" + text.slice(0, 250));
        continue;
      }
      console.log("Request variant succeeded:", candidate.label, "HTTP", response.status);
      return { ...parsed, contentType: response.headers.get("content-type") || candidate.accept };
    } catch (error) {
      failures.push(candidate.label + ": " + (error?.message || String(error)));
    }
  }
  throw new Error("All API request variants failed. " + failures.join(" | "));
}
async function main() {
  if (!API_KEY) throw new Error("Missing GitHub secret NATIONAL_MUSEUM_API_KEY");
  let all = [], pageNo = 1, contentType = "", totalCount = null, completedByShortPage = false;
  const pageFingerprints = new Set();
  while (pageNo <= MAX_PAGES) {
    const page = await requestPage(pageNo);
    contentType = page.contentType;
    if (page.totalCount !== null) {
      if (totalCount === null) totalCount = page.totalCount;
      else if (page.totalCount !== totalCount) console.warn("API totalCount changed between pages:", totalCount, "->", page.totalCount);
      totalCount = Math.max(totalCount, page.totalCount);
    }
    const fingerprintInput = page.items.map(x => x.localId || x.url || [x.title || "", x.creater || "", x.period || ""].join("|")).join("\n");
    const fingerprint = createHash("sha256").update(fingerprintInput).digest("hex").slice(0, 16);
    if (page.items.length && pageFingerprints.has(fingerprint)) throw new Error("Pagination repeated an identical page fingerprint at page " + pageNo + "; refusing to publish duplicate/partial data.");
    if (page.items.length) pageFingerprints.add(fingerprint);
    all.push(...page.items);
    console.log("Page", pageNo, "records", page.items.length, "reported totalCount", totalCount ?? "unknown", "total accumulated", all.length, "fingerprint", fingerprint);
    if (totalCount !== null && all.length >= totalCount) break;
    if (page.items.length < PAGE_SIZE) {
      completedByShortPage = true;
      break;
    }
    pageNo++;
  }
  const reachedPageLimit = pageNo > MAX_PAGES;
  if (reachedPageLimit && (totalCount === null || all.length < totalCount)) {
    throw new Error("Pagination limit reached before completion. Fetched " + all.length + " records; reported totalCount " + (totalCount ?? "unknown") + ". Dataset was not overwritten.");
  }
  if (!all.length) throw new Error("API returned zero records; dataset was not overwritten.");
  if (totalCount !== null && all.length < totalCount && !completedByShortPage) {
    throw new Error("API response count indicates incomplete collection (" + all.length + "/" + totalCount + "); dataset was not overwritten.");
  }
  const seen = new Set(), programs = [];
  let duplicates = 0;
  for (const raw of all) {
    const normalized = normalize(raw, programs.length);
    if (!normalized.title) continue;
    if (seen.has(normalized.sourceId)) { duplicates++; continue; }
    seen.add(normalized.sourceId);
    programs.push(normalized);
  }
  await fs.mkdir("data", { recursive: true });
  const payload = { generatedAt: new Date().toISOString(), source: SOURCE, endpoint: ENDPOINT, responseContentType: contentType, totalFetched: all.length, reportedTotalCount: totalCount, paginationComplete: true, count: programs.length, duplicateRecordsRemoved: duplicates, programs };
  await fs.writeFile("data/programs.json", JSON.stringify(payload, null, 2));
  const regional = Object.fromEntries([...new Set(programs.map(p => p.region || "지역미확인"))].map(r => [r, programs.filter(p => (p.region || "지역미확인") === r).length]));
  const missing = Object.fromEntries(["description","region","startDate","endDate","fee","imageUrl","detailUrl"].map(field => [field, programs.filter(p => !p[field]).length]));
  console.log("API TEST SUCCESS: fetched", all.length, "records; normalized", programs.length, "unique programs; removed duplicates", duplicates, "pagination complete", true);
  console.log("Regional distribution:", JSON.stringify(regional));
  console.log("Missing fields:", JSON.stringify(missing));
  console.log("Sample record:", JSON.stringify(programs[0] ? {id:programs[0].id,title:programs[0].title,organization:programs[0].organization,region:programs[0].region,address:programs[0].address,startDate:programs[0].startDate,endDate:programs[0].endDate,fee:programs[0].fee,imageUrl:programs[0].imageUrl,detailUrl:programs[0].detailUrl,sourceId:programs[0].sourceId} : null));
}
main().catch(error => { console.error("API TEST FAILED:", error.message); process.exit(1); });
