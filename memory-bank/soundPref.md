Below are **three practical paths**—all still “pure-web”—for replacing the harsh square/white-noise tick with gentler cues, plus concrete tips on sourcing ready-made samples.

---

## 1  Synthesize a Softer Click in-browser (Web Audio API)

You can generate a pleasant, wood-block–style “pip” entirely on the client with <40 lines of code and **no additional assets**.  
Key ideas:

| Stage | Web Audio Node | Parameters | Purpose |
|-------|---------------|------------|---------|
| **Oscillator** | `OscillatorNode` | `type:'sine'` or `'triangle'`, `freq≈1000 Hz` | Gives a clean tone (triangle is a touch brighter). |
| **Envelope** | `GainNode` | `gain.setValueAtTime(1)` → `exponentialRampToValueAtTime(0.0001, +50 ms)` | Makes the click ultra-short and removes click-tail. |
| **EQ (optional)** | `BiquadFilterNode` `('highpass')` `freq≈700 Hz` | Removes low-end rumble so it “sits” quietly. |

```ts
// src/lib/clickFactory.ts
export function buildSoftClick(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 0.06;          // 60 ms total
  const offline = new OfflineAudioContext(1, length, ctx.sampleRate);

  // tone
  const tone = offline.createOscillator();
  tone.type = 'triangle';
  tone.frequency.value = 1000;

  // envelope
  const gain = offline.createGain();
  gain.gain.setValueAtTime(1, 0);
  gain.gain.exponentialRampToValueAtTime(0.0001, 0.05); // 50 ms fade

  // (optional) hi-pass
  const hp = offline.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 700;

  tone.connect(gain).connect(hp).connect(offline.destination);
  tone.start();
  tone.stop(0.06);

  return offline.startRendering(); // returns Promise<AudioBuffer>
}
```

*Once the buffer is rendered* you just `await` it once on app startup and schedule it in your existing look-ahead loop.  
Because it’s an `AudioBuffer`, timing accuracy stays sample-perfect.  
See MDN advanced-audio guide for envelope + buffer-render patterns.  ([Advanced techniques: Creating and sequencing audio - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques?utm_source=chatgpt.com))

---

## 2  Synthesize a Filtered-Noise “Shaker” Tick

A **band-pass filtered noise burst** sounds like a tiny shaker—pleasantly percussive but soft:

```ts
function buildNoiseClick(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // pink-ish noise: 1/f
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length); // decay envelope in-data
  }

  // run through band-pass at runtime
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2000;
  bp.Q.value = 1;
  source.connect(bp).connect(ctx.destination);
}
```

Noise + band-pass feels less “techy” than a square wave and still synthesises in-browser.

---

## 3  Load a Tiny Sample (Most Flexible)

If you’d rather not synthesize, drop a **1–20 kB WAV/Ogg** into `public/sounds/` and let `audioEngine` pick the appropriate `AudioBuffer`:

```ts
const buffer = await fetch('/sounds/woodblock.wav')
    .then(r => r.arrayBuffer())
    .then(ab => ctx.decodeAudioData(ab));
```

### Where to find soothing clicks (CC-0 / CC-BY)

| Site | Example search term | Notes |
|------|--------------------|-------|
| **Freesound.org** | “soft metronome”, “woodblock click”, “kalimba pluck” | Vast CC library. Links: gentle click ➜  ([Metronome click by edgyboi1 - Freesound](https://freesound.org/people/edgyboi1/sounds/490276/?utm_source=chatgpt.com)) ; woodblock ➜  ([Freesound - Click Metronome atonal high by lennartgreen](https://freesound.org/people/lennartgreen/sounds/566888/?utm_source=chatgpt.com)) |
