import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  amplitudeToColor,
  CSI_SUBCARRIER_COUNT,
  simulateCsi,
} from "../lib/csi-sim.ts";

describe("simulateCsi", () => {
  it("is deterministic for the same input", () => {
    const input = {
      motionLevel: 0.4,
      stillDuration: 12,
      anomalyScore: 0.2,
      status: "normal" as const,
      t: 40,
      presenceX: 55,
      presenceY: 48,
      wifiX: 30,
      wifiY: 40,
    };
    const a = simulateCsi(input);
    const b = simulateCsi(input);
    assert.equal(a.amplitude, b.amplitude);
    assert.equal(a.motionEnergy, b.motionEnergy);
    assert.deepEqual([...a.subcarrierAmp], [...b.subcarrierAmp]);
    assert.deepEqual([...a.subcarrierPhase], [...b.subcarrierPhase]);
  });

  it("emits one value per subcarrier", () => {
    const s = simulateCsi({
      motionLevel: 0.1,
      stillDuration: 0,
      anomalyScore: 0,
      status: "normal",
      t: 1,
      presenceX: 50,
      presenceY: 50,
      wifiX: 50,
      wifiY: 50,
    });
    assert.equal(s.subcarrierAmp.length, CSI_SUBCARRIER_COUNT);
    assert.equal(s.subcarrierPhase.length, CSI_SUBCARRIER_COUNT);
  });

  it("raises motion energy when motion is high", () => {
    const calm = simulateCsi({
      motionLevel: 0.05,
      stillDuration: 200,
      anomalyScore: 0,
      status: "normal",
      t: 10,
      presenceX: 50,
      presenceY: 50,
      wifiX: 20,
      wifiY: 20,
    });
    const busy = simulateCsi({
      motionLevel: 0.9,
      stillDuration: 0,
      anomalyScore: 0.3,
      status: "normal",
      t: 10,
      presenceX: 50,
      presenceY: 50,
      wifiX: 20,
      wifiY: 20,
    });
    assert.ok(busy.motionEnergy > calm.motionEnergy);
    assert.ok(calm.microMotion > busy.microMotion * 0.5);
  });

  it("maps amplitude into brand-safe rgb", () => {
    const c = amplitudeToColor(0.8, "normal");
    assert.ok(c.g > c.r);
    assert.ok(c.g > c.b);
  });
});
