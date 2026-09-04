import { useLayoutEffect, useRef, useState } from "react";

/**
 * 要素の実幅を測る。SVG の描画幅は CSS では決められないため。
 *
 * 初回はレイアウト直後に同期で確定させる。ResizeObserver の初回通知だけに頼ると、
 * 通知が届かない環境（描画が止まっている webview など）でチャートが永久に空のまま、
 * しかもエラーも出ないという最悪の壊れ方をする。
 * 監視はあくまで「その後の変化」を拾うためのもので、初期値の取得には使わない。
 */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;

    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return [ref, width] as const;
}
