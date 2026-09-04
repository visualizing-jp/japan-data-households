/**
 * 都道府県のタイル地図。類型構成比の全国比（relative）を升目に書く。
 * 全国=1。色尺度は類型横断で固定（1/1.5〜1.5）。
 */

import { scaleLinear } from "d3-scale";

const LAYOUT = [
  "........................01",
  "........................02",
  "......................0503",
  "......................0604",
  "....................1507..",
  "..............171620100908",
  "..............1821..111312",
  "....3231..2625..23221914..",
  "..35343328272924..........",
  "404438373630..............",
  "4143..39..................",
  "424645....................",
  "..........................",
  "47........................",
];

const COLS = 13;

const BELOW = "#8fb4cc";
const MIDDLE = "#ffffff";
const ABOVE = "#dd9583";

export interface Tile {
  code: string;
  label: string;
  relative: number | null;
  households: number | null;
  /** 塗るかどうか。差が見えにくいセルは塗らない。 */
  certain: boolean;
}

function short(label: string): string {
  return label.replace(/[都府県]$/, "");
}

const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const RATIO = 1.5;
const color = scaleLinear<string>()
  .domain([-Math.log(RATIO), 0, Math.log(RATIO)])
  .range([BELOW, MIDDLE, ABOVE])
  .clamp(true);

export function TileMap({
  tiles,
  hovered,
  onHover,
  pinned,
  onPin,
}: {
  tiles: Tile[];
  hovered: string | null;
  onHover: (code: string | null) => void;
  pinned: string | null;
  onPin: (code: string | null) => void;
}) {
  const byPrefix = new Map(tiles.map((t) => [t.code.slice(0, 2), t]));

  return (
    <div className="mx-[-0.5rem] overflow-x-auto px-2">
      <div
        className="grid aspect-[13/14] max-w-[700px] min-w-[560px] gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${LAYOUT.length}, minmax(0, 1fr))`,
        }}
        onMouseLeave={() => onHover(null)}
      >
        <div
          className="flex flex-col justify-start pt-1"
          style={{ gridColumn: "1 / 8", gridRow: "1 / 6" }}
        >
          <Legend />
        </div>
        {LAYOUT.flatMap((row, r) =>
          Array.from({ length: COLS }, (_, c) => {
            const prefix = row.slice(c * 2, c * 2 + 2);
            const tile = prefix === ".." ? undefined : byPrefix.get(prefix);
            if (tile === undefined) return null;
            const isPinned = tile.code === pinned;
            return (
              <button
                type="button"
                key={tile.code}
                aria-pressed={isPinned}
                onClick={() => onPin(isPinned ? null : tile.code)}
                onMouseEnter={() => onHover(tile.code)}
                onFocus={() => onHover(tile.code)}
                onBlur={() => onHover(null)}
                title={`${tile.label} ${tile.relative ?? "—"}`}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-[3px] border transition-[box-shadow,transform] duration-150 ease-out active:scale-[0.97] ${
                  isPinned
                    ? "border-ink shadow-[0_0_0_1.5px_var(--color-ink)]"
                    : tile.code === hovered
                      ? "border-ink"
                      : "border-rule"
                }`}
                style={{
                  gridColumn: c + 1,
                  gridRow: r + 1,
                  backgroundColor:
                    tile.relative === null || !tile.certain
                      ? "var(--color-paper)"
                      : color(Math.log(tile.relative)),
                }}
              >
                <span className="text-[9.5px] leading-tight text-ink/70">
                  {short(tile.label)}
                </span>
                <span
                  className={`tnum text-[11px] leading-tight ${
                    tile.certain ? "font-medium" : "text-faint"
                  }`}
                >
                  {tile.relative === null ? "—" : one.format(tile.relative)}
                </span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="text-[10.5px] leading-relaxed text-muted">
      <p className="pb-1.5">全国を1とした構成比の相対値</p>
      <div className="flex items-center gap-2">
        <span className="tnum">{one.format(1 / RATIO)}</span>
        <span
          className="h-[7px] flex-1 rounded-full border border-rule"
          style={{
            background: `linear-gradient(to right, ${BELOW}, ${MIDDLE}, ${ABOVE})`,
          }}
        />
        <span className="tnum">{one.format(RATIO)}</span>
      </div>
      <p className="pt-1 text-faint">尺度は全類型で共通。外れる県は端の色で止まる。</p>
    </div>
  );
}

if (import.meta.env.DEV) {
  const codes = LAYOUT.flatMap((row) => row.match(/../g) ?? []).filter((s) => s !== "..");
  if (new Set(codes).size !== 47) {
    throw new Error(`タイル配置の県が ${new Set(codes).size} 個しかない`);
  }
  if (LAYOUT.some((row) => row.length !== COLS * 2)) {
    throw new Error(`タイル配置の行の長さが ${COLS * 2} 文字でない`);
  }
}
