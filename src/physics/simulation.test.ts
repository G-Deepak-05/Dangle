import { describe, expect, it } from "vitest";
import { CharmSimulation, FIXED_DT } from "./simulation";
import { resolveParams, type PhysicsProfileName } from "./profiles";

const BOUNDS = { width: 640, height: 480 };
const ANCHOR = { x: 320, y: 0 };

function makeSim(profile: PhysicsProfileName = "normal", reduce = false) {
  const sim = new CharmSimulation(ANCHOR, 124, resolveParams(profile, reduce), BOUNDS);
  sim.setTipInset(40);
  return sim;
}

function run(sim: CharmSimulation, seconds: number) {
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps && !sim.asleep; i++) sim.step(FIXED_DT);
}

function timeToSleep(sim: CharmSimulation, limit = 60): number {
  let t = 0;
  while (!sim.asleep && t < limit) {
    sim.step(FIXED_DT);
    t += FIXED_DT;
  }
  return t;
}

function allFinite(sim: CharmSimulation) {
  for (let i = 0; i <= sim.segments; i++) {
    if (!Number.isFinite(sim.x[i]) || !Number.isFinite(sim.y[i])) return false;
  }
  return Number.isFinite(sim.angle) && Number.isFinite(sim.angularVelocity);
}

function swingTo(sim: CharmSimulation, x: number, y: number) {
  sim.startDrag(sim.tip);
  for (let i = 0; i < 60; i++) {
    sim.moveDrag({ x, y });
    sim.step(FIXED_DT);
  }
  sim.endDrag();
}

describe("CharmSimulation", () => {
  it("hangs straight down at rest and falls asleep", () => {
    const sim = makeSim();
    expect(timeToSleep(sim)).toBeLessThan(2);
    expect(sim.tip.x).toBeCloseTo(ANCHOR.x, 3);
    expect(sim.tip.y).toBeCloseTo(124, 0);
    expect(sim.angle).toBeCloseTo(0, 3);
  });

  it("follows the pointer without teleporting", () => {
    const sim = makeSim();
    sim.startDrag(sim.tip);
    sim.moveDrag({ x: 420, y: 60 });
    sim.step(FIXED_DT);
    const tip = sim.tip;
    expect(Math.hypot(tip.x - 420, tip.y - 60)).toBeGreaterThan(20);
    for (let i = 0; i < 120; i++) sim.step(FIXED_DT);
    expect(Math.hypot(sim.tip.x - 420, sim.tip.y - 60)).toBeLessThan(40);
  });

  it("never stretches the string far past its length", () => {
    const sim = makeSim();
    sim.startDrag(sim.tip);
    for (let i = 0; i < 240; i++) {
      sim.moveDrag({ x: 620, y: 470 });
      sim.step(FIXED_DT);
    }
    const len = Math.hypot(sim.tip.x - ANCHOR.x, sim.tip.y - ANCHOR.y);
    expect(len).toBeLessThan(124 * 1.35);
  });

  it("keeps moving after release, then settles back under the anchor", () => {
    const sim = makeSim();
    swingTo(sim, 440, 40);
    run(sim, 0.05);
    expect(sim.asleep).toBe(false);
    expect(sim.speed).toBeGreaterThan(50);
    expect(timeToSleep(sim)).toBeLessThan(30);
    expect(Math.abs(sim.tip.x - ANCHOR.x)).toBeLessThan(1);
  });

  it("stays finite under violent random dragging", () => {
    const sim = makeSim("bouncy");
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    sim.startDrag(sim.tip);
    for (let i = 0; i < 4000; i++) {
      sim.moveDrag({ x: rand() * 2000 - 700, y: rand() * 1600 - 600 });
      sim.step(FIXED_DT);
      if (i % 400 === 0) {
        sim.endDrag();
        sim.impulse(rand() * 1e5 - 5e4, rand() * 1e5 - 5e4);
        sim.startDrag(sim.tip);
      }
    }
    sim.endDrag();
    expect(allFinite(sim)).toBe(true);
    expect(timeToSleep(sim)).toBeLessThan(60);
  });

  it("orders settle time calm < normal < bouncy, and reduced motion is fastest", () => {
    const times = (["calm", "normal", "bouncy"] as const).map((p) => {
      const sim = makeSim(p);
      swingTo(sim, 430, 60);
      return timeToSleep(sim);
    });
    expect(times[0]).toBeLessThan(times[1]);
    expect(times[1]).toBeLessThan(times[2]);
    const reduced = makeSim("bouncy", true);
    swingTo(reduced, 430, 60);
    expect(timeToSleep(reduced)).toBeLessThan(times[0]);
  });

  it("goes slack instead of pushing when the charm is lifted", () => {
    const sim = makeSim();
    sim.startDrag(sim.tip);
    for (let i = 0; i < 120; i++) {
      sim.moveDrag({ x: 330, y: 40 });
      sim.step(FIXED_DT);
    }
    const mid = Math.floor(sim.segments / 2);
    expect(sim.y[mid]).toBeGreaterThan(40);
  });

  it("translate keeps screen position without adding speed", () => {
    const sim = makeSim();
    timeToSleep(sim);
    sim.setAnchor({ x: 300, y: 0 });
    sim.translate(-20, 0);
    sim.step(FIXED_DT);
    expect(sim.speed).toBeLessThan(5);
  });

  it("advance clamps huge frame gaps", () => {
    const sim = makeSim();
    swingTo(sim, 400, 80);
    expect(sim.advance(5)).toBeLessThanOrEqual(10);
    expect(allFinite(sim)).toBe(true);
  });
});
