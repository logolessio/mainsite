# logoless: UI build

Next.js 16 + Tailwind 4 + Framer Motion. UI only: every backend touchpoint is marked `TODO(backend)`.

    pnpm install && pnpm dev

## Where to wire the backend
- `lib/auth.ts`: Discord / Google / email sign-in, sign-up, password reset stubs
- `app/{dashboard,brand,admin}/layout.tsx`: add session + role guards
- `components/app/payouts-panel.tsx`: Stripe Connect onboarding + withdrawals
- `components/app/billing-panel.tsx`: Stripe Checkout to add funds
- `components/app/campaign-wizard.tsx`: create campaign
- `components/app/review-queue.tsx`, `admin-tables.tsx`: admin data + actions (row types define the shape)
- `lib/campaigns.ts`: placeholder campaigns, replace with DB
- `lib/site.ts`: domain, company, emails, fee %, minimums (all shown in copy and legal text)
- `lib/legal.ts`: starter legal text. Have counsel review before launch.
