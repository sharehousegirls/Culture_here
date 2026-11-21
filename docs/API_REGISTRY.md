# Culture Here API 통합 관리

## 관리 원칙
- API별로 하나의 등록 항목만 유지한다. 지역별로 API 또는 키를 중복 등록하지 않는다.
- 지역은 API 관리 분류가 아니라 조회 파라미터, 데이터 속성, 서비스 필터로 관리한다.
- 동일 API/키가 지역별 기록에 반복되면 하나로 통합하고, 지역별 테스트 이력만 별도 기록한다.
- 키 문자열은 Git에 커밋하지 않는다. 실제 키는 GitHub Actions Secrets 또는 로컬 `.env`에 보관한다.
- API의 전국 범위 여부는 문서만으로 단정하지 말고, 실제 응답 레코드의 지역을 확인해 판정한다.

## 등록된 후보/기존 API
| API ID | API명 | 상태 | 범위 | Secret 이름 |
|---|---|---|---|---|
| culture-portal | 문화포털 문화정보 조회 | 신청/승인 상태 재확인 | unknown | CULTURE_PORTAL_API_KEY |
| lifelong-learning-standard | 전국 평생학습강좌 표준데이터 | 미신청 | unknown | LIFELONG_LEARNING_API_KEY |
| ministry-affiliated-education | 문화부 소속 및 산하기관 교육정보 API | 키 발급 기록, 검증 필요 | unknown | MINISTRY_EDUCATION_API_KEY |
| national-museum-events | 국립박물관 문화행사 통합정보 API | 미신청 | unknown | NATIONAL_MUSEUM_EVENTS_API_KEY |
| national-library-recruitment | 국립어린이청소년도서관 공개모집 API | 키 발급 기록, 검증 필요 | unknown | NATIONAL_LIBRARY_RECRUITMENT_API_KEY |

## API 키 확인 상태
- 채팅/스크린샷에 전달된 키 값은 공개 저장소에 기록하지 않는다.
- 키 중복 여부는 발급기관/서비스 기준으로 확인한다. 문자열이 동일한 키가 여러 API 항목에 나타나면 해당 발급기관에서 실제 사용 범위를 확인한다.
- GitHub Secrets의 값은 등록 후 조회할 수 없으므로, 신규 등록/교체 시 사용자 측에서 값을 입력해야 한다.
- 현재 GitHub 연동 도구는 파일 등록/수정은 가능하지만 Repository Secrets 값을 직접 생성하거나 입력하는 기능은 제공하지 않는다.

## 지역 범위 검증 기록 템플릿
| 날짜 | API ID | 요청 지역/조건 | 반환 데이터 지역 | 판정 | 비고 |
|---|---|---|---|---|
| 미실시 | 미정 | 미정 | 미정 | 실제 응답 검증 전 |

## 운영
API metadata는 `config/apis.json`에서 관리한다. Collector와 UI는 이 등록부를 기준으로 API별 상태와 설정을 읽도록 확장한다.
