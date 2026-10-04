# Optional: real shared data with Google Sheets (free, ~5 minutes)

By default every visitor's registrations live in **their own browser** (localStorage). That's perfect for a demo. To collect **real** registrations from everyone into one Google Sheet, with leaderboards and the Command Center updating across devices, connect the Apps Script backend.

## Steps

1. Create a new Google Sheet at https://sheets.new and name it `BuildAI60 Registrations`.
2. **Extensions → Apps Script**. Delete the sample code and paste the whole of [`backend/google-apps-script.gs`](../backend/google-apps-script.gs). Click **Save**.
3. **Deploy → New deployment →** gear icon → **Web app**
   - Description: `BuildAI60 API`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, then **Authorize access** (choose your account → Advanced → Go to project → Allow).
4. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy…/exec`.
5. Test it: open `<that URL>?action=ping` in a browser. You should see `{"ok":true,…}`.
6. Paste the URL into `js/config.js`:
   ```js
   backendUrl: "https://script.google.com/macros/s/AKfy…/exec",
   ```
7. Commit and push (or re-drop on Netlify). Done.

The sheet creates three tabs automatically on first use: **Registrations**, **Champions** and **Events**.

## How it works

| Request | What happens |
|---|---|
| `POST {action:"register"}` | Validates, dedupes by phone/email (with a lock, so two signups can't collide), assigns a unique referral code and appends a row |
| `POST {action:"champion"}` | Same, for Campus Champions |
| `POST {action:"event"}` | Logs visit / form_start / share events for the funnel |
| `GET ?action=stats` | Returns **sanitised** public data: names shortened to "Ravi K.", **no phone numbers or emails**, plus events aggregated by day/type/source/variant |

The browser sends JSON as `text/plain`, which is a "simple" CORS request, so it works from GitHub Pages or Netlify with no proxy.

## Notes

- **Privacy:** phone numbers and emails stay in your Sheet. Only you can see them. Add a privacy note on the form if you run this for real.
- **Spreadsheet safety:** cells starting with `= + - @` are escaped to block formula injection.
- **Updating the script:** after editing, use **Deploy → Manage deployments → Edit → New version**. That keeps the same URL.
- **Demo mode:** with `demoMode: true`, the simulated campaign still blends with the real data. Set `demoMode: false` for real numbers only.
