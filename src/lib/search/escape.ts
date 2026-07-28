/** 문자열 내 모든 공백(앞뒤+중간)을 제거한다. */
export function stripWhitespace(value: string): string {
  return value.replace(/\s+/g, '');
}

/**
 * 검색어 내 모든 공백을 제거해 표기 차이를 흡수한다.
 * 빈/공백 문자열이면 null(검색 미적용 신호).
 * 검색어 쪽 공백만 제거하므로, 대상 컬럼 값 자체에 공백이 섞여 있는 경우
 * (예: "삼성 전자"로 저장된 값을 "삼성전자"로 검색)는 여전히 매칭되지 않는다.
 */
export function normalizeSearchTerm(raw: string): string | null {
  const stripped = stripWhitespace(raw);
  return stripped === '' ? null : stripped;
}

/**
 * LIKE 와일드카드(%, _)와 백슬래시를 이스케이프해 리터럴로 취급되게 한다.
 * 순서 중요: 백슬래시를 먼저 이스케이프해야 %/_ 이스케이프가 이중으로 처리되지 않는다.
 */
export function escapeLikeWildcards(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** `.ilike(col, pattern)`에 바로 넘길 수 있는 부분일치 패턴. */
export function toLikePattern(value: string): string {
  return `%${escapeLikeWildcards(value)}%`;
}

/**
 * PostgREST `.or()` 필터 문자열에 값으로 안전하게 넣을 수 있도록 큰따옴표로 감싼다.
 * `,` `.` `(` `)` 등 PostgREST 예약 문자가 값에 있어도 파싱이 깨지지 않는다.
 * value에는 이미 LIKE 이스케이프가 끝난 패턴(toLikePattern 결과)을 넣는다.
 */
export function toOrFilterValue(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/** 여러 컬럼에 동일 패턴을 ilike로 매칭하는 PostgREST or() 필터 문자열을 만든다. */
export function buildIlikeOrClause(columns: string[], pattern: string): string {
  const safeValue = toOrFilterValue(pattern);
  return columns.map((col) => `${col}.ilike.${safeValue}`).join(',');
}
