/** union으로 모은 최종 매칭 id 상한. 초과 시 잘라내고 안내 배너 노출. */
export const SEARCH_FINAL_ID_CAP = 500;

/** union 소스별(고객명·연락처명·AWS 등 각 쿼리) 중간 수집 상한. 배너 없이 조용히 캡. */
export const SEARCH_SOURCE_ID_CAP = 1000;
