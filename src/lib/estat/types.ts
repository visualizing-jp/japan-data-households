/**
 * e-Stat API 3.0 のレスポンス型。
 * 仕様: https://www.e-stat.go.jp/api/api-info/e-stat-manual3-0
 *
 * レスポンスは XML から機械変換された JSON のため、要素が1個のときは
 * 配列ではなく単体オブジェクトで返る。取り回しには toArray() を使うこと。
 */

/** 正常終了時は 0。それ以外はエラーで、ERROR_MSG に理由が入る。 */
export interface EstatResult {
  STATUS: number;
  ERROR_MSG: string;
  DATE: string;
}

/** 分類事項の1項目。@level は階層の深さ、@parentCode は親項目のコード。 */
export interface EstatClass {
  "@code": string;
  "@name": string;
  "@level": string;
  "@unit"?: string;
  "@parentCode"?: string;
}

/** cat01〜cat15 / tab / area / time といった軸の定義。 */
export interface EstatClassObj {
  "@id": string;
  "@name": string;
  CLASS: EstatClass | EstatClass[];
}

/** 欠測・秘匿などを表す特殊文字の凡例。@char が実際に値として返る記号。 */
export interface EstatNote {
  "@char": string;
  $: string;
}

/**
 * 統計数値1セル。軸のコードは属性として入り、値は $ に文字列で入る。
 * 値が特殊文字（NOTE の @char）のこともある。
 */
export interface EstatValue {
  "@tab"?: string;
  "@area"?: string;
  "@time"?: string;
  "@unit"?: string;
  "@annotation"?: string;
  $: string;
  /** cat01〜cat15 は動的キーのため索引シグネチャで受ける。 */
  [key: string]: string | undefined;
}

/** NEXT_KEY があれば継続データがある。次回の startPosition に指定する。 */
export interface EstatResultInf {
  TOTAL_NUMBER: number;
  FROM_NUMBER: number;
  TO_NUMBER: number;
  NEXT_KEY?: number;
}

export interface EstatTableInf {
  "@id": string;
  STAT_NAME: { "@code": string; $: string };
  GOV_ORG: { "@code": string; $: string };
  STATISTICS_NAME: string;
  TITLE: string | { "@no": string; $: string };
  CYCLE: string;
  SURVEY_DATE: string | number;
  OPEN_DATE: string;
  OVERALL_TOTAL_NUMBER: number;
  UPDATED_DATE: string;
}

export interface GetStatsDataResponse {
  GET_STATS_DATA: {
    RESULT: EstatResult;
    STATISTICAL_DATA?: {
      RESULT_INF: EstatResultInf;
      TABLE_INF: EstatTableInf;
      CLASS_INF: { CLASS_OBJ: EstatClassObj | EstatClassObj[] };
      DATA_INF: {
        NOTE?: EstatNote | EstatNote[];
        VALUE: EstatValue | EstatValue[];
      };
    };
  };
}

export interface GetMetaInfoResponse {
  GET_META_INFO: {
    RESULT: EstatResult;
    METADATA_INF?: {
      TABLE_INF: EstatTableInf;
      CLASS_INF: { CLASS_OBJ: EstatClassObj | EstatClassObj[] };
    };
  };
}

/** 単体オブジェクトでも配列でも配列に正規化する。未定義は空配列。 */
export function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}
