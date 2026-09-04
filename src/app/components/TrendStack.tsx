/**
 * x 軸を共有した折れ線の積み重ね。
 * 推計区間は破線＋帯ラベルで実績と区別する。
 */

import { useRef, useState, type PointerEvent } from "react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { MARKS, SPANS } from "../data/annotations.ts";

export interface Point {
  year: number;
  /** null は欠測。線はここで途切れる。 */
  value: number | null;
}

export interface Series {
  key: string;
  label: string;
  points: Point[];
  /** 選択中の系列を実線・濃色に、それ以外を細線・淡色にする。 */
  emphasized: boolean;
  /** 標本が飛んでいる区間に丸を打つ。毎年の区間は線のままにして騒がしくしない。 */
  markSparseSamples?: boolean;
  /** この年以降を推計（破線）。直前の観測点からつなぐ。 */
  projectedFrom?: number;
}

/** 前後の観測が1年隣ではない点。5年おきに公表されていた区間だけが残る。 */
function sparseSamples(points: Point[]): Point[] {
  const observed = points.filter((p) => p.value !== null);
  return observed.filter((p, i) => {
    const prev = observed[i - 1];
    const next = observed[i + 1];
    return (
      (prev === undefined || p.year - prev.year > 1) &&
      (next === undefined || next.year - p.year > 1)
    );
  });
}

export interface Panel {
  key: string;
  title: string;
  unit: string;
  series: Series[];
  /** 読み取り値の書式。桁は指標ごとに変える。 */
  format: (value: number) => string;
  /** 目盛りの書式。省略時は format と同じ。 */
  formatTick?: (value: number) => string;
  /** データの無い期間の説明。パネルの右上に小さく置く。 */
  coverage?: string;
}

const M = { left: 62, right: 34, top: 0, bottom: 26 };
const HEADER_H = 24;
const PLOT_H = 132;
const GAP = 18;

function xTicks(domain: [number, number]): number[] {
  const [from, to] = domain;
  const span = to - from;
  const step = span <= 20 ? 5 : span <= 50 ? 10 : 20;
  const start = Math.ceil(from / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= to; t += step) ticks.push(t);
  if (ticks[0] !== from) ticks.unshift(from);
  if (ticks.at(-1) !== to) ticks.push(to);
  return ticks;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (value <= step * mag) return step * mag;
  }
  return 10 * mag;
}

function splitProjected(
  points: Point[],
  projectedFrom: number | undefined,
): { actual: Point[]; projected: Point[] } {
  if (projectedFrom === undefined) {
    return { actual: points, projected: [] };
  }
  const actual = points.filter((p) => p.year < projectedFrom);
  const bridge = [...points].reverse().find((p) => p.year < projectedFrom && p.value !== null);
  const projected = points.filter((p) => p.year >= projectedFrom);
  if (bridge !== undefined && projected.length > 0) {
    return { actual, projected: [bridge, ...projected] };
  }
  return { actual, projected };
}

/**
 * 密な年次配列（欠測は null）に対して線を引く。
 * d3 の .defined() だと観測点のあいだの null で線が切れ、各点が
 * `M…Z` の1点セグメントになり画面上は線が消える。観測点だけをつなぐ。
 */
function seriesPathD(
  points: Point[],
  x: (year: number) => number,
  y: (value: number) => number,
): string | undefined {
  const observed = points.filter((p): p is { year: number; value: number } => p.value !== null);
  if (observed.length < 2) return undefined;
  return (
    line<{ year: number; value: number }>()
      .x((p) => x(p.year))
      .y((p) => y(p.value))(observed) ?? undefined
  );
}

export function TrendStack({
  panels,
  domain,
  width,
  hoverYear,
  onHoverYear,
}: {
  panels: Panel[];
  domain: [number, number];
  width: number;
  hoverYear: number | null;
  onHoverYear: (year: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [openMark, setOpenMark] = useState<number | null>(null);

  const height = panels.length * (HEADER_H + PLOT_H) + (panels.length - 1) * GAP + M.bottom;
  const x = scaleLinear().domain(domain).range([M.left, width - M.right]);

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect === undefined) return;
    const year = Math.round(x.invert(e.clientX - rect.left));
    onHoverYear(Math.min(domain[1], Math.max(domain[0], year)));
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="block touch-none select-none"
      onPointerMove={onMove}
      onPointerLeave={() => onHoverYear(null)}
    >
      {panels.map((panel, pi) => {
        const top = pi * (HEADER_H + PLOT_H + GAP);
        const plotTop = top + HEADER_H;
        const max = niceMax(
          Math.max(
            ...panel.series.flatMap((s) =>
              s.points.map((p) => (p.value === null ? 0 : p.value)),
            ),
            0,
          ),
        );
        const y = scaleLinear().domain([0, max]).range([plotTop + PLOT_H, plotTop]);
        const pathD = (points: Point[]) => seriesPathD(points, (year) => x(year), (v) => y(v));

        const readYear = hoverYear;
        const readout = panel.series
          .filter((s) => s.emphasized)
          .map((s) => {
            const p =
              readYear === null
                ? [...s.points].reverse().find((q) => q.value !== null)
                : s.points.find((q) => q.year === readYear);
            return { key: s.key, label: s.label, point: p ?? null };
          });

        return (
          <g key={panel.key}>
            <text x={M.left} y={top + 13} className="fill-ink text-[13px] font-semibold">
              {panel.title}
              <tspan className="fill-faint font-normal"> {panel.unit}</tspan>
            </text>
            <text
              x={width - M.right}
              y={top + 13}
              textAnchor="end"
              className="tnum fill-ink text-[13px] font-semibold"
            >
              {readout.map((r, i) => (
                <tspan key={r.key} dx={i === 0 ? 0 : 14}>
                  {readout.length > 1 && (
                    <tspan className="fill-muted text-[11px] font-normal">
                      {r.label}{" "}
                    </tspan>
                  )}
                  {r.point?.value == null ? "—" : panel.format(r.point.value)}
                </tspan>
              ))}
            </text>

            {[0, max / 2, max].map((v) => (
              <g key={v}>
                <line
                  x1={M.left}
                  x2={width - M.right}
                  y1={y(v)}
                  y2={y(v)}
                  className="stroke-rule"
                  strokeWidth={1}
                />
                <text
                  x={M.left - 8}
                  y={y(v) + 4}
                  textAnchor="end"
                  className="tnum fill-faint text-[10px]"
                >
                  {v === 0 ? "0" : (panel.formatTick ?? panel.format)(v)}
                </text>
              </g>
            ))}

            {SPANS.filter((s) => s.to >= domain[0] && s.from <= domain[1]).map((s) => {
              const x0 = x(Math.max(s.from - 0.5, domain[0]));
              const x1 = x(Math.min(s.to + 0.5, domain[1]));
              return s.kind === "missing" ? (
                <rect
                  key={s.label}
                  x={x0}
                  width={Math.max(1, x1 - x0)}
                  y={plotTop}
                  height={PLOT_H}
                  className="fill-ink/[0.06]"
                />
              ) : (
                <rect
                  key={s.label}
                  x={x0}
                  width={Math.max(1, x1 - x0)}
                  y={plotTop + PLOT_H - 2}
                  height={2.5}
                  className="fill-ink/25"
                />
              );
            })}

            {MARKS.filter((m) => m.year >= domain[0] && m.year <= domain[1]).map((m) => (
              <line
                key={m.year}
                x1={x(m.year)}
                x2={x(m.year)}
                y1={plotTop}
                y2={plotTop + PLOT_H}
                className="stroke-rule-strong"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            ))}

            {panel.series.map((s) => {
              const { actual, projected } = splitProjected(s.points, s.projectedFrom);
              return (
                <g key={s.key} className={s.emphasized ? "" : "opacity-45"}>
                  <path
                    d={pathD(actual)}
                    fill="none"
                    className={s.emphasized ? "stroke-accent" : "stroke-muted"}
                    strokeWidth={s.emphasized ? 1.75 : 1}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {projected.length > 0 && (
                    <path
                      d={pathD(projected)}
                      fill="none"
                      className={s.emphasized ? "stroke-accent" : "stroke-muted"}
                      strokeWidth={s.emphasized ? 1.75 : 1}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeDasharray="5 4"
                      opacity={0.85}
                    />
                  )}
                  {s.markSparseSamples &&
                    sparseSamples(s.points).map((p) => (
                      <circle
                        key={p.year}
                        cx={x(p.year)}
                        cy={y(p.value!)}
                        r={1.8}
                        className={s.emphasized ? "fill-accent" : "fill-muted"}
                      />
                    ))}
                  {panel.series.length > 1 &&
                    (() => {
                      const last = [...s.points].reverse().find((p) => p.value !== null);
                      if (last === undefined) return null;
                      return (
                        <text
                          x={x(last.year) + 5}
                          y={y(last.value!) + 3.5}
                          className={`text-[10px] font-medium ${
                            s.emphasized ? "fill-accent" : "fill-muted"
                          }`}
                        >
                          {s.label}
                        </text>
                      );
                    })()}
                </g>
              );
            })}

            {hoverYear !== null && (
              <g className="pointer-events-none">
                <line
                  x1={x(hoverYear)}
                  x2={x(hoverYear)}
                  y1={plotTop}
                  y2={plotTop + PLOT_H}
                  className="stroke-ink/35"
                  strokeWidth={1}
                />
                {panel.series.map((s) => {
                  const p = s.points.find((q) => q.year === hoverYear);
                  if (p?.value == null) return null;
                  return (
                    <circle
                      key={s.key}
                      cx={x(p.year)}
                      cy={y(p.value)}
                      r={3}
                      className={s.emphasized ? "fill-accent" : "fill-muted"}
                      stroke="var(--color-surface)"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </g>
            )}

            {panel.coverage !== undefined && (
              <text x={M.left + 4} y={plotTop + 12} className="fill-faint text-[10px]">
                {panel.coverage}
              </text>
            )}
          </g>
        );
      })}

      <g transform={`translate(0, ${height - M.bottom})`}>
        <line
          x1={M.left}
          x2={width - M.right}
          className="stroke-rule-strong"
          strokeWidth={1}
        />
        {xTicks(domain).map((t) => (
          <text
            key={t}
            x={x(t)}
            y={16}
            textAnchor="middle"
            className="tnum fill-muted text-[10px]"
          >
            {t}
          </text>
        ))}
        {hoverYear !== null && (
          <g className="pointer-events-none">
            <rect
              x={x(hoverYear) - 20}
              y={3}
              width={40}
              height={17}
              rx={3}
              className="fill-ink"
            />
            <text
              x={x(hoverYear)}
              y={16}
              textAnchor="middle"
              className="tnum fill-paper text-[10px] font-medium"
            >
              {hoverYear}
            </text>
          </g>
        )}
      </g>

      <g>
        {SPANS.filter(
          (s) => s.kind === "scope" && s.to >= domain[0] && s.from <= domain[1],
        ).map((s) => (
          <text
            key={s.label}
            x={x((Math.max(s.from, domain[0]) + Math.min(s.to, domain[1])) / 2)}
            y={HEADER_H + PLOT_H - 8}
            textAnchor="middle"
            className="fill-muted text-[9.5px]"
          >
            {s.label}
          </text>
        ))}
        {MARKS.filter((m) => m.year >= domain[0] && m.year <= domain[1]).map((m) => (
          <g
            key={m.year}
            className="cursor-help"
            onPointerEnter={() => setOpenMark(m.year)}
            onPointerLeave={() => setOpenMark(null)}
          >
            <rect
              x={x(m.year) - 5}
              y={HEADER_H - 4}
              width={10}
              height={PLOT_H}
              fill="transparent"
            />
            <text
              x={x(m.year)}
              y={HEADER_H + 12}
              textAnchor="middle"
              className={
                openMark === m.year
                  ? "fill-ink text-[10px] font-semibold"
                  : "fill-muted text-[10px] font-semibold"
              }
            >
              {m.year}
            </text>
          </g>
        ))}
      </g>

      {openMark !== null && (
        <MarkTooltip year={openMark} x={x(openMark)} width={width} y={HEADER_H + 18} />
      )}
    </svg>
  );
}

function MarkTooltip({
  year,
  x,
  y,
  width,
}: {
  year: number;
  x: number;
  y: number;
  width: number;
}) {
  const mark = MARKS.find((m) => m.year === year)!;
  const w = 260;
  const left = Math.min(Math.max(x - w / 2, 8), width - w - 8);
  return (
    <foreignObject x={left} y={y} width={w} height={140} className="pointer-events-none">
      <div className="rounded-md border border-rule bg-surface px-3 py-2 shadow-[0_6px_20px_-8px_rgba(22,20,15,0.3)]">
        <p className="text-[11px] font-semibold text-ink">
          {mark.year}年 · {mark.label}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">{mark.detail}</p>
      </div>
    </foreignObject>
  );
}
