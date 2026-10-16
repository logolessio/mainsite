import { SITE } from './site'
import { applyWording } from './wording'

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
      { h: 'Campaigns, submissions and verification', p: ['Brands set campaign budgets, rates and briefs, and our team reads each new campaign before it goes live. Clippers submit links to content they have published on third-party platforms. We check submissions when they arrive, and our team confirms the views before they are paid. We use automated and manual checks, and only verified views are eligible for payment.', 'We may reject or remove a submission, withhold or reverse payment, or adjust view counts where we reasonably determine that content breaks a brief, these Terms or platform rules, or that views are artificial, incentivised in breach of platform policy, or otherwise not genuine.'] },
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
      { h: 'Data we collect', p: ['Account data: name, email address, password hash (if you use email sign-in), role, and profile details you add.', 'Sign-in data from Discord or Google: your account identifier, name, email and avatar, according to the permissions you approve. If you connect Discord we keep your Discord ID so the bot can message you and give you roles; the permission to add you to our server is used once and we do not keep it.', 'Linked social accounts: handle, account identifier and public view, like, comment and share counts for content you submit. We do not read private messages or post on your behalf.', 'Payment data: payments and payouts go through PayPal, which collects and holds your payment details. We keep the PayPal email you choose to be paid at, and transaction records such as amounts, dates and PayPal reference numbers.', 'Usage and device data: the pages you view and when, a scrambled (hashed) form of your IP address rather than the address itself, your country, your browser and device type, language and time zone, and security signals used to detect fraud and artificial views.', 'Communications: messages you send us and notifications we send you.'] },
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
    slug: 'clipper-terms',
    title: 'Clipper Terms',
    summary: 'Additional terms for people who submit clips and earn payouts.',
    sections: [
      { h: 'Scope', p: [`These terms apply to Clippers and supplement the Terms of Service.`] },
      { h: 'Independent contractors', p: ['You act as an independent contractor, not an employee, agent or partner of logoless or any Brand. You are responsible for your own taxes, equipment and compliance with laws that apply to you.'] },
      { h: 'Earning', p: ['Each campaign lists a rate per 1,000 verified views and a total budget. You earn only for views on approved clips that occur while the campaign is active and budget remains, and that pass verification. A campaign closes when its budget is used up: we tell you when it is nearly gone and when it has ended, and submissions sent after it closes are not paid.'] },
      { h: 'Your accounts and content', p: ['You may only submit content from accounts you own and control. You must follow each platform\'s rules and each campaign brief. You must disclose partnerships and sponsored content as the law and the platforms require.'] },
      { h: 'Prohibited conduct', p: ['No purchased, botted, incentivised or otherwise artificial views, likes or engagement; no re-use of other people\'s submissions; no content that breaks the brief, platform rules or law; no multiple accounts to circumvent limits.'] },
      { h: 'Verification, rejection and clawback', p: ['We may reject clips, exclude views and reverse earnings, including after payment, where we find a breach or artificial activity. We may deduct reversed amounts from future payouts or require repayment.', 'If a submission is declined before anything has been paid for it, you can ask for a person to look at it again, once, from the Submissions page in your dashboard.'] },
      { h: 'Payouts', p: [`Earnings can be withdrawn as soon as they are confirmed. Payouts are sent to the PayPal email you choose once your available balance reaches the minimum (currently $${SITE.minPayoutUsd}). Make sure the email is one you can sign in to: we cannot recover a payout sent to a wrong address. Details are in the Payments & Payouts policy.`] },
      { h: 'Licence to Brands', p: ['You grant the Brand running a campaign a non-exclusive licence to repost, display and promote your approved clip, with credit to your handle where reasonably possible, for the purposes of the campaign. You keep ownership of your content.'] },
      { h: 'Ending your use', p: ['You may stop at any time. Verified, unreversed earnings remain payable subject to the minimum and these terms.'] },
    ],
  },
  {
    slug: 'brand-terms',
    title: 'Brand Terms',
    summary: 'Additional terms for brands, artists and streamers who run campaigns.',
    sections: [
      { h: 'Scope', p: ['These terms apply to Brands (including agencies acting for clients) and supplement the Terms of Service.'] },
      { h: 'Authority and rights', p: ['You confirm you own or control the rights to all material you supply in a campaign, including music, footage and brand assets, and may license them to Clippers for the purposes of the campaign. Agencies confirm they are authorised by each client.'] },
      { h: 'Campaigns and briefs', p: ['You are responsible for the accuracy and legality of your brief. Briefs must not require Clippers to break the law, platform rules or third-party rights, or to make false claims. You must clearly state what is on and off limits.'] },
      { h: 'Funding and spend', p: [`You keep one balance, which you add to with PayPal. Every campaign draws from it as Clippers earn: the amount a Clipper is paid for verified views, plus a ${SITE.platformFeePct}% platform fee charged on top of that amount. Each campaign has a budget cap, which is the most it can pay Clippers in total; you can raise it, lower it (not below what has been paid) or move budget between campaigns at any time. If your balance cannot cover a payment, the campaign pauses until you add funds. You pay only for views that are verified under our checks, and money you have not spent stays in your balance and can be refunded on request. The smallest amount you can add at once is $${SITE.minTopUpUsd}.`] },
      { h: 'Review and approvals', p: ['Our team reads every new campaign before it goes live and may decline, pause or end a campaign that breaks these terms. Submissions are checked by us. You can turn down a submission from your dashboard before it has been paid for. Once a submission\'s views have been verified and paid you cannot take that back, except where fraud or a breach of the brief is found.'] },
      { h: 'Unspent budget', p: ['When a campaign ends or you close it, remaining budget returns to your balance and may be refunded in line with the Refund Policy.'] },
      { h: 'No guarantees', p: ['We do not guarantee any number of clips, views or particular results from a campaign. Views on third-party platforms are subject to those platforms\' policies and algorithms.'] },
      { h: 'Advertising compliance', p: ['You are responsible for ensuring campaigns comply with advertising, sponsorship-disclosure and consumer-protection laws, and for instructing Clippers to include required disclosures.'] },
      { h: 'Indemnity', p: [`You will defend and indemnify ${C} against third-party claims arising from materials you provide or your campaign briefs.`] },
    ],
  },
  {
    slug: 'campaign-rules',
    title: 'General Campaign Rules',
    summary: 'The rules that apply to every campaign on logoless.',
    sections: [
      { h: 'Follow the brief', p: ['Each campaign has its own brief. If it conflicts with these general rules, the stricter rule applies.'] },
      { h: 'Original, owned accounts', p: ['Post from accounts you own. Do not submit content you did not create or have the right to use, and do not repost another clipper\'s work.'] },
      { h: 'Only genuine views', p: ['Views must come from real people. Do not use bots, view-for-pay services, engagement pods or any artificial method. Do not offer rewards to people for watching.'] },
      { h: 'Keep clips live', p: ['A clip must stay public and unedited while the campaign runs and until we have confirmed its views. Deleting or privating a clip can stop earnings.'] },
      { h: 'Use required tags and disclosures', p: ['Use any hashtags, tags or captions the brief requires and any partnership disclosure label the platform or law requires.'] },
      { h: 'No harmful content', p: ['No hate, harassment, sexual content involving minors, graphic violence, dangerous acts, scams, misinformation or anything that breaks the law or platform rules.'] },
      { h: 'Review and appeals', p: ['Submissions are checked automatically and by our team. If a submission is declined before anything has been paid for it, you can ask for a person to look at it again, once, from the Submissions page in your dashboard. Our decision after that review is final, subject to your legal rights.'] },
      { h: 'Enforcement', p: ['Breaking these rules can lead to rejected clips, reversed earnings, removal from campaigns, account suspension and, where required, reports to platforms or authorities.'] },
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
    slug: 'payments',
    title: 'Payments & Payouts',
    summary: 'How funding, fees, payouts, taxes and reversals work.',
    sections: [
      { h: 'PayPal', p: ['All payments on logoless are processed by PayPal. By adding funds or receiving payouts you agree to PayPal\'s own terms and user agreement.'] },
      { h: 'Funding campaigns', p: [`Brands add funds with PayPal. You can add between $${SITE.minTopUpUsd} and $${SITE.maxTopUpUsd.toLocaleString()} at a time. Funds sit in your ${S} balance, and your campaigns draw from it as Clippers earn, up to each campaign's budget cap.`] },
      { h: 'Fees', p: [`Clippers keep everything they earn: the platform fee is never taken from a Clipper's earnings. Brands pay a ${SITE.platformFeePct}% platform fee on top of what Clippers are paid, so a $1,000 budget costs $${(1000 + (1000 * SITE.platformFeePct) / 100).toLocaleString()}. We pay the fees PayPal charges for taking your deposit and for sending a payout, so every dollar a Brand adds is credited in full and every dollar a Clipper withdraws is sent in full. If a payment involves a different currency, PayPal may apply its own currency conversion, which PayPal shows at the point of payment.`] },
      { h: 'Earnings and balance', p: SITE.holdDays === 0 ? ['Verified views are converted into earnings at the campaign rate. Earnings are available to withdraw as soon as they are confirmed.'] : [`Verified views are converted into earnings at the campaign rate. Earnings are held for ${SITE.holdDays} days after they are confirmed, then become available. Only available earnings can be withdrawn.`] },
      { h: 'Withdrawals', p: [`Clippers can withdraw once their available balance reaches $${SITE.minPayoutUsd}, to the PayPal email they choose. Large or unusual withdrawals are checked by a person first. Timing depends on that check, on PayPal and on your country.`] },
      { h: 'Reversals and holds', p: ['We may delay, hold or reverse payments where we suspect fraud or artificial views, breach of terms, chargebacks, or where required by law or by PayPal.'] },
      { h: 'Taxes', p: ['You are responsible for any taxes on your earnings. We and PayPal may collect tax information and report payments as required by law. Brands are responsible for any taxes due on their purchases.'] },
      { h: 'Currencies', p: ['Campaign amounts are denominated in US dollars. If your payout account uses another currency, conversion is handled by PayPal and fees and exchange rates apply.'] },
      { h: 'Disputes', p: [`If you think a payment is wrong, contact ${SITE.emails.support} within ${SITE.disputeDays} days.`] },
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
    slug: 'refunds',
    title: 'Refund Policy',
    summary: 'When funds can be refunded to Brands.',
    sections: [
      { h: 'Unspent campaign budget', p: ['Budget not yet paid to Clippers can be returned to your balance at any time by closing the campaign, and refunded to your original payment method on request.'] },
      { h: 'Funds already paid out', p: ['Amounts paid to Clippers for verified views are not refundable, except where we find fraud, in which case we will credit your balance.'] },
      { h: 'Platform fee', p: ['The platform fee is charged on payouts and is refunded to the extent the related payout is reversed.'] },
      { h: 'Duplicate or erroneous charges', p: [`Contact ${SITE.emails.support} within ${SITE.disputeDays} days and we will investigate and correct genuine errors.`] },
      { h: 'Timing', p: [`Refunds are checked by a person and issued through PayPal. They usually appear ${SITE.refundNote}.`] },
    ],
  },
  {
    slug: 'external-links',
    title: 'External Links & Profiles',
    summary: `How links on ${S} profiles work, and what to know before you follow one.`,
    sections: [
      { h: 'What this covers', p: [`${S} members can add social links, a Discord invite and a website to their public profile. This page explains how those links are handled and what ${S} is and is not responsible for.`] },
      { h: 'Links are added by members, not by us', p: [`Every link on a profile was added by the member who owns that profile. They are not official ${S} links, and ${S} does not own, run, check or endorse the sites, servers or accounts they lead to. A link appearing on ${S} is not a recommendation.`] },
      { h: 'The leaving-site page', p: ['Website links open a short notice page first. It shows the full address you are about to visit, and you continue only after you press "I understand". Social links and Discord invites are limited to each platform\'s own domain, but they are still created by members, so the same care applies.'] },
      { h: 'Staying safe', p: ['Check the address on the notice page before you continue. Never enter your password, a recovery code or payment details on a site you reached through a profile link unless you are certain it is the real service. We will never ask you to log in to logoless through a link on someone\'s profile.', 'Be careful with Discord invites and downloads, and never share a login or a verification code with someone you met through a link.'] },
      { h: 'What members may not link to', p: ['Members may not link to phishing or scam pages, malware, sites that impersonate logoless or another business, illegal content, adult content, or anything that breaks our Acceptable Use Policy. Profile links must use https.'] },
      { h: 'Reporting and removal', p: [`If you see a link that breaks these rules, report it to ${SITE.emails.abuse}. We may remove a link, hide a profile, or restrict an account without notice when we believe a link is harmful.`] },
      { h: 'Our responsibility', p: [`To the fullest extent permitted by law, ${C} is not responsible for the content, availability, security or practices of any site reached through a member\'s profile, or for loss or damage that results from visiting one. Your use of a third-party site is at your own risk and under that site\'s own terms.`] },
      { h: 'Contact', p: [`Questions about this page: ${SITE.emails.legal}.`] },
    ],
  },
]

/** The legal text in the site's current wording (creator, submission). The saved wording below is left as it is. */
export const LEGAL: LegalDoc[] = RAW.map((d) => ({ ...d, title: applyWording(d.title), summary: applyWording(d.summary), sections: d.sections.map((x) => ({ h: applyWording(x.h), p: x.p.map(applyWording) })) }))

export const getLegal = (slug: string) => LEGAL.find((d) => d.slug === slug)
