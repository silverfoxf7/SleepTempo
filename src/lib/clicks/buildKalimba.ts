import { render } from "../offline";

export async function buildKalimba(
  pitchHz = 1046, // C6—nice bright pluck
  sampleRate = 48000
): Promise<AudioBuffer> {
  const duration = 0.4; // 400 ms pluck
  const delaySamp = Math.round(sampleRate / pitchHz);

  return render((ctx) => {
    /* create pinkish noise excitation */
    const excBuf = ctx.createBuffer(1, delaySamp, sampleRate);
    const exc = excBuf.getChannelData(0);
    for (let i = 0; i < exc.length; i++) exc[i] = Math.random() * 2 - 1;

    /* buffer source → delay → low-pass → destination (+ feedback) */
    const src = ctx.createBufferSource();
    src.buffer = excBuf;
    src.loop = true; // keeps drive in delay

    const delay = ctx.createDelay();
    delay.delayTime.value = delaySamp / sampleRate;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 4000; // mellow metal tone
    lpf.Q.value = 0.2;

    /* feedback */
    const fbGain = ctx.createGain();
    fbGain.gain.value = 0.97; // decay factor

    /* envelope */
    const outGain = ctx.createGain();
    outGain.gain.setValueAtTime(1, 0);
    outGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    /* wire graph */
    src.connect(delay).connect(lpf).connect(fbGain).connect(delay);
    lpf.connect(outGain).connect(ctx.destination);

    src.start(0);
    src.stop(ctx.currentTime + duration); // once envelope hits silence
  }, duration, sampleRate);
} 