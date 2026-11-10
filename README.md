# Larzy portfolio

A static HTML, CSS, and JavaScript portfolio. The public site reads its artwork, creators, reviews, page copy, and image choices from `data/content.json`. `admin/` is a **local editor** for that file; the admin server is not part of the public website.

## Run the editor on Windows

1. Open PowerShell in this folder and run `./start-admin.bat` (or double-click the file).
2. Choose a local password of at least 12 characters. The prompt hides what you type. The password is kept only in that terminal session.
3. Open `http://127.0.0.1:3000/admin` and sign in. The **Publish to GitHub** button is enabled by default; it needs working GitHub push access on this computer. Use **Preview site** to open the local website.

The editor requires Node.js. The startup script installs the existing npm dependencies if they are missing. The admin server listens only on `127.0.0.1`; do not deploy or expose it on the public internet.

### Editing content

- **Home hero:** title, description, and button labels.
- **Hero images:** choose and reorder the thumbnails in the moving wall.
- **Work:** add, edit, remove, upload, and reorder thumbnails. The first nine are shown in Selected Work; the full ordered list appears on the portfolio page.
- **Trusted By:** edit creator names, subscriber labels, avatars, and order. The first three rows appear before the expand button.
- **Reviews:** edit quotes, authors, avatars, and order.
- **Approach:** edit and reorder the vertical steps and their images.
- **Page copy, About, Contact & brand:** edit section wording, feature images, the commission popup wording, Discord profile URL, X profile URL, and the logo path.

Use the up/down controls to reorder items; they work with keyboard and touch. Uploads are stored under `assets/uploads/`. PNG, JPG, and WebP images up to 10 MB are supported. You can also enter a path to an image already in `assets/`. Keep client names, subscriber counts, and reviews accurate.

**Save locally** writes `data/content.json` on this computer. An open local preview refreshes automatically when it uses the same localhost address. Nothing reaches GitHub or the domain until you publish. If the editor tab says it is offline, run `start-admin.bat` again and reload the tab.

## Publish to GitHub and the domain

The production site is hosted by the Vercel project `portfolio-eaj7` at [www.larzyfx.com](https://www.larzyfx.com/). Vercel is connected to this repository's `main` branch and creates a production deployment when a new commit is pushed. GitHub Pages is a separate copy; its workflow and status do not control the custom domain.

Make edits in the local admin page, then click **Publish to GitHub**. The editor saves first, commits only `data/content.json` and `assets/uploads/`, and pushes `main`. Publishing to GitHub starts a Vercel deployment; the domain updates after it finishes. Check the Vercel project's **Deployments** page for **Ready**, then refresh the domain. If the push fails after the local commit, fix Git access and click Publish again to retry. The button never commits other code changes. The most recent saved hero-image order was confirmed on the live `data/content.json` file.

You can also publish content manually:

```powershell
git add -- data/content.json assets/uploads
git commit -m "Update portfolio content"
git push origin main
```

The GitHub Pages workflow also runs on pushes to `main` and publishes a copy at `https://mysterioususer-develop.github.io/portfolio/`. Its success or failure does not indicate whether Vercel updated `www.larzyfx.com`.

## Project brief email

The popup submits to the Vercel Function at `api/brief.mjs`, which sends the answers to `larzyfx@gmail.com`. Email delivery needs two **server-side** Vercel environment variables:

- `RESEND_API_KEY`: provided by the Resend integration or an API key from Resend.
- `BRIEF_FROM_EMAIL`: a sender on a domain verified in Resend, for example `Larzy <briefs@larzyfx.com>` after verifying `larzyfx.com`.

Add both to the production environment and redeploy. Never put the API key in `script.js`, `data/content.json`, or a committed `.env` file. Until the variables are configured, the form shows an error and keeps the visitor's answers so they can use Discord or X instead. Local admin preview uses the same endpoint and needs the same environment variables in its terminal to send a real email.

## Static preview without the editor

Run `python -m http.server 8000` from this folder, then open `http://127.0.0.1:8000`. Opening HTML files directly can prevent the browser from loading `data/content.json`.
