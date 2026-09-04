/**
 * 等幅の選択肢を並べる切替。
 * 選択インジケータは transform だけを動かすので、GPU から降りない。
 */

export interface Option<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative isolate inline-grid rounded-md bg-ink/[0.055] p-0.5"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 -z-10 rounded-[5px] bg-surface shadow-[0_1px_2px_rgba(22,20,15,0.12)] transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer px-3 py-1 text-[12px] font-medium transition-[color,transform] duration-150 ease-out active:scale-[0.97] ${
            o.value === value ? "text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
