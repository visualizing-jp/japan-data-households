/**
 * 家族類型を選ぶ一覧。名前と全国の世帯数だけを出す。
 */

import { useEffect, useRef } from "react";

const int = new Intl.NumberFormat("ja-JP");

export interface PickerRow {
  code: string;
  label: string;
  households: number;
}

export function TypePicker({
  rows,
  selected,
  onSelect,
}: {
  rows: PickerRow[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  const max = Math.max(...rows.slice(1).map((r) => r.households), 1);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <ul className="flex flex-col">
      {rows.map((row, i) => {
        const isSelected = row.code === selected;
        const isTotal = i === 0;
        return (
          <li key={row.code} className={isTotal ? "mb-1 border-b border-rule pb-1" : ""}>
            <button
              type="button"
              ref={isSelected ? selectedRef : null}
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
                className={`tnum w-[4.5rem] shrink-0 text-right text-[11px] ${
                  isSelected ? "text-ink" : "text-faint"
                }`}
              >
                {int.format(row.households)}
              </span>
              {isTotal ? (
                <span className="w-[52px] shrink-0" />
              ) : (
                <span className="h-[9px] w-[52px] shrink-0 bg-ink/[0.05]">
                  <span
                    className={`block h-full ${isSelected ? "bg-accent" : "bg-accent/45"}`}
                    style={{ width: `${(row.households / max) * 100}%` }}
                  />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
