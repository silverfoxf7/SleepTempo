import { render } from "../offline";

export async function buildRimshot(sampleRate = 48000): Promise<AudioBuffer> {
  return render((ctx) => {
    /* white-noise burst */
    const noiseBuf = ctx.createBuffer(1, ctx.length, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    /* band-pass filter shapes the timbre */
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2500;
    bp.Q.value = 1;

    /* very fast decay envelope */
    const g = ctx.createGain();
    g.gain.setValueAtTime(1, 0);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);

    /* add tiny triangle "stick" transient */
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 2400; // same band

    noise.connect(bp).connect(g).connect(ctx.destination);
    osc.connect(g);
    
    osc.start(0);
    osc.stop(ctx.currentTime + 0.02); // 20 ms
    noise.start(0);
    noise.stop(ctx.currentTime + 0.06);
  }, 0.06, sampleRate);
} 