/** 時代ビューの注記・図中マーク。 */

export const MARKS = [
  {
    year: 2020,
    label: "国勢調査（基準年）",
    detail:
      "社人研推計の基準年。配信では2020年は国勢調査の実績を優先し、2025年以降を推計として表示する。",
  },
] as const;

/** 帯注記。推計区間を図中で示す。 */
export const SPANS: readonly {
  from: number;
  to: number;
  label: string;
  detail: string;
  kind: "missing" | "scope";
}[] = [
  {
    from: 2025,
    to: 2050,
    label: "推計",
    detail: "国立社会保障・人口問題研究所「日本の世帯数の将来推計（全国推計）令和6年推計」。",
    kind: "scope",
  },
];

/** 折れ線の推計開始年（この年から破線）。 */
export const PROJECTED_FROM = 2025;

export const NOTES = [
  {
    term: "家族類型",
    detail:
      "社人研の5類型に揃えている。国勢調査の16区分は単独・夫婦のみ・夫婦と子・ひとり親と子・その他へビルド時に畳む。",
  },
  {
    term: "推計",
    detail:
      "2025年以降は社人研の将来推計（世帯主率法）。破線と帯ラベル「推計」で実績と区別する。",
  },
  {
    term: "単位",
    detail: "一般世帯数。人口の人数ではない。平均世帯人員は総数のみ時代ビューに表示。",
  },
] as const;
