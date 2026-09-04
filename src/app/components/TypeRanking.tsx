/**
 * 選んだ世帯主年齢での家族類型ランキング。
 * 右端のスパークは各年齢階級での構成比。
 */

import { line } from "d3-shape";
import { scaleLinear } from "d3-scale";

const SPARK_W = 76;
const SPARK_H = 18;

const int = new Intl.NumberFormat("ja-JP");
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface RankRow {
  code: string;
  label: string;
  households: number;
  share: number;
  shareByAge: number[];
  /** 高齢単身など強調したい行。 */
  emphasize?: boolean;
}

export function TypeRanking({
  rows,
  ageIndex,
}: {
  rows: RankRow[];
  ageIndex: number | null;
}) {
  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => (
        <li
          key={row.code}
          className={`flex items-center gap-3 rounded px-2 py-[3px] transition-colors duration-150 hover:bg-ink/[0.03] ${
            row.emphasize ? "bg-accent-soft/40" : ""
          }`}
        >
          <span className="tnum w-4 shrink-0 text-right text-[11px] text-faint">
            {i + 1}
          </span>
          <span
            className={`w-[10rem] shrink-0 truncate text-[12.5px] max-md:w-[8rem] ${
              row.emphasize ? "font-semibold" : ""
            }`}
            title={row.label}
          >
            {row.label}
          </span>
          <span className="hidden h-[10px] min-w-0 flex-1 bg-ink/[0.05] sm:block">
            <span
              className="block h-full bg-accent/70"
              style={{ width: `${row.share * 100}%` }}
            />
          </span>
          <span className="tnum w-[4.5rem] shrink-0 text-right text-[12px]">
            {int.format(row.households)}
          </span>
          <span className="tnum w-[3.25rem] shrink-0 text-right text-[11px] text-muted">
            {pct.format(row.share * 100)}%
          </span>
          <Spark values={row.shareByAge} markAt={ageIndex} />
        </li>
      ))}
    </ol>
  );
}

function Spark({ values, markAt }: { values: number[]; markAt: number | null }) {
  const max = Math.max(...values, 0);
  const x = scaleLinear()
    .domain([0, Math.max(values.length - 1, 1)])
    .range([1, SPARK_W - 1]);
  const y = scaleLinear()
    .domain([0, max || 1])
    .range([SPARK_H - 2, 2]);
  const path = line<number>()
    .x((_, i) => x(i))
    .y((v) => y(v));

  return (
    <svg width={SPARK_W} height={SPARK_H} className="shrink-0" aria-hidden>
      <path
        d={path(values) ?? undefined}
        fill="none"
        className="stroke-muted"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {markAt !== null && values[markAt] !== undefined && (
        <circle cx={x(markAt)} cy={y(values[markAt]!)} r={2} className="fill-accent" />
      )}
    </svg>
  );
}
