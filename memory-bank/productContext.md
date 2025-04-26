### Product Requirement Document (PRD)  
**Product Name:** *SleepTempo* – a zero-distraction, beat-guided aid for resuming sleep  
**Author / Date:** _Rod / 26 Apr 2025_  
**Version:** v0.9 (draft)  

| Section | Content |
|---------|---------|
| **1 — Purpose & Vision** | Help night-wakers slip back to sleep by passively following a slowing rhythmic pattern proven to quiet rumination (cognitive shuffle) and entrain the brain’s natural slow-wave rhythms. The app supplies the beats so the user can simply lie still, tap fingers, and drift off. |
| **2 — Problem Statement** | • 2–4 a.m. awakenings → racing thoughts → prolonged insomnia.<br>• Manual counting/tapping works but requires mental effort and an external timer.<br>• Existing metronome apps are visually bright, multi-step, and not tuned for a *descending-tempo* sleep protocol. |
| **3 — Goals & Success Metrics** | **Primary KPI:** % of sessions in which user reports “fell back asleep in ≤15 min”.<br>**Secondary:** daily active users (DAU) who start ≥1 session; average time-to-sleep; user-reported sleep-quality delta (pre/post). |
| **4 — Target Persona** | *“Restless Founder”* – age 35-55, smartphone in reach, cognitively overstimulated, values minimalism & privacy, willing to pay $5–10 one-time for an ad-free tool. |
| **5 — User Stories** | 1. *As a user* I tap a single **Start** button at 3 a.m. and hear immediate 120 BPM ticks without opening my eyes.<br>2. The tempo auto-ramps down (120→100→80→60→50→40→30→20 BPM) while a soft count cycles 1-2-3-4, so I can match finger taps.<br>3. Screen stays black-on-dim, then turns off; when the pattern ends the app auto-silences.<br>4. Optional: I can pick female/neutral/pure-click sound, tweak tempo ladder, or disable voice counts. |
| **6 — Functional Requirements** | **FR-1** Start/Stop control (single tap). **FR-2** Pre-defined *tempo ladder* configurable in settings. **FR-3** Procedurally generated click using Web Audio API (latency ≤2 ms jitter) **or** 16-bit WAV sample playback.<br>**FR-4** Optional whispered voice count every 4 beats (1-2-3-4) using low-pass filter ≤2 kHz.<br>**FR-5** Automatic screen-dimming + wakelock to keep audio alive while OLED stays mostly black.<br>**FR-6** Offline-first PWA; no login; no data leaves device.<br>**FR-7** Accessibility hooks: haptic pulse on devices that allow it (silenced by default). |
| **7 — Non-Functional Requirements** | **NFR-1** Battery drain ≤3 % per 30 min session.<br>**NFR-2** First-load bundle ≤150 kB gzipped.<br>**NFR-3** WCAG 2.1 AA for low-vision modes.<br>**NFR-4** GDPR-compliant: no personal data collected. |
| **8 — UX / UI Guidelines** | • Default dark-gray (#0d0d0d) background, single cyan **Start** button, fades to “breathing dot” animation (CSS only).<br>• Tiny haptic icon toggles vibration; cog icon opens minimalist settings sheet.<br>• No text during session; optional audio “soft-voice ON” confirmation before fade-out. |
| **9 — Technical Architecture** | **Stack:** Next.js (app router) + React 18 + TypeScript + Tailwind (for dark theme).<br>• *AudioEngine.ts* encapsulates Web Audio API `AudioContext`, schedules `oscillator` or `BufferSource` clicks using `setTargetAtTime` for tempo ramps.<br>• `service-worker.ts` caches static assets; registers PWA install.<br>• Build target: static export → Netlify/Vercel CDN; fully server-less.<br>• Unit tests with Vitest; CI via GitHub Actions. |
| **10 — Dependencies / Integrations** | None (intentionally). Future: HealthKit / Google Fit write-only “session started” events. |
| **11 — Risks & Mitigations** | • **Perceptible latency on older Android:** pre-decode audio, keep AudioContext resumed.<br>• **Audio ducking by OS Doze mode:** hold `wakeLock` and recommend disabling battery saver.<br>• **User startles from unexpected count voice:** ship with voice off by default. |
| **12 — Open Questions** | 1. Ideal tempo ladder? (Need small-N user testing.)<br>2. Should voice count accelerate only on first two ladders?<br>3. Add white-noise bed under ticks? |
| **13 — Future Enhancements (v1.x)** | • Adaptive tempo using accelerometer (detect micro-movements).<br>• Apple Watch / haptic-only companion.<br>• ML-based “Smart Ladder” trained on sleep onset feedback.<br>• Ear-bud bone-conduction mode. |
| **14 — Research Backing** | • Rhythmic auditory stimulation improves sleep quality and slow-wave activity (Kauser & Ahluwalia 2024)  ([Effect of Rhythmic Auditory Stimulation on Sleep and Cognition in College Students | Sleep and Vigilance
        ](https://link.springer.com/article/10.1007/s41782-023-00254-3)).<br>• Cognitive shuffle effectively disrupts rumination and speeds sleep onset (Real Simple recap of Beaudoin 2014 & clinician commentary)  ([The 'Cognitive Shuffle Method' May Finally Help You Get Better Sleep](https://www.realsimple.com/cognitive-shuffle-method-for-sleep-8715111)). |

---

#### Design Notes on Beat Generation  
*Procedural vs. Sample*:  
- *Procedural* (preferred): create a short square-wave click with gain-envelope—file-less, pitch-adjustable, <1 kB JS.  
- *Sample*: load a 50 ms muted woodblock WAV (~10 kB) for warmer timbre; simpler but adds network fetch.  

The Web Audio API scheduler (`currentTime + offset`) easily handles long sequences; pre-compute an array of [timestamp, BPM] pairs for the ladder and iterate. For voice counts, fetch an Ogg sprite with “one, two, three, four” utterances or synthesize via `SpeechSynthesisUtterance` (cache to prevent startup lag).

The entire experience must feel *effortless*: one thumb-tap, no brightness, no intrusive UI—just subtle, slowing ticks until the user no longer notices them.
