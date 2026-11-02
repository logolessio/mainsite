import { SITE } from './site'

export type LegalSection = { h: string; p: string[] }
export type LegalDoc = { slug: string; title: string; summary: string; sections: LegalSection[] }

const S = SITE.name
const C = SITE.company
/** The registered address, left out while it is still the placeholder in site.ts. */
const ADDRESS = SITE.address.startsWith('[') ? '' : `, ${SITE.address}`

// Starter legal text. Have qualified counsel review and tailor every document before launch.
const RAW: LegalDoc[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    summary: `The agreement between you and ${C} for using ${S}.`,
    sections: [
      { h: 'Acceptance of terms', p: [`By creating an account or using ${S} (the "Service") you agree to these Terms, our Privacy Policy and any role-specific terms that apply to you (Clipper Terms or Brand Terms). If you do not agree, do not use the Service.`, 'You must be at least 16 years old, or the age of digital consent where you live if higher, and able to form a binding contract. If you use the Service for an organisation you confirm you can bind it.'] },
      { h: 'The Service', p: [`${S} is a marketplace that connects brands, artists and streamers ("Brands") who fund promotional campaigns with creators ("Clippers") who publish short-form content and are paid for verified views.`, `${S} is not a party to agreements between Brands and Clippers beyond what these Terms describe, and does not guarantee any level of views, earnings or campaign results.`] },
      { h: 'Accounts', p: ['You must provide accurate information and keep your credentials secure. You are responsible for all activity under your account. You may sign in with Discord, Google or email; connecting a third-party account allows us to read the basic profile information described in our Privacy Policy.', 'If you sign in with Discord or press Connect Discord, you also allow our bot to add you to the logoless Discord server and to give you roles there. You can disconnect Discord in Settings at any time.', 'You may hold one account per person. We may suspend or close accounts that break these Terms or that we reasonably believe are used for fraud.'] },
      { h: 'Campaigns, submissions and verification', p: ['Brands set campaign budgets, rates and briefs, and our team reads each new campaign before it goes live. Clippers submit links to content they have published on third-party platforms. We check submissions when they arrive. While a campaign is running we look up the views of YouTube and TikTok submissions again about every two hours and pay for increases we can verify; unusual jumps are held for our team to look at, and views on other platforms are confirmed by our team. We use automated and manual checks, and only verified views are eligible for payment.', 'We may reject or remove a submission, withhold or reverse payment, or adjust view counts where we reasonably determine that content breaks a brief, these Terms or platform rules, or that views are artificial, incentivised in breach of platform policy, or otherwise not genuine.'] },
      { h: 'Payments', p: [`Brands add funds, and Clippers are paid out, using PayPal. The balances you see on ${S} are our record of what you have added and earned. They are not a bank account, do not earn interest and are not insured. Fees, funding, payouts, refunds and taxes are described in the Payments & Payouts policy, which forms part of these Terms.`] },
      { h: 'Your content and licences', p: ['You keep ownership of content you create. You grant Brands that run the campaign you participate in a non-exclusive, worldwide licence to display and share your submitted clip for promotion of that campaign, and grant us a licence to host, display and analyse submission links and metadata to operate the Service.', 'You promise that you have the rights needed to publish your content, and that it does not infringe anyone else\'s rights or break the law.'] },
      { h: 'Acceptable use', p: [`You must follow our Acceptable Use Policy. In particular you must not use bots, purchased views, click farms or other artificial means to inflate views, or attempt to interfere with the Service.`] },
      { h: 'Third-party platforms', p: ['The Service interacts with TikTok, YouTube, Instagram, Discord, Google and PayPal. Your use of those services is governed by their own terms and policies. We are not responsible for their availability or actions. Use of YouTube data is subject to the YouTube Terms of Service and the Google Privacy Policy.'] },
      { h: 'Termination', p: ['You can close your account at any time. We may suspend or terminate access at any time for breach of these Terms, legal requirement or risk to other users. Balances owed for verified, unreversed views will be paid out after termination unless withheld under these Terms or by law.'] },
      { h: 'Disclaimers and liability', p: [`The Service is provided "as is" and "as available" without warranties of any kind to the fullest extent permitted by law. To the fullest extent permitted by law, ${C} is not liable for indirect, incidental, special, consequential or punitive damages, or for loss of profits, revenue or data. Our total liability for any claim relating to the Service is limited to the greater of the amounts you paid to or received from ${S} in the 12 months before the claim, or USD 100.`, 'Nothing in these Terms limits liability that cannot be limited by law.'] },
      { h: 'Governing law and disputes', p: ['These Terms are governed by the laws of the jurisdiction in which the company is registered, without regard to conflict-of-law rules. Disputes will be resolved in the courts of that jurisdiction unless mandatory consumer law gives you the right to bring a claim elsewhere.'] },
      { h: 'Changes', p: [`We may update these Terms. If a change is material we will notify you by email or in the product before it takes effect. Continued use after the effective date means you accept the new Terms.`] },
      { h: 'Contact', p: [`Questions about these Terms: ${SITE.emails.legal}. ${C}${ADDRESS}.`] },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: 'What data we collect, why, and the choices you have.',
    sections: [
      { h: 'Who we are', p: [`${C} ("${S}", "we") is the controller of personal data processed through the Service. Contact: ${SITE.emails.privacy}.`] },
      { h: 'Data we collect', p: ['Account data: name, email address, password hash (if you use email sign-in), role, and profile details you add.', 'Sign-in data from Discord or Google: your account identifier, name, email and avatar, according to the permissions you approve. If you connect Discord we keep your Discord ID so the bot can message you and give you roles; the permission to add you to our server is used once and we do not keep it.', 'Linked social accounts: handle, account identifier and public view, like, comment and share counts for content you submit. If you verify an account by a code in its bio, we read that account\'s public page to find the code and keep a record that it was verified. We do not read private messages or post on your behalf.', 'Payment data: payments and payouts go through PayPal, which collects and holds your payment details. We keep the PayPal email you choose to be paid at, and transaction records such as amounts, dates and PayPal reference numbers.', 'Usage and device data: the pages you view and when, a scrambled (hashed) form of your IP address rather than the address itself, your country, your browser and device type, language and time zone, and security signals used to detect fraud and artificial views.', 'Account limit: the network address (IP address) an account was created from, kept only to stop one person running many accounts, up to three per address. It is deleted with the account.', 'Communications: messages you send us and notifications we send you.'] },
      { h: 'How we use data', p: ['To provide the Service: authenticate you, run campaigns, track and verify views, calculate and make payouts.', 'To keep the Service safe: detect fraud, enforce our rules and comply with law, including anti-money-laundering and tax obligations.', 'To communicate with you about your account, campaigns, payouts and policy changes.', 'To improve the product through aggregated analytics.', 'Where required by law we rely on your consent; otherwise on contract performance, legitimate interests (security, fraud prevention, product improvement) and legal obligation.'] },
      { h: 'Who we share data with', p: ['PayPal, for taking payments and sending payouts.', 'Brands see the handle, clip links and verified view counts of Clippers who submit to their campaigns.', 'Service providers who host our infrastructure and run our security checks (Cloudflare), send email, and provide support, under contracts that restrict their use of your data. If you connect Discord, Discord.', 'Authorities or advisers where required by law or to protect rights and safety, and a successor in a merger or sale.', `We do not sell your personal information for money, and we do not share it for advertising. See the "Do Not Sell or Share" page.`] },
      { h: 'YouTube API Services', p: ['If you link a YouTube channel we use YouTube API Services. By doing so you agree to be bound by the YouTube Terms of Service (https://www.youtube.com/t/terms) and the Google Privacy Policy (https://policies.google.com/privacy). You can revoke our access at any time via the Google security settings page (https://security.google.com/settings/security/permissions).'] },
      { h: 'International transfers', p: ['We may process data in countries other than your own. Where required we use appropriate safeguards such as standard contractual clauses.'] },
      { h: 'Retention', p: ['We keep data for as long as your account is active and as needed to meet legal, tax, accounting and fraud-prevention obligations, then delete or anonymise it. If you delete your account there is a short grace period in which you can change your mind.'] },
      { h: 'Your rights', p: ['Depending on where you live you may have the right to access, correct, delete, export or restrict use of your data, to object to processing, to withdraw consent, and to complain to your data protection authority. California residents have additional rights described on the Do Not Sell or Share page.', `To exercise a right, email ${SITE.emails.privacy} or use the controls in your account settings. We will verify your identity before acting.`] },
      { h: 'Security', p: ['We use industry-standard technical and organisational measures. No system is perfectly secure, so keep your credentials safe.'] },
      { h: 'Children', p: ['The Service is not directed at children under 16 and we do not knowingly collect their data. Contact us if you believe a child has given us personal data.'] },
      { h: 'Changes', p: ['We will post updates here and notify you of material changes.'] },
    ],
  },
  {
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    summary: 'What you may not do on or with the Service.',
    sections: [
      { h: 'General', p: ['Use the Service lawfully and in good faith. You must not:'] },
      { h: 'Prohibited activities', p: ['Manipulate views, engagement or payouts, including with bots, scripts, view farms, VPN or proxy rotation, or purchased traffic.', 'Create multiple or false accounts, impersonate others or misrepresent your affiliation.', 'Upload or link to content that is illegal, infringing, defamatory, hateful, sexually explicit involving minors, or that promotes self-harm or violence.', 'Scrape, reverse engineer, probe or disrupt the Service, or bypass access or rate limits.', 'Use the Service to launder money, evade sanctions, or finance illegal activity.', 'Send spam or unsolicited promotions to other users.'] },
      { h: 'Reporting', p: [`Report violations to ${SITE.emails.abuse}. We may investigate and take action, including removing content and closing accounts.`] },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    summary: 'How we use cookies and similar technologies.',
    sections: [
      { h: 'What are cookies', p: ['Cookies and similar technologies store small pieces of information on your device so a site can remember you and stay secure.'] },
      { h: 'How we use them', p: ['Strictly necessary: keep you signed in, protect forms and secure the Service, including the human check that stops bots. These cannot be switched off.', 'Preferences: your choices such as reduced motion are kept in your browser\'s own storage on your device and are not sent to us.', 'We do not use advertising cookies or third-party analytics cookies. We count page views on our own servers, as described in the Privacy Policy.'] },
      { h: 'Third parties', p: ['PayPal may set cookies on its own payment pages for fraud prevention. Discord and Google may set cookies when you sign in with them. Cloudflare may set a cookie when it checks that you are not a bot.'] },
      { h: 'Your choices', p: ['Use your browser settings to block or delete cookies. Blocking necessary cookies will stop sign-in and some forms from working.'] },
    ],
  },
  {
    slug: 'do-not-sell',
    title: 'Do Not Sell or Share My Personal Information',
    summary: 'Your choices under US state privacy laws.',
    sections: [
      { h: 'Our practice', p: [`${S} does not sell personal information for money, and does not share it for cross-context behavioural advertising. We do not run advertising technologies on the Service. If that ever changes we will update this page first and give you a way to opt out.`] },
      { h: 'Your choices', p: [`If you want to be sure, you can email ${SITE.emails.privacy} with the subject "Do Not Sell or Share" and we will record your request.`] },
      { h: 'Other rights', p: ['Residents of California and other states may have the right to know, delete, correct and obtain a copy of their data, and to limit use of sensitive information. We will not discriminate against you for exercising these rights. You may use an authorised agent; we will ask for proof of authority.'] },
    ],
  },
  {
    slug: 'dmca',
    title: 'Copyright & DMCA',
    summary: 'How to report content that infringes your copyright.',
    sections: [
      { h: 'Reporting infringement', p: [`If you believe content linked or displayed on ${S} infringes your copyright, send a notice to our designated agent at ${SITE.emails.abuse} containing: your signature; identification of the work; the URL of the material; your contact details; a statement of good-faith belief that the use is unauthorised; and a statement, under penalty of perjury, that the information is accurate and you are authorised to act for the owner.`] },
      { h: 'Counter-notice', p: ['If you believe material was removed by mistake you may send a counter-notice with the information required by 17 U.S.C. § 512(g)(3).'] },
      { h: 'Repeat infringers', p: ['We close the accounts of users who are repeat infringers in appropriate circumstances.'] },
      { h: 'Note', p: ['Clips live on third-party platforms, and takedowns on those platforms must also be requested from them directly.'] },
    ],
  },
  {
    slug: 'accessibility',
    title: 'Accessibility',
    summary: `How ${S} works for people who use a keyboard, a screen reader or other assistive tools, and how to tell us when it does not.`,
    sections: [
      { h: 'What we aim for', p: [`We want ${S} to be usable by everyone, including people who navigate with a keyboard, use a screen reader, magnify the page, or need less motion or more contrast. We work towards the Web Content Accessibility Guidelines (WCAG) 2.2 level AA. We cannot promise every page meets it at every moment, and we say below where we know it does not.`] },
      { h: 'The keyboard', p: ['Everything can be reached and used with a keyboard. A skip link at the top jumps past the menus to the page, and a visible outline shows where you are.', 'Press ? on any page for the list of shortcuts that work there. In short: g then a letter goes to a page, j and k move through lists, the arrow keys move across grids, menus and tabs, [ and ] switch tabs, / opens search, and Esc closes a dialog. Letters never act while you are typing in a field.', 'Dialogs keep the keyboard inside them while they are open, and give it back to what opened them when they close.'] },
      { h: 'Screen readers', p: ['Pages use headings, landmarks, labelled controls and lists. When a page changes, its name is announced and, after a keyboard click, focus moves into the new page. Short messages such as "Saved" are announced as they appear.'] },
      { h: 'Reading and motion settings', p: ['In Settings, under Display, you can switch on calm mode (less motion), larger text, higher contrast and underlined links. Calm mode, and less motion, also follow your device setting, and higher contrast follows your device preference.'] },
      { h: 'What does not work well yet', p: ['Some images and video previews come from other platforms and we cannot control their captions or descriptions. Embedded players from TikTok, YouTube and Instagram follow those platforms\' own accessibility.'] },
      { h: 'Tell us', p: [`If something on ${S} is hard to use, tell us what you were trying to do and which assistive tool you use at ${SITE.emails.support}. We read every message and will tell you what we can do and when.`] },
    ],
  },
]

/** The legal text in the site's current wording (creator, submission). The saved wording below is left as it is. */
export const LEGAL: LegalDoc[] = RAW

export const getLegal = (slug: string) => LEGAL.find((d) => d.slug === slug)
