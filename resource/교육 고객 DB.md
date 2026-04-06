# Database Schema

NXT TT Command Center의 Supabase 데이터베이스 스키마 문서.

---

## 테이블 관계도

```
┌──────────────────────────────────────────────────────────────┐
│                    고객/계약 영역                               │
│                                                              │
│  client_info ──M:N──▶ client_contract ──N:1──▶ contracts     │
│  (고객사)            (브릿지)                    (계약 마스터)  │
│                                                 │            │
│                                                 1:N          │
│                                                 ▼            │
│                                              operations      │
│                                              (교육운영)       │
└──────────────────────────────────────────────────────────────┘
                                                  │
                          ┌───────────────────────┼───────────────────────┐
                          │                       │                       │
                          ▼                       ▼                       ▼
                ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
                │ 운영 부속 테이블    │  │  인원 관련         │  │  성과/피드백       │
                │                  │  │                  │  │                  │
                │ • education_types│  │ • leads          │  │ • survey         │
                │ • curriculum     │  │ • instructors    │  │   └▶ feedback    │
                │ • platforms      │  │ • enrollment     │  │ • follow_up      │
                │                  │  │   └▶ attendance  │  │                  │
                │                  │  │   └▶ deliverables│  │                  │
                │                  │  │   └▶ reviews     │  │                  │
                │                  │  │   └▶ certs       │  │                  │
                └──────────────────┘  └──────────────────┘  └──────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    마스터/독립 테이블                      │
│                                                         │
│  • lead_registry      (리드 마스터)                       │
│  • instructors        (강사 마스터)                       │
│  • platforms          (플랫폼 마스터)                     │
│  • users              (수강생 마스터)                     │
│  • aws_certifications (AWS 자격증 원본)                   │
│  • items_inventory    (교육 아이템 목록) ← 독립, FK 없음   │
│  • system_users       (시스템 로그인 계정) ← auth.users    │
│  • customer_operations(고객-운영 매핑) ← auth.users       │
│  • client_contract   (고객-계약 브릿지)                    │
└─────────────────────────────────────────────────────────┘
```

---

## 테이블 요약

| # | 테이블 | 역할 | FK 관계 |
|---|--------|------|---------|
| **고객/계약** |
| 1 | `client_info` | 고객사 마스터 | - |
| 2 | `contracts` | 계약 마스터 | - |
| 3 | `client_contract` | 고객-계약 브릿지 | → contracts, client_info |
| **운영 중심** |
| 4 | `operations` | 교육 운영 (핵심) | → contracts |
| 5 | `operation_education_types` | 교육 유형 (AI/CLD/CRT 등) | → operations |
| 6 | `operation_curriculum` | 일자별 커리큘럼 | → operations |
| 7 | `operation_platforms` | 사용 플랫폼 연결 | → operations, platforms |
| **인원** |
| 8 | `lead_registry` | 리드 마스터 | - |
| 9 | `operation_leads` | 운영별 리드 배정 | → operations, lead_registry |
| 10 | `instructors` | 강사 마스터 | - |
| 11 | `operation_instructors` | 운영별 강사 배정 (날짜별) | → operations, instructors |
| **수강생** |
| 12 | `users` | 수강생 마스터 | - |
| 13 | `student_enrollment` | 수강 등록 | → operations, users |
| 14 | `daily_attendance` | 일별 출석 | → student_enrollment |
| 15 | `deliverables` | 산출물 | → student_enrollment |
| 16 | `reviews` | 후기 | → student_enrollment |
| **자격증** |
| 17 | `aws_certifications` | AWS 자격증 원본 데이터 | - |
| 18 | `student_certifications` | 수강생-자격증 매핑 | → student_enrollment, aws_certifications |
| **성과/피드백** |
| 19 | `survey` | 만족도 조사 | → operations |
| 20 | `survey_feedback` | 만족도 피드백 요약 | → survey |
| 21 | `follow_up_actions` | 후속 조치 | → operations, contracts |
| **시스템** |
| 22 | `system_users` | 시스템 로그인 계정 | → auth.users |
| 23 | `customer_operations` | 고객 계정-운영 매핑 | → auth.users |
| **독립** |
| 24 | `platforms` | 플랫폼 마스터 | - |
| 25 | `items_inventory` | 교육 아이템 목록 | FK 없음 |

---

## 상세 스키마

### 1. client_info (고객사)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **client_id** | text PK | O | 고객 ID (C001~) |
| client_name | text | O | 고객사명 |
| client_type | text | - | univ/govt/corp/asso/campustown/etc |
| tier | varchar(1) | - | 고객 등급 A/B/C/D/F (아래 Tier 기준 참고) |
| location | text | - | 권역 (수도권_서울특별시 등) |
| created_at, updated_at | timestamp | - | |

#### Tier 산정 기준

**점수 = 계약 횟수 + 넥클 제공 플랫폼 수** (단순 합산)

- 계약 횟수: `client_contract` 브릿지 테이블에서 해당 클라이언트의 계약 수
- 넥클 제공 플랫폼 수: `operation_platforms.provided_by_nxtcloud = true`인 고유 플랫폼 수

| Tier | 조건 |
|------|------|
| **A** | MSP 사업 진행 클라이언트 (점수 무관) 또는 합산 7점 이상 |
| **B** | 합산 5~6점 |
| **C** | 합산 3~4점 |
| **D** | 합산 2점 |
| **F** | 합산 1점 |

> MSP(Managed Service Provider) 사업을 진행한 클라이언트는 점수와 관계없이 Tier A로 분류한다. 현재 `is_msp` 컬럼은 별도로 두지 않으며, MSP 해당 시 수동으로 tier를 A로 설정한다.

---

### 2. contracts (계약 마스터)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **contract_id** | text PK | O | 계약 ID (CT2026001~) |
| project_name | text | O | 계약/프로젝트명 |
| created_at, updated_at | timestamp | - | |

---

### 3. client_contract (고객-계약 브릿지)

고객과 계약의 다대다 관계를 연결하는 브릿지 테이블. 하나의 계약에 여러 고객사가 참여할 수 있다.

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **contract_id** | text PK, FK | O | → contracts |
| **client_id** | text PK, FK | O | → client_info |

> 복합 PK (contract_id, client_id). 단일 클라이언트 계약은 1행, 복수 클라이언트 계약(예: KWU+GWNU)은 클라이언트 수만큼 행이 생긴다.

---

### 4. operations (교육 운영)

핵심 테이블. 모든 운영 부속 테이블이 이 테이블을 참조한다.

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **ops_id** | text PK | O | 운영 ID (OPS001~) |
| contract_id | text FK | O | → contracts |
| ops_name | text | O | 운영명 |
| start_date | date | O | 시작일 |
| end_date | date | O | 종료일 |
| date_list | text | O | 교육 일자 목록 (세미콜론 구분) |
| total_hours | integer | O | 총 교육시간 |
| contract_count | integer | - | 계약 인원 |
| applicant_count | integer | O | 신청 인원 |
| actual_count | integer | O | 실제 참석 인원 |
| attendance_rate | numeric | - | 전체 출석률 (아래 산정 공식 참고) |
| education_location | text | O | 교육 장소 |
| target_organization | text | - | 교육 대상 기관 |
| included_items | text | - | 포함 항목 |
| notes_leadership | text | - | 운영 메모 |
| dashboard_tabs | text | - | 대시보드 탭 제한 (NULL=전체) |
| created_at, updated_at | timestamp | - | |

#### 출석률(attendance_rate) 산정 공식

**전체 출석률 = 출석 횟수 / (참석 인원 × 교육 일수) × 100**

- 분자: `daily_attendance`에서 `status = '출석'`인 레코드 수
- 분모: `daily_attendance` 전체 레코드 수
- 일별 출석률은 별도 저장하지 않으며, `daily_attendance`에서 쿼리로 산출

---

### 5. operation_education_types (교육 유형)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **type_id** | text PK | O | TYPE001~ (순번 자동 증가) |
| ops_id | text FK | O | → operations |
| education_type | text | O | AI/CLD/CRT/XTH/ETC |

유형 설명:
- `AI`: AI 관련 교육
- `CLD`: 클라우드 교육
- `CRT`: 자격증 과정
- `XTH`: 해커톤/경진대회
- `ETC`: 기타 (본사투어 등)

---

### 6. operation_curriculum (커리큘럼)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **id** | uuid PK | O | auto |
| ops_id | text FK | O | → operations |
| day_number | integer | O | 일차 |
| schedule_date | date | - | 날짜 |
| topic | text | O | 주제 |
| description | text | - | 상세 내용 (아래 포맷 참고) |
| hours | numeric | - | 시간 |
| created_at, updated_at | timestamptz | - | |

#### description 작성 포맷

**Pattern A — 단일 세션 (하루에 강사 1명)**

```
• 세부내용1
• 세부내용2
• 세부내용3
```

**Pattern B — 복수 세션 (하루에 강사 2명 이상)**

```
• 주제1 [강사명 / 시간]
  - 세부내용1
  - 세부내용2
• 주제2 [강사명 / 시간]
  - 세부내용1
```

> topic에는 그날의 대표 주제를, description에는 세부 내용을 넣는다. 복수 세션일 때만 강사/시간 메타데이터를 대괄호로 표기한다.

---

### 7. platforms (플랫폼 마스터)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **platform_id** | text PK | O | SLACK, AWS_CON, CANVA 등 |
| platform_name | text | O | 표시명 |
| platform_type | text | - | communication/learning/presentation/ai_tool |
| description | text | - | 설명 |
| created_at, updated_at | timestamp | - | |

---

### 8. operation_platforms (운영-플랫폼 연결)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **ops_platform_id** | text PK | O | `OP-{ops_id}-{순번}` (예: OP-OPS001-01, OP-2502_KNU_CRT_01-01) |
| ops_id | text FK | O | → operations |
| platform_id | text FK | O | → platforms |
| workspace_url | text | - | URL |
| account_info | text | - | 계정 정보 |
| access_period_start | date | - | 접근 시작일 |
| access_period_end | date | - | 접근 종료일 |
| provided_by_nxtcloud | boolean | - | 넥클 제공 여부 (기본 true). tier 산정에 사용 |
| notes | text | - | 비고 |
| created_at, updated_at | timestamp | - | |

> 같은 운영에서 동일 플랫폼을 여러 계정으로 사용할 수 있다 (예: AWS Console 2개).
>
> `account_info` 입력 기준: CertiNavigator의 경우 개발팀에서 부여한 그룹명을 기입한다.

---

### 9. lead_registry (조직 마스터)

교육/운영 주체가 될 수 있는 조직 목록.

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **lead_id** | text PK | O | nxtcloud, nxtcloud_tt, aws_tnc 등 |
| organization | text | O | 상위 조직명 (넥클, AWS, 스마트소셜 등) |
| name | text | O | 표시명 (넥클 교육팀, AWS T&C 등) |
| is_active | boolean | - | 활성 여부 (기본 true) |
| created_at | timestamptz | - | |

현재 등록 조직:
- `nxtcloud`: 넥클
- `nxtcloud_tt`: 넥클 교육팀
- `aws_tnc`: AWS T&C
- `aws_proserve`: AWS ProServe
- `smartsocial`: 스마트소셜
- `purpleai`: 퍼플AI

---

### 10. operation_leads (운영-조직 배정)

교육/운영의 주체 조직을 배정한다.

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **id** | bigint PK | O | auto |
| ops_id | text FK | O | → operations |
| lead_id | text FK | O | → lead_registry (조직 단위) |
| lead_type | text | O | education/operations |
| created_at | timestamptz | - | |

> 기존 `operations.led_by_training_team`, `operations.operations_manager` 컬럼은 삭제됨. 운영 주체 정보는 이 테이블에서 관리한다.

---

### 11. instructors (강사 마스터)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **instructor_id** | text PK | O | INS001~ |
| name | text | O | 이름 |
| email | text | - | 이메일 |
| phone | text | - | 전화번호 |
| organization | text | - | 소속 회사 (NXTCLOUD/Partner/Purple AI/AWS) |
| team | text | - | 소속 팀 (Technical Training/Partnerships 등). C-level은 NULL |
| position | text | - | 직책 (Team Lead/Technical Trainer/CTO 등) |
| status | text | - | 활동/휴직/퇴사 (기본: 활동) |
| created_at, updated_at | timestamp | - | |

---

### 12. operation_instructors (운영-강사 배정)

날짜별로 별도 행으로 입력한다.

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **assignment_id** | text PK | O | `OI-{ops_id}-{순번}` (예: OI-OPS001-01, OI-2502_KNU_CRT_01-01) |
| ops_id | text FK | O | → operations |
| instructor_id | text FK | O | → instructors |
| role | text | O | 주강사/보조강사/멘토/게스트 |
| assigned_date | date | O | 배정일 |
| hours_allocated | numeric | - | 근무시간 |
| hourly_rate | numeric | - | 시급 |
| total_payment | numeric | - | 총 지급액 |
| payment_status | text | - | 미정/예정/완료/보류 (기본: 미정) |
| notes | text | - | 비고 |
| created_at, updated_at | timestamp | - | |

---

### 13. users (수강생 마스터)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **user_id** | text PK | O | UUID |
| name | text | O | 이름 |
| email | text | - | 이메일 |
| phone | text | - | 전화번호 |
| affiliation | text | - | 소속 |
| created_at, updated_at | timestamp | - | |

---

### 14. student_enrollment (수강 등록)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **enrollment_id** | text PK | O | `ENR-{ops_id}-{순번}` (예: ENR-OPS001-01, ENR-2502_KNU_CRT_01-01) |
| ops_id | text FK | O | → operations |
| user_id | text FK | O | → users |
| status | text | - | 신청/참석/불참/취소 (기본: 신청) |
| affiliation_at_enrollment | text | - | 등록 시점 소속 |
| created_at, updated_at | timestamp | - | |

---

### 15. daily_attendance (일별 출석)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **attendance_id** | text PK | O | UUID |
| enrollment_id | text FK | O | → student_enrollment |
| attendance_date | date | O | 출석일 |
| status | text | - | 출석/지각/결석/공결 (기본: 결석) |
| remarks | text | - | 비고 |
| created_at, updated_at | timestamp | - | |

---

### 16. deliverables (산출물)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **deliverable_id** | text PK | O | UUID |
| enrollment_id | text FK | O | → student_enrollment |
| deliverable_date | date | O | 제출일 |
| title | text | - | 제목 |
| submission_url | text | - | 제출 URL |
| submission_file | text | - | 파일 |
| status | text | O | 완료/미완료 (기본: 미완료) |
| updated_by | text | - | 수정자 |
| created_at, updated_at | timestamp | - | |

---

### 17. reviews (후기)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **review_id** | text PK | O | UUID |
| enrollment_id | text FK | O | → student_enrollment |
| review_date | date | - | 작성일 |
| review_url | text | O | 후기 URL |
| platform | text | - | 플랫폼 |
| notes | text | - | 비고 |
| created_at, updated_at | timestamp | - | |

---

### 18. aws_certifications (AWS 자격증 원본)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **id** | bigint PK | O | auto |
| certi_type | text | - | 자격증 타입 |
| certi_code | text | O | 코드 |
| certi_level | text | O | 레벨 |
| submitted_date | date | O | 취득일 |
| name | text | O | 이름 |
| email | text | O | 이메일 |
| created_at | timestamptz | - | |

---

### 19. student_certifications (수강생-자격증 매핑)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **id** | bigint PK | O | auto |
| enrollment_id | text FK | O | → student_enrollment |
| aws_cert_id | bigint FK | O | → aws_certifications |
| match_method | text | O | email/name/manual (기본: manual) |
| match_confidence | text | O | confirmed/probable (기본: confirmed) |
| notes | text | - | 비고 |
| created_at, updated_at | timestamptz | - | |

---

### 20. survey (만족도 조사)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **survey_id** | text PK | O | SRV001~ |
| ops_id | text FK | O | → operations |
| resp_count | integer | O | 응답자 수 |
| items_count | integer | O | 평가 항목 수 |
| total_score | numeric | O | 총점 |
| avg_score | numeric | O | 평균 (total_score / resp_count / items_count) |
| survey_raw_data | text | O | 원본 JSON |
| created_at, updated_at | timestamp | - | |

---

### 21. survey_feedback (만족도 피드백 요약)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **id** | uuid PK | O | auto |
| survey_id | text FK | O | → survey |
| feedback_type | text | O | good/bad |
| content | text | O | 요약 내용 |
| display_order | integer | - | 표시 순서 |
| created_at | timestamptz | - | |

---

### 22. follow_up_actions (후속 조치)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **action_id** | text PK | O | |
| ops_id | text FK | O | → operations |
| action_type | text | - | 후속교육/플랫폼계약/추가서비스/사업논의/컨설팅/기타 |
| status | text | - | 논의중/제안/진행중/완료/보류/취소 (기본: 논의중) |
| description | text | - | 설명 |
| related_ops_id | text FK | - | → operations (관련 운영) |
| related_contract_id | text FK | - | → contracts (관련 계약) |
| expected_value | numeric | - | 예상 금액 |
| notes | text | - | 비고 |
| created_at, updated_at | timestamp | - | |

---

### 23. items_inventory (교육 아이템 목록)

FK 관계 없는 독립 테이블.

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **item_id** | text PK | O | |
| item_name | text | O | 아이템명 |
| manager | text | - | 담당자 |
| dev_status | text | - | Done/진행중/기획중 |
| standard_level | integer | - | 난이도 (1~3) |
| practice_ratio | integer | - | 실습 비율 (0~100) |
| created_at, updated_at | timestamp | - | |

---

### 24. system_users (시스템 계정)

대시보드 로그인 계정. Supabase auth.users와 연결.

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **id** | uuid PK | O | → auth.users |
| email | text UNIQUE | O | 이메일 |
| full_name | text | O | 이름 |
| user_type | text | O | admin/employee/customer |
| organization | text | - | 소속 회사 (NXTCLOUD/AWS 등). customer는 기관명 |
| team | text | - | 소속 팀 (Technical Training/Partnerships 등). C-level은 NULL |
| position | text | - | 직책 (Team Lead/Technical Trainer/CTO 등) |
| is_active | boolean | - | 활성 여부 (기본 true) |
| created_at, updated_at | timestamptz | - | |

---

### 25. customer_operations (고객-운영 매핑)

고객 계정이 접근할 수 있는 운영 목록.

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| **id** | uuid PK | O | auto |
| user_id | uuid FK | O | → auth.users |
| ops_id | text | O | 운영 ID |
| assigned_by | uuid FK | - | → auth.users (배정자) |
| assigned_at | timestamptz | - | |

---

## PK 규칙

| # | 테이블 | PK | 규칙 | 예시 |
|---|--------|----|------|------|
| 1 | client_info | client_id | `C{순번}` | C001 |
| 2 | contracts | contract_id | `CT{년도}{순번}` | CT2026001 |
| 3 | client_contract | (contract_id, client_id) | 복합 PK | |
| 4 | operations | ops_id | `OPS{순번}` | OPS001 |
| 5 | operation_education_types | type_id | `TYPE{순번}` | TYPE001 |
| 6 | operation_curriculum | id | UUID (auto) | |
| 7 | platforms | platform_id | 영문 대문자 식별자 | SLACK, AWS_CON |
| 8 | operation_platforms | ops_platform_id | `OP-{ops_id}-{순번}` | OP-OPS001-01 |
| 9 | lead_registry | lead_id | snake_case 식별자 | nxtcloud, aws_tnc |
| 10 | operation_leads | id | bigint (auto) | |
| 11 | instructors | instructor_id | `INS{순번}` | INS001 |
| 12 | operation_instructors | assignment_id | `OI-{ops_id}-{순번}` | OI-OPS001-01 |
| 13 | users | user_id | UUID | |
| 14 | student_enrollment | enrollment_id | `ENR-{ops_id}-{순번}` | ENR-OPS001-01 |
| 15 | daily_attendance | attendance_id | UUID | |
| 16 | deliverables | deliverable_id | UUID | |
| 17 | reviews | review_id | UUID | |
| 18 | aws_certifications | id | bigint (auto) | |
| 19 | student_certifications | id | bigint (auto) | |
| 20 | survey | survey_id | `SRV{순번}` | SRV001 |
| 21 | survey_feedback | id | UUID (auto) | |
| 22 | follow_up_actions | action_id | `ACT{순번}` | ACT001 |
| 23 | items_inventory | item_id | (미정) | |
| 24 | system_users | id | UUID (auth.users 연동) | |
| 25 | customer_operations | id | UUID (auto) | |

---

## 헷갈리기 쉬운 포인트

| 구분 | 설명 |
|------|------|
| `lead_registry` | 조직 마스터. 교육/운영 주체가 될 수 있는 조직 목록 |
| `operation_leads` | 운영별 교육/운영 주체 조직 배정. lead_registry FK. 프론트 헤더에 표시 |
| `instructors` | 강사 마스터 (개인 단위). 유일한 인원 마스터 테이블 |
| `operation_instructors` | 강사 배정 (개인+날짜+급여). 누가 언제 가르쳤고 얼마 받았는지 |
| `system_users` vs `users` | 시스템 로그인 계정 vs 수강생 마스터. 별도 테이블 |
| `client_info.location` vs `operations.education_location` | 고객사 권역 vs 실제 교육 장소 |
| `contracts` vs `client_contract` | 계약 마스터(project_name 등) vs 고객-계약 M:N 브릿지. operations는 contracts를 참조 |
| `customer_operations` | 대시보드 접근 제어(system_users↔operations). 고객-계약 관계와 무관 |
