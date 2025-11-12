# Larzy — YouTube Thumbnail Designer Portfolio

This repository contains the static site I designed to market my custom YouTube thumbnails. The site highlights my process, showcases recent client work, and gives creators a clear way to book new thumbnail packages.

## What you'll find
- `index.html` — landing page with hero copy, service overview, and CTA buttons for YouTube creators.
- `portfolio.html` — grid of recent thumbnail concepts organized by creator niche.
- `about.html` — background on my graphic design approach and toolset.
- `contact.html` — form for collaboration requests plus direct contact info.
- `clients.json` — sample testimonials/metrics used to power the "clients" carousel via `script.js`.
- `styles.css` + `assets/` — custom branding, typography, and optimized thumbnail previews.

Everything runs on plain HTML, CSS, and a small amount of vanilla JavaScript, so it can be hosted anywhere without a build step.

## Updating content
1. Add or replace thumbnails in `assets/` and update their references in `portfolio.html`.
2. Refresh testimonials or stats by editing `clients.json` (the script hotloads the latest data on page load).
3. Tweak copy in `about.html` or `index.html` to reflect new services or pricing.
4. Keep contact details current in `contact.html` so creators can reach me quickly.

## Preview locally
```bash
cd /path/to/portfolio
open index.html        # macOS
# or
xdg-open index.html    # Linux
start index.html       # Windows
```

## Deploying
Push the repo to GitHub (or any static host), enable GitHub Pages for the `main` branch, and the live site updates immediately. No build tools, frameworks, or server dependencies required.

## Work with me
If you need scroll-stopping thumbnails for your channel, reach out via the contact form or email listed on `contact.html`. I'm always open to new collaborations with creators who want higher CTRs and consistent channel branding.
