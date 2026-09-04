/**
 * 取得済みの生データを、軸を「名前」で引ける形にして読み込む。
 *
 * e-Stat は同じ内容の表でも cat01 / cat02 … の割り当てが揃っていない。
 * 実例として人口推計の都道府県表は、`0003459027` が cat02=年齢・cat03=人口、
 * `0004021109` が cat02=人口・cat03=年齢だった。軸 id を決め打ちすると静かに壊れる。
 * ここでは常に軸名で解決し、曖昧なら例外にする。
 */

import { resolve } from "node:path";
import { readJsonGz } from "../cache.ts";
import { buildAxes, parseCells, type Axis, type Cell } from "../estat/parse.ts";
import type { EstatClass, EstatClassObj, EstatNote, EstatValue } from "../estat/types.ts";

const RAW_DIR = resolve(import.meta.dirname, "../../../data/raw");

interface RawCache {
  values: EstatValue[];
  classes: EstatClassObj[];
  notes: EstatNote[];
  totalNumber: number;
}

export class Table {
  readonly key: string;
  readonly cells: Cell[];
  /** 軸 id → 軸。id は "tab" / "cat01" / "area" / "time" など。 */
  readonly axes: Map<string, Axis>;
  /** 全軸のコードを結合したキー → 値。欠測は null で入る。 */
  private readonly index: Map<string, number | null>;
  /** index のキーを組み立てるときの軸 id の並び。 */
  private readonly order: string[];

  constructor(key: string, raw: RawCache) {
    this.key = key;
    this.axes = buildAxes(raw.classes);
    this.cells = parseCells(raw.values, raw.notes).cells;
    this.order = [...this.axes.keys()].sort();
    this.index = new Map();
    for (const cell of this.cells) {
      this.index.set(this.order.map((id) => cell.codes[id] ?? "").join("|"), cell.value);
    }
  }

  /**
   * 軸名の部分一致で軸を1本引く。
   * 「年齢(5歳階級)」「年齢5歳階級」のような表記ゆれを吸収するため部分一致にしてある。
   * 0本でも2本以上でも例外にして、取り違えを黙って通さない。
   */
  axis(nameFragment: string): Axis {
    // 部分一致だと「年」(time軸) と「業種（2008年～）」(cat01軸) のように衝突することがある。
    // まずは完全一致を優先して曖昧性を潰す。
    const exactHits = [...this.axes.values()].filter((a) => a.name === nameFragment);
    if (exactHits.length === 1) return exactHits[0]!;

    const hits = [...this.axes.values()].filter((a) => a.name.includes(nameFragment));
    if (hits.length !== 1) {
      const names = [...this.axes.values()].map((a) => `${a.id}=${a.name}`).join(", ");
      throw new Error(
        `${this.key}: 軸「${nameFragment}」が ${hits.length} 本ヒットした。候補: ${names}`,
      );
    }
    return hits[0]!;
  }

  /** 軸名と項目名からコードを引く。項目名は完全一致。 */
  codeOf(axisName: string, itemName: string): string {
    const axis = this.axis(axisName);
    const hit = axis.items.find((c) => c["@name"] === itemName);
    if (hit === undefined) {
      throw new Error(`${this.key}: 軸「${axis.name}」に項目「${itemName}」がない`);
    }
    return hit["@code"];
  }

  /** 軸の項目を階層レベルで絞る。5歳階級だけ、章だけ、といった取り出しに使う。 */
  itemsAtLevel(axisName: string, level: number): EstatClass[] {
    return this.axis(axisName).items.filter((c) => Number(c["@level"]) === level);
  }

  /**
   * 全軸のコードを指定して1セル引く。
   * キーは軸名の部分一致。指定漏れがあれば例外にする（暗黙の総数扱いを作らない）。
   */
  get(selector: Record<string, string>): number | null {
    const codes = new Map<string, string>();
    for (const [nameFragment, code] of Object.entries(selector)) {
      codes.set(this.axis(nameFragment).id, code);
    }
    const missing = this.order.filter((id) => !codes.has(id));
    if (missing.length > 0) {
      const names = missing.map((id) => this.axes.get(id)!.name).join(", ");
      throw new Error(`${this.key}: 軸の指定が足りない: ${names}`);
    }
    return this.index.get(this.order.map((id) => codes.get(id)!).join("|")) ?? null;
  }
}

export async function loadTable(key: string): Promise<Table> {
  return new Table(key, await readJsonGz<RawCache>(resolve(RAW_DIR, `${key}.json.gz`)));
}
