# Culture Here API 통합 관리

## 관리 원칙
- API별로 하나의 등록 항목만 유지한다. 지역별로 API 또는 키를 중복 등록하지 않는다.
- 지역은 API 관리 분류가 아니라 조회 파라미터, 데이터 속성, 서비스 필터로 관리한다.
- 키 문자열은 Git에 커밋하지 않는다. 실제 키는 GitHub Actions Secrets 또는 로컬 `.env`에 보관한다.
- API 전국 범위 여부는 문서와 실 응답을 확인해 판단한다. 일부 지역 데이터만으로 전국 범위를 확정하지 않는다.
- 검증 전 데이터는 정상 수집 또는 서비스 통합 완료로 표시하지 않는다.

## API 상태
| API ID | API명 | 상태 | 범위 | Secret 이름 |
|---|---|---|---|---|
| culture-portal | 문화포털 문화정보 조회 | 신청/승인 상태 재확인 | unknown | CULTURE_PORTAL_API_KEY |
| lifelong-learning-standard | 전국 평생학습강좌 표준데이터 | 미신청 | unknown | LIFELONG_LEARNING_API_KEY |
| ministry-affiliated-education | 문화부 소속 및 산하기관 교육정보 API | 키 발급 기록, 검증 필요 | unknown | MINISTRY_EDUCATION_API_KEY |
| national-museum-events | 국립중앙박물관 외_국립지방박물관 문화행사 통합정보 | 실 검증·통합·배포 완료 | unknown | NATIONAL_MUSEUM_API_KEY |
| national-library-recruitment | 국립어린이청소년도서관 공개모집 API | 키 발급 기록, 검증 필요 | unknown | NATIONAL_LIBRARY_RECRUITMENT_API_KEY |
| performance-info-integrated | 한국문화정보원 외_공연정보(통합) | 문서 검토 후보; 호출/활성화 금지 | unknown | 미발급/미확인 |

## 국립지방박물관 문화행사 API 검증 기록

### 공식 정보
- 공공데이터포털 ID: `15105222`
- 제공기관: 문화체육관광부
- 공식 페이지: https://www.data.go.kr/data/15105222/openapi.do
- 데이터 유형: OpenAPI
- 제공 형식: JSON + XML
- 업데이트 주기: 실시간
- 이용 비용: 무료
- 이용허락범위: 제한 없음 (포털에 표시된 범위)
- endpoint (Collector 기준): `https://api.kcisa.kr/openapi/service/CNV/API_CNV_043/request`
- 요청 파라미터: `serviceKey`, `numOfRows`, `pageNo`
- 인증: GitHub Actions Secret `NATIONAL_MUSEUM_API_KEY`; 키는 로그/코드/커밋에 출력하지 않는다.

### 최신 실 수집 (2026-11-23, Collector run #11)
- Workflow: https://github.com/sharehousegirls/Culture_here/actions/runs/45086409240
- 실행 결과: success; full pagination 수집 및 normalized dataset validation 통과
- API 응답: JSON; 이전 실 호출에서 HTTP 200 및 resultCode `0000` 확인. 이번 실행의 collector summary는 전체 API 수집 성공으로 기록됨
- reported totalCount: 294,499
- fetched: 294,499 / 294,499
- paginationComplete: true
- pagesFetched: 361
- 1,000 rows/page 수집 중 raw offset 291,000에서 HTTP 504; 100-row fallback도 HTTP 504; 50-row fallback 70페이지 / 3,499 records로 tail 복구
- unique records: 13,890
- duplicate records removed: 280,606 (95.28%)
- duplicate page fingerprints: 181
- published programs: 12
- filter window: 2026-10-24 ~ 2027-05-22
- regional distribution: 경북 2, 대구 6, 충북 4
- missing region: 0
- missing fields among 12 published records: description 0, region 0, startDate 0, endDate 0, fee 12, imageUrl 12, detailUrl 0
- dataset generated: 29,601 bytes; data file: `data/programs.json`
- dataset commit: https://github.com/sharehousegirls/Culture_here/commit/e6fd71f0f4a3e64575ca0c2ac35ad39da04d30f0
- Collector validation/push, CI, and Pages deployment: successful; Pages run #45 https://github.com/sharehousegirls/Culture_here/actions/runs/45086409161
- API 500 `From data is null at Assign!` was not reproduced in the successful collector run. The current verified request combination returned complete pagination. HTTP 504 is a separate timeout at large-page tail; it was recovered by reducing page size.

### 데이터 품질 및 범위 주의
- 중복 비율이 95.28%로 매우 높다. 중복 제거 결과는 기록하지만 원본 데이터 품질 개선이 필요하다.
- 현재 날짜 범위 필터에 포함된 12건이 경북/대구/충북에 있다는 사실은 전국 조회 범위를 입증하지 않는다. `scope: unknown` 유지.
- 현재 12건 모두 비용(`fee`)과 이미지(`imageUrl`)가 비어 있다. 원본에 없는 값은 추정하지 않는다.
- 지역은 행사장/기관명 기반 정규화 결과다. 기관 지역을 행사 장소 지역으로 대체한 경우 그 근거를 확인할 수 있어야 한다.

## 다음 후보 — 문서 조사만
### 한국문화정보원 외_공연정보(통합)
- 문화포털 API ID: 597
- 공공데이터 연계자료 ID: 1437
- 공식 연계자료: https://www.data.go.kr/data/1437/linkedData.do
- 문화포털 상세 링크: https://culture.go.kr/data/openapi/openapiView.do?id=597&gubun=A
- 공식 연계자료 설명: 제목, 기간, 시간, 장소, 공연시간, 요금/할인정보 등 24개 표준 메타데이터; 2024년 자료 기준 10개 기관 데이터, 추가 23개 자원 표준화 진행 설명
- endpoint, 상세 파라미터, 인증/권한, 최신 기관 목록은 문화포털 API 상세에서 추가 확인해야 한다. 상세 페이지는 이번 확인 도구에서 열리지 않아 확인하지 못했다.
- 상태: 후보 조사만; 실제 요청/키 사용/활성화하지 않음.

## API 키 관리
- GitHub Secrets 값은 읽어낼 수 없으며 공개 저장소에 기록하지 않는다.
- 신규 키 등록/교체는 사용자가 GitHub Settings → Secrets and variables → Actions에서 수행한다.
- 인증키가 필요하지만 발급되지 않은 API는 공식 문서 조사까지만 수행하고 사용자에게 발급 절차를 안내한다.

## 지역 범위 검증 기록 템플릿
| 날짜 | API ID | 요청 조건 | 반환 데이터 지역 | 판정 | 비고 |
|---|---|---|---|---|
| 미실시 | 미정 | 미정 | 미정 | 실제 응답 검증 전 |

## 운영
API metadata는 `config/apis.json`에서 관리한다. 보류 API는 `enabled: false`로 유지하고, 한 번에 하나의 API만 실제 호출한다.

## 실행 감사 — 2026-11-23 16:51 KST

- 저장소 main의 최신 커밋: API 오류 진단/지역 출처 코드 변경(collector)과 해당 테스트 추가까지 확인.
- 최신 **확인된 실 수집**은 Collector run #11 (2026-11-23 09:02~09:22 KST): HTTP 요청 성공, 294,499/294,499, 361 pages, 13,890 unique, 280,606 duplicates, 181 duplicate page fingerprints, 12개 프로그램 게시. 291,000 offset tail에서 1,000-row/100-row 요청이 HTTP 504, 50-row fallback 70페이지/3,499건으로 완료. 이 run은 최신 HTTP status instrumentation 이전이라 data 파일에 HTTP status count가 기록되지 않음.
- data/programs.json 12건의 지역은 경북 2/대구 6/충북 4. **12건 모두 address가 박물관명으로 저장되어 지역은 행사 장소가 아닌 박물관 소속 지역 fallback 기반**임을 명시. 비용·이미지 누락 12/12. 이 분포를 전국 행사 장소 분포로 해석하지 않음.
- 500 `From data is null at Assign!`는 이전 요청에서 관찰된 서버 내부 오류 메시지로, run #11에서는 재현되지 않음. 504와 구분. 최신 collector commit `13c8db13`는 HTTP 500 Assign-null, 일반 500, 504, 인증/권한, 요청, DNS/네트워크/timeout, 응답 parsing 오류 분류 및 pageNo/numOfRows/attempt 진단을 추가; 요청 URL/키는 로그하지 않고 response preview에서 키를 redaction. `regionSource`를 eventSite/spatialCoverage/museumAffiliation/unknown으로 기록.
- 테스트 commit `cb5c0dc`는 지역 출처 우선순위, 500/504/auth/request, network/DNS/timeout, parse/API/pagination 분류 4개 테스트를 추가. **이 새 commit에 대한 CI/Collector 실행 결과는 현재 connector에서 workflow run 목록을 읽을 수 없어 확인 불가**; 성공으로 기록하지 않음. Script 변경은 collector workflow의 push-path trigger에 해당함.
- Pages run #51: attempt 1은 업로드 성공 후 deploy가 artifact 0개를 반환했고, 재실행 attempt 2는 같은 이름의 artifact 2개를 발견해 실패. 이는 job 재실행 시 `github-pages` 이름으로 artifact가 중복 생성되는 문제와 metadata 지연 가능성을 드러냄. Workflow commit `c28f7b51`에서 artifact 이름을 `github-pages-${{ github.run_attempt }}`로 분리하고 upload 후 10초 대기하도록 수정. 수정된 새 Pages run 결과는 조회할 수 없어 성공 여부 미확인.
- 다음 후보 문서 조사: 한국문화정보원 외_공연정보(통합), 문화포털 API ID 597 / Data.go linked data ID 1437. 공식 linked-data 설명은 24개 표준 메타데이터, 10개 기관 및 23개 추가 자원 표준화 진행을 언급하지만, 기관 목록에 9개 이름만 열거되어 수량 불일치. Culture Portal 상세 API 페이지는 도구에서 접근 불가해 endpoint/parameter/auth/현재 기관 범위 미확인. **호출·키 사용·활성화 없이 후보로 유지.**


## 실행 감사 — 2026-11-23 21:10 KST

- 저장소 최신 main 확인: `f17b96807c516a36d6f4cefe1ce5e3a651dd8997`. Collector/CI/Pages workflow 및 직전 API_REGISTRY 감사 기록을 검토.
- Collector run #14 (https://github.com/sharehousegirls/Culture_here/actions/runs/45134672954): 첫 요청 pageNo=1, numOfRows=1000에서 HTTP 429. 응답: 일일 1,000 요청 제한 초과. Secret 존재 확인 단계는 성공했으나 키 값은 출력하지 않음. 기존 collector는 같은 요청을 2회 시도했고 두 번 모두 429. 데이터 artifact, 정규화 검증, dataset commit, 배포 단계는 skip; 이번 run의 데이터 건수/응답형식/지역분포 검증 없음.
- Collector run #13 (https://github.com/sharehousegirls/Culture_here/actions/runs/45110093024) 역시 첫 페이지 429. Run #12 (https://github.com/sharehousegirls/Culture_here/actions/runs/45109177218)는 291,000건까지 진행 후 tail HTTP 504; 100/50/25-row fallback은 429 quota 초과로 실패. 이 실패 실행들은 기존 dataset을 덮어쓰지 않음.
- HTTP 429 일일 quota를 `API_QUOTA_EXCEEDED`로 분류하고, 이 유형에는 재시도하지 않도록 Collector 수정: https://github.com/sharehousegirls/Culture_here/commit/2010de6c7952dbcbd2aa9e68f0394c0d3c87e688. 일반 429는 `API_RATE_LIMITED`로 구분.
- Unit test에 quota/generic-429 분류 및 재시도 정책 추가: https://github.com/sharehousegirls/Culture_here/commit/f17b96807c516a36d6f4cefe1ce5e3a651dd8997. 해당 CI는 감사 시점에 실행 중이었음.
- Collector run #15 (https://github.com/sharehousegirls/Culture_here/actions/runs/45171773861)는 수정 후 push-triggered 실 호출에서 첫 페이지 429 quota 초과로 종료. 이번 run에서는 데이터 수집·검증·commit·deploy 없음. HTTP 500 `From data is null at Assign!` 재현 불가: quota가 첫 요청을 차단함.
- CI #52 (https://github.com/sharehousegirls/Culture_here/actions/runs/45135060488) 및 Pages #56 (https://github.com/sharehousegirls/Culture_here/actions/runs/45135059979)은 이전 수정 상태에서 성공. 신규 코드 CI/Pages는 감사 시점에 진행 중 또는 대기.
- 공식 Data.go 페이지 https://www.data.go.kr/data/15105222/openapi.do 는 국립중앙박물관과 전국 13개 국립지방박물관 행사 정보, JSON/XML, 실시간, 무료, 이용허락 제한 없음을 설명. 이번 공식 문서 열람 결과 endpoint/parameter 표는 확인되지 않았으며, endpoint 및 `serviceKey,numOfRows,pageNo` 조합은 Collector 설정과 이전 성공 run #11 기록에 근거. 이번 run의 HTTP status count/응답 레코드/지역 분포는 없음.
- 다음 작업: API 제공기관 quota가 회복된 후 국립지방박물관 API만 다시 검증. 전체 pagination, 응답 형식, 데이터 총수, 중복, 필드 누락, 지역 출처를 확인하고 500 Assign-null 오류 재현 여부를 판단. API 성공 통합 전 다음 API 후보 호출/활성화 금지. 보류 API는 계속 disabled.
- 사용자 조치: 키 교체/재발급 불필요. 제공기관의 일일 요청 한도 회복 전 API 수집 대기. 키/비밀 값은 저장소와 보고서에 포함하지 않음.


## 실행 감사 — 2026-11-24 00:55 KST

- 최신 main 확인: `8fccb2613958f6e919526414bfc54233d16a47bb`. Collector workflow, CI, Pages workflow, config, collector/test code, 직전 API_REGISTRY 보고서를 검토.
- Collector run #15 attempt 2를 실패 job 단독 재실행함: https://github.com/sharehousegirls/Culture_here/actions/runs/45171773861. Secret 존재 확인 단계는 성공했고 값은 노출되지 않음. 첫 요청 `pageNo=1,numOfRows=1000`에서 HTTP 429, 메시지 `Quota exceeded ! You reach the limit of 1000 requests per 1 days`; 1회 요청 후 종료. 재시도/페이지 수집/정규화/데이터 commit/배포는 모두 skip. quota가 여전히 초과되어 이번 실행도 실 수집 실패.
- HTTP 429 일일 quota 초과를 확인. DNS/network, 키 누락, 권한, 요청 parameter, parsing 오류 증거 없음. HTTP 500 `From data is null at Assign!`는 quota가 요청을 차단하여 이번에도 재현할 수 없음.
- 최신 CI #55 (run https://github.com/sharehousegirls/Culture_here/actions/runs/45171894207) 성공. Syntax check step에서 `node --check` 및 `node --test scripts/collect-national-museum.test.js` 실행, Required files 단계 성공. Pages #59 (https://github.com/sharehousegirls/Culture_here/actions/runs/45171894130) 전체 배포 단계 성공.
- 현재 data/programs.json은 이전 성공 Collector #11의 스냅샷이며 generatedAt=2026-11-23T00:02:14.570Z, fetched/reported=294,499, 12 programs, missing fee 12/12, image 12/12, 지역분포 경북 2/대구 6/충북 4. 샘플의 address는 박물관명(국립경주박물관), regionSource 필드는 아직 없음. 새 Collector에서 추가된 지역 출처 필드는 quota 회복 후 재수집하기 전까지 실제 데이터에 적용되지 않았음. 이 지역 분포를 행사장 위치 분포로 해석하지 않고 API scope=unknown 유지.
- 공식 데이터 페이지 https://www.data.go.kr/data/15105222/openapi.do 확인: 문화체육관광부 제공, 국립중앙박물관과 전국 13개 국립지방박물관 행사, JSON/XML, 실시간, 무료, 이용허락 제한 없음. 페이지에서 endpoint/parameter 상세표는 이번에도 확인하지 못함; endpoint와 `serviceKey,numOfRows,pageNo`는 Collector 및 이전 성공 run #11 근거로 유지. 이번 실행 HTTP 응답은 quota 오류 외에 body records 없음.
- CI/Pages 성공 외 코드 변경 없음. API_REGISTRY만 이 감사 기록을 추가하여 main에 기록함. 이 docs-only push는 Collector workflow path trigger를 건드리지 않으므로 추가 API 호출을 유발하지 않음.
- 다음 후보 문서 검토(호출/활성화 금지): 한국문화정보원 외_공연정보(통합), linked data 1437/API 597. 공식 Data.go 설명은 24개 표준 필드, 2024 snapshot 10개 기관, 23개 추가 자원 표준화 진행이라고 설명하지만, 10개라고 명시하면서 열거된 기관은 9개여서 기관 범위 수량 불일치. Culture Portal 상세 API 페이지는 접근 불가; endpoint/parameter/auth/현재 기관 목록은 미확인. 보류 상태 유지.
- 다음 실행: API quota 회복 확인 후 NATIONAL_MUSEUM_API_KEY 대상만 재검증. 200/JSON/resultCode/totalCount/pagination/duplicates/missing fields/sample/regionSource를 확인; 실패하면 429 quota로 분류해 추가 호출 중단. 다른 API는 계속 disabled.
- 사용자 조치: 현재는 키 교체/재발급 불필요. quota 회복 전 추가 실 호출을 피함. 비밀값은 기록하지 않음.


## 실행 감사 — 2026-11-24 04:59 KST

- 현재 main 최신 커밋은 `8b76cc6516739bb153aa60f434f83dbf9794c2ad` (2026-11-23 API quota retry audit)으로 확인. Collector, CI, Pages, pagination probe workflows, `config/apis.json`, `data/programs.json`, 직전 실행 감사 보고서를 재검토. Collector는 수동 실행 및 지정 경로 push trigger; API secret 존재 여부를 확인하고 키 값은 출력하지 않음. Actions workflow dispatch를 직접 호출할 수 있는 연결 도구가 없어서 기존 Collector run #15의 실패 job 재실행을 이용.
- Collector #15 attempt 3 (https://github.com/sharehousegirls/Culture_here/actions/runs/45171773861) 실패 job rerun을 실제 수행. checkout/setup-node/Secret presence check 성공; API request 단계에서 `pageNo=1,numOfRows=1000` HTTP 429. 응답 메시지: `Quota exceeded ! You reach the limit of 1000 requests per 1 days`. 1회 요청 이후 Collector 중단; 데이터 검증, artifact, dataset commit, Pages deploy skip. secret 존재 확인은 성공하나 키 값은 노출하지 않음.
- 실패 분류: 일일 quota 초과 `API_QUOTA_EXCEEDED` 확인. DNS/network, key missing, permission, request parameter, parsing 오류의 증거는 없음. HTTP 500 `From data is null at Assign!`는 quota에 의해 첫 요청이 차단되어 재현/분석 불가. 실 데이터 수 0; JSON record, sample, totalCount, pagination, 지역 분포/누락 필드 검증은 이번 실행에서 수행 불가.
- Collector workflow 및 코드는 변경하지 않음. 429 quota 보호 로직이 추가 호출 없이 중단하는 것을 attempt 3에서 다시 확인. 기존 CI #56 (45210867754) 및 Pages #60 (45210867531)은 최신 commit 8b76cc65 기준 성공; 이번 감사 문서 push 이후 새 CI/Pages 결과는 별도 확인 필요.
- 공식 Data.go API 페이지(https://www.data.go.kr/data/15105222/openapi.do)를 다시 열어 확인: 식별자 15105222, 문화체육관광부 제공, 국립중앙박물관과 13개 국립지방박물관 행사, JSON/XML, 실시간, 무료, 이용허락범위 제한 없음, 2025-08-20 수정. Endpoint `https://api.kcisa.kr/openapi/service/CNV/API_CNV_043/request` 및 `serviceKey,numOfRows,pageNo`는 현재 Collector와 이전 성공 run #11 근거; 공식 페이지에서 상세 endpoint/parameter 표는 이번에도 독립 확인되지 않음.
- 기존 `data/programs.json`은 마지막 성공 Collector #11 snapshot (294,499 fetched/reported, 361 pages, 13,890 unique, 280,606 duplicates removed, 181 duplicate-page fingerprints, 12 published). 현재 지역 경북 2/대구 6/충북 4, missing region 0; fee/image missing 12/12. 주소가 박물관명인 기존 12건은 박물관 소속 지역 fallback; 실제 행사장 지역 분포로 해석하지 않으며 scope=unknown 유지. 이번 실행에서 새 데이터로 갱신하지 않음.
- API_REGISTRY에 이 실행 기록만 추가. 다른 API는 호출/활성화하지 않으며 모두 보류. 성공 통합 전 다음 후보 조사 확장 없음.
- 다음 실행: quota 회복 여부를 낮은 호출량으로 확인하고 HTTP 200/JSON/resultCode/totalCount/pagination, dedupe, missing fields, sample, regionSource를 확인. quota 초과 시 즉시 중단. HTTP 500 Assign-null은 실제 요청이 정상 통과하는 시점에 별도 검증. 사용자 조치: 키 재발급 불필요; quota 회복 전 API 호출을 피하고 대기.


## 실행 감사 — 2026-11-24 12:55 KST

- 최신 main 기준 데이터 커밋 확인: `ec302a21d396c1d02dfcd95e22b2ddf51eeefb43` (Update National Museum API dataset). 저장소, Collector/CI/Pages workflows, `config/apis.json`, `data/programs.json`, 직전 감사 기록을 재확인.
- Museum Collector run #16 (https://github.com/sharehousegirls/Culture_here/actions/runs/45314978770)에서 Secret 존재 확인 성공(값은 노출하지 않음), API Fetch, normalized dataset validation, artifact, data commit까지 성공. 이번 실행은 이 API 하나만 호출; 다른 API는 이 운영에서 테스트/활성화하지 않음.
- 실제 수집: JSON `application/json; charset=utf-8`; HTTP status counts `200: 362`, `504: 4` (총 366 요청 응답); reportedTotalCount=294,499, totalFetched=294,499, paginationComplete=true, pagesFetched=361. API quota 회복은 정상 200 응답으로 확인됨. 별도 추가 호출은 하지 않음.
- 페이지 292, 1,000행 요청이 HTTP 504로 2회 실패; 100행 fallback (pageNo 2912)도 504로 2회 실패; 50행 fallback으로 tail 70페이지/3,499건을 복구. 429 quota, DNS/network, key/auth, request-format, parsing 오류는 이번 성공 실행에서 관찰되지 않음. HTTP 500 `From data is null at Assign!`는 재현되지 않음.
- Dataset validation 성공: 13,890 unique records, 280,606 duplicates removed, 181 duplicate page fingerprints, 12 published programs, 12 unique program/source IDs, missing region=0, totalFetched와 reportedTotalCount 일치. 지역 분포 경북 2/대구 6/충북 4; 12/12 regionSource=`museumAffiliation`, address는 박물관명으로 행사장 위치와 동일하다고 검증되지 않음. 따라서 지역 분포는 기관 소속 fallback이며 행사장 분포로 해석하지 않고 scope=`unknown` 유지.
- 12개 게시 프로그램 누락: description 0, region 0, startDate 0, endDate 0, fee 12, imageUrl 12, detailUrl 0. filterWindow 2026-10-25~2027-05-23; filteredOut missingTitle 3, unknownDate 6,710, outsideWindow 7,168. Sample: 2026 신라학 강좌 / 국립경주박물관 / 경북 / 2026-06-24~2026-11-11.
- Dataset commit: https://github.com/sharehousegirls/Culture_here/commit/ec302a21d396c1d02dfcd95e22b2ddf51eeefb43. Collector job의 fetch/validation/archive/commit은 성공했으나 **같은 Collector workflow 내부 Pages deploy 단계는 실패**: artifact upload는 성공, deploy 단계에서 artifact metadata 조회 오류 및 `No artifacts named "github-pages"` 반환. 최신 dataset은 main에 커밋되어 기존 data는 덮어쓰기 없이 정상 갱신됨.
- 별도 Pages run #69 (https://github.com/sharehousegirls/Culture_here/actions/runs/45315624273)는 성공했지만 head commit `1f41f26`로 dataset commit `ec302a21`보다 이전이므로 최신 dataset 배포를 확인한 것으로 간주하지 않음. 이번 audit-only 문서 commit은 Collector workflow trigger paths에 해당하지 않아 museum API를 재호출하지 않으며, Pages workflow가 최신 main dataset으로 배포되도록 trigger한다. 새 Pages/CI run은 commit 후 확인 예정.
- 공식 Data.go API page https://www.data.go.kr/data/15105222/openapi.do: 문화체육관광부 제공, 국립중앙박물관 및 13개 국립지방박물관 문화행사, JSON/XML, 실시간, 무료. Endpoint 및 `serviceKey,numOfRows,pageNo` 조합은 Collector 설정과 실 성공 응답으로 검증했으나 공식 상세 parameter 표를 독립적으로 확인한 것은 아님.
- 다음: audit-only push 후 CI 및 Pages run 확인. Pages deploy가 성공하면 최신 dataset 배포 확인; 실패하면 workflow artifact metadata 오류를 분리 진단. API quota 회복이 이미 full collector run으로 확인되었으므로 불필요한 실 API 호출은 하지 않음. 다음 API 후보 조사 모듈은 월요일에만 실행.
- 사용자 조치: 현재 없음. 다른 API는 보류/disabled 유지.


## 실행 후속 확인 — 2026-11-24 12:56 KST

- 앞선 감사 commit `b107c80`에 의해 실행된 CI #66 (https://github.com/sharehousegirls/Culture_here/actions/runs/45323165425) 성공: Syntax check 및 Required files 단계 통과.
- Pages #70 (https://github.com/sharehousegirls/Culture_here/actions/runs/45323165462) 성공. Deploy payload의 `pages_build_version`는 `b107c80afddc0000adfff552ce93e707d53ed34e`로 확인. 이 commit의 부모는 최신 데이터 commit `ec302a21d396c1d02dfcd95e22b2ddf51eeefb43`이므로, 최신 museum dataset을 포함한 사이트 배포가 확인됨.
- Collector run #16의 수집/정규화 검증/데이터 artifact/commit은 성공. 해당 collector job은 내장 Pages deploy에서 artifact metadata 조회 실패로 job conclusion이 failure였지만, 별도 Pages workflow #70이 최신 데이터 포함 commit을 성공적으로 배포하여 배포 장애는 복구됨.
- 이 후속 감사 commit은 문서만 변경하며 Collector trigger paths에 포함되지 않음. 다른 API 호출/활성화는 하지 않음. Module B 신규 API 조사는 월요일에만 수행하므로 오늘(화요일)은 생략.
- 사용자 조치: 없음.


## 운영 감사 — 2026-11-25 00:55 KST

- 저장소 최신 상태를 확인: main의 이전 최신 커밋은 `03bd8afa267e4f05a24c65290513ef7ccfcd639f`; 데이터/Collector/CI/Pages/probe workflow와 직전 감사 기록을 검토. 최근 전체 수집은 Collector #16 (2026-11-24)이며 데이터 검증·commit 성공, workflow 내부 Pages deploy 단계 실패. 별도 Pages #71은 최신 데이터 commit을 포함한 버전으로 성공. 이번 run에서 full collector는 실행하지 않아 기존 데이터 변경 없음.
- 안전한 상태 probe를 위해 기존 pagination probe(19 requests)를 `pageNo=1,numOfRows=1`의 단일 요청으로 축소. 코드 commit `28f7e1d9ac20f27356b0f76a23513767a65b0bd0`. API key 및 요청 URL은 출력하지 않음. 한 요청만 수행, 재시도 없음.
- Probe run #4 https://github.com/sharehousegirls/Culture_here/actions/runs/45431698717 성공. HTTP 200, JSON content type, 1 item, response bytes 1860, elapsed 5371ms. API metadata: resultCode=0000, resultMsg=OK, totalCount=294499, pageNo=1, numOfRows=1. Sample: 조이 오브 스트링스 / 국립중앙박물관 / 2017-06-17; eventSite empty. 이 오래된 sample은 API 응답·구조·quota 접근 가능성 확인용이며 최신 행사 데이터의 freshness를 보증하지 않음. quota가 차단된 상태가 아님을 확인했지만 잔여 quota 수량은 미확인. 지역은 sample eventSite가 비어 있어 unknown; 기존 12 records의 지역은 museumAffiliation fallback으로 행사장 실제 지역을 의미하지 않음.
- Probe script `safe(value, limit)`의 현재 length parameter가 실제 truncation에 적용되지 않는 점을 발견. API key replacement는 적용되고 이번 로그에서 키/요청 URL은 노출되지 않았으나, 출력 길이 제한은 다음 코드 개선 대상으로 기록. 현재 probe는 1-request로 유지; 이 수정은 다음 실행에서 CI와 1-request probe로 검증.
- Push-triggered CI #68 (run ID 45431698845) https://github.com/sharehousegirls/Culture_here/actions/runs/45431698845 성공. Pages #72 https://github.com/sharehousegirls/Culture_here/actions/runs/45431698550 성공. Pages deploy는 commit `28f7e1d9` 기준 완료; 기존 dataset은 `03bd8afa` snapshot을 포함하며 최신 API data refresh는 하지 않음.
- API current status/quota: 단일 HTTP 200으로 현재 요청 가능 상태 확인. quota 잔여량을 추정하지 않으며 추가 API 호출 없음. HTTP 500 `From data is null at Assign!`는 이번 probe에서 재현되지 않음.
- Module B: 오늘은 수요일, 신규 API 후보 조사 미실행. 기존 다른 API는 이번 run에서 호출/활성화하지 않음; 모두 보류 유지.
- 사용자 조치: 없음. 정상 상태 및 개선 기록만으로 이메일 발송하지 않음.
- 다음 실행: 최신 main/report를 다시 확인하고 probe 출력 길이 제한을 수정한 뒤 단일 요청만 수행. API 200/JSON/resultCode/item/totalCount 확인; quota error면 즉시 중단. 데이터 refresh는 필요한 경우 별도 승인 없이 full collection을 반복하지 않음.


## 운영 감사 — 2026-11-25 04:59 KST

- main 최신 상태 및 이전 감사/데이터/Collector/CI/Pages/probe workflow를 재확인. 최신 데이터는 Collector #16 성공 기록(294,499/294,499; 361 pages; 13,890 unique; 12 published)이며 이번 run에서는 전체 수집을 하지 않아 기존 데이터 유지.
- Probe #5 (https://github.com/sharehousegirls/Culture_here/actions/runs/45475687312): 1회 제한 요청 성공. HTTP 200, JSON, resultCode=0000/OK, 1 item, totalCount=294,499, pageNo=1, numOfRows=1, response 1,860 bytes, elapsed 5.4s. Sample은 2017-06-17 행사로 최신성 확인 목적이 아닌 연결/응답 검증용. 잔여 quota 수량은 확인 불가. #5는 helper 수정 전 코드였으나 API key와 URL은 로그에 출력되지 않았음.
- Probe 출력의 길이 제한이 실제 적용되지 않는 문제를 발견. Commit 321245947fc64f44a7d621c1092881b7c68b9194에서 helper 분리, 비밀값 마스킹 후 길이 제한, probe/helper syntax checks, 2개 unit test 추가. CI #71은 초기 helper의 whitespace 정규식 오작성으로 2개 테스트 실패; 외부 API/데이터 문제는 아님.
- Commit a57cfb5442e76e50719bda8389bc4ee827ee47c에서 whitespace regex와 테스트 입력 escape를 수정. CI #72 성공(14 tests pass, 0 fail), Pages #76 성공. 
- Commit c03193a20048a455a09ef52a28f04551ac1cbd43에서 probe 입력 길이 상한을 180자 이하로 강제. Probe #6 (https://github.com/sharehousegirls/Culture_here/actions/runs/45475968461) corrected helper로 1회 요청 성공: HTTP 200, JSON, resultCode=0000/OK, item=1, totalCount=294,499, 2.54s. Sample 동일한 오래된 행사, eventSite 비어 있음; 지역은 행사장 미확인으로 unknown. 500 Assign-null 재현되지 않음. 
- CI #73 https://github.com/sharehousegirls/Culture_here/actions/runs/45475968642 성공; Pages #77 https://github.com/sharehousegirls/Culture_here/actions/runs/45475968471 성공. #71 test failure는 #72에서 복구, 최신 commit 기준 CI/Pages 모두 성공.
- API 상태: 단일 제한 probe에서 정상 응답; 현재 quota 차단은 관찰되지 않았으나 잔여 quota 수량은 미확인. full collector 재실행/데이터 갱신은 하지 않음. 
- 기존 API 외 다른 API 호출/활성화 없음. 오늘 수요일이므로 Module B 신규 후보 조사 미실시.
- 사용자 조치: 없음. 이메일 발송하지 않음.
- 다음: 최신 main/report 확인; 단일 요청 probe 유지; quota 오류면 즉시 중단. 실제 데이터 갱신은 필요성과 요청량을 별도로 검토한 뒤 진행.