import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { BackIcon } from "./Icons";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** Radio group with roving focus and arrow-key navigation. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: KeyboardEvent) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="segmented" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          className="segment"
          aria-checked={o.value === value}
          tabIndex={o.value === value || (index === -1 && i === 0) ? 0 : -1}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
    />
  );
}

export function SettingRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting">
      <div className="setting-text">
        <span className="setting-label" id={`${id}-label`}>
          {label}
        </span>
        {description && (
          <span className="setting-desc" id={`${id}-desc`}>
            {description}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <SettingRow id={id} label={label} description={description}>
      <Switch
        checked={checked}
        onChange={onChange}
        labelledBy={`${id}-label`}
        describedBy={description ? `${id}-desc` : undefined}
      />
    </SettingRow>
  );
}

export function BackBar({ title, onBack, children }: { title: string; onBack: () => void; children?: ReactNode }) {
  return (
    <div className="backbar" data-tauri-drag-region>
      <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
        <BackIcon size={18} />
      </button>
      <h1 data-tauri-drag-region>{title}</h1>
      <div style={{ flex: 1 }} data-tauri-drag-region />
      {children}
    </div>
  );
}
