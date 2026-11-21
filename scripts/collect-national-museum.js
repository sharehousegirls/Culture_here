import fs from "node:fs/promises";

const API_KEY = process.env.NATIONAL_MUSEUM_API_KEY;
const ENDPOINT = "https://api.kcisa.kr/openapi/service/CNV/API_CNV_043/request";
const PAGE_SIZE = 100;
const MAX_PAGES = 100;
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
    for (const name of ["publisher","collectionDb","creater","title","sourceAgency","collectedDate","description","localId","url","subDescription","viewCount","imageObject","videoObject","spatialCoverage","charge","contactPoint","period","sizing"]) {
      fields[name] = xmlTag(block, name);
    }
    return fields;
  });
}
function parseItems(text, contentType) {
  if (contentType.includes("json") || text.trim().startsWith("{")) {
    const json = JSON.parse(text);
    const items = json?.response?.body?.items?.item ?? json?.body?.items?.item ?? json?.items?.item ?? json?.items ?? [];
    return Array.isArray(items) ? items : items ? [items] : [];
  }
  const code = xmlTag(text, "resultCode");
  const msg = xmlTag(text, "resultMsg");
  if (code && code !== "0000" && code !== "0000") throw new Error("API response code " + code + ": " + msg);
  return parseXmlItems(text);
}
function regionFromCoverage(coverage, museum) {
  const text = (coverage + " " + museum).replace(/\s/g, "");
  const map = [
    ["국립춘천박물관","강원"],["국립경주박물관","경북"],["국립대구박물관","대구"],
    ["국립부산박물관","부산"],["국립진주박물관","경남"],["국립청주박물관","충북"],
    ["국립공주박물관","충남"],["국립부여박물관","충남"],["국립전주박물관","전북"],
    ["국립제주박물관","제주"],["국립광주박물관","광주"],["국립익산박물관","전북"],
    ["국립김해박물관","경남"]
  ];
  for (const [name, region] of map) if (text.includes(name)) return region;
  const provinces = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
  return provinces.find(r => text.includes(r)) || "";
}
function dateFromPeriod(period, index) {
  const matches = [...String(period || "").matchAll(/(20\d{2})[-./]?(\d{1,2})[-./]?(\d{1,2})/g)];
  if (matches.length) return matches[index] ? matches[index][1] + "-" + matches[index][2].padStart(2,"0") + "-" + matches[index][3].padStart(2,"0") : "";
  return "";
}
function normalize(x, i) {
  const museum = x.creater || x.publisher || "";
  const dates = [...String(x.period || "").matchAll(/(20\d{2})[-./]?(\d{1,2})[-./]?(\d{1,2})/g)];
  const getDate = idx => dates[idx] ? dates[idx][1] + "-" + dates[idx][2].padStart(2,"0") + "-" + dates[idx][3].padStart(2,"0") : "";
  const place = x.spatialCoverage || museum;
  return {
    id: "museum-" + (x.localId || x.publisher || i),
    title: x.title || "",
    category: "박물관 문화행사",
    description: [x.description, x.subDescription].filter(Boolean).join("\n"),
    organization: museum,
    region: regionFromCoverage(x.spatialCoverage, museum),
    district: "",
    address: place,
    latitude: null,
    longitude: null,
    startDate: getDate(0),
    endDate: getDate(1),
    applicationStart: "",
    applicationEnd: "",
    fee: x.charge || "",
    imageUrl: x.imageObject || "",
    detailUrl: x.url || "",
    applicationUrl: "",
    sourceName: SOURCE,
    sourceId: x.localId || x.publisher || String(i),
    audience: "누구나",
    collectedAt: new Date().toISOString(),
    rawPeriod: x.period || "",
    museumMetadata: { publisher: x.publisher || "", sourceAgency: x.sourceAgency || "", collectedDate: x.collectedDate || "", contactPoint: x.contactPoint || "" }
  };
}
async function requestPage(pageNo) {
  // The provider's Swagger lists serviceKey, numOfRows and pageNo.
  // A note on the page also mentions blank keyword parameters; test that variant if needed.
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
        failures.push(candidate.label + ": HTTP " + response.status + " - " + text.slice(0, 300));
        continue;
      }
      const items = parseItems(text, response.headers.get("content-type") || candidate.accept);
      if (!items.length && pageNo === 1) {
        failures.push(candidate.label + ": HTTP " + response.status + " but no item records parsed; body=" + text.slice(0, 300));
        continue;
      }
      console.log("Request variant succeeded:", candidate.label, "HTTP", response.status);
      return { items, contentType: response.headers.get("content-type") || candidate.accept, sample: text.slice(0, 300) };
    } catch (error) {
      failures.push(candidate.label + ": " + (error?.message || String(error)));
    }
  }
  throw new Error("All API request variants failed. " + failures.join(" | "));
}
async function main() {
  if (!API_KEY) throw new Error("Missing GitHub secret NATIONAL_MUSEUM_API_KEY");
  let all = [], pageNo = 1, contentType = "";
  while (pageNo <= MAX_PAGES) {
    const page = await requestPage(pageNo);
    contentType = page.contentType;
    all.push(...page.items);
    console.log("Page", pageNo, "records", page.items.length, "total accumulated", all.length);
    if (page.items.length < PAGE_SIZE) break;
    pageNo++;
  }
  const seen = new Set();
  const programs = all.map(normalize).filter(p => p.title).filter(p => {
    const key = p.sourceId || p.title + "|" + p.startDate;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  await fs.mkdir("data", { recursive: true });
  const payload = { generatedAt: new Date().toISOString(), source: SOURCE, endpoint: ENDPOINT, responseContentType: contentType, totalFetched: all.length, count: programs.length, programs };
  await fs.writeFile("data/programs.json", JSON.stringify(payload, null, 2));
  const regional = Object.fromEntries([...new Set(programs.map(p => p.region || "지역미확인"))].map(r => [r, programs.filter(p => (p.region || "지역미확인") === r).length]));
  console.log("API TEST SUCCESS: fetched", all.length, "records; normalized", programs.length, "unique programs.");
  console.log("Regional distribution:", JSON.stringify(regional));
  console.log("Sample record:", JSON.stringify(programs[0] || null));
}
main().catch(error => { console.error("API TEST FAILED:", error.message); process.exit(1); });
