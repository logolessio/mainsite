/** The brief to give Base44 so it builds a copy of the owner dashboard on top of the logoless API. Shown on the API page and sent by email. */
export const API_BASE = 'https://logoless.io/api/v1'

export const BASE44_PROMPT = `Build me a private admin dashboard web app called "logoless owner" that runs the back office of my clip-campaign marketplace through its REST API. It must work from a school network that blocks logoless.io, so every call to logoless goes from Base44 BACKEND FUNCTIONS (server side), never from the browser. The browser only talks to Base44.

SETUP
- Store the API key as a Base44 secret named LOGOLESS_API_KEY and the base URL as LOGOLESS_API_BASE = ${API_BASE}.
- Write one backend function "logoless(method, path, body)" that calls LOGOLESS_API_BASE + path with the header "Authorization: Bearer <LOGOLESS_API_KEY>" and "content-type: application/json", returns the parsed JSON, and passes errors through with their "error" message and status. Every page uses this function. Never expose the key to the browser.
- Only I can use the app: require sign in and allow only my own account.

LOOK AND FEEL
- Dark, minimal, editorial. Black background, white text, thin grey borders, large light sans-serif headings, pill buttons, no gradients or bright colours. Green and red only for good and bad states. Works on phone and desktop. Left sidebar on desktop, bottom tabs on phone.

PAGES AND THE ENDPOINTS BEHIND THEM (all JSON, money is in cents, times are unix seconds)
1. Overview (GET /overview): stat cards for people (total, online now, new today), live campaigns, campaign requests, clips to review, withdrawals in review, new messages; money (brand balances, owed to clippers, fees earned, paid out); three switches shown read-only (withdrawals paused, clips paused, sign-ups paused); a health list. Auto refresh every 30 seconds. Show a red banner if any health item is "bad".
2. Stats (GET /stats?range=24h|7d|30d|90d|all): totals, a per-day line chart from "perDay" (views, visitors, errors), top pages, business and money blocks.
3. People (GET /users?q=&filter=online|new|flagged|restricted&limit=&offset=): a searchable grid of cards (handle, name, status, risk, owed, clips, roles). Click for GET /users/{id}: profile, balances, stats, recent clips, campaigns. A "Message" button on the detail page calls POST /users/{id}/message with {title, text, href?, email?}.
4. Campaigns (GET /campaigns?status=requested|awaiting_payment|live|paused|ended|rejected): table with budget cap, paid to clippers, status. Detail: GET /campaigns/{id}. Buttons call POST /campaigns/{id}/action with {action:"accept"} | {action:"reject", note} | {action:"pause", note?} | {action:"resume"} | {action:"end", note?}. Rejecting needs a reason (at least 3 characters).
5. Clip review (GET /clips?status=pending|approved|rejected&limit=): queue with the link, platform, campaign, who posted it and their risk level. Buttons call POST /clips/{id}/action with {action:"approve"} or {action:"reject", reason} (reason at least 3 characters). A "Set views" field calls {action:"views", views:N}, which pays the clipper, so ask me to confirm first and show the dollar amount (views / 1000 x the campaign rate_cents).
6. Withdrawals (GET /withdrawals?status=review|sent|failed): read only table. Add a note that sending or declining withdrawals is done in the real owner dashboard.
7. Inbox and tickets (GET /inbox?status=new|open|closed, GET /inbox/{id}): list on the left, conversation on the right with all replies. A reply box calls POST /inbox/{id}/reply with {text, close?}. Mark Discord tickets with a small badge ("discordTicket": true); replying posts in the person's private Discord channel and pings them.
8. Announcements: a form calling POST /announce with {where:"news"|"updates", title, text, href?} to post in the Discord server.
9. Audit (GET /audit?limit=100): a plain log table of who did what.

RULES
- Show friendly errors. A 401 means the key is wrong or revoked. A 403 says which scope is missing. A 429 means wait a moment.
- Always confirm before reject, end, pause and set-views actions.
- Money is always shown as dollars with two decimals and the original cents in a tooltip.
- Do not build anything that sends money, bans or deletes people, edits roles or changes site settings: the API deliberately does not allow those.
- Use polling (30 seconds) rather than websockets.

Start by building the backend function and the Overview page, show me, then add the other pages one at a time.`
