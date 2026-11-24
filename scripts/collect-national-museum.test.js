import test from "node:test";
import { safeText } from "./probe-utils.js";
import assert from "node:assert/strict";
import { fallbackPageRange, regionFromText, regionFromCoverage, regionWithSource, classifyHttpError, classifyNetworkError, classifyRequestError, shouldRetryRequest } from "./collect-national-museum.js";

test("fallback page ranges preserve raw offsets for 100 rows", () => {
  assert.deepEqual(fallbackPageRange(290000, 294499, 100), { firstPage: 2901, lastPage: 2945 });
});
test("fallback page ranges preserve raw offsets for 50 rows", () => {
  assert.deepEqual(fallbackPageRange(290000, 294499, 50), { firstPage: 5801, lastPage: 5890 });
});
test("fallback page ranges preserve raw offsets for 25 rows", () => {
  assert.deepEqual(fallbackPageRange(290000, 294499, 25), { firstPage: 11601, lastPage: 11780 });
});
test("unaligned fallback offsets are rejected", () => {
  assert.throws(() => fallbackPageRange(290050, 294499, 100), /cannot align/);
});
test("full Korean administrative names normalize to service region codes", () => {
  assert.equal(regionFromText("충청북도 청주시"), "충북");
  assert.equal(regionFromText("경상남도 김해시"), "경남");
  assert.equal(regionFromText("전북특별자치도 전주시"), "전북");
  assert.equal(regionFromText("서울특별시"), "서울");
});
test("explicit event location takes priority over museum affiliation", () => {
  assert.equal(regionFromCoverage("부산광역시 해운대구 행사장", "국립경주박물관"), "부산");
});
test("museum affiliation is used only as a fallback", () => {
  assert.equal(regionFromCoverage("", "국립경주박물관"), "경북");
  assert.equal(regionFromCoverage("행사 장소 미확인", "국립중앙박물관"), "서울");
});

test("region provenance prefers event site, then spatial coverage, then museum affiliation", () => {
  assert.deepEqual(regionWithSource("부산광역시 해운대구","","국립경주박물관"), {region:"부산",regionSource:"eventSite"});
  assert.deepEqual(regionWithSource("행사 장소 미확인","충청북도 청주시","국립경주박물관"), {region:"충북",regionSource:"spatialCoverage"});
  assert.deepEqual(regionWithSource("","","국립대구박물관"), {region:"대구",regionSource:"museumAffiliation"});
  assert.deepEqual(regionWithSource("","","미확인 기관"), {region:"",regionSource:"unknown"});
});

test("HTTP errors are classified without confusing 500 assignment errors with 504 timeouts", () => {
  assert.equal(classifyHttpError(500,"From data is null at Assign!"),"API_INTERNAL_ASSIGNMENT_ERROR");
  assert.equal(classifyHttpError(500,"generic server failure"),"API_SERVER_ERROR");
  assert.equal(classifyHttpError(504,"gateway timeout"),"API_GATEWAY_TIMEOUT");
  assert.equal(classifyHttpError(403,"forbidden"),"AUTH_OR_PERMISSION_ERROR");
  assert.equal(classifyHttpError(400,"invalid parameter"),"REQUEST_ERROR");
  assert.equal(classifyHttpError(429,'{"message":"Quota exceeded ! You reach the limit of 1000 requests per 1 days"}'),"API_QUOTA_EXCEEDED");
  assert.equal(classifyHttpError(429,"Too many requests"),"API_RATE_LIMITED");
});
test("daily API quota errors are not retried",()=>{
  assert.equal(shouldRetryRequest({category:"API_QUOTA_EXCEEDED"}),false);
  assert.equal(shouldRetryRequest({category:"API_RATE_LIMITED"}),true);
  assert.equal(shouldRetryRequest(new Error("temporary server error")),true);
});

test("network errors distinguish DNS, connection, and timeout failures", () => {
  assert.equal(classifyNetworkError({cause:{code:"ENOTFOUND"}}),"DNS_ERROR");
  assert.equal(classifyNetworkError({cause:{code:"EAI_AGAIN"}}),"DNS_ERROR");
  assert.equal(classifyNetworkError({cause:{code:"ECONNRESET"}}),"NETWORK_CONNECTION_ERROR");
  assert.equal(classifyNetworkError({cause:{code:"ETIMEDOUT"}}),"NETWORK_TIMEOUT");
  assert.equal(classifyNetworkError({name:"TimeoutError"}),"NETWORK_TIMEOUT");
});

test("API and pagination errors are classified separately from network errors", () => {
  assert.equal(classifyRequestError(new Error("API result code 10: bad request")),"API_RESPONSE_ERROR");
  assert.equal(classifyRequestError(new Error("Pagination metadata mismatch")),"REQUEST_PARAMETER_MISMATCH");
  assert.equal(classifyRequestError(new SyntaxError("invalid json")),"RESPONSE_PARSE_ERROR");
});

test("probe output redacts secrets before enforcing length limit", () => {
  const secret = "private-api-key-value";
  const output = safeText("response " + secret + " " + "x".repeat(100), 40, secret);
  assert.ok(!output.includes(secret));
  assert.ok(output.includes("[REDACTED]"));
  assert.ok(output.length <= 40);
  assert.ok(output.endsWith("…"));
});
test("probe output normalizes whitespace and respects exact length limits", () => {
  assert.equal(safeText(" first\nsecond\tthird ", 50), "first second third");
  assert.equal(safeText("abcdef", 4), "abc…");
  assert.equal(safeText("abcdef", 1), "…");
  assert.equal(safeText("abcdef", 0), "");
});
