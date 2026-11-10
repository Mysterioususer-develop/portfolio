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
- **Work:** add, edit, remove, upload, and reorder thumbnails. The first eight are shown in Selected Work; the full ordered list appears on the portfolio page.
- **Trusted By:** edit creator names, subscriber labels, avatars, and order. The first three rows appear before the expand button.
- **Reviews:** edit quotes, authors, avatars, and order.
- **Approach:** edit and reorder the vertical steps and their images.
- **Page copy, About, Contact & brand:** edit section wording, feature images, the commission popup wording, contact handles, and the logo path.

Use the up/down controls to reorder items; they work with keyboard and touch. Uploads are stored under `assets/uploads/`. PNG, JPG, and WebP images up to 10 MB are supported. You can also enter a path to an image already in `assets/`. Keep client names, subscriber counts, and reviews accurate.

**Save changes** writes `data/content.json` locally. Refresh the local preview to see the result. Nothing reaches GitHub or the domain until it is pushed.

## Publish to GitHub and the domain

This repo's `origin` is `https://github.com/Mysterioususer-develop/portfolio.git`. Its workflow runs after pushes to `main`, copies only the public HTML, CSS, JavaScript, `assets/`, and `data/` into a clean publishing folder, then deploys that folder with GitHub Pages. It does not publish the editor, admin server, or `node_modules`.

**First, push this admin feature and workflow once from the terminal:**

```powershell
git status
git add -- index.html portfolio.html about.html contact.html styles.css script.js data/content.json assets/uploads/.gitkeep admin/admin.html admin/admin.css admin/admin.js admin/server.js admin/start.ps1 start-admin.bat .github/workflows/deploy.yml README.md
git commit -m "Add local portfolio editor"
git push origin main
```

Review `git status` before committing. Add any other intended website changes or new images separately. These commands require your GitHub credentials or an already authenticated Git client.

**For later content edits:** make edits and click **Publish to GitHub**. The editor saves first, commits only `data/content.json` and `assets/uploads/`, and pushes `main`. If the push fails after the commit, fix Git access and run `git push origin main` in PowerShell. The button never commits other code changes. To disable publishing for one session, set `$env:ENABLE_GIT_PUBLISH='false'` before running the launcher.

You can also publish content manually:

```powershell
git add -- data/content.json assets/uploads
git commit -m "Update portfolio content"
git push origin main
```

In GitHub, open the repository's **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. This is required once for the new workflow. Check the **Actions** tab for the deployment run and the Pages settings for the live URL. If your custom domain is already connected to GitHub Pages, it updates after the deployment completes; changing content does not require another DNS change. If the domain points to a different host, configure that host to deploy this repository's `main` branch instead.

## Static preview without the editor

Run `python -m http.server 8000` from this folder, then open `http://127.0.0.1:8000`. Opening HTML files directly can prevent the browser from loading `data/content.json`.
