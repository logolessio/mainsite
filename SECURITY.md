# Security notes

Money moves through this site, so every route that changes something follows the same pattern: sign-in check, role check, same-site check, rate limit, validated input, then the change, then an audit entry for anything an admin does.

## The 20-point checklist, point by point

| # | Item | Status |
| --- | --- | --- |
| 1 | Hide API keys | Keys exist only as Cloudflare Secrets. None are in the browser bundle. The Turnstile *site* key is public by design. |
| 2 | Environment variables | Set in Cloudflare, never in files. `.env.example` has names only. `/admin/keys` shows set / not set and never a value. |
| 3 | Keys in git | `.gitignore` now blocks `.env*`, `.dev.vars`, `*.pem`, `*.key` and service-account files. The tree and the full git history were scanned: clean. |
| 4 | Protect admin routes | Three layers: the admin layout, a check inside every admin page (non-admins get a plain 404), and a check inside every admin API. Add Cloudflare Access (see `PLATFORM_SETUP.md`) for a fourth. |
| 5 | Authentication | Google (Auth.js), 14-day sessions, human check (Turnstile) before sign-in starts. Suspended or banned accounts are refused everywhere. |
| 6 | User permissions | Every query is scoped to the signed-in user's id (clips, notifications, favourites, payouts). Only the campaign's owner can pay for it. Admin comes only from `ADMIN_EMAILS`. |
| 7 | Sanitise inputs | zod schemas, length caps, https-only link checks per platform, control characters stripped, request bodies capped at 64 KB. |
| 8 | XSS | React escapes all text. There is no raw HTML injection anywhere. Edited site text is stored and shown as plain text. CSP is on. Uploaded images are re-encoded and served with `nosniff` and a sandboxing CSP. SVG uploads are refused. |
| 9 | SQL injection | Every query uses bound parameters. The few queries with built clauses only join fixed fragments, never user text. |
| 10 | Database rules | D1 can only be reached from the Worker binding, not from the internet. Access rules are enforced in code by user id on every query. |
| 11 | Rate limiting | Per network and per account on every route that changes something, plus sign-in and the human check. Add a Cloudflare WAF rate rule as well. |
| 12 | Spend cap | Payment amounts always come from our database, never the browser. A campaign pool can never go below zero (single atomic statement). Daily payout cap, review of large withdrawals, and a one-click pause on all withdrawals (`/admin/settings`). |
| 13 | Secure file uploads | JPEG, PNG and WebP only, real type read from the file bytes, 450 KB cap, dimension check, re-encoded in the browser first, per-person storage cap, ownership check before an upload can be used. |
| 14 | CSRF | Every state-changing request must carry an `Origin` or `Sec-Fetch-Site` that proves it came from this site. Cookies are also `SameSite=Lax`. |
| 15 | CORS | No cross-origin access is granted to any route. Stripe's webhook is verified by its signature instead. |
| 16 | HTTPS | Cloudflare terminates TLS. HSTS for two years including subdomains, and `upgrade-insecure-requests`. |
| 17 | Security headers | CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. Test them in `/admin/keys`. |
| 18 | Secure cookies | `HttpOnly`, `Secure`, `SameSite=Lax`, `__Secure-` prefix in production. |
| 19 | Disable debug | No source maps, no `X-Powered-By`, visitors see generic error text, details go only to server logs. |
| 20 | (not visible in the video) | Covered instead: every admin action and every text change goes into a hash-chained log that shows tampering (`/admin/audit`), and D1 keeps 30 days of point-in-time restore. |

## Account checks for VPN / proxy / data-centre networks

Cloudflare tells us which network owns each visitor's address. Networks that belong to VPNs, proxies, Tor and cloud hosts are flagged at sign-up and again when someone withdraws. A flag never blocks anyone. It switches on extra checks: every withdrawal waits for an admin, earnings take twice as long to clear, and the account is marked in `/admin/users`. This is a heuristic based on the network's name, not proof. A paid IP-reputation service would make it sharper.

## Honest limits

- The CSP allows inline scripts because Next.js needs them without a per-request nonce. XSS protection therefore rests on there being no injection points, which is why raw HTML is never rendered.
- The audit chain makes tampering **visible**. It cannot stop someone who already has full access to the database.
- View counts are verified by an admin by hand for now.
- Legal pages are deliberately not editable from the site: change them in code so every edit is reviewed.
