/**
 * 年の選択。10年分あるのでセグメントでは横に長くなりすぎる。
 * 独自のポップオーバーは作らず、ネイティブの select に見た目だけ当てる。
 */

export function YearSelect({
  years,
  value,
  onChange,
}: {
  years: string[];
  value: string;
  onChange: (year: string) => void;
}) {
  return (
    <label className="relative flex items-center">
      <span className="sr-only">年</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-md border border-rule bg-surface py-1 pr-7 pl-3 text-[12px] font-medium transition-colors duration-150 hover:border-rule-strong"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}年
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 10 6"
        width="9"
        height="6"
        aria-hidden
        className="pointer-events-none absolute right-2.5 fill-none stroke-muted"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 1l4 4 4-4" />
      </svg>
    </label>
  );
}
