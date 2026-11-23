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
