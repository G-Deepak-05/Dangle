import { useState } from "react";
import { backend } from "../../ipc/backend";
import { stageConfigFor, updateSettings } from "../../state/stores";
import { CharmPreview } from "../components/CharmPreview";
import { useActiveCharm, useCharms, useSettings } from "../hooks";

const PICKS = ["moon", "star", "cat", "ghost", "mushroom", "heart"];
const STEPS = 4;

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [swung, setSwung] = useState(false);
  const settings = useSettings();
  const charm = useActiveCharm();
  const charms = useCharms();
  const picks = PICKS.map((id) => charms.find((c) => c.id === id)).filter((c) => c !== undefined);
  const config = stageConfigFor(settings, charm);

  const finish = async () => {
    await updateSettings({ onboardingComplete: true, hidden: false });
    window.setTimeout(() => void backend.hideControl(), 450);
  };

  return (
    <div className="onboarding">
      {step === 0 && (
        <section className="onboarding-step" key="0" aria-labelledby="ob-0">
          <CharmPreview config={config} height={300} label={`${charm.name}, hanging`} />
          <h1 id="ob-0">Meet Dangle.</h1>
          <p className="lede">A tiny thing for your desktop.</p>
        </section>
      )}

      {step === 1 && (
        <section className="onboarding-step" key="1" aria-labelledby="ob-1">
          <h1 id="ob-1">Pick something that feels like you.</h1>
          <p className="lede">You can change it any time, or make your own.</p>
          <div className="pick-grid" role="radiogroup" aria-label="Charm">
            {picks.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                className="pick"
                aria-checked={c.id === charm.id}
                onClick={() => void updateSettings({ activeCharmId: c.id })}
              >
                <img src={c.thumbnail} alt="" draggable={false} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="onboarding-step" key="2" aria-labelledby="ob-2">
          <CharmPreview
            config={config}
            height={320}
            label={`${charm.name}. Drag it to swing.`}
            onDragChange={(dragging) => {
              if (!dragging) setSwung(true);
            }}
          >
            <p className="stage-hint">{swung ? "Just like that." : "Try it here"}</p>
          </CharmPreview>
          <h1 id="ob-2">Grab it. Swing it. Let go.</h1>
          <p className="lede">Hold ⌥ Option while you drag to let out more string.</p>
        </section>
      )}

      {step === 3 && (
        <section className="onboarding-step" key="3" aria-labelledby="ob-3">
          <CharmPreview config={config} height={260} label={`${charm.name}, hanging`} />
          <h1 id="ob-3">That’s it.</h1>
          <p className="lede">Your desktop just got a little more personal.</p>
          <p className="help">Dangle lives in your menu bar. Click it any time to change your charm.</p>
        </section>
      )}

      <div className="onboarding-footer">
        <div className="dots" aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className="dot" data-active={i === step} />
          ))}
        </div>
        <div className="row">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < STEPS - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)} autoFocus>
              Continue
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => void finish()} autoFocus>
              Hang it on my desktop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
