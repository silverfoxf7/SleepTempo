export async function render(
  buildGraph: (ctx: OfflineAudioContext) => void,
  duration = 0.3,
  sampleRate = 48000 // Use a common default or get from actual context if needed
): Promise<AudioBuffer> {
  // Ensure OfflineAudioContext is available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) {
    throw new Error("OfflineAudioContext not supported.");
  }
  const frames = Math.round(duration * sampleRate);
  // Use the constructor obtained from window
  const off = new OfflineCtx(1, frames, sampleRate);
  buildGraph(off);
  return off.startRendering();
} 