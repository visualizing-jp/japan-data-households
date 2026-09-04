import type { EstatClass, EstatClassObj, EstatNote, EstatValue } from "./types.ts";
import { toArray } from "./types.ts";

/** 軸1本ぶんのコード表。id は "tab" / "cat01" / "area" / "time" など。 */
export interface Axis {
  id: string;
  name: string;
  items: EstatClass[];
  byCode: Map<string, EstatClass>;
}

/** 1セルぶんの値。codes のキーは軸 id（"@" を除いたもの）。 */
export interface Cell {
  codes: Record<string, string>;
  /** 欠測・秘匿は null。特殊文字の内訳は rawMissing に残す。 */
  value: number | null;
  rawMissing?: string;
  annotation?: string;
}

export function buildAxes(classes: EstatClassObj[]): Map<string, Axis> {
  const axes = new Map<string, Axis>();
  for (const obj of classes) {
    const items = toArray(obj.CLASS);
    axes.set(obj["@id"], {
      id: obj["@id"],
      name: obj["@name"],
      items,
      byCode: new Map(items.map((c) => [c["@code"], c])),
    });
  }
  return axes;
}

/**
 * 数値としてパースできる形。e-Stat は桁区切りを含めないが、
 * 符号と小数は現れうる。
 */
const NUMERIC = /^-?\d+(?:\.\d+)?$/;

/**
 * VALUE 配列を数値に正規化する。
 *
 * 欠測・秘匿は表ごとに異なる記号で表され、その凡例が NOTE に入っている。
 * 記号をハードコードせず NOTE から動的に集合を作ることで、表による差異を取りこぼさない。
 */
export function parseCells(values: EstatValue[], notes: EstatNote[]) {
  const missingChars = new Set(notes.map((n) => n["@char"]));
  const cells: Cell[] = [];
  /** NOTE にも載っておらず数値でもなかった値。想定外の記号を検出するために数える。 */
  const unexpected = new Map<string, number>();

  for (const v of values) {
    const codes: Record<string, string> = {};
    for (const [key, raw] of Object.entries(v)) {
      if (raw === undefined) continue;
      if (key === "$" || key === "@unit" || key === "@annotation") continue;
      codes[key.slice(1)] = raw;
    }

    const raw = v.$.trim();
    let value: number | null = null;
    let rawMissing: string | undefined;

    if (NUMERIC.test(raw)) {
      value = Number(raw);
    } else {
      rawMissing = raw;
      if (!missingChars.has(raw)) {
        unexpected.set(raw, (unexpected.get(raw) ?? 0) + 1);
      }
    }

    const cell: Cell = { codes, value };
    if (rawMissing !== undefined) cell.rawMissing = rawMissing;
    if (v["@annotation"] !== undefined) cell.annotation = v["@annotation"];
    cells.push(cell);
  }

  return { cells, unexpected };
}
