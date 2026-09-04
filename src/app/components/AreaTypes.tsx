/**
 * 固定した県について、構成比が全国から離れている類型を出す。
 */

const int = new Intl.NumberFormat("ja-JP");
const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface StandoutRow {
  code: string;
  label: string;
  households: number;
  relative: number;
}

export function AreaTypes({
  areaLabel,
  high,
  low,
  moreHigh,
  moreLow,
  selected,
  onSelect,
  onClear,
}: {
  areaLabel: string;
  high: StandoutRow[];
  low: StandoutRow[];
  moreHigh: number;
  moreLow: number;
  selected: string;
  onSelect: (code: string) => void;
  onClear: () => void;
}) {
  const empty = high.length === 0 && low.length === 0;

  return (
    <section className="mt-6 border-t border-rule pt-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold tracking-tight">
          {areaLabel}が全国と違う類型
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-[11px] text-faint transition-colors duration-150 hover:text-ink"
        >
          県の選択を外す
        </button>
      </header>

      {empty ? (
        <p className="text-[12.5px] text-muted">どの類型でも全国平均との差が小さい。</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <Side title="高い" rows={high} more={moreHigh} selected={selected} onSelect={onSelect} />
          <Side title="低い" rows={low} more={moreLow} selected={selected} onSelect={onSelect} />
        </div>
      )}
    </section>
  );
}

function Side({
  title,
  rows,
  more,
  selected,
  onSelect,
}: {
  title: string;
  rows: StandoutRow[];
  more: number;
  selected: string;
  onSelect: (code: string) => void;
}) {
  return (
    <div>
      <h3 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-2 text-[12px] text-faint">該当なし</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => {
            const isSelected = row.code === selected;
            return (
              <li key={row.code}>
                <button
                  type="button"
                  onClick={() => onSelect(row.code)}
                  aria-pressed={isSelected}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-[3px] text-left transition-colors duration-150 ${
                    isSelected ? "bg-ink/[0.06]" : "hover:bg-ink/[0.03]"
                  }`}
                >
                  <span
                    className={`min-w-0 flex-1 truncate text-[12px] ${
                      isSelected ? "font-semibold text-ink" : "text-muted"
                    }`}
                    title={row.label}
                  >
                    {row.label}
                  </span>
                  <span
                    className={`tnum w-[4rem] shrink-0 text-right text-[11px] ${
                      isSelected ? "text-ink" : "text-faint"
                    }`}
                  >
                    {int.format(row.households)}
                  </span>
                  <span className="tnum w-[3.25rem] shrink-0 text-right text-[12px] font-medium">
                    {one.format(row.relative)}倍
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {more > 0 && <p className="px-2 pt-1 text-[11px] text-faint">ほか {more} 項目</p>}
    </div>
  );
}
