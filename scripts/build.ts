/**
 * 生データから配信用 cube を組み立てて public/data/ に書き出す。
 *
 *   npm run data
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadTable, type Table } from "../src/lib/transform/table.ts";
import { Cube, round } from "../src/lib/transform/cube.ts";
import { formatBytes } from "../src/lib/cache.ts";
import {
  CENSUS_LEAF_CODES,
  CENSUS_TO_FAMILY,
  FAMILY_TYPES,
  SEX_LABEL_CENSUS,
  TOTAL_TYPE,
  type FamilyTypeCode,
  type Sex,
} from "../src/lib/data/labels.ts";
import type { DictEntry } from "../src/app/data/cube.ts";
import {
  IPSS_ERA_YEARS,
  IPSS_HEAD_YEARS,
  IPSS_SCALE,
  readIpssEra,
  readIpssHead,
} from "./ingest-ipss.ts";

const OUT_DIR = resolve(import.meta.dirname, "../public/data");

const SEXES = ["total", "male", "female"] as const satisfies readonly Sex[];

const TYPE_CODES = FAMILY_TYPES.map((t) => t.code);

/** 世帯主ビューに載せる年齢（国勢コード）。 */
const HEAD_AGE_CODES = [
  "150", // 15～19
  "160",
  "170",
  "180",
  "190",
  "200",
  "210",
  "220",
  "230",
  "240",
  "250",
  "260",
  "280", // 75～79
  "290", // 80～84
  "310", // 85歳以上
] as const;

const CENSUS_YEARS = [
  { year: "1995", timeCode: "1995000000" },
  { year: "2000", timeCode: "2000000000" },
  { year: "2005", timeCode: "2005000000" },
  { year: "2010", timeCode: "2010000000" },
  { year: "2015", timeCode: "2015000000" },
  { year: "2020", timeCode: "2020000000" },
] as const;

function shortAgeLabel(name: string): string {
  return name.replace(/歳$/, "").replace(/～/g, "–");
}

function shareOf(part: number | null, total: number | null): number | null {
  if (part === null || total === null || total === 0) return null;
  return round(part / total, 4);
}

async function writeJson(name: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  const path = resolve(OUT_DIR, `${name}.json`);
  await writeFile(path, json);
  console.log(`  ${name}.json  ${formatBytes(Buffer.byteLength(json))}`);
}

/** 16区分の葉を5類型に合算。 */
function foldHouseholds(
  t: Table,
  selectorBase: Record<string, string>,
  tabCode: string,
): Record<FamilyTypeCode, number | null> {
  const sums: Record<string, number> = {
    alone: 0,
    couple: 0,
    couple_child: 0,
    single_parent: 0,
    other: 0,
  };
  let missingAll = true;

  for (const leaf of CENSUS_LEAF_CODES) {
    const family = CENSUS_TO_FAMILY[leaf]!;
    if (family === "total") continue;
    const v = t.get({
      ...selectorBase,
      表章項目: tabCode,
      家族類型: leaf,
    });
    if (v !== null) {
      missingAll = false;
      sums[family] = (sums[family] ?? 0) + v;
    }
  }

  const total = t.get({
    ...selectorBase,
    表章項目: tabCode,
    家族類型: "100",
  });

  if (missingAll && total === null) {
    return {
      total: null,
      alone: null,
      couple: null,
      couple_child: null,
      single_parent: null,
      other: null,
    };
  }

  return {
    total,
    alone: sums.alone ?? 0,
    couple: sums.couple ?? 0,
    couple_child: sums.couple_child ?? 0,
    single_parent: sums.single_parent ?? 0,
    other: sums.other ?? 0,
  };
}

function typesDict(): DictEntry[] {
  return FAMILY_TYPES.map((t) => ({
    code: t.code,
    label: t.label,
    level: t.level,
  }));
}

async function buildEra() {
  const t = await loadTable("hh-geo");
  const tabHh = t.codeOf("表章項目", "一般世帯数");
  const tabMean = t.codeOf("表章項目", "１世帯当たり人員");
  const types = typesDict();

  const censusYears = CENSUS_YEARS.map((y) => y.year);
  const years = [...censusYears, ...IPSS_ERA_YEARS];

  const cube = new Cube(
    [
      { name: "type", codes: TYPE_CODES },
      { name: "year", codes: [...years] },
    ],
    ["households", "share", "meanSize", "projected"],
  );

  for (const gy of CENSUS_YEARS) {
    const folded = foldHouseholds(
      t,
      { 地域: "00000", 時間軸: gy.timeCode },
      tabHh,
    );
    const meanTotal = t.get({
      表章項目: tabMean,
      家族類型: "100",
      地域: "00000",
      時間軸: gy.timeCode,
    });

    for (const code of TYPE_CODES) {
      const hh = folded[code as FamilyTypeCode];
      cube.set("households", [code, gy.year], hh === null ? null : round(hh, 0));
      cube.set("share", [code, gy.year], shareOf(hh, folded.total));
      cube.set(
        "meanSize",
        [code, gy.year],
        code === TOTAL_TYPE ? round(meanTotal, 3) : null,
      );
      cube.set("projected", [code, gy.year], 0);
    }
  }

  const ipss = readIpssEra();
  const byYear = new Map(ipss.map((r) => [r.year, r]));
  for (const year of IPSS_ERA_YEARS) {
    const row = byYear.get(year);
    if (row === undefined) {
      console.warn(`  era: IPSS ${year} なし`);
      continue;
    }
    for (const code of TYPE_CODES) {
      const raw = row.households[code as FamilyTypeCode];
      const hh = round(raw * IPSS_SCALE, 0);
      const total = row.households.total * IPSS_SCALE;
      cube.set("households", [code, year], hh);
      cube.set("share", [code, year], shareOf(hh, total));
      cube.set(
        "meanSize",
        [code, year],
        code === TOTAL_TYPE ? round(row.meanSize, 3) : null,
      );
      cube.set("projected", [code, year], 1);
    }
  }

  await writeJson("era", { ...cube.toJSON(), types });
}

async function buildHead() {
  const t = await loadTable("hh-head");
  const tabHh = t.codeOf("表章項目", "一般世帯数");
  const ageAxis = t.axis("世帯主の年齢");
  const ages: DictEntry[] = HEAD_AGE_CODES.map((code) => {
    const item = ageAxis.byCode.get(code);
    if (item === undefined) throw new Error(`年齢コード ${code} がない`);
    return {
      code,
      label: shortAgeLabel(item["@name"]),
      level: 1,
    };
  });
  const types = typesDict();
  const censusYears = CENSUS_YEARS.map((y) => y.year);
  const years = [...censusYears, ...IPSS_HEAD_YEARS];

  const cube = new Cube(
    [
      { name: "type", codes: TYPE_CODES },
      { name: "age", codes: ages.map((a) => a.code) },
      { name: "sex", codes: [...SEXES] },
      { name: "year", codes: [...years] },
    ],
    ["households", "share", "projected"],
  );

  for (const gy of CENSUS_YEARS) {
    for (const sex of SEXES) {
      const sexCode = t.codeOf("世帯主の男女", SEX_LABEL_CENSUS[sex]);
      for (const age of ages) {
        const folded = foldHouseholds(
          t,
          {
            世帯主の年齢: age.code,
            世帯主の男女: sexCode,
            時間軸: gy.timeCode,
          },
          tabHh,
        );
        for (const code of TYPE_CODES) {
          const hh = folded[code as FamilyTypeCode];
          cube.set(
            "households",
            [code, age.code, sex, gy.year],
            hh === null ? null : round(hh, 0),
          );
          cube.set(
            "share",
            [code, age.code, sex, gy.year],
            shareOf(hh, folded.total),
          );
          cube.set("projected", [code, age.code, sex, gy.year], 0);
        }
      }
    }
  }

  const ipssRows = readIpssHead([...IPSS_HEAD_YEARS]);
  for (const row of ipssRows) {
    if (!ages.some((a) => a.code === row.age)) continue;
    for (const code of TYPE_CODES) {
      const raw = row.households[code as FamilyTypeCode];
      const hh = round(raw * IPSS_SCALE, 0);
      const total = row.households.total * IPSS_SCALE;
      cube.set("households", [code, row.age, row.sex, row.year], hh);
      cube.set("share", [code, row.age, row.sex, row.year], shareOf(hh, total));
      cube.set("projected", [code, row.age, row.sex, row.year], 1);
    }
  }

  await writeJson("head-age", { ...cube.toJSON(), types, ages });
}

async function buildGeo() {
  const t = await loadTable("hh-geo");
  const tabHh = t.codeOf("表章項目", "一般世帯数");
  const types = typesDict();

  const prefectures = t
    .axis("地域")
    .items.filter((c) => c["@code"] !== "00000")
    .map((c) => ({
      code: c["@code"],
      label: c["@name"],
      level: Number(c["@level"] || 1),
    }));
  const areas: DictEntry[] = [
    { code: "00000", label: "全国", level: 1 },
    ...prefectures,
  ];
  const years = CENSUS_YEARS.map((y) => y.year);

  const cube = new Cube(
    [
      { name: "type", codes: TYPE_CODES },
      { name: "year", codes: [...years] },
      { name: "area", codes: areas.map((a) => a.code) },
    ],
    ["households", "share", "relative"],
  );

  for (const gy of CENSUS_YEARS) {
    const national = foldHouseholds(
      t,
      { 地域: "00000", 時間軸: gy.timeCode },
      tabHh,
    );

    for (const code of TYPE_CODES) {
      const nHh = national[code as FamilyTypeCode];
      const nShare = shareOf(nHh, national.total);
      cube.set("households", [code, gy.year, "00000"], nHh === null ? null : round(nHh, 0));
      cube.set("share", [code, gy.year, "00000"], nShare);
      cube.set("relative", [code, gy.year, "00000"], nShare === null ? null : 1);
    }

    for (const pref of prefectures) {
      const folded = foldHouseholds(
        t,
        { 地域: pref.code, 時間軸: gy.timeCode },
        tabHh,
      );
      for (const code of TYPE_CODES) {
        const hh = folded[code as FamilyTypeCode];
        const share = shareOf(hh, folded.total);
        const nShare = shareOf(
          national[code as FamilyTypeCode],
          national.total,
        );
        const relative =
          share === null || nShare === null || nShare === 0
            ? null
            : round(share / nShare, 4);
        cube.set(
          "households",
          [code, gy.year, pref.code],
          hh === null ? null : round(hh, 0),
        );
        cube.set("share", [code, gy.year, pref.code], share);
        cube.set("relative", [code, gy.year, pref.code], relative);
      }
    }
  }

  await writeJson("geo", { ...cube.toJSON(), types, areas });
}

async function buildElderly() {
  const t = await loadTable("hh-elderly");
  const tab = t.codeOf("表章項目", "実数");
  const ageTotal = t.codeOf("年齢", "総数");
  const years = [...t.axis("時間軸").items]
    .map((c) => {
      const m = /^(\d{4})年/.exec(c["@name"]);
      if (m === null) throw new Error(`年として読めない: ${c["@name"]}`);
      return { code: c["@code"], year: m[1]! };
    })
    .sort((a, b) => a.year.localeCompare(b.year));

  const cube = new Cube(
    [
      { name: "sex", codes: [...SEXES] },
      { name: "year", codes: years.map((y) => y.year) },
    ],
    ["households"],
  );

  for (const sex of SEXES) {
    const sexCode = t.codeOf("男女", SEX_LABEL_CENSUS[sex]);
    for (const y of years) {
      const v = t.get({
        表章項目: tab,
        年齢: ageTotal,
        男女: sexCode,
        地域: "00000",
        時間軸: y.code,
      });
      cube.set("households", [sex, y.year], v === null ? null : round(v, 0));
    }
  }

  await writeJson("elderly-alone", cube.toJSON());
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("build era");
  await buildEra();
  console.log("build head-age");
  await buildHead();
  console.log("build geo");
  await buildGeo();
  console.log("build elderly-alone");
  await buildElderly();
  console.log("done");
}

await main();
