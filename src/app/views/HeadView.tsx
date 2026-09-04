/**
 * 世帯主ビュー。類型ランキング × 世帯主年齢 × 性 × 年。
 */

import { use, useMemo } from "react";
import { loadHeadAge, type Sex } from "../data/chunks.ts";
import { rankTypes, TOTAL_TYPE } from "../data/hierarchy.ts";
import { AgeList, type AgeRow } from "../components/AgeList.tsx";
import { TypeRanking, type RankRow } from "../components/TypeRanking.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const SEXES = [
  { value: "total", label: "総数" },
  { value: "male", label: "男" },
  { value: "female", label: "女" },
] as const satisfies readonly { value: Sex; label: string }[];

const ALL = "all";
/** 65歳以上の年齢コード（強調用）。 */
const ELDERLY_AGES = new Set(["250", "260", "280", "290", "310"]);

const int = new Intl.NumberFormat("ja-JP");
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const sum = (xs: (number | null)[]) => xs.reduce<number>((n, v) => n + (v ?? 0), 0);

export function HeadView() {
  const { types, ages, cube, years } = use(loadHeadAge());
  const selectable = useMemo(() => rankTypes(types), [types]);

  const [year, setYear] = useUrlState("year", years[0]!, (v) => years.includes(v));
  const [sex, setSex] = useUrlState<Sex>("sex", "total", (v) =>
    SEXES.some((s) => s.value === v),
  );
  const [age, setAge] = useUrlState<string>("age", ALL, (v) =>
    v === ALL || ages.some((a) => a.code === v),
  );

  const matrix = useMemo(
    () =>
      selectable.map((c) =>
        cube.series("households", "age", { type: c.code, sex, year }),
      ),
    [selectable, cube, sex, year],
  );
  const totalByAge = useMemo(
    () => cube.series("households", "age", { type: TOTAL_TYPE, sex, year }),
    [cube, sex, year],
  );

  const ageRows = useMemo((): AgeRow[] => {
    const bands = ages.map((a, i) => ({
      code: a.code,
      label: a.label,
      households: totalByAge[i] ?? 0,
    }));
    return [{ code: ALL, label: "全年齢", households: sum(totalByAge) }, ...bands];
  }, [ages, totalByAge]);

  const ageIndex = age === ALL ? null : ages.findIndex((a) => a.code === age);
  const total = ageIndex === null ? sum(totalByAge) : (totalByAge[ageIndex] ?? 0);
  const grandTotal = sum(totalByAge);
  const isElderly = age !== ALL && ELDERLY_AGES.has(age);

  const rows = useMemo(() => {
    return selectable
      .map((c, ci) => {
        const byAge = matrix[ci]!;
        const households = ageIndex === null ? sum(byAge) : (byAge[ageIndex] ?? 0);
        return {
          code: c.code,
          label: c.label,
          households,
          share: total === 0 ? 0 : households / total,
          shareByAge: byAge.map((v, ai) => {
            const t = totalByAge[ai] ?? 0;
            return t === 0 ? 0 : (v ?? 0) / t;
          }),
          emphasize: isElderly && c.code === "alone",
        } satisfies RankRow;
      })
      .filter((r) => r.households > 0)
      .sort((a, b) => b.households - a.households);
  }, [selectable, matrix, totalByAge, ageIndex, total, isElderly]);

  const label = ageIndex === null ? "全年齢" : ages[ageIndex]!.label;
  const isProjected = Number(year) >= 2025;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full">
        <h2 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          世帯主の年齢
        </h2>
        <AgeList rows={ageRows} selected={age} onSelect={setAge} />
        <p className="px-2 pt-3 text-[10.5px] leading-relaxed text-faint">
          バーは世帯数。65歳以上を選ぶと単独を強調する。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">{label}の暮らし方</h1>
            <p className="tnum text-[13px] text-muted">
              {int.format(total)}世帯
              {ageIndex !== null && grandTotal > 0 && (
                <span className="text-faint">
                  {" "}
                  · 全年齢の{pct.format((total / grandTotal) * 100)}%
                </span>
              )}
              {isProjected && (
                <span className="ml-1.5 text-[11px] text-faint">推計</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <YearSelect years={years} value={year} onChange={setYear} />
            <Segmented options={SEXES} value={sex} onChange={setSex} label="世帯主の男女" />
          </div>
        </header>

        <TypeRanking rows={rows} ageIndex={ageIndex} />

        <p className="mt-4 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          バーの長さはその年齢階級の一般世帯に占める割合。右端の折れ線は同じ割合を全階級について並べたもの（左が15–19歳）。2025年以降は社人研推計。
        </p>
      </main>
    </div>
  );
}
