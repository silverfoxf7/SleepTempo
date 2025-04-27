import { render } from "../offline";

export async function buildWoodblock(sampleRate = 48000): Promise<AudioBuffer> {
  return render((ctx) => {
    const partials = [
      { f: 550, decay: 0.08 },
      { f: 825, decay: 0.06 },
    ];

    partials.forEach(({ f, decay }) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;

      const g = ctx.createGain();
      g.gain.setValueAtTime(1, 0);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay);

      o.connect(g).connect(ctx.destination);
      o.start(0);
      o.stop(ctx.currentTime + decay);
    });
  }, 0.1, sampleRate); // 100 ms buffer
} 