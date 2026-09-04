/**
 * Google Analytics 4。測定IDが空のあいだは何もしない。
 *
 * 画面の切り替えは history.replaceState だけで、パスは変わらずクエリだけが変わる。
 * 既定の page_view は初回しか飛ばないので、URL が変わったときだけもう一度送る。
 */

const MEASUREMENT_ID: string = "G-2J4CRWHPDB";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let lastPath = "";

export function initAnalytics(): void {
  if (MEASUREMENT_ID === "" || window.gtag !== undefined) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag は arguments オブジェクトをそのまま積む。配列に包むと計測が落ちる。
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);
  lastPath = `${location.pathname}${location.search}`;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

let timer = 0;

/** 同じティックで複数のクエリが書き換わるので、一度にまとめて送る。 */
export function schedulePageView(): void {
  if (MEASUREMENT_ID === "" || window.gtag === undefined) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    const path = `${location.pathname}${location.search}`;
    if (path === lastPath) return;
    lastPath = path;
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: location.href,
    });
  }, 0);
}
