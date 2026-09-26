// シリーズ共通のブランド要素。全サイトで同じ内容を持つので、変えるときは japan-data 配下の兄弟リポすべてに揃える。

export const HUB_URL = "https://japan-data.visualizing.jp/";
export const HUB_TITLE = "日本人は、どう生きてきたか";
export const VISUALIZING_URL = "https://visualizing.jp/";

/**
 * visualizing.jp のマーク（V と、線で結ばれた2点）。
 * 紙の上で沈まないよう V と線は文字色に従わせ、2点だけブランドのピンクを残す。
 */
export function VisualizingMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="72 54 156 192"
      aria-hidden
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path
        transform="translate(0 300) scale(.01 -.01)"
        fill="currentColor"
        d="M7765 18894 c-232 -37 -260 -97 -260 -554 0 -578 8 -586 610 -600 610 -15 798 -108 1138 -563 383 -512 531 -825 1708 -3619 514 -1222 624 -1469 1592 -3593 702 -1541 1503 -3230 1664 -3505 367 -631 540 -774 933 -773 464 0 564 111 1068 1188 121 259 421 900 667 1425 246 525 769 1648 1162 2495 1267 2732 1304 2797 2020 3532 403 413 476 472 716 575 260 112 534 154 1086 167 530 12 526 8 526 581 0 589 -2 590 -805 545 -1431 -81 -2775 -81 -4343 0 -816 42 -812 45 -812 -540 0 -554 14 -572 455 -586 736 -22 1115 -436 1016 -1109 -43 -291 -754 -2122 -1220 -3139 -137 -301 -224 -365 -345 -256 -63 58 -29 -27 -1091 2650 -762 1920 -1310 3582 -1310 3977 0 342 316 547 845 548 481 1 534 60 535 595 0 578 -25 592 -945 541 -1454 -81 -4343 -81 -5900 -1 -330 17 -666 26 -710 19z"
      />
      <path
        d="M108.5 72.5L194.5 100"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={8}
      />
      <circle cx="108.5" cy="72.5" r="15.5" fill="#e645a2" />
      <circle cx="194.5" cy="100" r="15.5" fill="#e645a2" />
    </svg>
  );
}

const LINK = "transition-colors duration-150 ease-[var(--ease-out)]";

/** ヘッダー最上段。左にシリーズ表紙への帰り道、右に制作者のマーク。 */
export function SeriesBar() {
  return (
    <div className="border-b border-rule">
      <div className="mx-auto flex h-10 w-full max-w-[1240px] items-center justify-between gap-4 px-6">
        <a
          href={HUB_URL}
          className={`group inline-flex min-w-0 items-center gap-2 text-[11px] tracking-[0.06em] text-muted ${LINK} hover:text-ink`}
        >
          <span
            aria-hidden
            className="transition-transform duration-150 ease-[var(--ease-out)] group-hover:-translate-x-0.5"
          >
            ←
          </span>
          <span className="truncate">{HUB_TITLE}</span>
          <span className="hidden text-faint sm:inline">シリーズ一覧</span>
        </a>
        <a
          href={VISUALIZING_URL}
          aria-label="visualizing.jp"
          className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] tracking-[0.08em] text-muted ${LINK} hover:text-ink`}
        >
          <VisualizingMark className="h-[18px] w-auto" />
          <span className="hidden min-[26rem]:inline">visualizing.jp</span>
        </a>
      </div>
    </div>
  );
}

/** フッター末尾。読み終えた人にも表紙への帰り道と制作者を示す。 */
export function SeriesFooter() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-rule pt-6">
      <a
        href={HUB_URL}
        className={`group inline-flex items-center gap-2 text-[12px] tracking-[0.06em] text-muted ${LINK} hover:text-ink`}
      >
        <span
          aria-hidden
          className="transition-transform duration-150 ease-[var(--ease-out)] group-hover:-translate-x-0.5"
        >
          ←
        </span>
        シリーズ「{HUB_TITLE}」の一覧へ
      </a>
      <a
        href={VISUALIZING_URL}
        className={`inline-flex items-center gap-2.5 text-muted ${LINK} hover:text-ink`}
      >
        <VisualizingMark className="h-8 w-auto" />
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] tracking-[0.08em] text-faint">
            Visualized by
          </span>
          <span className="text-[13px] font-medium tracking-[0.04em]">
            visualizing.jp
          </span>
        </span>
      </a>
    </div>
  );
}
