export interface UnionIdsResult {
  ids: string[];
  truncated: boolean;
}

/** 여러 소스의 id 배열을 합집합(중복 제거)한 뒤 상한을 적용한다. 잘리는 항목은 비결정적(Set 순서 기반). */
export function computeUnionIds(idLists: string[][], cap: number): UnionIdsResult {
  const set = new Set<string>();
  for (const list of idLists) {
    for (const id of list) set.add(id);
  }
  const all = Array.from(set);
  if (all.length > cap) {
    return { ids: all.slice(0, cap), truncated: true };
  }
  return { ids: all, truncated: false };
}
