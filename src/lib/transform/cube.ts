/**
 * 配信用の多次元データ。
 *
 * 軸のコードを辞書に出し、値は行優先のフラット配列にする。
 * セルごとにキーを持つ JSON に比べて桁違いに小さく、
 * クライアント側では添字計算だけで引ける。
 */

export interface Dim {
  /** 軸の名前。"cause" / "sex" / "year" など。 */
  name: string;
  /** 軸の項目コード。値配列の並び順と対応する。 */
  codes: string[];
}

export interface CubeJson {
  dims: Dim[];
  /** 指標名 → 行優先のフラット配列。欠測は null。 */
  measures: Record<string, (number | null)[]>;
}

export class Cube {
  private readonly dims: Dim[];
  private readonly indexOf: Map<string, number>[];
  private readonly strides: number[];
  private readonly measures = new Map<string, (number | null)[]>();
  readonly size: number;

  constructor(dims: Dim[], measureNames: string[]) {
    this.dims = dims;
    this.indexOf = dims.map((d) => new Map(d.codes.map((c, i) => [c, i])));
    this.strides = dims.map((_, i) =>
      dims.slice(i + 1).reduce((n, d) => n * d.codes.length, 1),
    );
    this.size = dims.reduce((n, d) => n * d.codes.length, 1);
    for (const name of measureNames) {
      this.measures.set(name, new Array<number | null>(this.size).fill(null));
    }
  }

  /** 座標（各軸のコード）から値を置く。軸に無いコードは例外にする。 */
  set(measure: string, coords: string[], value: number | null): void {
    const target = this.measures.get(measure);
    if (target === undefined) throw new Error(`指標 ${measure} は未定義`);
    let offset = 0;
    for (let i = 0; i < this.dims.length; i++) {
      const idx = this.indexOf[i]!.get(coords[i]!);
      if (idx === undefined) {
        throw new Error(`軸 ${this.dims[i]!.name} にコード ${coords[i]} がない`);
      }
      offset += idx * this.strides[i]!;
    }
    target[offset] = value;
  }

  /** 欠測でないセルの数。データの詰まり具合の確認に使う。 */
  filled(measure: string): number {
    return this.measures.get(measure)!.filter((v) => v !== null).length;
  }

  toJSON(): CubeJson {
    return { dims: this.dims, measures: Object.fromEntries(this.measures) };
  }
}

/** 小数の桁を落とす。率は 1 桁あれば表示に足りる。null はそのまま。 */
export function round(value: number | null, digits: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
