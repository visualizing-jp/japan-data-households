/**
 * 地域ビュー。都道府県 × 家族類型 × 年の構成比相対指標。
 */

import { use, useMemo, useState } from "react";
import { loadGeo } from "../data/chunks.ts";
import { TOTAL_TYPE } from "../data/hierarchy.ts";
import { AreaTypes, type StandoutRow } from "../components/AreaTypes.tsx";
import { TypePicker, type PickerRow } from "../components/TypePicker.tsx";
import { TileMap, type Tile } from "../components/TileMap.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const STANDOUT = 5;

const int = new Intl.NumberFormat("ja-JP");
const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function Headline({
  ranked,
  households,
  share,
}: {
  ranked: (Tile & { relative: number })[];
  households: number;
  share: number | null;
}) {
  const certain = ranked.filter((t) => t.certain);
  if (certain.length === 0) {
    return (
      <span className="text-muted">
        どの県も全国との差が小さい。全国{int.format(households)}世帯
        {share !== null && `（構成比 ${pct.format(share * 100)}%）`}。
      </span>
    );
  }
  const top = certain[0]!;
  const bottom = certain.at(-1)!;
  if (certain.length === 1 || top.code === bottom.code) {
    return (
      <span className="text-muted">
        目立つのは{" "}
        <span className="font-semibold text-ink">
          {top.label} {one.format(top.relative)}
        </span>
      </span>
    );
  }
  return (
    <span className="text-muted">
      最も高い{" "}
      <span className="font-semibold text-ink">
        {top.label} {one.format(top.relative)}
      </span>
      {"  ／  最も低い "}
      <span className="font-semibold text-ink">
        {bottom.label} {one.format(bottom.relative)}
      </span>
    </span>
  );
}

export function GeoView() {
  const { types, areas, cube, years } = use(loadGeo());

  const [year, setYear] = useUrlState("year", years[0]!, (v) => years.includes(v));
  const [type, setType] = useUrlState<string>("type", "alone", (v) =>
    types.some((c) => c.code === v),
  );
  const [area, setArea] = useUrlState<string>("area", "", (v) =>
    v === "" || areas.some((a) => a.code === v && a.code !== "00000"),
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const prefectures = useMemo(() => areas.slice(1), [areas]);

  const rows = useMemo(() => {
    const of = (item: { code: string; label: string }) => ({
      ...item,
      households: cube.series("households", "area", { type: item.code, year }),
      share: cube.series("share", "area", { type: item.code, year }),
      relative: cube.series("relative", "area", { type: item.code, year }),
    });

    const total = of({ code: TOTAL_TYPE, label: "総数（すべての世帯）" });
    const others = types
      .filter((o) => o.code !== TOTAL_TYPE)
      .map((o) => of(o))
      .sort((a, b) => (b.households[0] ?? 0) - (a.households[0] ?? 0));

    return [total, ...others];
  }, [types, cube, year]);

  const current = rows.find((r) => r.code === type) ?? rows[0]!;

  const picker = useMemo(
    (): PickerRow[] =>
      rows.map((r) => ({
        code: r.code,
        label: r.label,
        households: r.households[0] ?? 0,
      })),
    [rows],
  );

  const tiles = useMemo(
    (): Tile[] =>
      prefectures.map((a, i) => {
        const relative = current.relative[i + 1] ?? null;
        const households = current.households[i + 1] ?? null;
        const certain =
          current.code !== TOTAL_TYPE &&
          relative !== null &&
          households !== null &&
          Math.abs(relative - 1) >= 0.05;
        return { code: a.code, label: a.label, relative, households, certain };
      }),
    [prefectures, current],
  );

  const ranked = useMemo(
    () =>
      tiles
        .filter((t): t is Tile & { relative: number } => t.relative !== null)
        .sort((a, b) => b.relative - a.relative),
    [tiles],
  );

  const rankOf = useMemo(
    () => new Map(ranked.map((t, i) => [t.code, i + 1])),
    [ranked],
  );

  const areaIndex = area === "" ? -1 : areas.findIndex((a) => a.code === area);
  const pinnedTile = areaIndex < 1 ? undefined : tiles.find((t) => t.code === area);

  const standout = useMemo(() => {
    const empty = {
      high: [] as StandoutRow[],
      low: [] as StandoutRow[],
      moreHigh: 0,
      moreLow: 0,
    };
    if (areaIndex < 1) return empty;

    const mid = rows
      .filter((r) => r.code !== TOTAL_TYPE)
      .flatMap((r) => {
        const relative = r.relative[areaIndex] ?? null;
        const households = r.households[areaIndex] ?? null;
        if (relative === null || households === null) return [];
        if (Math.abs(relative - 1) < 0.08) return [];
        return [
          {
            code: r.code,
            label: r.label,
            households,
            relative,
          } satisfies StandoutRow,
        ];
      });

    const highAll = mid.filter((r) => r.relative > 1).sort((a, b) => b.relative - a.relative);
    const lowAll = mid.filter((r) => r.relative < 1).sort((a, b) => a.relative - b.relative);
    return {
      high: highAll.slice(0, STANDOUT),
      low: lowAll.slice(0, STANDOUT),
      moreHigh: Math.max(0, highAll.length - STANDOUT),
      moreLow: Math.max(0, lowAll.length - STANDOUT),
    };
  }, [areaIndex, rows]);

  const focusCode = hovered ?? (area === "" ? null : area);
  const focus = focusCode === null ? undefined : tiles.find((t) => t.code === focusCode);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <h2 className="flex items-baseline justify-between px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          <span>
            家族類型 <span className="font-normal">{picker.length}項目</span>
          </span>
          <span className="font-normal">全国の世帯</span>
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TypePicker rows={picker} selected={current.code} onSelect={setType} />
        </div>
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          多い順。地図の色は構成比の全国比。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate text-[19px] font-semibold tracking-tight">
              {current.label}
            </h1>
            <p className="tnum shrink-0 text-[13px] text-muted">
              全国 {int.format(current.households[0] ?? 0)}世帯
            </p>
          </div>
          <YearSelect years={years} value={year} onChange={setYear} />
        </header>

        <p className="tnum min-h-9 pb-4 text-[12.5px]">
          {focus !== undefined ? (
            <>
              <span className="font-semibold">{focus.label}</span>
              <span className="text-muted">
                {focus.households !== null && ` ${int.format(focus.households)}世帯`}
                {focus.relative === null
                  ? " データなし"
                  : ` · 全国の${one.format(focus.relative)}倍 · ${ranked.length}県中${rankOf.get(focus.code)}位`}
              </span>
            </>
          ) : (
            <Headline
              ranked={ranked}
              households={current.households[0] ?? 0}
              share={current.share[0] ?? null}
            />
          )}
        </p>

        <TileMap
          tiles={tiles}
          hovered={hovered}
          onHover={setHovered}
          pinned={area === "" ? null : area}
          onPin={(code) => setArea(code ?? "")}
        />

        {pinnedTile !== undefined && (
          <AreaTypes
            areaLabel={pinnedTile.label}
            high={standout.high}
            low={standout.low}
            moreHigh={standout.moreHigh}
            moreLow={standout.moreLow}
            selected={current.code}
            onSelect={setType}
            onClear={() => setArea("")}
          />
        )}

        <p className="mt-5 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          数値は県の当該類型構成比を全国の構成比で割った相対値。全国が1。将来推計は都道府県軸がないため載せない。
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          地図は模式図。色の尺度は全類型で共通（全国の1/1.5〜1.5倍）。
        </p>
      </main>
    </div>
  );
}
