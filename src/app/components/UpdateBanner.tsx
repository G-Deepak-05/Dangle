import { useState } from "react";
import { backend } from "../../ipc/backend";
import { useUpdate } from "../hooks";

/** A quiet note that appears only when a newer, verified release is available. */
export function UpdateBanner() {
  const update = useUpdate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!update) return null;

  const install = async () => {
    setBusy(true);
    setError(null);
    try {
      await backend.installUpdate();
    } catch (err) {
      setError(typeof err === "string" ? err : "The update couldn't be installed.");
      setBusy(false);
    }
  };

  return (
    <div className="update-banner" role="status">
      <div>
        <strong>Dangle {update.version} is ready</strong>
        <span>{error ?? (busy ? "Downloading and installing…" : "Restart to get the latest charms and fixes.")}</span>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => void install()} disabled={busy}>
        {busy ? "Updating…" : "Restart to update"}
      </button>
    </div>
  );
}
