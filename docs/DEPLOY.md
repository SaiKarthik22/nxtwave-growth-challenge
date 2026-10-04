# Deploy & Share: get a live link in under 10 minutes

The project is a plain static site (HTML/CSS/JS) with no build step, so any static host works. Pick **one** option.

---

## Option A: GitHub Pages (recommended: free and permanent)

### 1. Create a GitHub account (skip if you have one)
Sign up at https://github.com/signup and verify your email.

### 2. Create an empty repository
1. Go to https://github.com/new
2. **Repository name:** `nxtwave-growth-challenge`
3. **Public** (free GitHub Pages needs a public repo)
4. Do **not** tick "Add a README" (the project already has one)
5. Click **Create repository**

### 3. Push the project (run these in the project folder)
```bash
git remote add origin https://github.com/<your-username>/nxtwave-growth-challenge.git
git push -u origin main
```
The first push opens a browser window to sign in to GitHub. Approve it.

> Using the GitHub CLI instead? `gh auth login --web`, then
> `gh repo create nxtwave-growth-challenge --public --source . --push`

### 4. Turn on GitHub Pages
1. Open your repo → **Settings** → **Pages**
2. **Source:** Deploy from a branch → **Branch:** `main` → folder **`/ (root)`** → **Save**
3. Wait about 1 minute and refresh. Your live link appears at the top:

```
https://<your-username>.github.io/nxtwave-growth-challenge/
```

### 5. Final touches
- Check that the live link at the top of `README.md` and `repoUrl` in `js/config.js` use your username. They are preset for `saikoushik22`.
- After any change: `git add -A && git commit -m "Update" && git push`. Pages redeploys automatically.

---

## Option B: Netlify Drop (fastest: no Git needed)

1. Open https://app.netlify.com/drop
2. Drag the whole `nxtwave-growth-challenge` folder onto the page.
3. You get a live URL like `https://random-name-123.netlify.app` instantly.
4. Optional: sign in to keep the site, then use **Site settings → Change site name** to get `https://buildai60.netlify.app`.

---

## Option C: Vercel

1. Push to GitHub (Option A, steps 1–3).
2. Go to https://vercel.com/new and import the repo.
3. Framework preset **Other**, no build command, output directory `./`. Click **Deploy**.

---

## Run it on another computer

```bash
git clone https://github.com/<your-username>/nxtwave-growth-challenge.git
cd nxtwave-growth-challenge
npm start                 # → http://localhost:3000  (Node 16+, no npm install needed)
```
No Node? Just double-click `index.html`. Everything still works (the champion poster QR needs internet for its tiny QR library).

---

## Before you submit: checklist

- [ ] Live link opens on your phone (test the Workshop, Referral Hub and Command Center pages)
- [ ] Register once yourself, open your link in the same browser, click **Register another student on this device** and register a friend. Check that the referral counts in the Referral Hub.
- [ ] Command Center → press ▶ to check that the 7-day replay works
- [ ] Clear your own test data: Command Center → **Reset my data**
- [ ] Paste the live link into the "Working Asset" field of the submission form

**Optional:** for real shared data across all visitors, connect the free Google Sheets backend. See [BACKEND_SETUP.md](BACKEND_SETUP.md).
