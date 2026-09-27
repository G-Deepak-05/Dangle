import { THIS_DEVICE } from "../platform";
import type { Route } from "../../ipc/backend";
import { BackBar } from "../components/Controls";

export function Privacy({ go }: { go: (r: Route) => void }) {
  return (
    <div className="view">
      <BackBar title="Privacy" onBack={() => go("settings")} />
      <div className="prose">
        <p>Dangle is a small thing that lives on your computer. It keeps everything here, too.</p>

        <h2>No account, no tracking</h2>
        <p>There’s nothing to sign up for. Dangle has no analytics and sends no telemetry. It doesn’t need an internet connection at all.</p>

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

        <h2>If that ever changes</h2>
        <p>Any future analytics would be off by default and would only turn on if you choose to share them.</p>
      </div>
    </div>
  );
}
