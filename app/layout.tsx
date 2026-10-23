import type { Metadata, Viewport } from 'next'
import { Bodoni_Moda, Bricolage_Grotesque, DM_Mono, DM_Sans, Familjen_Grotesk, Figtree, Fragment_Mono, Fraunces, Funnel_Display, Funnel_Sans, Geologica, Gloock, Hanken_Grotesk, Host_Grotesk, Instrument_Sans, Martian_Mono, Mona_Sans, Newsreader, Onest, Schibsted_Grotesk, Special_Gothic, Syne, Wix_Madefor_Display, Young_Serif, Geist, Geist_Mono, IBM_Plex_Mono, Inter, Inter_Tight, Instrument_Serif, JetBrains_Mono, Manrope, Outfit, Playfair_Display, Plus_Jakarta_Sans, Sora, Space_Grotesk, Space_Mono, Cormorant_Garamond, EB_Garamond, DM_Serif_Display, Libre_Caslon_Text, Libre_Baskerville, Cinzel, Abril_Fatface, Prata, Rufina, Spectral, Lora, Old_Standard_TT, Gilda_Display, Playfair_Display_SC, Marcellus, Yeseva_One, Italiana, Bellefair, Vidaloka, Rozha_One, Cardo, Crimson_Pro, Sorts_Mill_Goudy, Libre_Bodoni, Baskervville, Forum, Cormorant_Infant, Castoro, Ovo, Gelasio, Source_Serif_4, Noto_Serif_Display, Libre_Caslon_Display, DM_Serif_Text, IM_Fell_English } from 'next/font/google'
import { connection } from 'next/server'
import { SecretDialogHost } from '@/components/admin/secret-dialog'
import { SiteCheckHost } from '@/components/admin/site-check-host'
import { TextEditor } from '@/components/admin/text-editor'
import { DevBar } from '@/components/dev/dev-bar'
import { DevGate } from '@/components/dev/dev-gate'
import { AppShell } from '@/components/shell/app-shell'
import { AutoCopy } from '@/components/shell/auto-copy'
import { CopyProvider } from '@/components/shell/copy-provider'
import { SkipLink } from '@/components/shell/skip-link'
import { DesignProvider } from '@/components/shell/design-provider'
import { FeaturesProvider } from '@/components/shell/features-provider'
import { FloatingSearch } from '@/components/shell/floating-search'
import { LiveProgress } from '@/components/shell/live-progress'
import { getAnnouncement } from '@/lib/announcement'
import { featureState, requestHost } from '@/lib/features'
import { headers } from 'next/headers'
import { parseChoices } from '@/lib/design-choices'
import { effectiveFont, faceById, fontById } from '@/lib/fonts'
import { isBetaHost } from '@/lib/beta-host'
import { launchExempt, launchView, linksExempt } from '@/lib/launch'
import { launchHomeData } from '@/lib/launch-home'
import { LaunchPage } from '@/components/launch/launch-page'
import { LaunchHome } from '@/components/launch/home/launch-home'
import { getOverrides } from '@/lib/copy'
import { parseRoundness, roundnessVars } from '@/lib/roundness'
import { allSettings } from '@/lib/settings'
import { getLinks } from '@/lib/socials-db'
import { getSession } from '@/lib/session'
import { SITE } from '@/lib/site'
import './globals.css'

// Every typeface the dev dashboard can switch the site to. Only the one in use is downloaded: the others are declared but not preloaded.
// The standard look is the Anubis one: IBM Plex Mono for the words and Schibsted Grotesk Black for the big titles, so those two are preloaded and the rest wait until they are chosen
// (Inter and Gloock, the look before it, come back only if the Anubis look is undone).
const inter = Inter({ subsets: ['latin'], variable: '--font-f-inter', display: 'swap', preload: false })
const tight = Inter_Tight({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-f-inter-tight', display: 'swap', preload: false })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-face' })
const geist = Geist({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-geist' })
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-dm-sans' })
const manrope = Manrope({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-manrope' })
const sora = Sora({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-sora' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-space-grotesk' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-plus-jakarta' })
const outfit = Outfit({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-outfit' })
const instrument = Instrument_Serif({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-instrument-serif' })
const fraunces = Fraunces({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-fraunces' })
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-playfair' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-jetbrains-mono' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], display: 'swap', weight: ['400', '500', '600'], variable: '--font-f-ibm-plex-mono' })
const spaceMono = Space_Mono({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], variable: '--font-f-space-mono' })
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-bricolage' })
const funnelDisplay = Funnel_Display({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-funnel-display' })
const funnelSans = Funnel_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-funnel-sans' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-hanken' })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-instrument-sans' })
const schibsted = Schibsted_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--font-f-schibsted' })
const specialGothic = Special_Gothic({ subsets: ['latin'], display: 'swap', preload: false, adjustFontFallback: false, variable: '--font-f-special-gothic' })
const hostGrotesk = Host_Grotesk({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-host' })
const familjen = Familjen_Grotesk({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-familjen' })
const mona = Mona_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-mona' })
const onest = Onest({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-onest' })
const figtree = Figtree({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-figtree' })
const geologica = Geologica({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-geologica' })
const wix = Wix_Madefor_Display({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-wix' })
const syne = Syne({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-syne' })
const newsreader = Newsreader({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-newsreader' })
const youngSerif = Young_Serif({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-young-serif' })
const gloock = Gloock({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-gloock' })
const bodoni = Bodoni_Moda({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-bodoni' })
const martian = Martian_Mono({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-martian' })
const dmMono = DM_Mono({ subsets: ['latin'], display: 'swap', preload: false, weight: ['300', '400', '500'], variable: '--font-f-dm-mono' })
const fragment = Fragment_Mono({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-fragment' })
// classical faces for the headlines (each one is paired with Inter for the text; see lib/fonts.ts)
const cls_cormorant = Cormorant_Garamond({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-cormorant' })
const cls_eb_garamond = EB_Garamond({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-eb-garamond' })
const cls_dm_serif = DM_Serif_Display({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-dm-serif' })
const cls_libre_caslon = Libre_Caslon_Text({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], variable: '--font-f-libre-caslon' })
const cls_libre_baskerville = Libre_Baskerville({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-libre-baskerville' })
const cls_cinzel = Cinzel({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-cinzel' })
const cls_abril = Abril_Fatface({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-abril' })
const cls_prata = Prata({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-prata' })
const cls_rufina = Rufina({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], variable: '--font-f-rufina' })
const cls_spectral = Spectral({ subsets: ['latin'], display: 'swap', preload: false, weight: ['300', '400', '500', '600'], variable: '--font-f-spectral' })
const cls_lora = Lora({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-lora' })
const cls_old_standard = Old_Standard_TT({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], variable: '--font-f-old-standard' })
const cls_gilda = Gilda_Display({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-gilda' })
const cls_playfair_sc = Playfair_Display_SC({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700', '900'], variable: '--font-f-playfair-sc' })
const cls_marcellus = Marcellus({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-marcellus' })
const cls_yeseva = Yeseva_One({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-yeseva' })
const cls_italiana = Italiana({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-italiana' })
const cls_bellefair = Bellefair({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-bellefair' })
const cls_vidaloka = Vidaloka({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-vidaloka' })
const cls_rozha = Rozha_One({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-rozha' })
const cls_cardo = Cardo({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], variable: '--font-f-cardo' })
const cls_crimson = Crimson_Pro({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-crimson' })
const cls_sorts_mill = Sorts_Mill_Goudy({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-sorts-mill' })
const cls_libre_bodoni = Libre_Bodoni({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-libre-bodoni' })
const cls_baskervville = Baskervville({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-baskervville' })
const cls_forum = Forum({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-forum' })
const cls_cormorant_infant = Cormorant_Infant({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-cormorant-infant' })
const cls_castoro = Castoro({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-castoro' })
const cls_ovo = Ovo({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-ovo' })
const cls_gelasio = Gelasio({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-gelasio' })
const cls_source_serif = Source_Serif_4({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-source-serif' })
const cls_noto_display = Noto_Serif_Display({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-noto-display' })
const cls_libre_caslon_display = Libre_Caslon_Display({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-libre-caslon-display' })
const cls_dm_serif_text = DM_Serif_Text({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-dm-serif-text' })
const cls_im_fell = IM_Fell_English({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-im-fell' })
const FONT_CLASSES = [inter, tight, geistMono, geist, dmSans, manrope, sora, spaceGrotesk, jakarta, outfit, instrument, fraunces, playfair, jetbrains, plexMono, spaceMono, bricolage, funnelDisplay, funnelSans, hanken, instrumentSans, schibsted, specialGothic, hostGrotesk, familjen, mona, onest, figtree, geologica, wix, syne, newsreader, youngSerif, gloock, bodoni, martian, dmMono, fragment, cls_cormorant, cls_eb_garamond, cls_dm_serif, cls_libre_caslon, cls_libre_baskerville, cls_cinzel, cls_abril, cls_prata, cls_rufina, cls_spectral, cls_lora, cls_old_standard, cls_gilda, cls_playfair_sc, cls_marcellus, cls_yeseva, cls_italiana, cls_bellefair, cls_vidaloka, cls_rozha, cls_cardo, cls_crimson, cls_sorts_mill, cls_libre_bodoni, cls_baskervville, cls_forum, cls_cormorant_infant, cls_castoro, cls_ovo, cls_gelasio, cls_source_serif, cls_noto_display, cls_libre_caslon_display, cls_dm_serif_text, cls_im_fell].map((f) => f.variable).join(' ')

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'logoless | views have value', template: '%s' },
  openGraph: { title: 'logoless | views have value', siteName: 'logoless', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'logoless' }] },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  description:
    'Clip campaigns from artists, streamers and brands. Post the clip, get paid for every thousand views.',
}

export async function generateMetadata(): Promise<Metadata> {
  const fs = await featureState()
  // the dev address and the pre-launch sign-up are not for search engines
  return fs.dev || isBetaHost(await requestHost()) ? { ...baseMetadata, robots: { index: false, follow: false } } : baseMetadata
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
}

/** What search engines are told about the site itself. Page-specific data (breadcrumbs, FAQs) is added on those pages. */
const SITE_LD = (sameAs: string[]) => ({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE.url}/#org`, name: SITE.name, url: SITE.url, logo: `${SITE.url}/logo.png`, email: SITE.emails.support, ...(sameAs.length ? { sameAs } : {}) },
    { '@type': 'WebSite', '@id': `${SITE.url}/#site`, name: SITE.name, url: SITE.url, publisher: { '@id': `${SITE.url}/#org` } },
  ],
})

/** The reading preferences (calm mode, larger text, contrast, underlined links) are applied before the first paint, so a page never reflows after it has appeared. */
const HEAD_SCRIPT = <script dangerouslySetInnerHTML={{ __html: "try{var c=document.documentElement.classList,l=localStorage;l.getItem('logoless:calm')==='1'&&c.add('calm');l.getItem('logoless:text')==='large'&&c.add('text-large');l.getItem('logoless:contrast')==='high'&&c.add('contrast');l.getItem('logoless:links')==='underline'&&c.add('underline-links');var d=document.documentElement;d.dataset.themes&&l.getItem('logoless:theme')==='light'&&(d.dataset.theme='light')}catch(e){}" }} />

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Site text can be edited by the owner, so every page is built per request with the current wording.
  await connection()
  const [overrides, session, fs, design, links] = await Promise.all([getOverrides(), getSession(), featureState(), allSettings(), getLinks()])
  const font = fontById(effectiveFont(design.design_font, design.design_font_mono))
  // one typeface for each job (Design, Fonts by use) on top of the preset: a job left empty follows the preset
  const headline = faceById(design.design_font_headline)
  const bodyFace = faceById(design.design_font_body)
  const uiFace = faceById(design.design_font_ui)
  const figuresFace = faceById(design.design_font_figures)
  const monoFace = faceById(design.design_font_mono_face)
  const fontVars = {
    '--font-body': `var(${bodyFace?.var ?? font.body})`,
    '--font-display-face': `var(${headline?.var ?? font.display})`,
    ...(uiFace ? { '--font-ui': `var(${uiFace.var})` } : {}),
    ...(figuresFace ? { '--font-figures': `var(${figuresFace.var})` } : {}),
    ...(monoFace ? { '--font-mono-pick': `var(${monoFace.var})` } : {}),
  }
  // The Anubis look (live; undo it on the dev site to go back): IBM Plex Mono for all the words, buttons and menus, and Schibsted Grotesk Black for
  // the big titles and figures, whatever was chosen in Design
  const look = fs.on['anubis-look'] === true
  if (look) {
    fontVars['--font-body'] = 'var(--font-f-ibm-plex-mono)'
    fontVars['--font-display-face'] = 'var(--font-f-schibsted)'
    ;(fontVars as Record<string, string>)['--font-ui'] = 'var(--font-f-ibm-plex-mono)'
    ;(fontVars as Record<string, string>)['--font-figures'] = 'var(--font-f-schibsted)'
    ;(fontVars as Record<string, string>)['--font-mono-pick'] = 'var(--font-f-ibm-plex-mono)'
  }
  const kind = look ? 'sans' : (headline?.kind ?? (font.id === 'inter' ? undefined : font.kind))
  const isAdmin = session?.user?.role === 'admin'
  const isDev = session?.user?.roles?.includes('dev') === true
  // The dev site is for the team (admins and developers): everyone else gets a sign-in screen and nothing from behind it.
  const blocked = fs.dev && !isAdmin && !isDev
  const announcement = fs.on.announcement && !blocked ? await getAnnouncement() : null
  const reqHeaders = await headers()
  // The launch page: while the owners have it switched on (and the countdown has not ended and opened the site by itself), everyone but an owner
  // sees only the countdown and the sign-up, on the public address. The owner dashboard, the dev address, scroll (a site of its own) and owners themselves are never shut out.
  const launch = launchView(design)
  // light mode is the owner's choice (Design settings), off unless switched on there; with it off nobody gets the button and anyone who had picked light is back on dark
  const lightOn = design.design_light_mode === '1'
  const featuresOn = { ...fs.on, 'light-theme': lightOn }
  const host = await requestHost()
  const path = reqHeaders.get('x-path') ?? '/'
  // with the new page (launch-links) /links stays open too, and the closed site shows the new page
  const newLaunch = fs.on['launch-links'] === true
  // beta.logoless.io (the pre-launch sign-up) and the sign-in hop it uses are pages of their own: none of the site around them, and never behind the launch page
  const bare = isBetaHost(host) || /^\/join(\/|$)/.test(path)
  const shut = !bare && launch.closed && !fs.dev && !/^(owner|admin|scroll)\./i.test(host) && !isAdmin && !launchExempt(path) && !(newLaunch && linksExempt(path))
  if (shut || bare) {
    return (
      <html
        lang="en"
        suppressHydrationWarning
        data-scroll-behavior="smooth"
        data-look={look ? 'anubis' : undefined}
        data-surfaces={fs.on['solid-surfaces'] ? 'solid' : undefined}
        data-themes={lightOn ? '1' : undefined}
        data-font={look ? 'schibsted' : font.id === 'inter' ? undefined : font.id}
        data-kind={kind}
        data-ui={look || uiFace ? '1' : undefined}
        data-figures={look || figuresFace ? '1' : undefined}
        style={{ ...fontVars, ...(look ? {} : roundnessVars(parseRoundness(design.design_roundness))) } as React.CSSProperties}
        className={`${FONT_CLASSES} bg-ink`}
      >
        <head>
{HEAD_SCRIPT}
        </head>
        <body className="antialiased">
          <FeaturesProvider dev={fs.dev} on={featuresOn}>
            {bare ? children : newLaunch ? <LaunchHome {...await launchHomeData('soon')} locked /> : <LaunchPage end={launch.end} headline={launch.headline} text={launch.text} signedInAs={session?.user?.email ?? null} />}
          </FeaturesProvider>
        </body>
      </html>
    )
  }
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      data-look={look ? 'anubis' : undefined}
      data-surfaces={fs.on['solid-surfaces'] ? 'solid' : undefined}
      data-themes={lightOn ? '1' : undefined}
      data-font={look ? 'schibsted' : font.id === 'inter' ? undefined : font.id}
      data-kind={kind}
      data-ui={look || uiFace ? '1' : undefined}
      data-figures={look || figuresFace ? '1' : undefined}
      style={{ ...fontVars, ...(look ? {} : roundnessVars(parseRoundness(design.design_roundness))) } as React.CSSProperties}
      className={`${FONT_CLASSES} bg-ink`}
    >
      <head>
        {HEAD_SCRIPT}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD(links.filter((l) => l.platform !== 'website' && l.url.startsWith('https://')).map((l) => l.url))) }} />
      </head>
      <body className="antialiased">
        <SkipLink />
        <FeaturesProvider dev={fs.dev} on={featuresOn}>
          <DesignProvider value={{ coverBorder: design.design_cover_border === '1', coverBar: design.design_cover_bar === '1', scrollEffects: design.design_scroll_effects === '1', liquidLoader: design.design_liquid_loader === '1', ...parseChoices(design) }}>
          <CopyProvider overrides={overrides} isAdmin={isAdmin}>
            <AppShell announcement={announcement} dots={design.bg_dots === '1'} links={links} signedIn={Boolean(session?.user?.email)}>{blocked ? <DevGate email={session?.user?.email ?? null} /> : children}</AppShell>
            <AutoCopy />
            <LiveProgress />
            <FloatingSearch raised={fs.dev && (isAdmin || isDev)} />
            {isAdmin && <TextEditor />}
            {isAdmin && <SecretDialogHost />}
            {(isAdmin || isDev) && <SiteCheckHost />}
            {fs.dev && (isAdmin || isDev) && <DevBar />}
          </CopyProvider>
          </DesignProvider>
        </FeaturesProvider>
      </body>
    </html>
  )
}
