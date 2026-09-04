/**
 * 統計データ本体を取得して data/raw/ に gzip キャッシュする。
 *
 *   npm run fetch
 *   npm run fetch -- occ-age
 *   npm run fetch -- --force
 */

import { resolve } from "node:path";
import { createClient } from "../src/lib/estat/client.ts";
import { parseCells } from "../src/lib/estat/parse.ts";
import { exists, formatBytes, writeJsonGz } from "../src/lib/cache.ts";
import { ALL_DATASETS, type DatasetDef } from "../src/lib/data/datasets.ts";

const RAW_DIR = resolve(import.meta.dirname, "../data/raw");

function requireAppId(): string {
  const appId = process.env["ESTAT_APP_ID"];
  if (!appId) {
    throw new Error(
      "ESTAT_APP_ID が未設定です。.env.example をコピーして .env を作り、アプリケーションIDを設定してください。",
    );
  }
  return appId;
}

function selectTargets(args: string[]): DatasetDef[] {
  const keys = args.filter((a) => !a.startsWith("--"));
  const pool =
    keys.length > 0
      ? ALL_DATASETS.filter((d) => keys.includes(d.key) || keys.includes(d.statsDataId))
      : ALL_DATASETS;

  if (keys.length > 0 && pool.length === 0) {
    throw new Error(`対象が見つかりません: ${keys.join(", ")}`);
  }

  return pool;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const targets = selectTargets(args);

  const client = createClient({
    appId: requireAppId(),
    throttleMs: Number(process.env["ESTAT_THROTTLE_MS"] ?? 1000),
  });

  for (const ds of targets) {
    const out = resolve(RAW_DIR, `${ds.key}.json.gz`);
    if (!force && (await exists(out))) {
      console.log(`cached ${ds.key}`);
      continue;
    }

    console.log(`fetch ${ds.statsDataId} ${ds.key}`);
    const result = await client.data({ statsDataId: ds.statsDataId, ...ds.query }, (got, total) => {
      process.stdout.write(`\r  ${got.toLocaleString()} / ${total.toLocaleString()}`);
    });
    process.stdout.write("\n");

    const { cells, unexpected } = parseCells(result.values, result.notes);
    const missing = cells.filter((c) => c.value === null).length;
    const bytes = await writeJsonGz(out, result);

    console.log(
      `  取得 ${cells.length.toLocaleString()} 件 / 欠測 ${missing.toLocaleString()} 件`,
    );
    console.log(`  凡例 ${result.notes.map((n) => `${n["@char"]}`).join(" ") || "(なし)"}`);
    console.log(`  保存 ${formatBytes(bytes)} → data/raw/${ds.key}.json.gz`);

    if (ds.expectedCells !== undefined && result.totalNumber !== ds.expectedCells) {
      console.log(
        `  ※ 公称 ${ds.expectedCells.toLocaleString()} と件数 ${result.totalNumber.toLocaleString()} が不一致`,
      );
    }
    if (unexpected.size > 0) {
      console.log(
        `  ※ NOTE にない非数値: ${[...unexpected].map(([c, n]) => `"${c}"×${n}`).join(", ")}`,
      );
    }
  }
}

await main();
