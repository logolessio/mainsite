'use client'

import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useMounted } from '@/hooks/use-motion-prefs'

const PANELS = [
  { cover: '/covers/01.jpg', title: 'RED ROOM', by: 'KXNG VALE', rate: '$3', tilt: -2, hue: '#ff2e93' },
  { cover: '/covers/02.jpg', title: 'MERCURY', by: 'HOLLOW FORM', rate: '$2.50', tilt: 1.5, hue: '#00e5ff' },
  { cover: '/covers/03.jpg', title: 'LATE SHIFT', by: 'DEX MARLOW', rate: '$1.80', tilt: -1, hue: '#ffe600' },
  { cover: '/covers/06.jpg', title: 'TAIL LIGHTS', by: 'SLOWBURN', rate: '$2.80', tilt: 2, hue: '#ff3b1f' },
]

/**
 * An experiment, not the site: need-for-speed energy with pop-art halftone, spray paint and glitch.
 * Everything is scoped to this page: the styles live in the <style> tag below and nothing leaks out.
 */
export function StreetLab() {
  const mounted = useMounted()
  // drawn straight onto the page body, so none of the site's own menus sit on top of it
  if (!mounted) return null
  return createPortal(
    <div className="st">
      <style>{CSS}</style>
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <filter id="st-spray">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <header className="st-top">
        <span className="st-logo">LOGOLESS</span>
        <nav>
          <a>CAMPAIGNS</a>
          <a>HOW IT WORKS</a>
          <a>PRICING</a>
        </nav>
        <Link href="/" className="st-back">
          ← BACK TO THE REAL SITE
        </Link>
      </header>

      <section className="st-hero">
        <div className="st-halftone" />
        <div className="st-speed" />
        <div className="st-spray st-spray-a" />
        <div className="st-spray st-spray-b" />
        <p className="st-tag">LAB 01 · STREET EDITION</p>
        <h1 className="st-glitch" data-text="VIEWS HAVE VALUE">
          VIEWS HAVE VALUE
        </h1>
        <p className="st-caption">Cut it. Post it. Get paid per 1,000 views. Nothing else matters.</p>
        <div className="st-cta">
          <a className="st-btn st-btn-y">START CLIPPING</a>
          <a className="st-btn st-btn-m">LAUNCH A CAMPAIGN</a>
        </div>
      </section>

      <div className="st-ticker" aria-hidden="true">
        <div>
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>POST ★ CLIP ★ GET PAID ★ NO LOGOS ★ ONLY REAL VIEWS ★ POST ★ CLIP ★ GET PAID ★ NO LOGOS ★ ONLY REAL VIEWS ★&nbsp;</span>
          ))}
        </div>
      </div>

      <section className="st-panels">
        <h2 className="st-h2">LIVE RIGHT NOW</h2>
        <div className="st-grid">
          {PANELS.map((p) => (
            <article key={p.title} className="st-panel" style={{ ['--tilt' as string]: `${p.tilt}deg`, ['--hue' as string]: p.hue }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.cover} alt="" />
              <span className="st-dots" />
              <span className="st-burst">{p.rate}/1K</span>
              <div className="st-bubble">
                <b>{p.title}</b>
                <i>{p.by}</i>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="st-stats">
        {[
          ['$0', 'TO JOIN'],
          ['10%', 'OUR FEE'],
          ['$10', 'MIN PAYOUT'],
        ].map(([n, l], i) => (
          <div key={l} className={`st-stat st-stat-${i}`}>
            <b>{n}</b>
            <span>{l}</span>
          </div>
        ))}
      </section>

      <footer className="st-foot">
        <div className="st-check" />
        <p>THIS PAGE IS AN EXPERIMENT. IT LIVES ON THE DEV SITE ONLY.</p>
      </footer>
    </div>,
    document.body,
  )
}

const CSS = `
.st{--y:#ffe600;--m:#ff2e93;--c:#00e5ff;--r:#ff3b1f;position:fixed;inset:0;z-index:300;overflow-y:auto;overflow-x:hidden;background:#0a0a0a;color:#fff;font-family:Impact,Haettenschweiler,'Arial Narrow Bold','Arial Black',sans-serif;letter-spacing:.01em}
.st *{border-radius:0 !important;box-sizing:border-box}
.st a{cursor:pointer;text-decoration:none;color:inherit}
.st-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:28px;padding:14px 28px;background:#0a0a0a;border-bottom:4px solid var(--y)}
.st-logo{background:var(--y);color:#000;padding:6px 14px;font-size:24px;transform:skewX(-10deg);box-shadow:5px 5px 0 var(--m);display:inline-block}
.st-top nav{display:flex;gap:22px;font-size:17px;flex:1;font-style:italic}
.st-top nav a:hover{color:var(--c);text-shadow:2px 2px 0 var(--m)}
.st-back{font-size:14px;border:3px solid #fff;padding:8px 12px;transform:skewX(-8deg)}
.st-back:hover{background:#fff;color:#000}
.st-hero{position:relative;min-height:88vh;display:flex;flex-direction:column;justify-content:center;padding:80px 28px;overflow:hidden;isolation:isolate}
.st-halftone{position:absolute;inset:0;z-index:-3;background:radial-gradient(circle at 1.5px 1.5px,var(--m) 1.4px,transparent 1.8px) 0 0/11px 11px;opacity:.55;-webkit-mask-image:linear-gradient(115deg,#000 0%,transparent 62%);mask-image:linear-gradient(115deg,#000 0%,transparent 62%)}
.st-speed{position:absolute;inset:-20%;z-index:-2;background:repeating-linear-gradient(100deg,transparent 0 46px,rgba(255,255,255,.07) 46px 49px,transparent 49px 120px,rgba(0,229,255,.1) 120px 124px);animation:st-speed 1.1s linear infinite}
@keyframes st-speed{to{background-position:240px 0}}
.st-spray{position:absolute;z-index:-1;filter:url(#st-spray);opacity:.9}
.st-spray-a{width:46vw;height:46vw;right:-6vw;top:-8vw;background:radial-gradient(closest-side,var(--c),var(--c) 55%,transparent 72%)}
.st-spray-b{width:34vw;height:26vw;left:-6vw;bottom:-6vw;background:radial-gradient(closest-side,var(--y),var(--y) 50%,transparent 72%);transform:rotate(-14deg)}
.st-tag{display:inline-block;align-self:flex-start;background:#000;border:3px solid var(--y);color:var(--y);padding:4px 12px;font-size:15px;transform:rotate(-2deg)}
.st-glitch{position:relative;margin:18px 0 0;font-size:clamp(3.4rem,13vw,12rem);line-height:.86;font-weight:900;text-transform:uppercase;font-style:italic;transform:skewX(-8deg);text-shadow:7px 7px 0 #000,10px 10px 0 var(--m);-webkit-text-stroke:2px #000}
.st-glitch::before,.st-glitch::after{content:attr(data-text);position:absolute;inset:0;pointer-events:none;-webkit-text-stroke:0}
.st-glitch::before{color:var(--c);transform:translate(-5px,2px);clip-path:inset(0 0 62% 0);animation:st-g1 2.4s infinite steps(1)}
.st-glitch::after{color:var(--r);transform:translate(5px,-2px);clip-path:inset(58% 0 0 0);animation:st-g2 2.1s infinite steps(1)}
@keyframes st-g1{0%,100%{clip-path:inset(0 0 62% 0);transform:translate(-5px,2px)}20%{clip-path:inset(30% 0 40% 0);transform:translate(6px,-1px)}45%{clip-path:inset(70% 0 5% 0);transform:translate(-8px,0)}70%{clip-path:inset(10% 0 70% 0);transform:translate(4px,3px)}}
@keyframes st-g2{0%,100%{clip-path:inset(58% 0 0 0);transform:translate(5px,-2px)}25%{clip-path:inset(12% 0 60% 0);transform:translate(-7px,1px)}55%{clip-path:inset(40% 0 30% 0);transform:translate(8px,2px)}80%{clip-path:inset(80% 0 0 0);transform:translate(-4px,-3px)}}
.st-caption{margin:34px 0 0;align-self:flex-start;max-width:520px;background:var(--y);color:#000;padding:14px 18px;font-size:22px;line-height:1.15;border:4px solid #000;box-shadow:8px 8px 0 #000;transform:rotate(-1.5deg);font-family:'Arial Black',Impact,sans-serif;font-weight:900;font-size:17px;letter-spacing:0}
.st-cta{display:flex;flex-wrap:wrap;gap:18px;margin-top:38px}
.st-btn{display:inline-block;padding:16px 28px;font-size:22px;border:4px solid #000;box-shadow:7px 7px 0 #000;transform:skewX(-10deg);transition:transform .12s,box-shadow .12s}
.st-btn:hover{transform:skewX(-10deg) translate(4px,4px);box-shadow:3px 3px 0 #000}
.st-btn-y{background:var(--y);color:#000}
.st-btn-m{background:var(--m);color:#fff}
.st-ticker{overflow:hidden;white-space:nowrap;background:var(--y);color:#000;border-block:5px solid #000;transform:rotate(-2deg) scale(1.05);margin:20px 0;font-size:34px;box-shadow:0 8px 0 var(--m)}
.st-ticker div{display:inline-block;animation:st-run 18s linear infinite}
@keyframes st-run{to{transform:translateX(-50%)}}
.st-panels{padding:80px 28px}
.st-h2{margin:0 0 40px;font-size:clamp(2.4rem,6vw,5rem);font-style:italic;text-shadow:5px 5px 0 var(--m);transform:skewX(-8deg)}
.st-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:34px}
.st-panel{position:relative;aspect-ratio:1;border:6px solid #000;outline:3px solid #fff;box-shadow:10px 10px 0 var(--hue);transform:rotate(var(--tilt));overflow:hidden;transition:transform .2s}
.st-panel:hover{transform:rotate(0deg) scale(1.04)}
.st-panel img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;scale:1.08;filter:contrast(1.25) saturate(1.5)}
.st-dots{position:absolute;inset:0;background:radial-gradient(circle at 2px 2px,#000 1.6px,transparent 2px) 0 0/8px 8px;mix-blend-mode:multiply;opacity:.55;-webkit-mask-image:linear-gradient(0deg,#000,transparent 70%);mask-image:linear-gradient(0deg,#000,transparent 70%)}
.st-burst{position:absolute;top:10px;right:10px;width:96px;height:96px;display:grid;place-items:center;background:var(--y);color:#000;font-size:19px;clip-path:polygon(50% 0,61% 18%,82% 9%,80% 32%,100% 38%,84% 55%,97% 76%,74% 76%,68% 100%,50% 84%,32% 100%,26% 76%,3% 76%,16% 55%,0 38%,20% 32%,18% 9%,39% 18%);transform:rotate(12deg)}
.st-bubble{position:absolute;left:10px;right:10px;bottom:12px;background:#fff;color:#000;border:4px solid #000;padding:8px 12px;display:grid}
.st-bubble b{font-size:26px;line-height:1}
.st-bubble i{font-size:13px;font-style:normal;font-family:'Arial Black',sans-serif;opacity:.7}
.st-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0;margin:20px 0 0}
.st-stat{padding:46px 28px;border:5px solid #000;display:grid;gap:6px;transform:skewX(-6deg)}
.st-stat b{font-size:clamp(4rem,10vw,8rem);line-height:.9}
.st-stat span{font-size:20px;letter-spacing:.06em}
.st-stat-0{background:var(--c);color:#000}.st-stat-1{background:var(--m)}.st-stat-2{background:var(--y);color:#000}
.st-foot{margin-top:70px;padding-bottom:40px;text-align:center;font-size:15px;letter-spacing:.08em;color:#bbb}
.st-check{height:42px;background:conic-gradient(#fff 25%,#000 0 50%,#fff 0 75%,#000 0) 0 0/42px 42px;margin-bottom:24px}
@media(max-width:700px){.st-top nav{display:none}.st-top{justify-content:space-between}.st-ticker{font-size:24px}}
@media(prefers-reduced-motion:reduce){.st-speed,.st-ticker div,.st-glitch::before,.st-glitch::after{animation:none}}
`
