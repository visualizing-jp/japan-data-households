/**
 * 取得対象の e-Stat 統計表。
 * 各表の素性・注意点は docs/data-sources.md を参照。
 */

export interface DatasetDef {
  /** ファイル名やログに使う短いキー。 */
  key: string;
  /** e-Stat の統計表ID（getStatsData の statsDataId）。 */
  statsDataId: string;
  label: string;
  /** 公称セル数。取得後の健全性チェックに使う。 */
  expectedCells?: number;
  /** getStatsData への追加パラメータ。未指定なら全件取得。 */
  query?: Record<string, string>;
}

export const DATASETS = {
  /**
   * 国勢調査 時系列。家族類型16区分 × 全国・都道府県 × 調査年。
   * 時代（全国）と地域ビューの実績。
   */
  hhGeo: {
    key: "hh-geo",
    statsDataId: "0003414255",
    label: "国勢調査 時系列 家族類型16区分別一般世帯数（全国・都道府県）",
    expectedCells: 23_040,
  },

  /**
   * 国勢調査 時系列。家族類型 × 世帯主年齢 × 男女 × 年（全国）。
   */
  hhHead: {
    key: "hh-head",
    statsDataId: "0003414256",
    label: "国勢調査 時系列 家族類型×世帯主年齢×男女別一般世帯数（全国）",
    expectedCells: 12_240,
  },

  /**
   * 65歳以上単独世帯（補強・注記用）。
   */
  hhElderly: {
    key: "hh-elderly",
    statsDataId: "0003410427",
    label: "国勢調査 時系列 65歳以上単独世帯数（全国・都道府県）",
    expectedCells: 18_144,
  },
} as const satisfies Record<string, DatasetDef>;

export const ALL_DATASETS: DatasetDef[] = Object.values(DATASETS);

/** 配信用 cube の材料。 */
export const BUILD_DATASETS: DatasetDef[] = [
  DATASETS.hhGeo,
  DATASETS.hhHead,
  DATASETS.hhElderly,
];
