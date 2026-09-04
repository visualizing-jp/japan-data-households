/**
 * 配信データの取得。
 *
 * React 19 の `use()` はレンダーをまたいで同一の Promise であることを要求する。
 */

import { CubeView, type CubeJson, type DictEntry } from "./cube.ts";

export type Sex = "total" | "male" | "female";

export interface EraData {
  types: DictEntry[];
  cube: CubeView;
  years: number[];
}

export interface HeadAgeData {
  types: DictEntry[];
  ages: DictEntry[];
  cube: CubeView;
  /** 新しい年が先頭。 */
  years: string[];
}

export interface GeoData {
  types: DictEntry[];
  /** 先頭が全国（00000）、続いて47都道府県。 */
  areas: DictEntry[];
  cube: CubeView;
  /** 新しい年が先頭。 */
  years: string[];
}

export interface ElderlyAloneData {
  cube: CubeView;
  years: number[];
}

const cache = new Map<string, Promise<unknown>>();

function chunk<Raw, T>(name: string, transform: (raw: Raw) => T): Promise<T> {
  const hit = cache.get(name);
  if (hit !== undefined) return hit as Promise<T>;
  const promise = fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`${name}.json の取得に失敗しました (${r.status})`);
      return r.json() as Promise<Raw>;
    })
    .then(transform);
  cache.set(name, promise);
  return promise;
}

export function loadEra(): Promise<EraData> {
  return chunk<CubeJson & { types: DictEntry[] }, EraData>("era", (raw) => ({
    types: raw.types,
    cube: new CubeView(raw),
    years: raw.dims.find((d) => d.name === "year")!.codes.map(Number),
  }));
}

export function loadHeadAge(): Promise<HeadAgeData> {
  return chunk<CubeJson & { types: DictEntry[]; ages: DictEntry[] }, HeadAgeData>(
    "head-age",
    (raw) => ({
      types: raw.types,
      ages: raw.ages,
      cube: new CubeView(raw),
      years: [...raw.dims.find((d) => d.name === "year")!.codes].reverse(),
    }),
  );
}

export function loadGeo(): Promise<GeoData> {
  return chunk<CubeJson & { types: DictEntry[]; areas: DictEntry[] }, GeoData>(
    "geo",
    (raw) => ({
      types: raw.types,
      areas: raw.areas,
      cube: new CubeView(raw),
      years: [...raw.dims.find((d) => d.name === "year")!.codes].reverse(),
    }),
  );
}

export function loadElderlyAlone(): Promise<ElderlyAloneData> {
  return chunk<CubeJson, ElderlyAloneData>("elderly-alone", (raw) => ({
    cube: new CubeView(raw),
    years: raw.dims.find((d) => d.name === "year")!.codes.map(Number),
  }));
}
