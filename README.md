# Culture Here — 전국 문화·교육·체험 프로그램 탐색 서비스

전국의 문화·교육·체험 프로그램을 통합 검색하고, 실제 데이터가 확보된 지역부터 정보를 제공하는 웹서비스입니다.

## 현재 서비스

- 키워드 검색 및 프로그램 상세 보기
- 분야, 대상, 비용, 시·도, 시·군·구 필터
- 공공 API 원본 상세 링크
- GitHub Pages 정적 배포
- `data/programs.json`을 읽어 실데이터 표시

현재 실데이터는 **국립중앙박물관 및 국립지방박물관 문화행사 API**에서 수집한 프로그램입니다. 현재 조회 기간의 데이터는 12건이며, 지역 분포는 경북 2건, 대구 6건, 충북 4건입니다. 이 결과는 해당 기간에 확보된 데이터 분포일 뿐, API 또는 서비스가 전국의 모든 프로그램을 제공한다는 의미는 아닙니다.

## 첫 번째 API: 국립지방박물관 문화행사 통합정보

- API ID: `national-museum-events`
- 공공데이터포털 ID: `15105222`
- 제공기관: 문화체육관광부
- endpoint: `https://api.kcisa.kr/openapi/service/CNV/API_CNV_043/request`
- 응답: JSON (collector에서 JSON 우선 요청)
- 수집 인증: GitHub Actions Secret `NATIONAL_MUSEUM_API_KEY`
- 수집 워크플로: `.github/workflows/collect-national-museum.yml`
- 상태: 실 호출·전체 페이지 수집·데이터 검증·저장·GitHub Pages 배포 확인

### 최근 실측 (2026-11-23)

| 항목 | 결과 |
|---|---:|
| API reported totalCount | 294,499 |
| 수집 건수 | 294,499 |
| 페이지 | 361 |
| 고유 원본 레코드 | 13,890 |
| 중복 제거 | 280,606 (95.28%) |
| 반복 페이지 fingerprint | 181 |
| 현재 기간 필터 결과 | 12 |
| 필터 기간 | 2026-10-24 ~ 2027-05-22 |
| 지역 분포 | 경북 2, 대구 6, 충북 4 |
| 지역 누락 | 0 |

대용량 페이지 수집 중 HTTP 504가 발생한 구간은 1,000건과 100건 요청이 실패했으며, 50건 단위 fallback 70페이지/3,499건으로 복구했습니다. 최종 API 수신 건수와 reported totalCount가 일치했고 paginationComplete가 true로 검증됐습니다.

현재 기간 필터 결과 12건의 비용 및 이미지 필드는 모두 비어 있습니다. 원본에서 확인되지 않는 비용, 대상, 이미지, 지역 정보는 임의로 만들어 넣지 않습니다. 조회 범위는 현재 프로그램 12건 및 3개 지역만으로 확정하지 않아 `unknown`으로 유지합니다.

## API 수집·통합 원칙

- API마다 Collector/Adapter를 하나씩 검증하고 통합합니다.
- API 관리와 인증키를 지역별로 중복하지 않습니다.
- 조회 범위(`nationwide`, `region-required`, `unknown`)는 공식 문서와 실 응답으로 판단합니다.
- 전국 조회가 가능한 API는 지역별 반복 호출 없이 페이지 단위로 수집합니다.
- 지역별 요청이 필수인 경우에만 단일 Collector에서 지역을 반복 요청합니다.
- 데이터 범위가 불명확하면 지역을 추정하지 않고 `지역미확인`으로 처리합니다.
- API 응답 건수, 페이지네이션, 중복, 필드 누락, 지역 분포를 검증한 뒤 기존 데이터 교체를 허용합니다.
- 수집·검증 실패 시 기존 정상 데이터 파일을 덮어쓰지 않습니다.

## API 상태 관리

API 목록과 상태는 `config/apis.json`, 상세 기록은 `docs/API_REGISTRY.md`에서 관리합니다.

- `enabled: true`: 실제 검증 및 통합이 진행된 API
- `enabled: false`: 신청 대기, 미신청, 문서 검토 후보 또는 보류 API
- 다른 API는 사용자의 별도 승인과 개별 검증 전까지 호출하지 않습니다.

## 다음 후보 조사

다음 문서 검토 후보는 **한국문화정보원 외_공연정보(통합)** (문화포털 API ID 597, 공공데이터 연계자료 ID 1437)입니다. 공식 연계자료에는 24개 표준 메타데이터와 2024년 기준 10개 기관 데이터가 기술되어 있습니다. 현재 endpoint, 상세 요청 파라미터, 인증·권한 및 이용 조건은 공식 API 상세 문서에서 추가 확인해야 하므로 아직 호출하거나 활성화하지 않았습니다.

## GitHub Actions 및 배포

- CI: `.github/workflows/ci.yml`
- 국립박물관 API Collector: `.github/workflows/collect-national-museum.yml`
- 페이지 배포: `.github/workflows/pages.yml`

Collector workflow는 수동 실행 및 지정 경로의 변경으로 실행됩니다. 현재 자동화 환경에서 Actions workflow dispatch API를 직접 호출할 수 없으므로, 정기 확인 실행과 별개로 GitHub Actions 수집 workflow의 실행 권한/trigger 지원을 확인해야 합니다.

## 로컬 확인

`index.html`을 브라우저에서 열거나 GitHub Pages 사이트를 방문하세요. 웹 UI는 `./data/programs.json`을 fetch합니다. API 키는 브라우저에 노출하지 않고 GitHub Actions Secrets에 보관합니다.

## 보안

- API 키, 비밀번호, 개인정보 및 `.env`를 공개 저장소에 커밋하지 않습니다.
- 키는 GitHub Actions Secrets 또는 로컬 환경변수로 관리합니다.
- Collector 로그에 인증키와 전체 요청 URL을 노출하지 않습니다.
- 공개 API 데이터는 원본 기관의 정확성·최신성에 한계가 있을 수 있으므로 상세 정보 및 신청 여부는 원본 기관에서 확인하도록 안내합니다.
