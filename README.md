# larzy — Portfolio

Quick steps to publish to GitHub:

1. Initialize and commit locally
   ```
   cd c:\Users\rk\Desktop\portfolio
   git init
   git add .
   git commit -m "Initial site"
   ```

2. Create a GitHub repo (via github.com/new) and add remote:
   ```
   git remote add origin https://github.com/USERNAME/REPO.git
   git branch -M main
   git push -u origin main
   ```

3. Option A — Simple:
   - Go to the repo Settings → Pages → Source and choose "main branch / (root)" or "gh-pages" if you push there.

4. Option B — Automated (recommended):
   - Add the workflow file (.github/workflows/deploy.yml) and push to main.
   - The GitHub Action will publish the repo root to the `gh-pages` branch automatically.
   - After first successful run, enable Pages to serve from `gh-pages` branch (or let Actions set it).

Notes:
- If you prefer the site under a custom domain, add a CNAME file and configure DNS.
- For CI that builds (e.g. a static site generator) adjust the workflow to run the build step and set `publish_dir` to the build output.
