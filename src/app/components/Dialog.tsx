import { useEffect, useRef, useState } from "react";
import { Store } from "../../state/stores";
import { useStore } from "../hooks";

/** The webview has no window.confirm/prompt, so dialogs are drawn in-app. */
type DialogRequest =
  | { kind: "confirm"; title: string; body?: string; confirmLabel: string; danger?: boolean; resolve: (ok: boolean) => void }
  | { kind: "prompt"; title: string; initial: string; confirmLabel: string; resolve: (value: string | null) => void };

const dialogStore = new Store<DialogRequest | null>(null);

export function confirmDialog(opts: { title: string; body?: string; confirmLabel?: string; danger?: boolean }) {
  return new Promise<boolean>((resolve) =>
    dialogStore.set({ kind: "confirm", confirmLabel: "OK", ...opts, resolve }),
  );
}

export function promptDialog(opts: { title: string; initial?: string; confirmLabel?: string }) {
  return new Promise<string | null>((resolve) =>
    dialogStore.set({ kind: "prompt", initial: "", confirmLabel: "Save", ...opts, resolve }),
  );
}

export function DialogHost() {
  const request = useStore(dialogStore);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return;
    if (request.kind === "prompt") {
      setValue(request.initial);
      requestAnimationFrame(() => inputRef.current?.select());
    } else {
      requestAnimationFrame(() => confirmRef.current?.focus());
    }
  }, [request]);

  if (!request) return null;

  const close = (ok: boolean) => {
    dialogStore.set(null);
    if (request.kind === "confirm") request.resolve(ok);
    else request.resolve(ok && value.trim() ? value.trim() : null);
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onSubmit={(e) => {
          e.preventDefault();
          close(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            close(false);
          }
        }}
      >
        <h2 id="dialog-title">{request.title}</h2>
        {request.kind === "confirm" && request.body && <p>{request.body}</p>}
        {request.kind === "prompt" && (
          <input
            ref={inputRef}
            className="input"
            maxLength={40}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={request.title}
          />
        )}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="submit"
            className={`btn ${request.kind === "confirm" && request.danger ? "btn-danger-fill" : "btn-primary"}`}
            disabled={request.kind === "prompt" && !value.trim()}
          >
            {request.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
