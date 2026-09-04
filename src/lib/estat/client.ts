import type {
  EstatClassObj,
  EstatNote,
  EstatValue,
  EstatTableInf,
  GetMetaInfoResponse,
  GetStatsDataResponse,
} from "./types.ts";
import { toArray } from "./types.ts";

const BASE = "https://api.e-stat.go.jp/rest/3.0/app/json";

/** 1リクエストあたりの取得上限。仕様で 10 万件。 */
export const MAX_LIMIT = 100_000;

export interface ClientOptions {
  appId: string;
  /** リクエスト間隔。公式のレート制限は非公開のため既定は保守的に 1 秒。 */
  throttleMs?: number;
  maxRetries?: number;
}

/** getStatsData の絞り込みパラメータ。cdCat01 等は動的キーで渡す。 */
export interface StatsDataQuery {
  statsDataId: string;
  /** 項目コードでの絞り込み。カンマ区切りで最大 100 個（仕様上限）。 */
  [key: string]: string | undefined;
}

export interface StatsDataResult {
  tableInf: EstatTableInf;
  classes: EstatClassObj[];
  /** 欠測・秘匿を表す特殊文字の凡例。値のパースに使う。 */
  notes: EstatNote[];
  values: EstatValue[];
  totalNumber: number;
}

export class EstatError extends Error {
  // パラメータプロパティは型ストリッピングで消せないため、明示的に宣言する。
  status: number;

  constructor(status: number, message: string) {
    super(`e-Stat API error ${status}: ${message}`);
    this.name = "EstatError";
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createClient(options: ClientOptions) {
  const { appId, throttleMs = 1000, maxRetries = 3 } = options;

  // 直前のリクエストからの間隔を空けるため、呼び出しを直列につなぐ。
  let queue: Promise<unknown> = Promise.resolve();

  async function request<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE}/${endpoint}`);
    url.searchParams.set("appId", appId);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url);

      // 5xx と 429 は一時的な障害とみなして指数バックオフで再試行する。
      if ((res.status >= 500 || res.status === 429) && attempt < maxRetries) {
        await sleep(throttleMs * 2 ** attempt);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} for ${endpoint}`);
      }
      return (await res.json()) as T;
    }
  }

  /** スロットリング付きでリクエストを直列実行する。 */
  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(async () => {
      const result = await fn();
      await sleep(throttleMs);
      return result;
    });
    // 失敗しても後続を止めない。
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    /** メタ情報（各軸のコードと名称）を取得する。 */
    async meta(statsDataId: string): Promise<{ tableInf: EstatTableInf; classes: EstatClassObj[] }> {
      const json = await enqueue(() =>
        request<GetMetaInfoResponse>("getMetaInfo", { statsDataId }),
      );
      const { RESULT, METADATA_INF } = json.GET_META_INFO;
      if (RESULT.STATUS !== 0 || !METADATA_INF) {
        throw new EstatError(RESULT.STATUS, RESULT.ERROR_MSG);
      }
      return {
        tableInf: METADATA_INF.TABLE_INF,
        classes: toArray(METADATA_INF.CLASS_INF.CLASS_OBJ),
      };
    },

    /**
     * 統計データを取得する。NEXT_KEY を辿って全ページを結合して返す。
     * 2ページ目以降はメタ情報を落として転送量を減らす。
     */
    async data(query: StatsDataQuery, onPage?: (fetched: number, total: number) => void) {
      const base: Record<string, string> = {};
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) base[k] = v;
      }

      const values: EstatValue[] = [];
      let result: StatsDataResult | undefined;
      let startPosition: number | undefined;

      do {
        const params: Record<string, string> = { ...base, limit: String(MAX_LIMIT) };
        if (startPosition !== undefined) {
          params["startPosition"] = String(startPosition);
          params["metaGetFlg"] = "N";
        }

        const json = await enqueue(() => request<GetStatsDataResponse>("getStatsData", params));
        const { RESULT, STATISTICAL_DATA } = json.GET_STATS_DATA;
        if (RESULT.STATUS !== 0 || !STATISTICAL_DATA) {
          throw new EstatError(RESULT.STATUS, RESULT.ERROR_MSG);
        }

        const { RESULT_INF, DATA_INF, CLASS_INF, TABLE_INF } = STATISTICAL_DATA;
        values.push(...toArray(DATA_INF.VALUE));

        result ??= {
          tableInf: TABLE_INF,
          classes: toArray(CLASS_INF.CLASS_OBJ),
          notes: toArray(DATA_INF.NOTE),
          values,
          totalNumber: RESULT_INF.TOTAL_NUMBER,
        };

        onPage?.(values.length, RESULT_INF.TOTAL_NUMBER);
        startPosition = RESULT_INF.NEXT_KEY;
      } while (startPosition !== undefined);

      // result は必ず1周目で設定される。
      return result as StatsDataResult;
    },
  };
}

export type EstatClient = ReturnType<typeof createClient>;
