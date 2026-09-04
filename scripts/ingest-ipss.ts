/**
 * 社人研「日本の世帯数の将来推計」Excel の読み取り。
 * 単位は千世帯 → 呼び出し側で ×1000 して世帯数に揃える。
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";
import type { FamilyTypeCode } from "../src/lib/data/labels.ts";

const IPSS_DIR = resolve(import.meta.dirname, "../data/raw/ipss");

/** Excel 千世帯 → 世帯。 */
export const IPSS_SCALE = 1000;

export const FAMILY_COLS = [
  "total",
  "alone",
  "couple",
  "couple_child",
  "single_parent",
  "other",
] as const satisfies readonly FamilyTypeCode[];

/** 結果表1の列: 総数, 単独, (核家族総数 skip), 夫婦のみ, 夫婦と子, ひとり親と子, その他, 人員, 平均 */
const KEKA1_TYPE_OFFSET = {
  total: 4,
  alone: 5,
  couple: 7,
  couple_child: 8,
  single_parent: 9,
  other: 10,
} as const;

const KEKA1_PERSONS = 11;
const KEKA1_MEAN = 12;

export interface IpssEraRow {
  year: string;
  households: Record<FamilyTypeCode, number>;
  persons: number;
  meanSize: number;
}

export interface IpssHeadRow {
  year: string;
  sex: "total" | "male" | "female";
  age: string;
  households: Record<FamilyTypeCode, number>;
}

function loadBook(name: string): XLSX.WorkBook {
  const path = resolve(IPSS_DIR, name);
  if (!existsSync(path)) {
    throw new Error(`社人研 Excel がありません: ${path}`);
  }
  return XLSX.read(readFileSync(path));
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function yearFromCell(v: unknown): string | null {
  if (typeof v === "number" && v >= 1980 && v <= 2100) return String(v);
  if (typeof v === "string") {
    const m = /^(\d{4})/.exec(v.trim());
    return m ? m[1]! : null;
  }
  return null;
}

/** 結果表1: 2020–2050 年次。値は千世帯。 */
export function readIpssEra(): IpssEraRow[] {
  const wb = loadBook("kekka1.xlsx");
  const sheet = wb.Sheets["結果表1"];
  if (sheet === undefined) throw new Error("kekka1.xlsx に「結果表1」シートがない");
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
  });

  const out: IpssEraRow[] = [];
  for (const row of rows) {
    const year = yearFromCell(row[0]);
    if (year === null) continue;
    const households = {} as Record<FamilyTypeCode, number>;
    let ok = true;
    for (const code of FAMILY_COLS) {
      const v = num(row[KEKA1_TYPE_OFFSET[code]]);
      if (v === null) {
        ok = false;
        break;
      }
      households[code] = v;
    }
    const persons = num(row[KEKA1_PERSONS]);
    const meanSize = num(row[KEKA1_MEAN]);
    if (!ok || persons === null || meanSize === null) continue;
    out.push({ year, households, persons, meanSize });
  }
  return out;
}

/**
 * 結果表2の年齢ラベルを国勢のコードに寄せる。
 * 85歳以上は 85–89 + 90–94 + 95–99 + 100歳以上 を合算する側で扱う。
 */
export const IPSS_AGE_TO_CENSUS: Record<string, string | "fold85"> = {
  "15～19歳": "150",
  "20～24歳": "160",
  "25～29歳": "170",
  "30～34歳": "180",
  "35～39歳": "190",
  "40～44歳": "200",
  "45～49歳": "210",
  "50～54歳": "220",
  "55～59歳": "230",
  "60～64歳": "240",
  "65～69歳": "250",
  "70～74歳": "260",
  "75～79歳": "280",
  "80～84歳": "290",
  "85歳以上": "310",
  "85～89歳": "fold85",
  "90～94歳": "fold85",
  "95～99歳": "fold85",
  "100歳以上": "fold85",
};

function normalizeAgeLabel(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/〜/g, "～");
}

/**
 * 結果表2: 推計年ごとの世帯主年齢×類型。
 * シート内に 総数 / 男 / 女 セクションがある。値は千世帯。
 */
export function readIpssHead(years: string[]): IpssHeadRow[] {
  const wb = loadBook("kekka2.xlsx");
  const out: IpssHeadRow[] = [];

  for (const year of years) {
    const name = `結果表2 ${year}`;
    const sheet = wb.Sheets[name];
    if (sheet === undefined) {
      console.warn(`  IPSS 結果表2: シート「${name}」なし（スキップ）`);
      continue;
    }
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: null,
    });

    let sex: "total" | "male" | "female" = "total";
    let skipRekei = false;
    // 累積用: sex → ageCode → households（85歳以上は複数行を合算）
    const acc = new Map<string, Map<string, Record<FamilyTypeCode, number>>>();

    for (const row of rows) {
      const label0 = row[0];
      if (typeof label0 === "string") {
        const t = label0.replace(/\s+/g, "");
        if (t === "男") {
          sex = "male";
          skipRekei = false;
          continue;
        }
        if (t === "女") {
          sex = "female";
          skipRekei = false;
          continue;
        }
        if (t.includes("再掲")) {
          skipRekei = true;
          continue;
        }
      }
      if (skipRekei) continue;
      if (typeof label0 !== "string") continue;

      const ageLabel = normalizeAgeLabel(label0);
      if (ageLabel === "総数") continue;
      const mapped = IPSS_AGE_TO_CENSUS[ageLabel];
      if (mapped === undefined) continue;

      // 列: 1総数 2単独 3核家族総数 4夫婦のみ 5夫婦と子 6ひとり親 7その他
      const values: Record<FamilyTypeCode, number> | null = (() => {
        const total = num(row[1]);
        const alone = num(row[2]);
        const couple = num(row[4]);
        const coupleChild = num(row[5]);
        const singleParent = num(row[6]);
        const other = num(row[7]);
        if (
          total === null ||
          alone === null ||
          couple === null ||
          coupleChild === null ||
          singleParent === null ||
          other === null
        ) {
          return null;
        }
        return {
          total,
          alone,
          couple,
          couple_child: coupleChild,
          single_parent: singleParent,
          other,
        };
      })();
      if (values === null) continue;

      const ageCode = mapped === "fold85" ? "310" : mapped;
      const sexMap = acc.get(sex) ?? new Map();
      acc.set(sex, sexMap);
      const prev = sexMap.get(ageCode);
      if (prev === undefined) {
        sexMap.set(ageCode, { ...values });
      } else {
        for (const code of FAMILY_COLS) {
          prev[code] += values[code];
        }
      }
    }

    for (const [sx, ages] of acc) {
      for (const [age, households] of ages) {
        out.push({
          year,
          sex: sx as "total" | "male" | "female",
          age,
          households,
        });
      }
    }
  }

  return out;
}

/** 推計として載せる年（2020は実績優先のため除外）。 */
export const IPSS_ERA_YEARS = [
  "2025",
  "2030",
  "2035",
  "2040",
  "2045",
  "2050",
] as const;

export const IPSS_HEAD_YEARS = IPSS_ERA_YEARS;
