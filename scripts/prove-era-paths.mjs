/**
 * Era 折れ線の path `d` が L を含むことをデータから証明する。
 * 使い方: node scripts/prove-era-paths.mjs
 */
import { readFileSync } from "fs";
import { line } from "d3-shape";
import { scaleLinear } from "d3-scale";

const FROM = 1995;
const TO = 2050;
const PROJECTED_FROM = 2025;
const M = { left: 62, right: 34 };
const width = 700;
const plotTop = 24;
const PLOT_H = 132;

const raw = JSON.parse(readFileSync(new URL("../public/data/era.json", import.meta.url), "utf8"));
const yearDim = raw.dims.find((d) => d.name === "year");
const dims = raw.dims;
const strideOf = new Map(
  dims.map((d, i) => [d.name, dims.slice(i + 1).reduce((n, x) => n * x.codes.length, 1)]),
);
const indexOf = new Map(dims.map((d) => [d.name, new Map(d.codes.map((c, i) => [c, i]))]));

function offset(coords) {
  let o = 0;
  for (const d of dims) o += indexOf.get(d.name).get(coords[d.name]) * strideOf.get(d.name);
  return o;
}

function series(measure, type) {
  const values = raw.measures[measure];
  const codes = yearDim.codes;
  const stride = strideOf.get("year");
  const base = offset({ type, year: codes[0] });
  return codes.map((_, i) => values[base + i * stride] ?? null);
}

function dense(years, values) {
  const byYear = new Map(years.map((y, i) => [y, values[i] ?? null]));
  return Array.from({ length: TO - FROM + 1 }, (_, i) => ({
    year: FROM + i,
    value: byYear.get(FROM + i) ?? null,
  }));
}

function splitProjected(points, projectedFrom) {
  const actual = points.filter((p) => p.year < projectedFrom);
  const bridge = [...points].reverse().find((p) => p.year < projectedFrom && p.value !== null);
  const projected = points.filter((p) => p.year >= projectedFrom);
  if (bridge !== undefined && projected.length > 0) {
    return { actual, projected: [bridge, ...projected] };
  }
  return { actual, projected };
}

/** TrendStack.seriesPathD と同じロジック */
function seriesPathD(points, x, y) {
  const observed = points.filter((p) => p.value !== null);
  if (observed.length < 2) return undefined;
  return line().x((p) => x(p.year)).y((p) => y(p.value))(observed) ?? undefined;
}

const years = yearDim.codes.map(Number);
const points = dense(years, series("households", "alone"));
const x = scaleLinear().domain([FROM, TO]).range([M.left, width - M.right]);
const max = Math.max(...points.map((p) => p.value ?? 0));
const y = scaleLinear().domain([0, max]).range([plotTop + PLOT_H, plotTop]);
const { actual, projected } = splitProjected(points, PROJECTED_FROM);

const broken = line()
  .defined((p) => p.value !== null)
  .x((p) => x(p.year))
  .y((p) => y(p.value));

function stats(d) {
  return {
    M: (d.match(/M/g) || []).length,
    L: (d.match(/L/g) || []).length,
    Z: (d.match(/Z/g) || []).length,
    head: d.slice(0, 100),
  };
}

const fixedActual = seriesPathD(actual, (yr) => x(yr), (v) => y(v));
const fixedProjected = seriesPathD(projected, (yr) => x(yr), (v) => y(v));
const brokenActual = broken(actual);
const brokenProjected = broken(projected);

console.log("year gaps in era.json:", [...new Set(years.slice(1).map((y, i) => y - years[i]))]);
console.log("BROKEN actual", stats(brokenActual));
console.log("FIXED  actual", stats(fixedActual));
console.log("FIXED  projected", stats(fixedProjected));

if (stats(fixedActual).L < 2 || stats(fixedProjected).L < 2) {
  console.error("FAIL: fixed paths must contain multiple L commands");
  process.exit(1);
}
if (stats(brokenActual).L !== 0) {
  console.warn("unexpected: broken actual had L commands");
}
console.log("OK: fixed paths have L segments; .defined() on dense data does not.");
