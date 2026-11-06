import { SITE } from './site'

export type LegalSection = { h: string; p: string[] }
export type LegalDoc = { slug: string; title: string; summary: string; group: 'Agreements' | 'Privacy' | 'Content' | 'Other'; sections: LegalSection[] }

/** The order the legal index shows its groups in. */
export const LEGAL_GROUPS: LegalDoc['group'][] = ['Agreements', 'Privacy', 'Content', 'Other']

const S = SITE.name
const C = SITE.company
/** The registered address, left out while it is still the placeholder in site.ts. */
const ADDRESS = SITE.address.startsWith('[') ? '' : `, ${SITE.address}`
/** A page on the site, and a legal document by its slug. Written out in full so the renderer links them. */
const U = (path: string) => `${SITE.url}${path}`
const L = (slug: string) => U(`/legal/${slug}`)

// Starter legal text. Have qualified counsel review and tailor every document before launch.
// Facts in here come from the code (cookie names in auth.ts and lib/human.ts, upload limits in lib/upload.ts and lib/audio.ts,
// the username rule in lib/handle-shared.ts). If one of those changes, change the text here too.
const RAW: LegalDoc[] = [
  /* ------------------------------------------------------------------ Agreements */
  {
    slug: 'terms',
    title: 'Terms of Service',
    group: 'Agreements',
    summary: `The agreement between you and ${C} for using ${S}.`,
    sections: [
      {
        h: 'Agreeing to these terms',
        p: [
          `These Terms are an agreement between you and ${C} ("${S}", "we", "us"). They cover the website at ${SITE.url} including the editor, the pages people make, and anything else we offer under the ${S} name (together, the "Service").`,
          `By creating an account or using the Service you agree to these Terms, the Acceptable Use Policy (${L('acceptable-use')}), the Community Guidelines, the Username Policy and the Music & Uploads policy. Our Privacy Policy (${L('privacy')}) explains how we handle your data. If you do not agree, do not use the Service.`,
        ],
      },
      {
        h: 'Who can use logoless',
        p: [
          'You must be at least 13 years old. If you live in the EEA, the UK or another place where the age of digital consent is higher, you must be at least that age (up to 16).',
          'If you are under the age of majority where you live, a parent or guardian must agree to these Terms for you.',
          'If you use the Service for a company or other organisation, you confirm that you can bind it to these Terms.',
        ],
      },
      {
        h: 'What logoless is',
        p: [
          `${S} is a link-in-bio tool for video editors. Each person gets one page at logoless.io/<name>. You build it in the editor at ${U('/editor')} with layouts, backgrounds, music, cursors, links, embeds and an enter screen.`,
          `The Service is free. There are no paid plans and we do not take payments.`,
          'We keep improving the Service. We may add, change or remove features at any time. We will try to give notice before removing something you rely on, but we do not promise that any feature will stay.',
        ],
      },
      {
        h: 'Your account',
        p: [
          'You can sign in with Google, Discord, an email and password, or a passkey. Give us accurate information and keep your sign-in details safe. You are responsible for what happens under your account.',
          'You can turn on two-step sign-in codes and add passkeys in the editor. We strongly recommend it.',
          'If you sign in with Discord or connect Discord, you allow our Discord bot to add you to the logoless Discord server and to give you roles there. You can disconnect Discord at any time.',
          `One person, one account. Tell us at ${SITE.emails.support} straight away if you think someone else has used your account.`,
        ],
      },
      {
        h: 'Your page and username',
        p: [
          'Your page is public by default. Anyone with the link can see it, and search engines may list it unless you switch that off in the editor.',
          `Usernames follow the Username Policy (${L('usernames')}). We may take back or change a username that breaks that policy or these Terms.`,
        ],
      },
      {
        h: 'Your content',
        p: [
          'You keep ownership of everything you put on your page: text, links, pictures, videos, music and settings ("your content").',
          'You give us a worldwide, non-exclusive, royalty-free licence to host, store, copy, process, display and play your content, only so we can run the Service. Processing includes things like resizing and re-encoding pictures, and playing your music with the speed, pitch, reverb and fade settings you choose. The licence ends when you delete the content or your account, except for copies in short-term backups and anything we must keep by law.',
          `You promise that you have every right needed to use your content on ${S}, including music. Read the Music & Uploads policy (${L('music-and-uploads')}).`,
          'We do not check content before it goes live, but we may remove or hide content, or limit a page, if we believe it breaks these Terms or the law.',
        ],
      },
      {
        h: 'Rules and enforcement',
        p: [
          `Follow the Acceptable Use Policy and the Community Guidelines (${L('community-guidelines')}). If you break them, we may warn you, hide content or your page, take back your username, or suspend or close your account.`,
          `Do not try to inflate your view or click counts. Counts are approximate, leave out known bots, and may be reset or corrected.`,
        ],
      },
      {
        h: 'Other services',
        p: [
          'Pages can link to other websites and can show embedded players from YouTube, Vimeo, TikTok and Spotify. Backgrounds can come from GIPHY, and song lyrics can be found through LRCLIB. Sign-in can use Google and Discord. Those services have their own terms and privacy policies, and we are not responsible for them, their content or their availability.',
          'A link on a page is the page owner\'s choice, not an endorsement by us. Be careful where you go.',
        ],
      },
      {
        h: 'Ending your account',
        p: [
          `You can stop using ${S} at any time. To delete your account, email ${SITE.emails.support} from the address on your account. Before you go, you can download a backup of your page in the editor's Settings tab.`,
          'We may suspend or close an account, or remove a page, if you break these Terms, if the law requires it, or if your use puts other people or the Service at risk. Where it is safe and lawful, we will tell you why and how to appeal.',
          'Sections that by their nature should survive the end of this agreement (such as ownership, disclaimers, limits of liability and disputes) survive it.',
        ],
      },
      {
        h: 'Disclaimers and liability',
        p: [
          'The Service is provided "as is" and "as available", without warranties of any kind, to the fullest extent the law allows. We do not promise that it will be uninterrupted, error-free or that your content will never be lost. Keep your own backups.',
          `To the fullest extent the law allows, ${C} is not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, data or goodwill. Our total liability for any claim about the Service is limited to USD 100.`,
          'You agree to cover our reasonable costs if a claim is brought against us because of your content or your breach of these Terms.',
          'Nothing in these Terms limits liability that cannot be limited by law, or takes away rights you have as a consumer.',
        ],
      },
      {
        h: 'Law, disputes and changes',
        p: [
          'These Terms are governed by the laws of the place where the company is registered, without regard to conflict-of-law rules. Disputes go to the courts of that place, unless consumer law where you live gives you the right to bring a claim there.',
          'We may update these Terms. If a change is material we will tell you in the product or by email before it takes effect. If you keep using the Service after that date, you accept the new Terms.',
          `Questions about these Terms go to ${SITE.emails.legal}. ${C}${ADDRESS}.`,
        ],
      },
    ],
  },
  {
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    group: 'Agreements',
    summary: 'What you may not put on a page, and what you may not do to the Service.',
    sections: [
      {
        h: 'Why this exists',
        p: [
          `${S} pages are public and anyone can open them. This policy keeps visitors safe and the Service working. It is part of the Terms of Service (${L('terms')}). The Community Guidelines (${L('community-guidelines')}) explain the same rules in plainer words.`,
        ],
      },
      {
        h: 'Content you may not put on a page',
        p: [
          'Child safety: any sexual content involving minors, or content that sexualises or endangers children. We report it to the authorities.',
          'Sexual content: pornography or sexually explicit images or video, and links whose main purpose is sexual content without a clear warning on the page.',
          'Violence and hate: threats, incitement to violence, terrorism or violent extremism, and attacks on people for who they are.',
          'Harassment: bullying, targeting a person, or sharing someone\'s private information (doxxing) or intimate images without consent.',
          'Self-harm: content that encourages suicide, self-harm or eating disorders.',
          'Illegal goods and services: selling or promoting drugs, weapons, stolen data, counterfeit goods, or anything else that is illegal where it is offered.',
          'Infringement: music, pictures, video or trademarks you do not have the rights to use.',
          'Impersonation: pretending to be another person, brand or organisation, including us, in a way that misleads.',
        ],
      },
      {
        h: 'Links and embeds',
        p: [
          'Phishing: pages or links that try to collect passwords, payment details or other private information under false pretences.',
          'Malware: links to viruses, malicious downloads or sites that attack visitors\' devices.',
          'Deceptive redirects: links whose title hides where they really go, link chains used to dodge our checks, or cloaking that shows us one thing and visitors another.',
          'Scams: fake giveaways, get-rich-quick schemes, pyramid schemes and investment fraud.',
          'Spam: mass-produced pages that exist only to push traffic somewhere else.',
        ],
      },
      {
        h: 'What you may not do to the Service',
        p: [
          'Scraping: collecting pages, usernames or data with bots, crawlers or scripts beyond what a normal search engine does, or building a copy of the Service.',
          'Counter abuse: inflating views or clicks with bots, scripts, refresh loops, paid traffic or any other trick, or attacking someone else\'s counts.',
          'Attacks: probing, scanning or testing for weaknesses without following our Security policy, overloading the Service, or getting around rate limits, sign-in checks or other protections.',
          'Account abuse: creating accounts in bulk, sharing or selling accounts, or using someone else\'s account without permission.',
          'Username abuse: holding usernames only to sell them, or trading usernames. See the Username Policy.',
          'Upload abuse: using uploads to store or share files that are not part of your page, or hiding harmful data in them.',
          'Unlawful use: anything that breaks the law or someone else\'s rights.',
        ],
      },
      {
        h: 'What we do',
        p: [
          `We may remove content, hide a page, take back a username, or suspend or close an account. Serious harm, such as child sexual abuse material, phishing or malware, gets removed at once and may be reported to the authorities.`,
          `Report a page at ${U('/report')} or email ${SITE.emails.abuse}.`,
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ Privacy */
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    group: 'Privacy',
    summary: 'What data we collect, why we collect it, who sees it, and how to get it deleted.',
    sections: [
      {
        h: 'Who we are',
        p: [
          `${C} ("${S}", "we") runs ${SITE.url} and is the controller of the personal data described here. Contact: ${SITE.emails.privacy}. ${C}${ADDRESS}.`,
          'This policy covers people with an account (page owners) and people who visit pages (visitors).',
        ],
      },
      {
        h: 'What we collect',
        p: [
          'Account data: your email address, name, username, and how you sign in. If you use a password we keep only a salted, hashed version, never the password itself.',
          'Sign-in data: from Google or Discord we receive your account ID, name, email address and profile picture, as you approve on their screen. For passkeys we keep only the public key and a label, never your face, fingerprint or PIN. If you turn on two-step sign-in we keep the secret your authenticator app uses and your backup codes.',
          'Discord: if you sign in with Discord or connect it, we keep your Discord user ID so our bot can recognise you, add you to our server and manage your roles there.',
          'Page content: everything you put on your page, including your name, bio text, links, social profiles, embeds, layout, colours, cursor, music settings, song lyrics you add, and page title and description.',
          'Lyrics search: when you search for lyrics in the editor, our server sends only your search words (such as the song title and artist) to LRCLIB. No account data is sent. The lyrics you choose are copied into your page settings.',
          'Uploads: pictures, cursor pictures, short background videos and music you upload, with their type, size and upload time.',
          'Counters: how many times your page was viewed and your links were clicked, per day and per link. These are plain numbers. We do not record who viewed or clicked.',
          'Activity logs: when you use our API (for example, saving your page or signing in) we log the time, the address on our site, the result, your account if you are signed in, a scrambled (hashed) form of your network address rather than the address itself, your country, a rough label for your browser and device (such as "Chrome on macOS"), and the website that sent you.',
          'Messages: emails and reports you send us, and the emails we send you.',
          'Waitlist: if you joined our waitlist, your email address and the username you asked for.',
        ],
      },
      {
        h: 'What we collect from visitors',
        p: [
          'Visitors do not need an account. When you open a page we count one view per browser session, and one click when you press a link. To count a view once, your browser remembers which pages it has already counted, in its own session storage, until you close the tab.',
          'To stop counter abuse we keep a short-lived record against a scrambled form of your network address. It is cleared after about a day. Known bots are not counted.',
          `Your settings at ${U('/preferences')} (such as reduced motion or not autoplaying music) stay in your browser and are never sent to us.`,
          `If a page shows a YouTube, Vimeo, TikTok or Spotify player, or a GIPHY background, your browser loads it from that company, which receives your network address and may set its own cookies. See Cookies & Local Storage (${L('cookies')}).`,
        ],
      },
      {
        h: 'Why we use it, and our legal bases',
        p: [
          'To run the Service: create your account, sign you in, store and show your page, play your music, and show you your counts. Legal basis: performing our contract with you.',
          'To keep the Service safe: stop spam, fraud, counter abuse and attacks, enforce our rules, and fix errors. Legal basis: our legitimate interest in a safe, working service.',
          'To talk to you: send sign-in codes, security alerts and important notices about your account or these policies. Legal basis: contract, and legitimate interest.',
          'To meet the law: answer valid legal requests and keep records the law requires. Legal basis: legal obligation.',
          'We do not use your data for advertising, we do not build advertising profiles, and we do not sell it. We do not use automated decisions that have legal or similarly significant effects on you.',
        ],
      },
      {
        h: 'Who we share it with',
        p: [
          'Everyone: your page and anything on it is public, unless you change who can see it.',
          `Service providers: companies that host the Service, send our email, and provide sign-in. They only process data on our instructions. The full list is on the Subprocessors page (${L('subprocessors')}).`,
          'Platforms you choose: if you sign in with Google or Discord, or embed a player from another platform, that company receives what it needs to do its part.',
          'Legal reasons: authorities or advisers when the law requires it, or to protect people\'s safety, our users or our rights.',
          'A buyer: if the company is merged or sold, data may move to the new owner under this policy.',
        ],
      },
      {
        h: 'How long we keep it',
        p: [
          'Account data and page content: while your account is open. When you delete your account we delete it within 30 days.',
          'Uploads: until you delete them, replace them, or your account is deleted. We also clear older uploads of each kind automatically (see Music & Uploads).',
          'Counters: kept with your page until you reset them in the editor\'s Storage tab or delete your account.',
          'Activity logs: kept for security and fixing errors, for no longer than 12 months.',
          'Sign-in and email codes: a few minutes, until they are used or expire.',
          'Backups: our hosting keeps a rolling point-in-time copy of the database for up to 30 days, so deleted data may remain there until it rolls off.',
          'We may keep data longer if the law requires it or to deal with a dispute, abuse report or legal claim.',
        ],
      },
      {
        h: 'Your rights and how to use them',
        p: [
          'Depending on where you live, you may have the right to access your data, correct it, delete it, get a copy in a portable format, restrict or object to how we use it, and withdraw consent. You can also complain to your data protection authority.',
          'Do it yourself: change your page in the editor; delete single uploads or clear unused ones in the Storage tab; reset your views and clicks in the Storage tab; download a backup of your page as a JSON file in the Settings tab; disconnect Discord; remove passkeys.',
          `Visitors: clear everything ${S} stored in your browser with "Clear data on this device" at ${U('/preferences')} on each device you use.`,
          `Anything else, including a full copy of your data or deleting your account: email ${SITE.emails.privacy}. We will confirm it is you, then answer within 30 days (or 45 days where US state law allows).`,
          'California and other US states: you have the right to know, delete and correct your personal information, and to opt out of sale or sharing. We do not sell or share it (see Do Not Sell or Share). We will not treat you differently for using your rights. You may use an authorised agent; we will ask for proof.',
        ],
      },
      {
        h: 'Children',
        p: [
          'The Service is not for children under 13, or under 16 in the EEA and the UK (or the age of digital consent where you live). We do not knowingly collect their data. If you think a child has given us personal data, tell us and we will delete it.',
        ],
      },
      {
        h: 'International transfers and security',
        p: [
          'We and our providers process data in the United States and other countries, including on Cloudflare\'s global network. Where the law requires, we rely on safeguards such as the EU Standard Contractual Clauses and the UK addendum.',
          `We protect data with encryption in transit, hashed passwords, bound database queries, rate limits and access controls. No system is perfect, so use a passkey or two-step sign-in. See our Security page (${L('security')}).`,
        ],
      },
      {
        h: 'Changes and contact',
        p: [
          'We will post changes here and update the date at the top. If a change is material we will tell you in the product or by email before it takes effect.',
          `Send questions or requests to ${SITE.emails.privacy}.`,
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookies & Local Storage',
    group: 'Privacy',
    summary: 'Every cookie and browser storage key we use, what it is for, and how to clear it.',
    sections: [
      {
        h: 'The short version',
        p: [
          `${S} uses only the cookies it needs to sign you in and keep sign-in safe. We use no advertising cookies and no third-party analytics. Visitor settings are stored in your browser, not on our servers. Embedded players from other platforms may set their own cookies.`,
          'Because these cookies are strictly necessary, we do not ask for consent before setting them. Blocking them stops sign-in from working, but pages still open.',
        ],
      },
      {
        h: 'Our cookies',
        p: [
          'Session cookie: The cookie authjs.session-token (called __Secure-authjs.session-token on our live site). Keeps you signed in. It is encrypted, cannot be read by page scripts, and lasts 14 days. It is shared across logoless.io addresses so one sign-in works on all of them.',
          'Form protection: The cookie authjs.csrf-token (called __Host-authjs.csrf-token on our live site). Proves sign-in requests come from our own pages. Lasts until you close the browser.',
          'Return address: The cookie authjs.callback-url remembers which page to send you back to after you sign in.',
          'Sign-in checks: Cookies such as authjs.state, authjs.pkce.code_verifier and authjs.nonce are set only while you sign in with Google or Discord, to make sure the answer came from the right place. They expire after 15 minutes.',
          'Human check: The cookie ll_human proves you passed the Cloudflare Turnstile check before signing in or signing up. It is signed, tied to a scrambled form of your network address, and lasts 15 minutes.',
          'Passkey check: The cookie lg_pk holds the one-time challenge while you sign in or add a passkey. It lasts 5 minutes and is cleared when used.',
        ],
      },
      {
        h: 'Browser storage',
        p: [
          `Preferences: The key logoless:prefs holds the settings you choose at ${U('/preferences')} such as reduced motion, not autoplaying music, a music volume cap and plain cursors. It stays on this device only.`,
          'Calm mode: The keys logoless:calm and logoless:calm-auto remember whether heavy animation is off, and whether that was your choice or switched on because your device was struggling.',
          'View counting: The session storage key bio-seen:<username> marks that this tab already counted a view of that page, so a reload is not counted twice. It is removed when you close the tab.',
          'Music player position: If a page lets visitors drag its music player around, the session storage key logoless:player:<username> remembers where you moved it for that visit. It is removed when you close the tab.',
          'Cached files: the browser may keep copies of our files (such as fonts and page assets) in its cache to load faster.',
          'None of these are sent to us, and none identify you.',
        ],
      },
      {
        h: 'Third parties',
        p: [
          'Cloudflare: hosts the Service and runs the Turnstile human check. It may set a short-lived security cookie (such as __cf_bm) to tell people from bots.',
          'Google and Discord: set their own cookies on their own sites when you sign in with them.',
          'Embedded players: only load when a page shows them. YouTube players use youtube-nocookie.com, and Vimeo players ask Vimeo not to track. TikTok and Spotify players may set their own cookies under their own policies.',
          'GIPHY: when a page uses a GIPHY background, your browser loads the picture from GIPHY, which receives your network address.',
          'Fonts: our fonts are served from our own site, not from Google Fonts.',
        ],
      },
      {
        h: 'How to clear it',
        p: [
          `Open ${U('/preferences')} and press "Clear data on this device". It removes every ${S} key from local storage and session storage and clears our files from your browser's cache. Do it on each device and browser you use.`,
          'Signing out clears the session cookie. You can also delete or block cookies in your browser settings. Cookies set by embedded players are managed in your browser or on that platform.',
        ],
      },
    ],
  },
  {
    slug: 'subprocessors',
    title: 'Subprocessors',
    group: 'Privacy',
    summary: 'The companies that help run logoless and what each one handles.',
    sections: [
      {
        h: 'What this list is',
        p: [
          `These are the outside companies that process personal data to run ${S}. Each one gets only what it needs for its job. We will update this page before adding a new one that handles account data.`,
        ],
      },
      {
        h: 'Core providers',
        p: [
          'Cloudflare: hosting (Workers), the database that holds accounts, pages, uploads, counters and logs (D1), network delivery, security, and the Turnstile human check. Processes all data the Service handles. United States and global network.',
          'Resend: sends our emails, such as sign-up and reset codes and account notices. Processes your email address and the message. United States.',
        ],
      },
      {
        h: 'Sign-in and community',
        p: [
          'Google: sign-in with Google. Processes your Google account ID, name, email and profile picture. Only if you choose it.',
          'Discord: sign-in with Discord, and our Discord bot, which links your account and gives you roles in our server. Processes your Discord ID, name, email and profile picture. Only if you choose it.',
        ],
      },
      {
        h: 'Page features',
        p: [
          'GIPHY: the GIF search in the editor and GIF backgrounds. Searches go through our server, so GIPHY does not see who searched. Visitors\' browsers load chosen GIFs from GIPHY directly.',
          'Buzzheavier: stores files people choose to host for download from their page (preset packs, LUTs, project files). The file and its name are sent to Buzzheavier and visitors download it from Buzzheavier\'s own page, under its own terms. Pictures, videos and songs shown on a page are not sent there.',
          'Apple (iTunes Search) and Deezer: used to find a song\'s title, artist, album, cover and a short preview clip when a page owner searches for a song or pastes a song link. Searches go through our server and only the search words or the song link are sent. Visitors\' browsers may load covers and clips from them when a page shows one.',
          'LRCLIB: a free community lyrics database (https://lrclib.net) used when a page owner searches for synced lyrics in the editor. Contacted only when an owner searches, through our server, and only the search words are sent. Visitors\' browsers never contact it.',
          'Embed providers: YouTube (through youtube-nocookie.com), Vimeo (with tracking turned off), TikTok and Spotify. These load in the visitor\'s browser only when a page shows one of their players. They receive the visitor\'s network address and act under their own privacy policies.',
        ],
      },
      {
        h: 'Questions',
        p: [`To ask about a provider or how data moves between countries, email ${SITE.emails.privacy}.`],
      },
    ],
  },
  {
    slug: 'do-not-sell',
    title: 'Do Not Sell or Share My Personal Information',
    group: 'Privacy',
    summary: 'We do not sell or share your personal information, and how to make a request anyway.',
    sections: [
      {
        h: 'Our practice',
        p: [
          `${S} does not sell personal information, and does not share it for cross-context behavioural advertising. We run no ads, no ad trackers and no third-party analytics. If that ever changes we will update this page first and give you a way to opt out.`,
        ],
      },
      {
        h: 'Making a request',
        p: [
          `If you want it on record, email ${SITE.emails.privacy} with the subject "Do Not Sell or Share" and we will record your request. We also honour Global Privacy Control signals sent by your browser.`,
        ],
      },
      {
        h: 'Your other rights',
        p: [
          `Residents of California and other US states may have the right to know, delete, correct and get a copy of their personal information, and to limit use of sensitive information. We will not treat you differently for using these rights. You may use an authorised agent; we will ask for proof. See the Privacy Policy (${L('privacy')}).`,
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ Content */
  {
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    group: 'Content',
    summary: 'What is OK on a page, how reports work, and what happens when something breaks the rules.',
    sections: [
      {
        h: 'Make it yours',
        p: [
          `Your ${S} page is your corner of the internet. Show your edits, link your channels, set the mood with music and a background. Loud, dark, strange and experimental are all welcome. Just keep it safe for the people who open it.`,
        ],
      },
      {
        h: "What's OK",
        p: [
          'Your own work, your links, your socials and your style.',
          'Music, clips and pictures you made or have permission to use.',
          'Fan pages and parody, as long as it is clear you are not the real person or brand.',
          'Strong opinions, as long as you are not attacking people for who they are.',
        ],
      },
      {
        h: "What's not",
        p: [
          'Anything sexual involving minors. Ever. We report it.',
          'Porn or sexually explicit media.',
          'Threats, hate, harassment, or posting someone\'s private details.',
          'Scams, phishing, malware, or links that hide where they really go.',
          'Pretending to be someone you are not.',
          'Selling illegal things.',
          'Music, video or art you do not have the rights to use.',
          'Faking views or clicks.',
          `The full list is in the Acceptable Use Policy (${L('acceptable-use')}).`,
        ],
      },
      {
        h: 'Be kind to visitors',
        p: [
          'Flashing effects, loud music and heavy motion can hurt some people. Visitors can turn motion and autoplay off, but think about it anyway: avoid fast strobing, and keep music at a sensible volume.',
        ],
      },
      {
        h: 'How reports work',
        p: [
          `Anyone can report a page at ${U('/report')} or by emailing ${SITE.emails.abuse}. Include the page address and what is wrong. A person on our team reads every report. We do not tell the page owner who reported them.`,
          `Copyright complaints follow the Copyright & DMCA process (${L('dmca')}).`,
        ],
      },
      {
        h: 'What we do',
        p: [
          'Warn: for a first, minor problem we ask you to fix it.',
          'Hide: we may hide a piece of content or the whole page while we look into it, or until it is fixed.',
          'Take back a username: if it impersonates someone or breaks the Username Policy.',
          'Suspend or close: for serious or repeated breaks. Child safety, phishing and malware lead to immediate removal.',
          'We look at context, intent and history. Serious harm can skip the warning.',
        ],
      },
      {
        h: 'Appeals',
        p: [
          `If you think we got it wrong, email ${SITE.emails.support} within 30 days with your username and why. Someone who did not make the first decision will look again and reply.`,
        ],
      },
    ],
  },
  {
    slug: 'usernames',
    title: 'Username Policy',
    group: 'Content',
    summary: 'How usernames are given out, which are reserved, how often you can change yours, and when we take one back.',
    sections: [
      {
        h: 'First come, first served',
        p: [
          'Your username is also your page address, logoless.io/<name>. Usernames are given out in the order people claim them. Claiming one does not give you ownership of it; it gives you the right to use it under these rules.',
          'A username can be 1 to 30 characters long. It can use letters, numbers, and the punctuation . _ - ~ ! $ * + = anywhere in it, as long as it has at least one letter, number or underscore. Usernames are not case-sensitive.',
          'A username cannot end like a file name (for example .png or .html), because the address would not work.',
        ],
      },
      {
        h: 'Reserved names',
        p: [
          'Some names are kept for us. These include the names of pages on the site (such as editor, legal, help or report), and words that would make you look like staff (such as logoless, admin, support, official or moderator, including when split with punctuation). We may reserve more names at any time.',
        ],
      },
      {
        h: 'Changing your username',
        p: [
          'You can change your username twice in any seven days. After two changes, the editor tells you when you can change it again. Choosing your first username does not count.',
          'When you change it, your old username becomes free and someone else can take it. Links that used the old address will stop pointing to you.',
        ],
      },
      {
        h: 'No squatting or selling',
        p: [
          'Do not claim usernames just to hold them, sell them, or stop someone else using them. Do not buy, sell, trade or rent usernames or accounts. We may take back usernames used this way without notice.',
        ],
      },
      {
        h: 'Impersonation and trademarks',
        p: [
          'Do not use a username to pretend to be another person, brand or organisation.',
          `If a username uses your name or trademark in a way that misleads people, email ${SITE.emails.legal} with the username, proof of your identity or rights, and what you want us to do. We may release, transfer or change the username. We do not transfer names simply because someone wants them.`,
        ],
      },
      {
        h: 'Inactive and removed names',
        p: [
          'We may take back a username if the account has not been used for a long time and the page is empty or unchanged, after trying to contact you by email first. We may also take back a username from an account that is suspended or closed.',
        ],
      },
    ],
  },
  {
    slug: 'music-and-uploads',
    title: 'Music & Uploads',
    group: 'Content',
    summary: 'Your responsibility for the files you upload, the size limits, and how uploads are stored and removed.',
    sections: [
      {
        h: 'You need the rights',
        p: [
          'Only upload music, pictures and video that you made, that you own, or that you have permission to use on a public web page. Owning a copy of a song (for example, buying it) does not give you the right to put it on a page.',
          'You are responsible for licensing the music on your page, and for having the right to show any lyrics you add. We do not license music or lyrics for you.',
        ],
      },
      {
        h: 'Edits do not change ownership',
        p: [
          'You can play your music slowed down or sped up, with or without the original pitch, with reverb, with a fade-in, and from a chosen start time. These are playback settings. The song is still the original work, and the same rights rules apply.',
          'The same goes for pictures and video you crop, darken, blur or recolour.',
        ],
      },
      {
        h: 'Lyrics',
        p: [
          'You can search for your song in the editor and add synced lyrics to your page. The search goes through our server to LRCLIB (https://lrclib.net), a free community lyrics database. Only your search words are sent, never your account details.',
          'The lyrics you choose are copied into your page settings and shown with your music. LRCLIB does not license lyrics. You are responsible for having the right to show them, just as with the music itself.',
          `Rights holders can ask us to remove lyrics through the Copyright & DMCA process (${L('dmca')}).`,
        ],
      },
      {
        h: 'What you can upload',
        p: [
          'Pictures: JPEG, PNG or WebP, up to 450 KB each. Your browser resizes and re-encodes them before upload. Profile pictures up to 512 by 512 pixels, backgrounds up to 1920 by 1920, and cursor pictures up to 128 by 128. SVG files are not accepted because they can carry scripts.',
          'Videos and GIFs: MP4, WebM, MOV or GIF, of any size that fits in your storage.',
          'Music: MP3, M4A, OGG, WAV or FLAC, of any length that fits in your storage, so a full song fits.',
          'Storage: everything you upload (pictures, videos, cursors, songs and hosted files) shares 50 MB per account. Settings shows how much you have used, and by what.',
          'We check the real file type from the file itself, not from its name.',
        ],
      },
      {
        h: 'How uploads are stored',
        p: [
          'Uploads are stored in our database on Cloudflare, linked to your account. Anyone who opens your page can see, hear and, technically, save the files it uses.',
          'Large files such as songs and videos are stored in the database in pieces of 512 KB each and joined back together when they are played.',
          'We keep only your most recent uploads of each kind: for example 12 songs, 12 backgrounds, 6 cursor pictures and 3 videos. When you upload a new one beyond that, or need room in your 50 MB, older pictures and sounds your page is not using are deleted automatically. Files your page is using are never cleared this way.',
        ],
      },
      {
        h: 'Managing your uploads',
        p: [
          'The Storage tab in the editor lists every upload with its size and whether your page uses it. You can delete single uploads, or press "Clear unused uploads" to remove everything your page does not use. Deleted uploads cannot be restored.',
          'A backup from the Settings tab holds your page settings. Keep your own copies of the original files.',
        ],
      },
      {
        h: 'Removal on notice',
        p: [
          `We may remove an upload, mute your music or hide your page if we receive a valid copyright notice (see ${L('dmca')}), if the file breaks our rules, or if we must by law.`,
        ],
      },
    ],
  },
  {
    slug: 'dmca',
    title: 'Copyright & DMCA',
    group: 'Content',
    summary: 'How to report content that infringes your copyright, and how to respond if your content was removed.',
    sections: [
      {
        h: 'Our approach',
        p: [
          `We respect copyright and expect page owners to do the same. We respond to notices under the US Digital Millennium Copyright Act (DMCA) and similar laws elsewhere. Send notices to our copyright agent at ${SITE.emails.legal}. ${C}${ADDRESS}.`,
        ],
      },
      {
        h: 'Sending a notice',
        p: [
          'Your notice must include your physical or electronic signature; the copyrighted work you say is infringed; the logoless.io address of the page and, if you can, which file or link; your name, address, phone number and email; a statement that you believe in good faith the use is not authorised by the owner, its agent or the law; and a statement that the information is accurate and, under penalty of perjury, that you are the owner or authorised to act for them.',
          'Sending a false notice can make you liable for damages. If you are not sure the use is infringing, get advice first.',
        ],
      },
      {
        h: 'What happens next',
        p: [
          'We remove or disable the material, usually within a few working days, and tell the page owner, with a copy of the notice.',
        ],
      },
      {
        h: 'Counter-notice',
        p: [
          'If you believe your material was removed by mistake or misidentification, send us a counter-notice with: your signature; the material removed and where it was; a statement under penalty of perjury that you believe in good faith it was removed by mistake or misidentification; and your name, address and phone number, with consent to the jurisdiction of the federal court for your address (or, outside the US, any place where we may be found) and agreement to accept service from the person who sent the notice.',
          'We pass it on to the person who sent the notice. Unless they tell us within 10 to 14 working days that they have gone to court, we may put the material back.',
        ],
      },
      {
        h: 'Repeat infringers',
        p: ['We close the accounts of repeat infringers in appropriate circumstances.'],
      },
      {
        h: 'Embeds and links',
        p: [
          'YouTube, Vimeo, TikTok and Spotify players on a page are hosted by those platforms, not by us. To remove the video or track itself, report it to that platform. We can remove the embed or link from the page.',
          'Song lyrics shown on a page are found through LRCLIB, a community database, and copied into the page by its owner. Rights holders can use this process to have lyrics removed from a page.',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ Other */
  {
    slug: 'accessibility',
    title: 'Accessibility',
    group: 'Other',
    summary: `How ${S} works with a keyboard, a screen reader and reduced motion, and how to tell us when it does not.`,
    sections: [
      {
        h: 'What we aim for',
        p: [
          `We want ${S} to work for everyone, including people who use a keyboard, a screen reader or magnification, or who need less motion. We work towards the Web Content Accessibility Guidelines (WCAG) 2.2 level AA. We do not claim every part meets it yet, and we list known gaps below.`,
        ],
      },
      {
        h: 'Using the editor with a keyboard',
        p: [
          'Every control in the editor can be reached with Tab and used with the keyboard, with a visible focus outline.',
          'Shortcuts: Cmd/Ctrl+K searches settings. Cmd/Ctrl+S saves. Cmd/Ctrl+Z undoes and Cmd/Ctrl+Shift+Z redoes. [ and ] go to the previous and next section. ? lists every shortcut.',
          'Single-key shortcuts do nothing while you are typing in a field.',
        ],
      },
      {
        h: 'Motion and sound',
        p: [
          `If your device is set to reduce motion, ${S} follows it: heavy animation, shaders and effects calm down.`,
          `Visitors can also open ${U('/preferences')} to reduce motion, stop music from playing on its own, cap the music volume and use plain cursors. These settings apply to every ${S} page on that device.`,
        ],
      },
      {
        h: 'Pages are designed by their owners',
        p: [
          'Page owners choose their own layouts, colours, effects, cursors and music. Some choices can mean low contrast, a lot of motion, or sound. We give owners accessible defaults and warn against flashing effects, but we cannot control every page. Visitor settings at the preferences page override motion, autoplay and cursors.',
          'Embedded players from YouTube, Vimeo, TikTok and Spotify follow those platforms\' own accessibility, including captions.',
        ],
      },
      {
        h: 'Known gaps',
        p: [
          'Some shader backgrounds and enter screens are visual only. Custom cursors may be hard to see for some people; plain cursors fix that. Pictures uploaded by owners may not have text descriptions.',
        ],
      },
      {
        h: 'Tell us',
        p: [
          `If something is hard to use, email ${SITE.emails.support} with what you were trying to do, the page address, and the browser and assistive tool you use. We read every message and will tell you what we can fix and when.`,
        ],
      },
    ],
  },
  {
    slug: 'security',
    title: 'Security & Responsible Disclosure',
    group: 'Other',
    summary: 'How to report a vulnerability, what is in scope, and how we protect researchers who act in good faith.',
    sections: [
      {
        h: 'Reporting a vulnerability',
        p: [
          `Email ${SITE.emails.support} with "Security" in the subject. Tell us what you found, the steps to reproduce it, the affected address, and the impact you think it has. Screenshots or a short video help.`,
          'We will reply within 3 working days, keep you updated while we fix it, and tell you when it is fixed. Please give us a reasonable time to fix it (normally 90 days) before you tell anyone else.',
        ],
      },
      {
        h: 'In scope',
        p: [
          'logoless.io and its subdomains, the editor, sign-in (Google, Discord, email and password, passkeys and two-step codes), page rendering, uploads, the view and click counters, and our Discord bot.',
          'Out of scope: the services of Cloudflare, Google, Discord, GIPHY, Resend and embedded players (report to them); missing security headers with no real impact; self-XSS; clickjacking on pages with no sensitive actions; rate-limit findings that need huge traffic; social engineering of our team or users; physical attacks; and denial of service.',
        ],
      },
      {
        h: 'Safe harbour',
        p: [
          'If you act in good faith and follow this policy, we will not take legal action against you or ask anyone else to, and we will treat your research as authorised. If someone else brings a claim over your research, we will make it known that you followed this policy.',
        ],
      },
      {
        h: 'What not to do',
        p: [
          'Do not access, change or delete other people\'s data. Use your own test accounts and stop as soon as you prove a problem.',
          'Do not run automated scanners at high volume, degrade the Service, or inflate other people\'s counters.',
          'Do not upload malware, phish users, or publish details before we have fixed the problem.',
          'Do not demand payment in exchange for a report. We do not run a paid bug bounty, but we are happy to thank you publicly if you want.',
        ],
      },
      {
        h: 'Protecting your account',
        p: [
          'Use a passkey (Face ID, a fingerprint, a device PIN or a security key) or turn on two-step sign-in codes from an authenticator app in the editor. Two-step gives you eight backup codes; keep them somewhere safe.',
          'We will never ask for your password or codes by email or Discord message.',
        ],
      },
    ],
  },
]

/** Every legal document, in the order the index shows them (grouped as in LEGAL_GROUPS). */
export const LEGAL: LegalDoc[] = RAW

export const getLegal = (slug: string) => LEGAL.find((d) => d.slug === slug)
