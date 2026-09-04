import { gunzipSync, gzipSync } from "node:zlib";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * 生レスポンスのディスクキャッシュ。
 *
 * 取得は 1 リクエスト 1 秒スロットルで数十分かかりうるので、一度取れたものは
 * 再取得しない。JSON は冗長なので gzip して置く（数百 MB が数十 MB になる）。
 */

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function writeJsonGz(path: string, data: unknown): Promise<number> {
  await mkdir(dirname(path), { recursive: true });
  const buf = gzipSync(Buffer.from(JSON.stringify(data), "utf8"));
  await writeFile(path, buf);
  return buf.byteLength;
}

export async function readJsonGz<T>(path: string): Promise<T> {
  const buf = await readFile(path);
  return JSON.parse(gunzipSync(buf).toString("utf8")) as T;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
