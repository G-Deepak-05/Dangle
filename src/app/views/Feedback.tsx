import { useState } from "react";
import { backend, type FeedbackKind, type Route } from "../../ipc/backend";
import { BackBar, Segmented } from "../components/Controls";
import { AlertIcon, CheckIcon } from "../components/Icons";
import { useAppInfo } from "../hooks";

const PLACEHOLDER: Record<FeedbackKind, string> = {
  bug: "What happened, and what did you expect? Steps to make it happen again help a lot.",
  idea: "What would make Dangle better for you? A charm you'd love, a feature, anything.",
  other: "Anything on your mind.",
};

export function Feedback({ go, onToast }: { go: (r: Route) => void; onToast: (msg: string) => void }) {
  const info = useAppInfo();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [includeInfo, setIncludeInfo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const systemLine = info ? `Dangle ${info.version} · ${info.os} · ${info.arch}` : "";

  const openOnGitHub = async () => {
    setError(null);
    try {
      await backend.openFeedback(kind, message, includeInfo);
      onToast("Opened GitHub in your browser");
    } catch (err) {
      setError(typeof err === "string" ? err : "Couldn't open your browser.");
    }
  };

  const copy = async () => {
    setError(null);
    const label = { bug: "Bug", idea: "Idea", other: "Feedback" }[kind];
    const text = [`${label}: ${message.trim()}`, includeInfo && systemLine ? `\n${systemLine}` : ""].join("");
    try {
      await navigator.clipboard.writeText(text);
      onToast("Copied. Paste it anywhere you like");
    } catch {
      setError("Couldn't copy to the clipboard.");
    }
  };

  return (
    <div className="view">
      <BackBar title="Feedback" onBack={() => go("privacy")} />

      <p className="help" style={{ marginTop: 0, fontSize: "0.95rem", color: "var(--ink-2)" }}>
        Found a bug or have an idea? I read every note.
      </p>

      <div className="field">
        <div className="field-label">What kind?</div>
        <Segmented<FeedbackKind>
          label="Feedback type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "bug", label: "Bug" },
            { value: "idea", label: "Idea" },
            { value: "other", label: "Other" },
          ]}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="feedback-message">
          Your note
        </label>
        <textarea
          id="feedback-message"
          className="input textarea"
          rows={7}
          maxLength={4000}
          placeholder={PLACEHOLDER[kind]}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <label className="checkbox-row">
        <input type="checkbox" checked={includeInfo} onChange={(e) => setIncludeInfo(e.target.checked)} />
        <span>
          Include app version and system
          {systemLine && <span className="field-note"> ({systemLine})</span>}
        </span>
      </label>

      {error && (
        <div className="notice notice-error" role="alert">
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}

      <div className="row" style={{ marginTop: 18 }}>
        <button type="button" className="btn" onClick={() => void copy()} disabled={!message.trim()}>
          Copy
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-primary" onClick={() => void openOnGitHub()}>
          Open on GitHub
        </button>
      </div>

      <div className="notice">
        <CheckIcon />
        <span>
          Dangle never sends anything by itself. “Open on GitHub” fills in a new issue in your browser, and you
          review it before posting. No GitHub account? Copy your note and share it however you like.
        </span>
      </div>
    </div>
  );
}
