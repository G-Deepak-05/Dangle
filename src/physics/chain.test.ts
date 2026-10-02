import { describe, expect, it } from "vitest";
import { ChainSimulation } from "./chain";
import { resolveParams } from "./profiles";
import { FIXED_DT } from "./simulation";

const BOUNDS = { width: 640, height: 900 };
const ANCHOR = { x: 320, y: 0 };
const bodies = [{ length: 60 }, { length: 50 }, { length: 70 }];

function make() {
  return new ChainSimulation(ANCHOR, 120, resolveParams("normal", false), BOUNDS, bodies, 16);
}

function settle(sim: ChainSimulation, limit = 60) {
  let t = 0;
  while (!sim.asleep && t < limit) {
    sim.step(FIXED_DT);
    t += FIXED_DT;
  }
  return t;
}

describe("ChainSimulation", () => {
  it("hangs charms one below another at the right spacing", () => {
    const sim = make();
    settle(sim);
    const poses = sim.poses();
    expect(poses).toHaveLength(3);
    expect(poses[0].y).toBeCloseTo(120, 0);
    expect(poses[1].y).toBeCloseTo(120 + 60 + 16, 0);
    expect(poses[2].y).toBeCloseTo(120 + 60 + 16 + 50 + 16, 0);
    poses.forEach((p) => {
      expect(p.x).toBeCloseTo(320, 1);
      expect(p.angle).toBeCloseTo(0, 2);
    });
  });

  it("pulling the bottom charm moves the ones above", () => {
    const sim = make();
    settle(sim);
    const before = sim.poses()[0].x;
    const bottom = sim.poses()[2];
    sim.startDrag({ x: bottom.x, y: bottom.y + 10 }, 2);
    for (let i = 0; i < 90; i++) {
      sim.moveDrag({ x: 520, y: bottom.y });
      sim.step(FIXED_DT);
    }
    expect(sim.poses()[0].x).toBeGreaterThan(before + 20);
    sim.endDrag();
    expect(settle(sim)).toBeLessThan(60);
  });

  it("keeps each charm rigid and the string inextensible", () => {
    const sim = make();
    sim.startDrag(sim.poses()[1], 1);
    for (let i = 0; i < 200; i++) {
      sim.moveDrag({ x: 600, y: 880 });
      sim.step(FIXED_DT);
    }
    const poses = sim.poses();
    const anchorDist = Math.hypot(poses[0].x - ANCHOR.x, poses[0].y - ANCHOR.y);
    expect(anchorDist).toBeLessThanOrEqual(120.5);
    for (let i = 0; i < sim.x.length; i++) {
      expect(Number.isFinite(sim.x[i]) && Number.isFinite(sim.y[i])).toBe(true);
    }
  });

  it("rebuilds for a different number of charms", () => {
    const sim = make();
    sim.setBodies([{ length: 40 }, { length: 40 }]);
    settle(sim);
    expect(sim.poses()).toHaveLength(2);
    expect(sim.ropeRanges()).toHaveLength(2);
  });
});
