import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const KEY = process.env.NATIONAL_PERFORMANCE_API_KEY;
const ENDPOINT = "https://api.data.go.kr/openapi/tn_pubr_public_pblprfr_event_info_api";
const PAGE_SIZE = 500;
const MAX_PAGES = 50;
const SOURCE = "전국 공연·행사 표준데이터";

const pick = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== "") ?? "";
const itemsFrom = data => {
  const candidate = data?.response?.body?.items?.item ?? data?.body?.items?.item ?? data?.items?.item ?? data?.items ?? [];
  return Array.isArray(candidate) ? candidate : candidate ? [candidate] : [];
};
const regionFrom = value => {
  const s = String(value || "").replace(/\\s/g, "");
  const pairs = [["서울특별시","서울"],["서울시","서울"],["부산광역시","부산"],["부산시","부산"],["대구광역시","대구"],["대구시","대구"],["인천광역시","인천"],["인천시","인천"],["광주광역시","광주"],["광주시","광주"],["대전광역시","대전"],["대전시","대전"],["울산광역시","울산"],["울산시","울산"],["세종특별자치시","세종"],["세종시","세종"],["경기도","경기"],["강원특별자치도","강원"],["강원도","강원"],["충청북도","충북"],["충청남도","충남"],["전북특별자치도","전북"],["전라북도","전북"],["전라남도","전남"],["경상북도","경북"],["경상남도","경남"],["제주특별자치도","제주"]];
  return pairs.find(([k]) => s.includes(k))?.[1] || "";
};
function normalize(x) {
  const address = pick(x.rndmadr, x.lnmadr);
  const id = pick(x.eventNo, x.insttCode && x.eventNm ? x.insttCode + "|" + x.eventNm + "|" + x.eventStartDate : "");
  const stable = id || [x.eventNm,x.eventCo,x.eventStartDate,x.eventEndDate,x.insttNm].map(v=>String(v||"")).join("|");
  const hash = createHash("sha1").update(stable).digest("hex");
  return {
    id: "performance-" + hash,
    title: pick(x.eventNm),
    category: "공연·행사",
    description: [pick(x.eventCo), pick(x.atpn), pick(x.dscntInfo)].filter(Boolean).join("\\n"),
    organization: pick(x.insttNm, x.mnstrNm, x.auspcInsttNm),
    region: regionFrom(address),
    district: "",
    address,
    latitude: pick(x.latitude),
    longitude: pick(x.longitude),
    startDate: pick(x.eventStartDate),
    endDate: pick(x.eventEndDate),
    applicationStart: "",
    applicationEnd: "",
    fee: pick(x.chrgInfo, x.admfee),
    imageUrl: "",
    detailUrl: pick(x.homepageUrl, x.advntkInfo),
    applicationUrl: "",
    sourceName: SOURCE,
    sourceId: stable,
    audience: pick(x.entncAge),
    collectedAt: new Date().toISOString(),
    contact: pick(x.phoneNumber),
    venue: pick(x.eventPlace, x.rndmadr),
    referenceDate: pick(x.referenceDate),
    raw: { eventTime: [x.eventStartTime, x.eventEndTime].filter(Boolean).join(" - "), institutionCode: pick(x.insttCode), institutionName: pick(x.insttNm), supportInstitution: pick(x.suprtInsttNm), seatNumber: pick(x.seatNumber) }
  };
}
async function fetchPage(pageNo) {
  const params = new URLSearchParams({ serviceKey: KEY, pageNo: String(pageNo), numOfRows: String(PAGE_SIZE), type: "json" });
  const response = await fetch(ENDPOINT + "?" + params, { headers: { Accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) throw new Error("HTTP " + response.status + " page " + pageNo + ": " + text.slice(0, 300));
  let json;
  try { json = JSON.parse(text); } catch { throw new Error("Non-JSON response on page " + pageNo + ": " + text.slice(0, 300)); }
  const header = json?.response?.header ?? json?.header ?? {};
  if (header.resultCode && header.resultCode !== "00") throw new Error("API result " + header.resultCode + ": " + header.resultMsg);
  const body = json?.response?.body ?? json?.body ?? {};
  return { items: itemsFrom(json), total: Number(body.totalCount ?? json.totalCount ?? 0) };
}
async function main() {
  if (!KEY) throw new Error("Missing NATIONAL_PERFORMANCE_API_KEY secret.");
  let all = [], total = 0, pages = 0;
  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    const result = await fetchPage(pageNo);
    pages = pageNo; total = result.total; all.push(...result.items);
    console.log("Page", pageNo, "received", result.items.length, "records; cumulative", all.length, "/", total);
    if (!result.items.length || all.length >= total || result.items.length < PAGE_SIZE) break;
  }
  if (total && all.length < total) throw new Error("Pagination incomplete: fetched " + all.length + " of " + total + " records after " + pages + " pages.");
  const seen = new Set();
  const programs = all.map(normalize).filter(p => p.title).filter(p => {
    const k = p.sourceId;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile("data/performance-events.json", JSON.stringify({
    generatedAt: new Date().toISOString(), source: SOURCE, endpoint: ENDPOINT,
    pageSize: PAGE_SIZE, pagesFetched: pages, totalFetched: all.length, totalAvailable: total,
    count: programs.length, paginationComplete: !total || all.length >= total, programs
  }, null, 2));
  console.log("Collector complete:", JSON.stringify({pagesFetched: pages, totalFetched: all.length, totalAvailable: total, unique: programs.length}));
}
main().catch(error => { console.error(error); process.exit(1); });
