import { Suspense } from "react";
import { EraView } from "./views/EraView.tsx";
import { HeadView } from "./views/HeadView.tsx";
import { GeoView } from "./views/GeoView.tsx";
import { useUrlState } from "./hooks/useUrlState.ts";

const VIEWS = [
  { id: "era", label: "時代", hint: "1995–2050", ready: true },
  { id: "head", label: "世帯主", hint: "年齢 × 類型", ready: true },
  { id: "geo", label: "地域", hint: "47都道府県", ready: true },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function App() {
  const [view, setView] = useUrlState<ViewId>("view", "era", (v) =>
    VIEWS.some((x) => x.id === v && x.ready),
  );

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-4 px-6 pt-5">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">
              日本人はどう暮らしてきたか
            </h1>
            <p className="text-[11px] text-muted">
              総務省「国勢調査」・社人研「日本の世帯数の将来推計」
            </p>
          </div>
          <nav className="flex gap-1 -mb-px" aria-label="ビュー">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={!v.ready}
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? "page" : undefined}
                className={`cursor-pointer border-b-2 px-3 pt-1 pb-2 text-[13px] transition-colors duration-150 disabled:cursor-not-allowed disabled:text-faint ${
                  view === v.id
                    ? "border-accent font-semibold text-ink"
                    : "border-transparent text-muted hover:text-ink disabled:hover:text-faint"
                }`}
              >
                {v.label}
                <span className="ml-1.5 text-[10px] font-normal text-faint">
                  {v.ready ? v.hint : "準備中"}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <Suspense key={view} fallback={<Loading />}>
        {view === "era" && <EraView />}
        {view === "head" && <HeadView />}
        {view === "geo" && <GeoView />}
      </Suspense>

      <footer className="mx-auto w-full max-w-[1240px] px-6 pt-2 pb-10 text-[11px] leading-relaxed text-faint">
        出典: 総務省「国勢調査」（e-Stat 経由）、国立社会保障・人口問題研究所「日本の世帯数の将来推計（全国推計）令和6(2024)年推計」。
        単位は一般世帯数とその構成比。2025年以降は推計。地域ビューに推計は含まない。
        <a
          href="https://visualizing.jp/"
          className="mt-2 block w-fit transition-colors duration-150 hover:text-muted"
        >
          visualizing.jp
        </a>
      </footer>
    </div>
  );
}

function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-16 text-[12px] text-faint">
      読み込み中
    </div>
  );
}
