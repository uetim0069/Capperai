# LUDOWHOT

LUDOWHOT is a mobile-first web app and progressive web app for playing Whot and Ludo with demo stakes, bot matches, and wallet-style gameplay. It combines a polished landing experience with challenge-based multiplayer game flow and a full installable PWA feel.

## Overview

LUDOWHOT is designed as a front-end prototype and demo app for a real-stakes gaming experience. Players can:

- browse or post open challenges
- play Whot or Ludo against another player
- play against a bot when no opponent is available
- track a demo wallet and escrow balance
- install the app as a PWA from supported browsers
- download an Android APK bundle

This repository contains the app UI, game logic, branding, and static assets needed to run the experience locally or deploy it to a static host.

## Features

- Responsive landing page and game dashboard
- Whot match flow with card rules and defense selection
- Ludo board flow with dice-based gameplay
- Public lobby for challenge posting and acceptance
- Bot mode for instant gameplay
- Demo wallet and escrow logic
- PWA install support
- APK download option for Android users
- Mobile-first UI with desktop compatibility

## Project structure

- `index.html` — primary game experience and landing page
- `login.html` — login screen
- `signup.html` — account creation screen
- `auth.js` — authentication and install helpers
- `app.js` — game logic, lobby, match flow, and rendering
- `sw.js` — service worker for install/offline support
- `manifest.webmanifest` — PWA metadata
- `vercel.json` — deployment configuration
- `capper-ai.apk` — Android APK build
- `*.png` — branding, icons, and screenshots

## Tech stack

- HTML
- CSS
- JavaScript
- Tailwind CSS via CDN
- Progressive Web App manifest
- Service worker
- Static deployment hosting

## Local development

Because this is a static web app, you can run it from any local web server.

### Python

```bash
cd LUDOWHOT
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

### Alternative hosting

You can deploy the repository root to:

- Vercel
- Netlify
- GitHub Pages
- any static file host

## Deployment notes

The app is configured as a static front-end project. For production use, you would typically add:

- a real backend API
- authentication and user persistence
- secure wallet/account logic
- server-side game validation
- legal and compliance content for real-money play

At the moment, the project is best treated as a prototype or demo application.

## Screenshots

The repository includes screenshots and app assets for both mobile and desktop layouts.

## Notes

- This app uses demo balances and simulated escrow behavior.
- Match results and wallet logic are designed for demonstration purposes.
- The project is intended for portfolio, demo, and prototype use.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Contributing

Pull requests are welcome. For larger changes, please open an issue first to discuss the feature or bug fix.
