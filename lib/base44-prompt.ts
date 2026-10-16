/** The brief to give Base44 so it builds a copy of the owner dashboard on top of the logoless API. Shown on the API page and sent by email. */
export const API_BASE = 'https://logoless.io/api/v1'

export const BASE44_PROMPT = `Build me a private admin dashboard web app called "logoless owner" that runs my marketplace for creators and brands through its REST API. Its main job is managing ALL the text on the website (every sentence, button label and headline), plus features, the announcement bar, and the back office. It must work from a school network that blocks logoless.io, so every call to logoless goes from Base44 BACKEND FUNCTIONS (server side), never from the browser. The browser only talks to Base44.

SETUP
- Store the API key as a Base44 secret named LOGOLESS_API_KEY (it starts with lgk_ and I already have it) and the base URL as LOGOLESS_API_BASE = ${API_BASE}.
- Write one backend function "logoless(method, path, body)" that calls LOGOLESS_API_BASE + path with the header "Authorization: Bearer <LOGOLESS_API_KEY>" and "content-type: application/json", returns the parsed JSON, and passes errors through with their "error" message and status. Every page uses this function. Never expose the key to the browser.
- Only I can use the app: require sign in and allow only my own account.

LOOK AND FEEL
- Dark, minimal, editorial. Black background, white text, thin grey borders, large light sans-serif headings, pill buttons, no gradients or bright colours. Green and red only for good and bad states. Works on phone and desktop. Left sidebar on desktop, bottom tabs on phone. Use plain words: "submission" (not "clip") and "creator" (not "clipper").

PAGE 1: SITE TEXT (build this first, it is the most important)
Every piece of text on the site has a stable key. Money is in cents and times are unix seconds everywhere in this API.
- GET /text?q=&page=&edited=1&limit=50&offset=0 returns { total, edited (how many are changed), pages: [{page, n}], items: [{ key, original, shown, edited, page, updatedAt, updatedBy }] }. "original" is the sentence as written in the code, "edited" is my version (null when unchanged), "shown" is what visitors see now.
- Show a searchable list: a search box (q), a page dropdown filled from "pages", a switch "Only the ones I changed" (edited=1), and next/previous paging with the total. Each row shows the page in small grey text, the original sentence in grey, and one editable text box that holds "shown". A changed row gets a "Save" button and a "Reset to original" button (grey, with a confirm).
- Save: POST /text with { key, value, reason? }. The value is 1 to 2000 characters. Show a friendly error on failure (a 404 means the text is not in the list yet: use "Add by original sentence" below).
- Reset: POST /text/{key}/reset with {}.
- History: clicking a row's clock icon calls GET /text/{key}?history=20 and shows who changed it, when, the old and new wording, and the reason.
- Add by original sentence: a small form with "The sentence exactly as it is now" and "New wording" that calls POST /text with { original, value }. Use it when a sentence is not in the list.
- "Scan the site" button: POST /text/scan (takes up to a minute, show a spinner). It reads the public pages and adds the sentences it finds to the list. Show the result: pagesRead, sentencesSeen, added, total, and any pages in "failed".
- Home page headline: GET /text/hero returns { variants: [lines], isDefault }. Show the lines in a text area, one per line (at most 60). Save with POST /text/hero { variants: [...] }, and reset with POST /text/hero { variants: null }.
- Never change text I did not ask you to. Never bulk-edit. Always show the old and new wording side by side before saving.

PAGE 2: FEATURES
- GET /features returns { features: [{ id, name, description, category, path, live }], log: [...] }. Show a card per feature with its description, a "Live" or "Not live" pill, and a button "Push live" (POST /features/push { ids: [id] }) or "Take off" (POST /features/undo { ids: [id] }). Confirm before each. Pushing announces it in Discord automatically. Show the last pushes from "log" at the bottom.

PAGE 3: ANNOUNCEMENT BAR
- GET /announcement returns { announcement: { text, href } }. A form with the text (140 characters at most) and the link (a path like /faq or an https address), saved with POST /announcement { text, href }. Empty text switches the bar off. Show a live preview of the bar.

PAGE 4: OVERVIEW (GET /overview)
- Stat cards for people (total, online now, new today), live campaigns, campaign requests, submissions to review (queues.clipsToReview), withdrawals in review, new messages; money (brand balances, owed to creators, fees earned, paid out); three switches shown read-only (withdrawals paused, submissions paused, sign-ups paused); a health list. Auto refresh every 30 seconds. Show a red banner if any health item is "bad".

PAGE 5: STATS (GET /stats?range=24h|7d|30d|90d|all)
- Totals, a per-day line chart from "perDay" (views, visitors, errors), top pages, business and money blocks.

PAGE 6: PEOPLE (GET /users?q=&filter=online|new|flagged|restricted&limit=&offset=)
- A searchable grid of cards (handle, name, status, risk, owed, submissions, roles). Click for GET /users/{id}: profile, balances, stats, recent submissions, campaigns. A "Message" button calls POST /users/{id}/message with {title, text, href?, email?}.

PAGE 7: CAMPAIGNS (GET /campaigns?status=requested|awaiting_payment|live|paused|ended|rejected)
- Table with budget cap, paid to creators, status. Detail: GET /campaigns/{id}. Buttons call POST /campaigns/{id}/action with {action:"accept"} | {action:"reject", note} | {action:"pause", note?} | {action:"resume"} | {action:"end", note?}. Rejecting needs a reason (at least 3 characters).

PAGE 8: SUBMISSIONS (GET /clips?status=pending|approved|rejected&limit=)
- The API calls them "clips" in the path only. A queue with the link, platform, campaign, who posted it and their risk level. Buttons call POST /clips/{id}/action with {action:"approve"} or {action:"reject", reason} (reason at least 3 characters). A "Set views" field calls {action:"views", views:N}, which pays the creator, so ask me to confirm first and show the dollar amount (views / 1000 x the campaign rate_cents). That needs the "pay" scope, which my key may not have: then hide the field.

PAGE 9: WITHDRAWALS (GET /withdrawals?status=review|sent|failed)
- Read only table. Add a note that sending or declining withdrawals is done in the real owner dashboard.

PAGE 10: INBOX AND TICKETS (GET /inbox?status=new|open|closed, GET /inbox/{id})
- List on the left, conversation on the right with all replies. A reply box calls POST /inbox/{id}/reply with {text, close?}. Mark Discord tickets with a small badge ("discordTicket": true); replying posts in the person's private Discord channel and pings them.

PAGE 11: DISCORD ANNOUNCEMENTS
- A form calling POST /announce with {where:"news"|"updates", title, text, href?} to post in the Discord server.

PAGE 12: AUDIT (GET /audit?limit=100)
- A plain log table of who did what.

RULES
- Show friendly errors. A 401 means the key is wrong or revoked. A 403 says which scope is missing (the key needs "content" for text and "publish" for features and the bar). A 429 means wait a moment.
- Always confirm before reset, reject, end, pause, push, take-off and set-views actions.
- Money is always shown as dollars with two decimals and the original cents in a tooltip.
- Do not build anything that sends money, bans or deletes people, edits roles or changes site-wide switches: the API deliberately does not allow those.
- Use polling (30 seconds) on the overview rather than websockets.

Start by building the backend function and the Site text page, show me, then add the other pages one at a time.`
