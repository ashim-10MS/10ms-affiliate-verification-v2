# Affiliate Verification Portal v2

One-page portal where students check whether someone is an official 10 Minute School affiliate, using the affiliate's bKash or registered phone number.

```
index.html            the whole front end (inline CSS/JS)
apps-script/Code.gs   the Google Apps Script backend (already deployed)
```

## What changed
- Visitors now verify with **one number**, either the affiliate's **bKash number** or their **registered phone number**. The code + phone form is gone.
- New design: 10MS red theme, Poppins (English) and Anek Bangla (Bangla). Copy has been signed off in both languages.
- The page accepts `+880` / `88` prefixes, spaces and dashes, and Bangla digits (০১৭…).
- Share links re-run the check (`?q=<number>`) instead of only sending text.

## Status
| Part | Status |
|---|---|
| Backend (Apps Script bound to the "Affiliate DataBase - For Verification" sheet) | **Live.** Version 19 on the existing deployment, so the `/exec` URL is unchanged. Version 18 (old script) is still in history for rollback. |
| Front end (`index.html`) | **To do:** replace the current page on affiliate-verification.10minuteschool.com |

## Preview without hosting
Open `index.html` directly from a clone of this repo in a browser. Real lookups work, because the API allows any origin. Add `?demo=1` to the URL for fake data.

> ⚠️ **Only host this page on a 10minuteschool.com domain.** A test copy on `*.pages.dev` was flagged as phishing by Cloudflare within minutes: a 10MS-branded page that asks for phone/bKash numbers on a non-10MS domain looks exactly like a scam. For a shareable staging link, use a subdomain in the company Cloudflare account, e.g. `affiliate-verification-staging.10minuteschool.com`.

## Deploy the front end
1. Replace the current page with `index.html`. It's one self-contained file (inline CSS/JS, Google Fonts, logo from i.imgur.com) with no build step.
2. `API_URL` in the file already points at the live deployment. Don't change it.
3. Check after deploying:
   - Open `/?demo=1` to see the design with fake data and no API calls (`01800000001` = bKash match, `01700000001` = phone match, anything else = not found).
   - Run a real lookup with any bKash or phone number from the sheet.
   - Switch between English and বাংলা in the top right. `&lang=bn` in the URL opens the page in Bangla.

## API (for reference)
`POST <API_URL>` with header `Content-Type: text/plain;charset=utf-8` and body `{"query":"01XXXXXXXXX","token":"Speed&Scale"}`

- Found: `{ ok:true, found:true, matchedBy:"bkash"|"phone", affiliate:{ name, affiliateCode, phone, level, facebook, picture, bkash } }`
- Not found: `{ ok:true, found:false }`
- Errors: `{ ok:false, error:"unauthorized"|"empty"|"invalid"|"rate_limited" }`

Notes:
- NID is never read or returned.
- The old `{code, phone}` request is still accepted, so the current live page keeps working until it's replaced.
- The token is visible in the page source, so it isn't a real secret. The script's global cap of 1,500 lookups per 10 minutes is what stops someone scraping the sheet.

## Running the backend
- `apps-script/Code.gs` is the exact code that's deployed.
- Sheet edits show up within 2 minutes. Run `clearCache()` in the Apps Script editor to make them show at once.
- Optional: add a `Status` column. Rows marked Inactive / Suspended / Terminated stop verifying.
- To redeploy: Deploy → Manage deployments → ✏️ the first "Untitled" deployment (its ID ends in `…NO9wVHo5N0Ns3e`) → New version → Deploy. Only the deployment owner (ashim@) can do this.

## Open issues
- **Privacy:** the data sheet is shared as "anyone with the link can view", NID column included. Change it to Restricted. The portal is unaffected because the script runs as its owner.
- **Data:** two rows in the sheet (24 and 33) share a phone number and affiliate code, so that number always returns the first of them.
