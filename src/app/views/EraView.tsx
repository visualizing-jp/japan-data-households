/**
 * 時代ビュー。1995–2050 の家族類型別世帯数・構成比・平均人員。
 */

import { use, useMemo, useState } from "react";
import { loadEra, loadElderlyAlone } from "../data/chunks.ts";
import { listTypes } from "../data/hierarchy.ts";
import { MARKS, NOTES, PROJECTED_FROM } from "../data/annotations.ts";
import { TypeList } from "../components/TypeList.tsx";
import { TrendStack, type Panel, type Point } from "../components/TrendStack.tsx";
import { useWidth } from "../hooks/useWidth.ts";
import { useUrlState } from "../hooks/useUrlState.ts";

const FROM = 1995;
const TO = 2050;

const int = new Intl.NumberFormat("ja-JP");
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const meanFmt = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function dense(years: number[], values: (number | null)[]): Point[] {
  const byYear = new Map(years.map((y, i) => [y, values[i] ?? null]));
  return Array.from({ length: TO - FROM + 1 }, (_, i) => ({
    year: FROM + i,
    value: byYear.get(FROM + i) ?? null,
  }));
}

export function EraView() {
  const { types, cube, years } = use(loadEra());
  const elderly = use(loadElderlyAlone());
  const selectable = useMemo(() => listTypes(types), [types]);
  const defaultType = selectable.find((t) => t.code === "alone")?.code ?? selectable[0]!.code;

  const [type, setType] = useUrlState<string>("type", defaultType, (v) =>
    selectable.some((c) => c.code === v),
  );
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();

  const current = selectable.find((c) => c.code === type)!;

  const rows = useMemo(
    () =>
      selectable.map((c) => ({
        type: c,
        values: cube.series("share", "year", { type: c.code }),
      })),
    [selectable, cube],
  );

  const panels = useMemo((): Panel[] => {
    const at = (measure: string) => cube.series(measure, "year", { type });
    const panels: Panel[] = [
      {
        key: "households",
        title: "世帯数",
        unit: "世帯",
        format: (v) => int.format(Math.round(v)),
        formatTick: (v) =>
          v >= 1_000_000 ? `${int.format(Math.round(v / 10_000))}万` : int.format(v),
        series: [
          {
            key: "households",
            label: "",
            points: dense(years, at("households")),
            emphasized: true,
            markSparseSamples: true,
            projectedFrom: PROJECTED_FROM,
          },
        ],
      },
      {
        key: "share",
        title: "構成比",
        unit: "一般世帯全体に占める割合",
        format: (v) => `${pct.format(v * 100)}%`,
        formatTick: (v) => `${pct.format(v * 100)}%`,
        series: [
          {
            key: "share",
            label: "",
            points: dense(years, at("share")),
            emphasized: true,
            markSparseSamples: true,
            projectedFrom: PROJECTED_FROM,
          },
        ],
      },
    ];

    if (type === "alone") {
      const elderlyPts = dense(
        elderly.years,
        elderly.cube.series("households", "year", { sex: "total" }),
      );
      panels[0]!.series.push({
        key: "elderly",
        label: "65歳以上単独",
        points: elderlyPts,
        emphasized: false,
        markSparseSamples: true,
      });
    }

    // 平均人員は総数選択時のみ意味があるが、パネルは常に総数の系列を出す
    const meanSeries = cube.series("meanSize", "year", { type: "total" });
    panels.push({
      key: "meanSize",
      title: "平均世帯人員",
      unit: "人（一般世帯総数）",
      format: (v) => meanFmt.format(v),
      formatTick: (v) => meanFmt.format(v),
      series: [
        {
          key: "meanSize",
          label: "",
          points: dense(years, meanSeries),
          emphasized: true,
          markSparseSamples: true,
          projectedFrom: PROJECTED_FROM,
        },
      ],
    });

    return panels;
  }, [cube, type, years, elderly]);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[288px] shrink-0 max-lg:w-full">
        <h2 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          家族類型（5類型）
        </h2>
        <div className="max-h-[70vh] overflow-y-auto lg:max-h-[calc(100dvh-8rem)]">
          <TypeList rows={rows} years={years} selected={type} onSelect={setType} />
        </div>
        <p className="px-2 pt-3 text-[10.5px] leading-relaxed text-faint">
          折れ線は構成比の推移。高さは項目ごとに正規化してあるので、項目間の大小は比べられない。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">{current.label}</h1>
            <p
              className={`tnum text-[13px] ${hoverYear === null ? "text-faint" : "text-ink"}`}
            >
              {hoverYear ?? TO}年
              {(hoverYear ?? TO) >= PROJECTED_FROM && (
                <span className="ml-1.5 text-[11px] font-normal text-faint">推計</span>
              )}
            </p>
          </div>
        </header>

        <div ref={ref} className="min-h-[420px]">
          {width > 0 && (
            <TrendStack
              panels={panels}
              domain={[FROM, TO]}
              width={width}
              hoverYear={hoverYear}
              onHoverYear={setHoverYear}
            />
          )}
        </div>

        <section className="mt-6 border-t border-rule pt-4">
          <h2 className="text-[11px] font-semibold tracking-wide text-faint">注記</h2>
          <dl className="mt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              ...MARKS.map((m) => ({
                key: String(m.year),
                term: `${m.year}年 · ${m.label}`,
                detail: m.detail,
              })),
              ...NOTES.map((n) => ({
                key: n.term,
                term: n.term,
                detail: n.detail,
              })),
            ].map((n) => (
              <div key={n.key}>
                <dt className="tnum text-[12px] font-semibold">{n.term}</dt>
                <dd className="text-[11.5px] leading-relaxed text-muted">{n.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
