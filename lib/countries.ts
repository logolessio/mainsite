/**
 * Every country a profile can show, by its two letter code (what is stored), with its full name in English (what people pick from). The names come from the
 * browser's own list (Intl.DisplayNames), so they are always spelled the usual way and nobody has to keep a table of them.
 */
const CODES =
  'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ')

let names: Intl.DisplayNames | null | undefined

/** "United Kingdom" for "GB". An unknown code comes back as itself. */
export function countryName(code: string): string {
  const c = code.toUpperCase()
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(['en'], { type: 'region' })
    } catch {
      names = null
    }
  }
  try {
    return names?.of(c) ?? c
  } catch {
    return c
  }
}

let list: { code: string; name: string }[] | undefined

/** All countries, by name, A to Z. */
export function countryList(): { code: string; name: string }[] {
  list ??= CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name, 'en'))
  return list
}
