export const SEX_LABEL = {
  total: "総数",
  male: "男",
  female: "女",
} as const;

export type Sex = keyof typeof SEX_LABEL;

/** 国勢調査時系列の世帯主の男女。 */
export const SEX_LABEL_CENSUS = {
  total: "総数",
  male: "男",
  female: "女",
} as const;

/** UI・配信で使う5類型（＋総数）。 */
export const FAMILY_TYPES = [
  { code: "total", label: "総数（すべての世帯）", level: 1 },
  { code: "alone", label: "単独", level: 1 },
  { code: "couple", label: "夫婦のみ", level: 1 },
  { code: "couple_child", label: "夫婦と子", level: 1 },
  { code: "single_parent", label: "ひとり親と子", level: 1 },
  { code: "other", label: "その他", level: 1 },
] as const;

export type FamilyTypeCode = (typeof FAMILY_TYPES)[number]["code"];

export const TOTAL_TYPE = "total";

/**
 * 国勢調査16区分（葉）→ 5類型。
 * 中間集計（親族のみ・核家族 等）は含めない。
 */
export const CENSUS_TO_FAMILY: Record<string, FamilyTypeCode> = {
  "100": "total",
  "130": "couple",
  "140": "couple_child",
  "150": "single_parent",
  "160": "single_parent",
  "180": "other",
  "190": "other",
  "200": "other",
  "210": "other",
  "220": "other",
  "230": "other",
  "240": "other",
  "250": "other",
  "260": "other",
  "270": "other",
  "280": "other",
  "290": "alone",
};

/** 畳みに使う葉コード（総数を除く）。 */
export const CENSUS_LEAF_CODES = Object.keys(CENSUS_TO_FAMILY).filter((c) => c !== "100");
