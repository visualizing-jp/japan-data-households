/**
 * 家族類型のヘルパ。
 */

import type { DictEntry } from "./cube.ts";

export const TOTAL_TYPE = "total";

/** 総数を除いた選択可能な類型（表の並びのまま）。 */
export function listTypes(items: DictEntry[]): DictEntry[] {
  return items.filter((d) => d.code !== TOTAL_TYPE);
}

/** ランキング用。総数以外。 */
export function rankTypes(items: DictEntry[]): DictEntry[] {
  return listTypes(items);
}
