/**
 * 全対象表のメタ情報（各軸のコードと名称）を取得して data/raw/meta/ に保存する。
 *
 *   npm run meta
 *   npm run meta -- 0003024269
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "../src/lib/estat/client.ts";
import { buildAxes } from "../src/lib/estat/parse.ts";
import { ALL_DATASETS } from "../src/lib/data/datasets.ts";

const OUT_DIR = resolve(import.meta.dirname, "../data/raw/meta");

function requireAppId(): string {
  const appId = process.env["ESTAT_APP_ID"];
  if (!appId) {
    throw new Error(
      "ESTAT_APP_ID が未設定です。.env.example をコピーして .env を作り、アプリケーションIDを設定してください。",
    );
  }
  return appId;
}

async function main() {
  const filter = process.argv.slice(2);
  const targets =
    filter.length > 0
      ? ALL_DATASETS.filter((d) => filter.includes(d.statsDataId) || filter.includes(d.key))
      : ALL_DATASETS;

  if (targets.length === 0) {
    throw new Error(`対象が見つかりません: ${filter.join(", ")}`);
  }

  const client = createClient({
    appId: requireAppId(),
    throttleMs: Number(process.env["ESTAT_THROTTLE_MS"] ?? 1000),
  });

  await mkdir(OUT_DIR, { recursive: true });

  for (const ds of targets) {
    process.stdout.write(`${ds.statsDataId} ${ds.key} ... `);
    const { tableInf, classes } = await client.meta(ds.statsDataId);
    const axes = buildAxes(classes);

    await writeFile(
      resolve(OUT_DIR, `${ds.key}.json`),
      JSON.stringify({ tableInf, classes }, null, 2),
      "utf8",
    );

    const shape = [...axes.values()].map((a) => `${a.name}=${a.items.length}`).join(" × ");
    const cells = [...axes.values()].reduce((n, a) => n * a.items.length, 1);
    console.log(`OK`);
    console.log(`  ${tableInf.STATISTICS_NAME}`);
    console.log(`  ${typeof tableInf.TITLE === "string" ? tableInf.TITLE : tableInf.TITLE.$}`);
    console.log(`  ${shape}`);
    console.log(`  軸の積 ${cells.toLocaleString()} セル`);
    if (ds.query === undefined && ds.expectedCells !== undefined && cells !== ds.expectedCells) {
      console.log(`  ※ 想定 ${ds.expectedCells.toLocaleString()} と不一致`);
    }
  }
}

await main();
