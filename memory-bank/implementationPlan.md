# **SleepTempo — Web-Only Implementation SOP**  
_All native-app references removed. 100 % browser/PWA; deploy to Vercel static hosting._

Use the check-boxes below; mark `[x]` as you finish each task.

---

## ⏳ 0 — Prerequisites  
- [x] **Local stack**: Node ≥ 20 LTS, pnpm ≥ 9  
- [x] **Editor**: VS Code + ESLint, Prettier, Tailwind CSS IntelliSense  
- [x] **Browsers for QA**: Desktop Chrome (reference), Safari mobile simulator **or** real iOS Safari, Chrome Android  
- [x] **GitHub repo access**  

---

## 🗂️ 1 — Project Bootstrap (Next.js + TypeScript)  
- [x] `pnpm create next-app@latest sleeptempo --ts --tailwind --eslint --src-dir --import-alias "@/*"`  
- [x] Init Git, commit, push to GitHub; enable Vercel integration (automatic preview deploys).  
- [x] Add Prettier, Husky pre-commit (`pnpm dlx husky-init && npm pkg set scripts.prepare="husky install"`).  

---

## 🎧 2 — Audio Engine Prototype  
> **Objective:** schedule a 120 BPM click for 60 s in browser.  
- [x] Create `src/lib/audioEngine.ts`  
- [x] Instantiate singleton `AudioContext`.  
- [x] Generate 5 ms click buffer (square-wave or white-noise burst).  
- [x] Implement **look-ahead scheduler** using `setTimeout` for drift-free timing (Web Worker deferred/optional if `setTimeout` proves sufficient).  
- [x] Expose API:  
  ```ts
  interface TempoStep { bpm: number; beats: number }
  start(sequence: TempoStep[]): void
  stop(): void
  onEnded?: () => void
  ```  
- [x] Manual dev-page test: Start/Stop button, console logs.  

---

## 🎚️ 3 — Tempo-Ladder Sequencer  
- [x] Add `constants.ts` with default ladder (120⇢20 BPM as in PRD).  
- [ ] Build `SequencerManager` to iterate ladder and call `audioEngine.start` per segment.  
- [ ] Emit `onEnded` → UI auto-stops & powers down screen.  

---

## 🖥️ 4 — Minimal UI (Dark-Mode)  
- [ ] `app/page.tsx`: full-viewport flex-center; circular Start/Stop button with Tailwind `bg-zinc-800/90`.  
- [ ] When playing → replace button label with pulsing dot (CSS `animation-pulse`).  
- [ ] State handled by `usePlayer` hook (`isPlaying`, `stepIndex`).  
- [ ] Keyboard ⇢ Space-bar toggles playback (desktop convenience).  

---

## ⚙️ 5 — Settings Drawer (Optional)  
- [ ] Slide-up sheet (Radix UI or Headless UI).  
- [ ] Toggles: **voice count**, **haptic vibration** (uses `navigator.vibrate`, automatically no-ops on unsupported devices).  
- [ ] Editable ladder (input BPM & beats).  
- [ ] Persist to `localStorage`.  

---

## 🗣️ 6 — Soft Voice Count (Optional)  
- [ ] Record/synthesize "one…four"; export Ogg (16 kHz, mono, ≤25 kB).  
- [ ] Audio sprite technique: single file, offsets in JSON.  
- [ ] Schedule voice on every fourth beat when enabled.  

---

## 🌐 7 — PWA & Offline-First  
All still viable because a PWA **is** a web app:  
- [ ] Add `next-pwa` plugin; precache static assets & voice sprite.  
- [ ] `manifest.json`: name = SleepTempo, theme =#0d0d0d, display =`standalone`.  
- [ ] Verify install prompt on Chrome Android & iOS Safari (no native code needed).  
- [ ] Use Wake Lock API (`navigator.wakeLock.request("screen")`) while playing; fallback plea if unsupported.  

---

## 🧪 8 — Testing  
- [x] **Unit**: Vitest + `standardized-audio-context` mocks.  
- [ ] **E2E**: Playwright — simulate tap, wait, verify `onEnded`.  
- [ ] **Manual**: run on real phone from Vercel preview; measure battery (Chrome Performance → Energy). Target < 3 % / 30 min.  

---

## 🚀 9 — CI/CD  
- [ ] GitHub Actions: `pnpm install && pnpm lint && pnpm test && pnpm build`.  
- [ ] Auto-preview to Vercel on every PR; production deploy on `main`.  
- [ ] Tag `v0.1.0-alpha`, draft release notes.  

---

## 📄 10 — Docs & Handoff  
- [ ] `README.md` (setup, dev, build, deploy).  
- [ ] `docs/architecture.md` with diagram of `AudioEngine` ↔ `Sequencer` ↔ `UI`.  
- [ ] Changelog following Keep-a-Changelog.  

---

### ✅ Feasibility Check  
- Uses only **standard browser APIs** (Web Audio, WakeLock, Vibration).  
- No native SDKs, app-store builds, or certificates required.  
- Deployed as static Next.js app on Vercel → works on any modern mobile/desktop browser, and can be "installed" as a PWA for full-screen use while remaining a web project.

Project remains fully viable as a web-only solution. Let me know if you'd like code snippets for any step.