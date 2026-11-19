# Next steps: put QueueDesk on GitHub

A one-time checklist to publish the website (GitHub Pages) and the API image (GHCR). After this,
every push to `main` updates both automatically. For how the workflows work, see
[docs/deployment.md](docs/deployment.md).

In the steps below, `<user>` is your GitHub username and `<repo>` is the repository name.

## 1. Commit your work

```bash
git add -A
git commit -m "feat: docker image, GitHub Pages deploy and docs"
```

## 2. Create the GitHub repository

On https://github.com/new:

- **Name:** for example `queuedesk`. Don't name it `<user>.github.io`, because the website is built
  for a `/<repo>/` sub-path.
- **Visibility:** **Public**. GitHub Pages is free only for public repos.
- Leave "Add a README", ".gitignore" and "license" **unchecked** (the repo already has them).

## 3. Push the code

```bash
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

This push starts both workflows. The website deploy fails the first time because Pages isn't
turned on yet. Step 4 fixes that.

## 4. Turn on GitHub Pages

1. Repo → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab → **Deploy client to GitHub Pages** → **Run workflow** → `main`.

## 5. Check both workflows are green

In the **Actions** tab, wait for:

- **Deploy client to GitHub Pages:** about 1–2 minutes. The `deploy` job shows the site URL.
- **Publish API image to GHCR:** about 5–10 minutes on the first run (it builds for Intel and ARM).

If the image workflow fails with `403` or `denied`: **Settings → Actions → General → Workflow
permissions → Read and write permissions → Save**, then re-run it.

## 6. Make the API image public

New packages are private, so testers can't download it until you change that.

1. Go to `https://github.com/<user>?tab=packages` → **queuedesk-api**.
2. **Package settings** (bottom right) → **Danger Zone → Change visibility → Public**.

## 7. Fill in the placeholders in the README

In [README.md](README.md), replace:

- `<github-user>` with your username (in the `docker run` command and the website link)
- `<repo-name>` with your repository name

Then push:

```bash
git commit -am "docs: add real URLs to README"
git push
```

## 8. Test it like a tester would

1. Stop anything on port 4000 (for example `npm run dev`).
2. Run the `docker run` command from the README.
3. Open http://localhost:4000/api/health. It should show `"status":"ok"`.
4. Open `https://<user>.github.io/<repo>/` in Chrome. If asked about local network access, click
   **Allow**.
5. Log in as `agent@queuedesk.test` / `Password123!` and open a ticket.
6. Refresh the page on a ticket. It should stay on that ticket, not show a 404.

## 9. Share with testers

Send them the repo link. The README has everything they need: install Docker, run one command,
open the website, log in.

---

## Optional

- **Release a fixed version:** `git tag v1.0.0 && git push origin v1.0.0` publishes
  `queuedesk-api:1.0.0`, so testers can pin it.
- **Only allow your website to call the API:** testers add
  `-e CORS_ORIGIN=https://<user>.github.io` to `docker run`.
- **Use a hosted API instead of localhost:** add a repo variable `VITE_API_URL` (**Settings →
  Secrets and variables → Actions → Variables**) and re-run the website workflow.
- **Delete this file** once everything is live.
