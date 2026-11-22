import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const API_KEY = process.env.NATIONAL_MUSEUM_API_KEY;
const ENDPOINT = "https://api.kcisa.kr/openapi/service/CNV/API_CNV_043/request";
const PAGE_SIZE = 1000;
const MAX_PAGES = 300;
const TAIL_FALLBACK_SIZE = 100;
const MAX_OUTPUT_BYTES = 90 * 1024 * 1024;
const SOURCE = "국립지방박물관 문화행사 통합정보";
const PAST_DAYS = 30;
const FUTURE_DAYS = 180;

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
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
    for (const name of ["publisher","collectionDb","creater","title","sourceTitle","sourceAgency","collectedDate","description","localId","url","subDescription","viewCount","imageObject","videoObject","spatialCoverage","eventSite","type","audience","charge","contactPoint","period","sizing"]) fields[name] = xmlTag(block, name);
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
    const json = JSON.parse(text), root = json?.response ?? json, body = root?.body ?? json?.body ?? root, header = root?.header ?? json?.header ?? {};
    const candidate = body?.items?.item ?? body?.items ?? root?.items?.item ?? root?.items ?? json?.items?.item ?? json?.items ?? [];
    return { items: Array.isArray(candidate) ? candidate : candidate ? [candidate] : [], totalCount: toNumber(body?.totalCount ?? root?.totalCount ?? json?.totalCount), pageNo: toNumber(body?.pageNo ?? root?.pageNo ?? json?.pageNo), numOfRows: toNumber(body?.numOfRows ?? root?.numOfRows ?? json?.numOfRows), resultCode: header?.resultCode ?? root?.resultCode ?? json?.resultCode ?? "", resultMsg: header?.resultMsg ?? root?.resultMsg ?? json?.resultMsg ?? "" };
  }
  const resultCode = xmlTag(text, "resultCode"), resultMsg = xmlTag(text, "resultMsg");
  const accepted = ["0000","INFO-0","00","0","NORMAL_CODE"];
  if (resultCode && !accepted.includes(resultCode)) throw new Error("API result code " + resultCode + ": " + resultMsg);
  return { items: parseXmlItems(text), totalCount: toNumber(xmlTag(text, "totalCount")), pageNo: toNumber(xmlTag(text, "pageNo")), numOfRows: toNumber(xmlTag(text, "numOfRows")), resultCode, resultMsg };
}
function regionFromCoverage(coverage, museum) {
  const text = (coverage + " " + museum).replace(/\s/g, "");
  const map = [["국립중앙박물관","서울"],["국립춘천박물관","강원"],["국립경주박물관","경북"],["국립대구박물관","대구"],["국립진주박물관","경남"],["국립청주박물관","충북"],["국립공주박물관","충남"],["국립부여박물관","충남"],["국립전주박물관","전북"],["국립제주박물관","제주"],["국립광주박물관","광주"],["국립익산박물관","전북"],["국립김해박물관","경남"],["국립나주박물관","전남"]];
  for (const [name, region] of map) if (text.includes(name)) return region;
  const provinces = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
  return provinces.find(r => text.includes(r)) || "";
}
function parsePeriod(period) {
  const matches = [...String(period || "").matchAll(/(20\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/g)];
  const format = m => {
    if (!m) return "";
    const year=Number(m[1]), month=Number(m[2]), day=Number(m[3]);
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day) return "";
    return year+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0");
  };
  const start=format(matches[0]), end=format(matches[1])||start;
  return {startDate:start,endDate:end};
}
function normalize(x) {
  const museum=x.creater||x.publisher||"", periodDates=parsePeriod(x.period||"");
  const place=x.eventSite||x.spatialCoverage||museum;
  const stableKey=x.localId||x.url||[x.title||"",museum,x.period||"",x.sourceAgency||"",x.collectedDate||""].join("|");
  const id=x.localId ? "museum-"+x.localId : "museum-"+createHash("sha1").update(stableKey).digest("hex");
  return {
    id,title:x.title||"",category:x.type||"박물관 문화행사",description:[x.description,x.subDescription].filter(Boolean).join("\n"),
    organization:museum,region:regionFromCoverage(place,museum),district:"",address:place,latitude:null,longitude:null,
    startDate:periodDates.startDate,endDate:periodDates.endDate,applicationStart:"",applicationEnd:"",
    fee:x.charge||"",imageUrl:x.imageObject||"",detailUrl:x.url||"",applicationUrl:"",
    sourceName:SOURCE,sourceId:String(stableKey),audience:x.audience||"",collectedAt:new Date().toISOString(),rawPeriod:x.period||"",
    museumMetadata:{publisher:x.publisher||"",sourceAgency:x.sourceAgency||"",collectedDate:x.collectedDate||"",contactPoint:x.contactPoint||""}
  };
}
function hashPage(items) {
  const keys=items.map(x=>x.localId||x.url||[x.title||"",x.creater||"",x.period||""].join("|"));
  return createHash("sha256").update(keys.join("\n")).digest("hex").slice(0,16);
}
function dateShift(date, days) {
  const d=new Date(date+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);
}
async function requestPage(pageNo,numOfRows) {
  const url=new URL(ENDPOINT); url.searchParams.set("serviceKey",API_KEY); url.searchParams.set("numOfRows",String(numOfRows)); url.searchParams.set("pageNo",String(pageNo));
  let lastError;
  for(let attempt=1;attempt<=2;attempt++) {
    try {
      const response=await fetch(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(30000)});
      const text=await response.text();
       if(!response.ok) throw new Error("HTTP "+response.status+" response: "+text.slice(0,250).replace(/[\r\n\t]+/g," "));
      const parsed=parseResponse(text,response.headers.get("content-type")||"application/json");
      if(parsed.resultCode&&!["0000","INFO-0","00","0","NORMAL_CODE"].includes(String(parsed.resultCode))) throw new Error("API result code "+parsed.resultCode+": "+parsed.resultMsg);
      if(parsed.pageNo!==null&&parsed.pageNo!==pageNo) throw new Error("Pagination metadata mismatch: requested page "+pageNo+" but API echoed "+parsed.pageNo);
      if(parsed.numOfRows!==null&&parsed.numOfRows!==numOfRows) throw new Error("Pagination metadata mismatch: requested numOfRows "+numOfRows+" but API echoed "+parsed.numOfRows);
      if(pageNo===1&&!parsed.items.length) throw new Error("Page 1 returned no item records.");
      return {...parsed,contentType:response.headers.get("content-type")||"application/json"};
    } catch(error) {
      lastError=error;
      if(attempt<2) await new Promise(resolve=>setTimeout(resolve,1000));
    }
  }
  throw lastError;
}
function trackPage(page,pageNo,pageSize,fingerprints) {
  if(!page.items.length) return;
  const fingerprint=hashPage(page.items), key=pageSize+":"+fingerprint, prior=fingerprints.get(key);
  if(prior) {
    if(prior.pageNo===pageNo-1) throw new Error("Consecutive duplicate page content detected at page "+pageNo+" (page size "+pageSize+"); refusing to publish incomplete data.");
    console.warn("NONCONSECUTIVE DUPLICATE PAGE CONTENT:",JSON.stringify({pageNo,pageSize,firstSeenPage:prior.pageNo,fingerprint,action:"continue; record-level deduplication will remove duplicates"}));
  } else fingerprints.set(key,{pageNo,pageSize});
}
function overlapsWindow(program,windowStart,windowEnd) {
  if(!program.startDate||!program.endDate) return null;
  return program.endDate>=windowStart&&program.startDate<=windowEnd;
}
function processItems(items,counts,seen,programs,windowStart,windowEnd) {
  for(const raw of items) {
    const p=normalize(raw);
    if(!p.title){counts.missingTitle++;continue;}
    if(seen.has(p.sourceId)){counts.duplicatesRemoved++;continue;}
    seen.add(p.sourceId); counts.uniqueRecords++;
    const inWindow=overlapsWindow(p,windowStart,windowEnd);
    if(inWindow===null){counts.unknownDate++;continue;}
    if(!inWindow){counts.outsideWindow++;continue;}
    programs.push(p);
  }
}
async function main() {
  if(!API_KEY) throw new Error("Missing GitHub secret NATIONAL_MUSEUM_API_KEY");
  const now=new Date(), today=now.toISOString().slice(0,10), windowStart=dateShift(today,-PAST_DAYS), windowEnd=dateShift(today,FUTURE_DAYS);
  const counts={totalFetched:0,uniqueRecords:0,duplicatesRemoved:0,missingTitle:0,unknownDate:0,outsideWindow:0,pagesFetched:0};
  const seen=new Set(), programs=[], fingerprints=new Map();
  let pageNo=1,totalCount=null,contentType="",paginationComplete=false;
  while(pageNo<=MAX_PAGES) {
    let page;
    try { page=await requestPage(pageNo,PAGE_SIZE); }
    catch(error) {
      const expectedPages=totalCount===null?null:Math.ceil(totalCount/PAGE_SIZE);
      if(pageNo===expectedPages&&totalCount!==null) {
        console.warn("Large final page failed; falling back to 100-row tail pages:",error.message);
        const firstTailPage=Math.floor(((pageNo-1)*PAGE_SIZE)/TAIL_FALLBACK_SIZE)+1, lastTailPage=Math.ceil(totalCount/TAIL_FALLBACK_SIZE);
        for(let tailPageNo=firstTailPage;tailPageNo<=lastTailPage;tailPageNo++) {
          const tail=await requestPage(tailPageNo,TAIL_FALLBACK_SIZE);
          if(tail.totalCount!==null&&tail.totalCount!==totalCount) throw new Error("API totalCount changed during tail fallback; refusing to publish.");
          trackPage(tail,tailPageNo,TAIL_FALLBACK_SIZE,fingerprints);
          counts.totalFetched+=tail.items.length; counts.pagesFetched++;
          processItems(tail.items,counts,seen,programs,windowStart,windowEnd);
          console.log("Tail fallback page",tailPageNo,"rows",tail.items.length,"total fetched",counts.totalFetched);
        }
        paginationComplete=counts.totalFetched>=totalCount;
        break;
      }
      throw error;
    }
    contentType=page.contentType;
    if(page.totalCount!==null) {
      if(totalCount===null) totalCount=page.totalCount;
      else if(page.totalCount!==totalCount) throw new Error("API totalCount changed from "+totalCount+" to "+page.totalCount+"; refusing to publish mixed snapshot.");
    }
    trackPage(page,pageNo,PAGE_SIZE,fingerprints);
    counts.totalFetched+=page.items.length; counts.pagesFetched++;
    processItems(page.items,counts,seen,programs,windowStart,windowEnd);
    console.log("Page",pageNo,"rows",page.items.length,"reported totalCount",totalCount??"unknown","total fetched",counts.totalFetched);
    if(totalCount!==null&&counts.totalFetched>=totalCount){paginationComplete=true;break;}
    if(page.items.length<PAGE_SIZE){paginationComplete=true;break;}
    pageNo++;
  }
  if(pageNo>MAX_PAGES&&!paginationComplete) throw new Error("Pagination limit reached before completion. Fetched "+counts.totalFetched+" of "+(totalCount??"unknown")+"; dataset was not overwritten.");
  if(!paginationComplete) throw new Error("Collection did not reach a verified terminal page; dataset was not overwritten.");
  if(totalCount!==null&&counts.totalFetched<totalCount) throw new Error("Pagination incomplete ("+counts.totalFetched+"/"+totalCount+"); dataset was not overwritten.");
  const regional=Object.fromEntries([...new Set(programs.map(p=>p.region||"지역미확인"))].map(r=>[r,programs.filter(p=>(p.region||"지역미확인")===r).length]));
  const missing=Object.fromEntries(["description","region","startDate","endDate","fee","imageUrl","detailUrl"].map(field=>[field,programs.filter(p=>!p[field]).length]));
  const payload={generatedAt:now.toISOString(),source:SOURCE,endpoint:ENDPOINT,responseContentType:contentType,totalFetched:counts.totalFetched,reportedTotalCount:totalCount,paginationComplete:true,pagesFetched:counts.pagesFetched,uniqueRecords:counts.uniqueRecords,count:programs.length,duplicateRecordsRemoved:counts.duplicatesRemoved,filterWindow:{startDate:windowStart,endDate:windowEnd,includeUnknownDates:false},filteredOut:{missingTitle:counts.missingTitle,unknownDate:counts.unknownDate,outsideWindow:counts.outsideWindow},regionalDistribution:regional,missingFields:missing,programs};
  const output=JSON.stringify(payload,null,2), outputBytes=Buffer.byteLength(output,"utf8");
  if(outputBytes>MAX_OUTPUT_BYTES) throw new Error("Filtered output size "+outputBytes+" exceeds safe 90 MiB limit; dataset was not overwritten.");
  await fs.mkdir("data",{recursive:true}); await fs.writeFile("data/programs.json",output);
  console.log("API TEST SUCCESS: full pagination",counts.totalFetched+"/"+(totalCount??"unknown"),"records; published",programs.length,"programs in date window",windowStart+".."+windowEnd,"duplicates removed",counts.duplicatesRemoved,"output bytes",outputBytes);
  console.log("Collection counts:",JSON.stringify(counts));
  console.log("Filtered out:",JSON.stringify(payload.filteredOut));
  console.log("Regional distribution:",JSON.stringify(regional));
  console.log("Missing fields:",JSON.stringify(missing));
  console.log("Sample record:",JSON.stringify(programs[0]?{title:programs[0].title,organization:programs[0].organization,region:programs[0].region,startDate:programs[0].startDate,endDate:programs[0].endDate,detailUrl:programs[0].detailUrl}:null));
}
main().catch(error=>{console.error("API TEST FAILED:",error.message);process.exit(1);});
