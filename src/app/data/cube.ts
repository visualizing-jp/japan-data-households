/**
 * 配信データ（行優先のフラット配列）の読み出し。
 * 書き出し側は src/lib/transform/cube.ts。次元の並びと添字計算はそちらと対になっている。
 */

export interface Dim {
  name: string;
  codes: string[];
}

export interface CubeJson {
  dims: Dim[];
  measures: Record<string, (number | null)[]>;
}

/** 軸の項目。code は次元の codes と対応し、label は表示名。 */
export interface DictEntry {
  code: string;
  label: string;
  level: number;
  /** 階層の親コード。労働力調査の中分類などに付く。 */
  parent?: string;
}

export class CubeView {
  readonly dims: readonly Dim[];
  private readonly indexOf: Map<string, Map<string, number>>;
  private readonly strideOf: Map<string, number>;
  private readonly measures: Record<string, (number | null)[]>;

  constructor(json: CubeJson) {
    this.dims = json.dims;
    this.measures = json.measures;
    this.indexOf = new Map(
      json.dims.map((d) => [d.name, new Map(d.codes.map((c, i) => [c, i]))]),
    );
    this.strideOf = new Map(
      json.dims.map((d, i) => [
        d.name,
        json.dims.slice(i + 1).reduce((n, x) => n * x.codes.length, 1),
      ]),
    );
  }

  codes(dim: string): string[] {
    const d = this.dims.find((x) => x.name === dim);
    if (d === undefined) throw new Error(`軸 ${dim} がない`);
    return d.codes;
  }

  private offset(coords: Record<string, string>): number {
    let offset = 0;
    for (const d of this.dims) {
      const code = coords[d.name];
      if (code === undefined) throw new Error(`軸 ${d.name} の座標がない`);
      const i = this.indexOf.get(d.name)!.get(code);
      if (i === undefined) throw new Error(`軸 ${d.name} にコード ${code} がない`);
      offset += i * this.strideOf.get(d.name)!;
    }
    return offset;
  }

  at(measure: string, coords: Record<string, string>): number | null {
    return this.measures[measure]![this.offset(coords)] ?? null;
  }

  /**
   * `along` 以外の軸を固定して、`along` に沿った値の並びを取り出す。
   * 返る配列は `codes(along)` と同じ順序・同じ長さ。
   */
  series(
    measure: string,
    along: string,
    fixed: Record<string, string>,
  ): (number | null)[] {
    const values = this.measures[measure];
    if (values === undefined) throw new Error(`指標 ${measure} がない`);
    const codes = this.codes(along);
    const stride = this.strideOf.get(along)!;
    const base = this.offset({ ...fixed, [along]: codes[0]! });
    return codes.map((_, i) => values[base + i * stride] ?? null);
  }
}
