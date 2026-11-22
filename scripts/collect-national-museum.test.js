import test from "node:test";
import assert from "node:assert/strict";
import { fallbackPageRange, regionFromText, regionFromCoverage } from "./collect-national-museum.js";

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
