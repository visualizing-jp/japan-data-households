import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { schedulePageView } from "../analytics.ts";

/** 既定値のときはキーごと落として URL を短く保つ。 */
function write(key: string, value: string, fallback: string): void {
  const params = new URLSearchParams(window.location.search);
  if (value === fallback) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    query === "" ? window.location.pathname : `?${query}`,
  );
  schedulePageView();
}

/**
 * URL のクエリと同期する状態。`useState` と同じ形で使える。
 *
 * 履歴には積まない（`replaceState`）。死因を次々に見ていく操作で履歴が埋まると、
 * 戻るボタンを何度押してもページから出られなくなる。
 * URL は操作の履歴ではなく、いまどこを見ているかのしおりとして扱う。
 *
 * `isValid` は読み込み時だけ効く。壊れた URL を渡されても既定値に落ちて、
 * その値が URL に書き戻される。
 */
export function useUrlState<T extends string>(
  key: string,
  fallback: T,
  isValid: (value: string) => boolean,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const raw = new URLSearchParams(window.location.search).get(key);
    return raw !== null && isValid(raw) ? (raw as T) : fallback;
  });

  useEffect(() => {
    write(key, value, fallback);
  }, [key, value, fallback]);

  return [value, setValue];
}
