import { THIS_DEVICE } from "../platform";
import type { Route } from "../../ipc/backend";
import { BackBar } from "../components/Controls";

export function Privacy({ go, embedded }: { go?: (r: Route) => void; embedded?: boolean }) {
  const body = (
      <div className="prose">
        <p>Dangle is a small thing that lives on your computer. It keeps everything here, too.</p>

        <h2>No account, no tracking</h2>
        <p>There’s nothing to sign up for. Dangle has no analytics and sends no telemetry. Everything works without an internet connection.</p>

        <h2>Your images stay yours</h2>
        <p>
          When you make a custom charm, the image is resized and cleaned up on {THIS_DEVICE}. Only that result is saved in
          Dangle’s own app data folder. Nothing is uploaded anywhere.
        </p>

        <h2>What Dangle stores</h2>
        <ul>
          <li>Your chosen charm, size, string, and motion settings</li>
          <li>Where the charm hangs and on which display</li>
          <li>Your favorites and the charms you’ve made</li>
        </ul>
        <p>Delete a custom charm and its files are removed. Quitting Dangle leaves no background processes behind.</p>

        <h2>Updates</h2>
        <p>
          Every few hours Dangle downloads a small public file from its GitHub releases to see whether a newer
          version exists. Nothing about you or your charms is sent. Updates are checked against a signature before
          they install. You can turn this off in Settings › Updates.
        </p>

        <h2>Image links</h2>
        <p>
          If you paste an image link in Create, Dangle downloads that one image so you can make a charm from it. It only
          happens when you ask, and links to your own computer or local network are refused.
        </p>

        <h2>Feedback</h2>
        <p>
          The Feedback screen never sends anything by itself. It opens a pre-filled GitHub issue in your browser for
          you to review, or copies your note so you can share it however you like.
        </p>

        <h2>If that ever changes</h2>
        <p>Any future analytics would be off by default and would only turn on if you choose to share them.</p>
      </div>
  );
  if (embedded) {
    return (
      <section className="panel" style={{ marginTop: 18 }}>
        <h2 className="panel-title">Privacy</h2>
        {body}
      </section>
    );
  }
  return (
    <div className="view">
      <BackBar title="Privacy" onBack={() => go?.("privacy")} />
      {body}
    </div>
  );
}
