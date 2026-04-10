# 매출 분석 설계 (FR-060, FR-061)

## 개요

전사 섹션의 매출 분석 페이지. 연간 매출 현황과 팀별 매출 분석을 2개 탭으로 제공.
Recharts 기반 차트, 역할별 접근 제한 적용.

## 페이지 구조

### URL
- `/revenue` — 연간 현황 (기본 탭)
- `/revenue?tab=team` — 팀별 분석

### 접근 권한
| 역할 | 접근 | 데이터 범위 |
|------|------|------------|
| staff | 접근 차단 (사이드바 숨김) | - |
| team_lead | 접근 가능 | 소속 팀 매출만 |
| admin | 접근 가능 | 전사 |
| c_level | 접근 가능 | 전사 |

## 탭 1: 연간 현황

### 필터
- **연도 선택**: 드롭다운 (기본: 현재 연도)
- **타입 필터**: 전체 | MSP | 교육 | 개발 (토글 버튼)
- **전년 비교**: 토글 버튼 (데이터 없으면 disabled)

### 차트
- Recharts `BarChart`
- X축: 1~12월
- Y축: 금액
- 타입별 Stacked Bar (전체 선택 시): MSP=#2563eb, 교육=#f59e0b, 개발=#71717a
- 단일 타입 선택 시: 해당 색상 단일 Bar
- 전년 비교 ON: 같은 월에 올해(진한색) + 작년(연한색) 막대 나란히 배치
- 전년 비교 OFF: 올해만 표시
- 호버 시 Tooltip (월, 금액, 전년 대비 증감)

### 분기별 합계 카드
- 4개 분기 + 연간 합계 (파란 강조)
- 각 카드: 라벨 + 금액
- 선택된 타입 필터에 따라 값 변경

### 데이터 소스
```sql
SELECT
  EXTRACT(MONTH FROM c.created_at) as month,
  c.type,
  SUM(c.total_amount) as total
FROM contracts c
WHERE c.deleted_at IS NULL
  AND EXTRACT(YEAR FROM c.created_at) = :year
GROUP BY month, c.type
ORDER BY month
```

## 탭 2: 팀별 분석

### 필터
- **연도 선택**: 드롭다운 (기본: 현재 연도)
- **분기 필터**: 전체 | 1분기 | 2분기 | 3분기 | 4분기

### 본문 (2컬럼)

#### 좌측: 팀별 매출 비교 차트
- Recharts `BarChart` (가로 또는 세로)
- 팀별 막대: MSP팀=#2563eb, 교육팀=#f59e0b, 개발팀=#71717a
- **미배분** 항목: #e4e4e7 (contract_teams에 행이 없는 계약 금액)
- 호버 시 Tooltip (팀명, 금액, 전체 대비 비율)

#### 우측: 팀별 매출 순위 테이블
- 내림차순 정렬
- 순위 번호 (원형 배지, 팀 색상)
- 팀명 + 금액
- 미배분은 마지막에 "-" 순위로 표시

### 데이터 소스
```sql
-- 팀별 배분 매출
SELECT
  ct.team_id,
  t.name as team_name,
  SUM(c.total_amount * ct.percentage / 100) as team_revenue
FROM contract_teams ct
JOIN contracts c ON c.id = ct.contract_id
JOIN teams t ON t.id = ct.team_id
WHERE ct.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND EXTRACT(YEAR FROM c.created_at) = :year
GROUP BY ct.team_id, t.name

-- 미배분 매출
SELECT SUM(c.total_amount) as unallocated
FROM contracts c
WHERE c.deleted_at IS NULL
  AND EXTRACT(YEAR FROM c.created_at) = :year
  AND NOT EXISTS (
    SELECT 1 FROM contract_teams ct
    WHERE ct.contract_id = c.id AND ct.deleted_at IS NULL
  )
```

team_lead는 소속 팀 결과만 표시. 미배분은 admin/c_level만 볼 수 있음.

## 기술 스택

| 항목 | 선택 |
|------|------|
| 차트 | Recharts (v3.8.1, 이미 설치) |
| 데이터 | Supabase RPC 또는 클라이언트 쿼리 |
| 상태 관리 | React Query (useQuery) |
| 필터 상태 | URL searchParams (연도, 탭, 타입, 분기) |
| 권한 체크 | useCurrentUser → role 기반 분기 |

## 컴포넌트 구조

```
/revenue/page.tsx
├── RevenuePageInner (Suspense 래퍼)
│   ├── 타이틀 + 탭 (연간 현황 / 팀별 분석)
│   ├── [연간 현황]
│   │   ├── FilterRow (연도, 타입, 전년비교)
│   │   ├── MonthlyRevenueChart (Recharts BarChart)
│   │   └── QuarterlySummary (4분기 + 연간 합계 카드)
│   └── [팀별 분석]
│       ├── FilterRow (연도, 분기)
│       ├── TeamRevenueChart (Recharts BarChart)
│       └── TeamRankingTable (순위 테이블)
└── hooks/
    ├── use-monthly-revenue.ts (연간 월별 집계)
    └── use-team-revenue.ts (팀별 집계 + 미배분)
```

## 색상 체계

| 대상 | 색상 |
|------|------|
| MSP | #2563eb (blue-600) |
| 교육 | #f59e0b (amber-500) |
| 개발 | #71717a (zinc-500) |
| 미배분 | #e4e4e7 (zinc-200) |
| 전년 막대 | 각 색상의 연한 버전 (opacity 40%) |

## 확인 필요 사항 (진성님)

1. **매출 인식 기준** — 계약 생성일 vs 단계 도달일 vs 별도 필드 (현재: 생성일로 임시 적용)
2. **MSP MRR 월별 분할** — MSP 계약을 MRR 기준으로 월별 분할 집계할지
3. **교육 매출 시점** — 운영 완료 시점 vs 계약 시점
4. **통합 등급 산정 기준** — 기존 이슈와 동일

## pen 디자인 참조

- `Screen/Revenue` (ID: 8Ebtq) — 연간 현황
- `Screen/RevenueByTeam` (ID: hLdE4) — 팀별 분석
