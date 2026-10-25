# LUDOWHOT

LUDOWHOT is a lightweight web app and PWA for playing Whot and Ludo-style matches with real-money-style stakes in a demo environment. The project includes a landing page, challenge lobby, bot match flow, wallet UI, Android APK download, and a mobile-friendly install experience.

## Overview

This repository contains a front-end-only game app centered around:

- Posting and accepting challenges
- Playing Whot and Ludo matches
- Simulated wallet and escrow flow
- Bot matches at configurable stakes
- PWA install support for supported browsers
- Android APK bundle for direct download

The app is designed as a static web experience, with the main gameplay logic split across client-side JavaScript files.

## Project structure

- `index.html` — main app shell and game UI
- `login.html` — login screen
- `signup.html` — account creation screen
- `auth.js` — authentication-related client logic
- `app.js` — core app/game logic
- `sw.js` — service worker for offline/install support
- `manifest.webmanifest` — PWA manifest
- `vercel.json` — deployment configuration
- `capper-ai.apk` — Android APK build
- `*.png` — branding and screenshots

## Features

- Responsive landing page and game dashboard
- Whot and Ludo gameplay flows
- Lobby with challenge cards and stake display
- Demo wallet and escrow behavior
- Bot mode for practice or no-opponent play
- PWA install support for supported browsers
- APK download option for Android users

## Tech stack

This project is primarily a static front-end app built with:

- HTML
- CSS (Tailwind via CDN)
- JavaScript
- Web app manifest / service worker

## Run locally

Because this is a static site, you can serve it from any local web server.

Option 1: Python

```bash
cd LUDOWHOT
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Option 2: Any static hosting platform

You can also deploy it to Vercel, Netlify, GitHub Pages, or another static host by publishing the repository root.

## Notes

- The app includes demo wallet and match logic rather than a real backend payment or production authentication system.
- The game server / match resolution is represented in the front-end flow and is meant for demo and prototype use.
- The project is designed for demonstration and portfolio-style deployment.

## License

This repository does not currently include an explicit license file. If you plan to reuse or distribute the project, add a license before publishing or shipping it beyond internal use.

## Contributing

Contributions are welcome. For small changes, open a pull request with a clear description of the update.

## Screenshots

The repository includes multiple image assets showcasing the app on mobile and desktop layouts.
