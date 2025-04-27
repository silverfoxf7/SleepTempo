# SleepTempo

SleepTempo is a Progressive Web App (PWA) designed to help users gradually slow down their tempo, often used as a relaxation or sleep aid. It features a customizable tempo ladder, allowing users to define a sequence of tempos (BPM) and durations (beats) that the app will play through.

The app uses the Web Audio API for precise timing and includes optional voice cues for every tenth beat.

## Features

*   **Customizable Tempo Ladder:** Define your own sequence of BPM and beat counts.
*   **Precise Audio Engine:** Uses Web Audio API for accurate scheduling.
*   **Optional Voice Cues:** Hear "ten", "twenty", etc., on corresponding beats.
*   **Dark Mode UI:** Clean and simple interface.
*   **Settings Persistence:** Saves your tempo ladder and preferences to `localStorage`.
*   **PWA Support:** Installable on mobile devices for an app-like experience (coming soon).
*   **Screen Wake Lock:** Keeps the screen awake during playback.

## Getting Started

### Prerequisites

*   Node.js (version 20 LTS or higher recommended)
*   pnpm (version 9 or higher recommended)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/sleeptempo.git
    cd sleeptempo
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```

### Running the Development Server

Start the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Running Tests

*   **Unit Tests (Vitest):**
    ```bash
    pnpm test
    ```
*   **End-to-End Tests (Playwright, COMING SOON):** 
    ```bash
    pnpm playwright test
    ```

### Building for Production

```bash
pnpm build
```

This will create an optimized production build in the `.next` folder.

## Deployment

This project is configured for easy deployment to [Vercel](https://vercel.com/). Push commits to the `main` branch to trigger a production deployment. Preview deployments are automatically created for pull requests. 