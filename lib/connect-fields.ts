// Shared by the payout setup forms (browser) and the routes that talk to Stripe (server).

export type BankKind = 'us' | 'gb' | 'ca' | 'au' | 'iban'
export type Country = { code: string; name: string; currency: string; bank: BankKind; state?: boolean }

const eu = (code: string, name: string, currency = 'eur'): Country => ({ code, name, currency, bank: 'iban' })

/** Where clippers can be paid. Each needs its own bank fields. More can be added here. */
export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', currency: 'usd', bank: 'us', state: true },
  { code: 'GB', name: 'United Kingdom', currency: 'gbp', bank: 'gb' },
  { code: 'CA', name: 'Canada', currency: 'cad', bank: 'ca', state: true },
  { code: 'AU', name: 'Australia', currency: 'aud', bank: 'au', state: true },
  eu('AT', 'Austria'), eu('BE', 'Belgium'), eu('BG', 'Bulgaria', 'bgn'), eu('HR', 'Croatia'), eu('CY', 'Cyprus'),
  eu('CZ', 'Czechia', 'czk'), eu('DK', 'Denmark', 'dkk'), eu('EE', 'Estonia'), eu('FI', 'Finland'), eu('FR', 'France'),
  eu('DE', 'Germany'), eu('GR', 'Greece'), eu('HU', 'Hungary', 'huf'), eu('IE', 'Ireland'), eu('IT', 'Italy'),
  eu('LV', 'Latvia'), eu('LT', 'Lithuania'), eu('LU', 'Luxembourg'), eu('MT', 'Malta'), eu('NL', 'Netherlands'),
  eu('NO', 'Norway', 'nok'), eu('PL', 'Poland', 'pln'), eu('PT', 'Portugal'), eu('RO', 'Romania', 'ron'),
  eu('SK', 'Slovakia'), eu('SI', 'Slovenia'), eu('ES', 'Spain'), eu('SE', 'Sweden', 'sek'), eu('CH', 'Switzerland', 'chf'),
]
export const countryOf = (code: string | null | undefined) => COUNTRIES.find((c) => c.code === code)

/** Which part of the setup a Stripe "still needed" item belongs to. */
export type Section = 'details' | 'id' | 'document' | 'bank' | 'terms' | 'other'
export function sectionOf(req: string): Section {
  if (req === 'external_account') return 'bank'
  if (req.startsWith('tos_acceptance')) return 'terms'
  if (req === 'individual.id_number' || req === 'individual.ssn_last_4') return 'id'
  if (req.startsWith('individual.verification')) return 'document'
  if (/^individual\.(first_name|last_name|dob|address|email|phone)/.test(req)) return 'details'
  return 'other'
}

export type ConnectStatus = {
  status: 'not_connected' | 'incomplete' | 'ready'
  country: string | null
  currency: string | null
  publishableKey: string | null
  due: string[]
  pastDue: string[]
  pending: string[]
  errors: { requirement: string; message: string }[]
  disabledReason: string | null
  bank: { last4: string; name: string | null; currency: string; country: string } | null
}

/** Stripe's reason codes, in words a clipper can act on. */
export function errorMessage(code: string): string {
  const m: Record<string, string> = {
    verification_document_name_mismatch: 'The name on the ID did not match the name you gave. Check both and try again.',
    verification_document_dob_mismatch: 'The date of birth on the ID did not match. Check both and try again.',
    verification_document_expired: 'That ID has expired. Upload one that is still valid.',
    verification_document_not_readable: 'We could not read that photo. Take it again in good light, all four corners visible.',
    verification_document_failed_greyscale: 'The photo was black and white. Upload a colour photo.',
    verification_document_not_uploaded: 'No ID was uploaded.',
    verification_document_missing_back: 'Upload the back of the ID as well.',
    verification_document_missing_front: 'Upload the front of the ID.',
    verification_document_photo_mismatch: 'The photo on the ID did not match.',
    verification_document_too_large: 'That file is too large. Use one under 10 MB.',
    verification_failed_address_match: 'The address did not match our records. Check it and try again.',
    verification_failed_id_number_match: 'The ID number did not match. Check it and try again.',
    verification_failed_name_match: 'The name did not match official records. Check the spelling.',
    verification_failed_keyed_identity: 'The details could not be verified. Check each one and try again.',
    verification_failed_other: 'We could not verify you with these details. Upload an ID document.',
    invalid_address_city_state_postal_code: 'The city, state and postcode do not match.',
    invalid_street_address: 'That street address could not be found.',
    invalid_dob_age_under_minimum: 'You must be at least 13 to be paid. In some countries the minimum is 18.',
    invalid_dob_age_over_maximum: 'Check the date of birth.',
    invalid_value_other: 'One of the details looks wrong. Check each one.',
    invalid_representative_country: 'Payouts are not available for that country yet.',
  }
  return m[code] ?? 'Stripe could not accept one of the details. Check them and try again.'
}
