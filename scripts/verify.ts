/**
 * 配信 cube の健全性チェック。
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CubeView, type CubeJson, type DictEntry } from "../src/app/data/cube.ts";

const DATA = resolve(import.meta.dirname, "../public/data");

let failed = 0;

function ok(label: string, cond: boolean, detail = ""): void {
  console.log(`${cond ? "OK" : "NG"}  ${label}${detail ? `: ${detail}` : ""}`);
  if (!cond) failed += 1;
}

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

interface EraFile extends CubeJson {
  types: DictEntry[];
}

interface HeadFile extends CubeJson {
  types: DictEntry[];
  ages: DictEntry[];
}

interface GeoFile extends CubeJson {
  types: DictEntry[];
  areas: DictEntry[];
}

const eraRaw = JSON.parse(await readFile(resolve(DATA, "era.json"), "utf8")) as EraFile;
const headRaw = JSON.parse(
  await readFile(resolve(DATA, "head-age.json"), "utf8"),
) as HeadFile;
const geoRaw = JSON.parse(await readFile(resolve(DATA, "geo.json"), "utf8")) as GeoFile;

const era = new CubeView(eraRaw);
const head = new CubeView(headRaw);
const geo = new CubeView(geoRaw);

const TYPES = ["alone", "couple", "couple_child", "single_parent", "other"] as const;

// --- 時代: 2020 実績の規模、構成比合計、推計フラグ
const era2020 = era.at("households", { type: "total", year: "2020" });
ok(
  "era 2020 総世帯数が妥当",
  era2020 !== null && era2020 > 50_000_000 && era2020 < 60_000_000,
  String(era2020),
);
ok(
  "era 総数 share=1 (2020)",
  era.at("share", { type: "total", year: "2020" }) === 1,
  String(era.at("share", { type: "total", year: "2020" })),
);

const shareSum2020 = TYPES.reduce(
  (n, t) => n + (era.at("share", { type: t, year: "2020" }) ?? 0),
  0,
);
ok("era 2020 5類型 share 合計≈1", near(shareSum2020, 1, 0.02), String(shareSum2020));

ok(
  "era 2020 は実績 (projected=0)",
  era.at("projected", { type: "alone", year: "2020" }) === 0,
);
ok(
  "era 2025 は推計 (projected=1)",
  era.at("projected", { type: "alone", year: "2025" }) === 1,
);

const alone1995 = era.at("share", { type: "alone", year: "1995" });
const alone2020 = era.at("share", { type: "alone", year: "2020" });
ok(
  "era 単独シェアが上昇 (1995→2020)",
  alone1995 !== null && alone2020 !== null && alone2020 > alone1995,
  `${alone1995} → ${alone2020}`,
);

const child1995 = era.at("share", { type: "couple_child", year: "1995" });
const child2020 = era.at("share", { type: "couple_child", year: "2020" });
ok(
  "era 夫婦と子シェアが低下 (1995→2020)",
  child1995 !== null && child2020 !== null && child2020 < child1995,
  `${child1995} → ${child2020}`,
);

// --- 世帯主
const headYoungAlone = head.at("share", {
  type: "alone",
  age: "160",
  sex: "total",
  year: "2020",
});
const headMidChild = head.at("share", {
  type: "couple_child",
  age: "200",
  sex: "total",
  year: "2020",
});
ok(
  "head 20–24 は単独が高い",
  headYoungAlone !== null && headYoungAlone > 0.7,
  String(headYoungAlone),
);
ok(
  "head 40–44 は夫婦と子が相対的に高い",
  headMidChild !== null && headMidChild > 0.3,
  String(headMidChild),
);
ok(
  "head 2025 推計がある",
  head.at("households", {
    type: "alone",
    age: "160",
    sex: "total",
    year: "2025",
  }) !== null,
);

// --- 地域: 全国 relative=1、県合計≈全国
for (const year of ["1995", "2010", "2020"]) {
  const rel = geo.at("relative", { type: "alone", year, area: "00000" });
  ok(`geo ${year} 全国 relative(単独)=1`, rel === 1, String(rel));

  const national = geo.at("households", { type: "alone", year, area: "00000" });
  const prefs = geoRaw.areas.slice(1);
  const sum = prefs.reduce((n, a) => {
    const v = geo.at("households", { type: "alone", year, area: a.code });
    return n + (v ?? 0);
  }, 0);
  ok(
    `geo ${year} 単独 県合計≈全国`,
    national !== null && near(sum, national, 50),
    `全国=${national} 合計=${sum}`,
  );
}

if (failed > 0) {
  console.error(`\n${failed} 件不一致`);
  process.exit(1);
}
console.log("\n検証 OK");
