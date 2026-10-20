# Linking pinkaholic.com.au (GoDaddy) to GitHub Pages

The site is already live at https://fluffy731.github.io/pinkaholic/. These steps put it on https://pinkaholic.com.au, with www redirecting to it.

> **Before you start:** GitHub's terms say Pages isn't allowed to be used "to run your online business, e-commerce site" ([GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). A shop site is a risk there. The safer option is to keep the code on GitHub and let Cloudflare Pages host it from the same repo, which changes the DNS steps below. Decide on hosting before you change any DNS.

Do the steps in this order. Verifying the domain first stops anyone else from claiming it on GitHub.

## 1. Verify the domain with GitHub (about 5 minutes, then wait)

1. On GitHub, open your profile picture → **Settings** → **Pages** (under "Code, planning, and automation").
2. Click **Add a domain**, type `pinkaholic.com.au`, then click **Add domain**.
3. GitHub shows a TXT record. It looks like:
   - Name: `_github-pages-challenge-fluffy731`
   - Value: a long random code
4. Keep that page open and do step 2 below. Come back later and click **Verify**.

## 2. Add the DNS records at GoDaddy

1. Sign in at godaddy.com → **My Products** → next to pinkaholic.com.au click **DNS** (or **Manage DNS**).
2. **Delete** any existing `A` record with Name `@` that points to "Parked" or a GoDaddy IP. Also delete any `CNAME` with Name `www` that points to `@` or a GoDaddy address. Leave `NS`, `SOA` and any `MX` (email) records alone.
3. Add these records with **Add New Record**:

| Type | Name | Value | TTL |
|---|---|---|---|
| TXT | `_github-pages-challenge-fluffy731` | the code from step 1 | 1 hour |
| A | `@` | `185.199.108.153` | 1 hour |
| A | `@` | `185.199.109.153` | 1 hour |
| A | `@` | `185.199.110.153` | 1 hour |
| A | `@` | `185.199.111.153` | 1 hour |
| AAAA | `@` | `2606:50c0:8000::153` | 1 hour |
| AAAA | `@` | `2606:50c0:8001::153` | 1 hour |
| AAAA | `@` | `2606:50c0:8002::153` | 1 hour |
| AAAA | `@` | `2606:50c0:8003::153` | 1 hour |
| CNAME | `www` | `fluffy731.github.io` | 1 hour |

For the TXT record, GoDaddy adds `.pinkaholic.com.au` itself, so enter only `_github-pages-challenge-fluffy731` as the Name.

4. If GoDaddy shows a **Forwarding** section for the domain, make sure it's off. Forwarding overrides the A records.

## 3. Check the DNS has updated

Changes usually show within 30 minutes and can take up to 48 hours. To check, run this in a terminal:

```bash
nslookup pinkaholic.com.au
```

You should see the four `185.199.x.153` addresses. Then go back to GitHub Settings → Pages and click **Verify** on the domain.

## 4. Point the site at the domain

1. Open https://github.com/fluffy731/pinkaholic/settings/pages
2. Under **Custom domain**, type `pinkaholic.com.au` and click **Save**. GitHub runs a DNS check, which should go green.
3. Wait until the HTTPS certificate is issued (up to an hour), then tick **Enforce HTTPS**.

Or ask Claude to run it for you:

```bash
gh api -X PUT repos/fluffy731/pinkaholic/pages -f cname=pinkaholic.com.au -F https_enforced=true
```

Once it's saved, https://www.pinkaholic.com.au and https://fluffy731.github.io/pinkaholic/ both redirect to https://pinkaholic.com.au.

## 5. Email at the domain (optional)

The site's contact address is `hello@pinkaholic.com.au` (set in `site/config.js`). That address only works once you set up email for the domain. Options:

- **GoDaddy email forwarding**: forwards hello@ to your Gmail. Check whether your GoDaddy plan includes it.
- **Cloudflare Email Routing**: free forwarding, but you'd need to move the domain's DNS to Cloudflare.
- **Google Workspace or Microsoft 365**: a full mailbox, about A$10 a month.

Each one gives you MX records to add in GoDaddy's DNS page next to the records above. Adding them doesn't affect the website.

## If something goes wrong

- **"Domain does not resolve to the GitHub Pages server"**: an old GoDaddy A record or forwarding is still in place. Remove it and wait.
- **The certificate never arrives**: remove the custom domain in GitHub, wait a few minutes, then add it again.
- **The `.com.au` domain shows as inactive**: auDA needs your ABN or business details to stay current. Check the domain's status in GoDaddy.
