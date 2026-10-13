// The ready-made topics for messages and reports. Safe for the browser. Each one pre-fills the message so it is quick to send,
// and every one can be edited. "Write your own" starts empty and needs a subject.

export type Topic = { id: string; label: string; hint: string; template: string; about?: ('profile' | 'campaign' | 'clip')[] }

export const CONTACT_TOPICS: Topic[] = [
  { id: 'question', label: 'A question', hint: 'How something works', template: 'Hi, I have a question about ' },
  { id: 'payments', label: 'Payments or payouts', hint: 'Adding funds, withdrawing, a missing payment', template: 'My question is about a payment.\n\nWhat I was doing: \nAmount and date: \nWhat happened: ' },
  { id: 'campaign', label: 'Launching a campaign', hint: 'Brands and artists', template: 'I would like to launch a campaign.\n\nWho it is for: \nWhat we are promoting: \nRough budget: ' },
  { id: 'account', label: 'My account', hint: 'Sign-in, profile, deleting it', template: 'I need help with my account.\n\nWhat I need: ' },
  { id: 'partner', label: 'Partnerships or press', hint: 'Working together', template: 'Hi, I would like to talk about ' },
  { id: 'feedback', label: 'Feedback or an idea', hint: 'Tell us what to build', template: 'My idea: ' },
  { id: 'custom', label: 'Write your own', hint: 'Anything else', template: '' },
]

export const REPORT_TOPICS: Topic[] = [
  { id: 'fake-views', label: 'Fake or inflated views', hint: 'Bought, botted or faked', template: 'I think the views on this clip are not real.\n\nClip link: \nWhy I think so: ', about: ['clip', 'profile'] },
  { id: 'copyright', label: 'Stolen or copyrighted content', hint: 'Used without permission', template: 'This uses material I own, or that was taken without permission.\n\nWhere it is: \nWhat it is: \nWho owns it: ', about: ['clip', 'campaign', 'profile'] },
  { id: 'scam', label: 'Scam or misleading campaign', hint: 'It is not what it says', template: 'This campaign or profile looks like a scam or is misleading.\n\nWhat it claims: \nWhat is actually true: ', about: ['campaign', 'profile'] },
  { id: 'abuse', label: 'Harassment or abuse', hint: 'Hateful, threatening or targeting someone', template: 'This person or content is harassing or abusing someone.\n\nWhere it is: \nWhat happened: ', about: ['profile', 'clip'] },
  { id: 'impersonation', label: 'Pretending to be someone', hint: 'A fake of a person or brand', template: 'This account is pretending to be someone it is not.\n\nWho it copies: \nWhy I am sure: ', about: ['profile'] },
  { id: 'payment', label: 'A payment went wrong', hint: 'Charged twice, missing, wrong amount', template: 'Something went wrong with a payment.\n\nWhat happened: \nAmount and date: \nPayPal reference, if you have it: ' },
  { id: 'bug', label: 'Something is broken', hint: 'A page or button not working', template: 'Something is broken.\n\nWhere: \nWhat I expected: \nWhat happened instead: ' },
  { id: 'custom', label: 'Write your own', hint: 'Anything else you want us to look at', template: '' },
]

export const TOPIC_LABEL: Record<string, string> = Object.fromEntries([...CONTACT_TOPICS, ...REPORT_TOPICS].map((t) => [`${REPORT_TOPICS.includes(t) ? 'report' : 'contact'}:${t.id}`, t.label]))

export const ABOUT_LABEL = { profile: 'a profile', campaign: 'a campaign', clip: 'a clip' } as const
