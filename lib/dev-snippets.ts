// The copy-and-paste code on the Developers page, one set per stack. Safe for the browser: plain strings.
// Keep these working: they are the first thing most developers will run. Each one was written against the real endpoints
// (lib/oauth.ts, app/api/oauth/*) and the discovery document.

export type Snippet = { file: string; code: string }
export type Stack = {
  id: string
  label: string
  /** Which choice to make when registering the app. */
  kind: 'Yes, it has a server' | 'No, it runs on the device'
  /** The return address to register while developing. */
  redirect: string
  install?: string
  intro: string
  files: Snippet[]
}

export function stacks(issuer: string): Stack[] {
  return [
    {
      id: 'html',
      label: 'HTML + JavaScript',
      kind: 'No, it runs on the device',
      redirect: 'http://localhost:5500/callback.html',
      intro: 'No server and no library: two files. The browser makes a one-time PKCE code so no secret is needed.',
      files: [
        {
          file: 'index.html',
          code: `<a id="signin" href="#">Continue with logoless</a>

<script type="module">
  const ISSUER = '${issuer}'
  const CLIENT_ID = 'YOUR_CLIENT_ID'
  const REDIRECT_URI = location.origin + '/callback.html' // register this exact address

  const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '')
  const random = () => b64url(crypto.getRandomValues(new Uint8Array(32)))

  document.getElementById('signin').onclick = async (e) => {
    e.preventDefault()
    const verifier = random()
    const state = random()
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    sessionStorage.setItem('logoless', JSON.stringify({ verifier, state }))
    location.href = ISSUER + '/oauth/authorize?' + new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'openid profile',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    })
  }
</script>`,
        },
        {
          file: 'callback.html',
          code: `<p id="out">Signing you in…</p>

<script type="module">
  const ISSUER = '${issuer}'
  const CLIENT_ID = 'YOUR_CLIENT_ID'
  const REDIRECT_URI = location.origin + '/callback.html'

  const q = new URLSearchParams(location.search)
  const saved = JSON.parse(sessionStorage.getItem('logoless') || '{}')
  sessionStorage.removeItem('logoless')
  const out = document.getElementById('out')

  if (q.get('error')) out.textContent = 'Sign-in stopped: ' + q.get('error_description')
  else if (!saved.state || q.get('state') !== saved.state) out.textContent = 'That did not come from your sign-in button.'
  else {
    const tokens = await fetch(ISSUER + '/api/oauth/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: q.get('code'),
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: saved.verifier,
      }),
    }).then((r) => r.json())
    if (tokens.error) throw new Error(tokens.error_description)

    const me = await fetch(ISSUER + '/api/oauth/userinfo', {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
    }).then((r) => r.json())
    out.textContent = 'Hello, ' + me.name + '! Your id in this app is ' + me.sub
  }
</script>`,
        },
      ],
    },
    {
      id: 'nextjs',
      label: 'Next.js',
      kind: 'Yes, it has a server',
      redirect: 'http://localhost:3000/api/auth/callback/logoless',
      install: 'npm install next-auth@beta',
      intro: 'With Auth.js, logoless is one provider block. It reads everything else from the discovery document.',
      files: [
        {
          file: 'auth.ts',
          code: `import NextAuth from 'next-auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: 'logoless',
      name: 'logoless',
      type: 'oidc',
      issuer: '${issuer}',
      clientId: process.env.AUTH_LOGOLESS_ID,
      clientSecret: process.env.AUTH_LOGOLESS_SECRET,
      authorization: { params: { scope: 'openid profile email' } },
    },
  ],
})`,
        },
        { file: 'app/api/auth/[...nextauth]/route.ts', code: `import { handlers } from '@/auth'\n\nexport const { GET, POST } = handlers` },
        {
          file: 'app/page.tsx',
          code: `import { auth, signIn } from '@/auth'

export default async function Page() {
  const session = await auth()
  if (session?.user) return <p>Hello, {session.user.name}</p>
  return (
    <form action={async () => { 'use server'; await signIn('logoless') }}>
      <button type="submit">Continue with logoless</button>
    </form>
  )
}`,
        },
        { file: '.env.local', code: `AUTH_SECRET=run: npx auth secret\nAUTH_LOGOLESS_ID=YOUR_CLIENT_ID\nAUTH_LOGOLESS_SECRET=YOUR_CLIENT_SECRET` },
      ],
    },
    {
      id: 'react',
      label: 'React',
      kind: 'No, it runs on the device',
      redirect: 'http://localhost:5173/callback',
      install: 'npm install oidc-client-ts react-oidc-context',
      intro: 'For a React app with no server (Vite, Create React App). The library handles PKCE, state and the callback.',
      files: [
        {
          file: 'main.tsx',
          code: `import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import App from './App'

const oidc = {
  authority: '${issuer}',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: window.location.origin + '/callback', // register this exact address
  scope: 'openid profile',
  onSigninCallback: () => window.history.replaceState({}, '', '/'),
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider {...oidc}>
    <App />
  </AuthProvider>,
)`,
        },
        {
          file: 'App.tsx',
          code: `import { useAuth } from 'react-oidc-context'

export default function App() {
  const auth = useAuth()
  if (auth.isLoading) return <p>Loading…</p>
  if (auth.error) return <p>Sign-in failed: {auth.error.message}</p>
  if (auth.isAuthenticated) return <p>Hello, {auth.user?.profile.name}</p>
  return <button onClick={() => auth.signinRedirect()}>Continue with logoless</button>
}`,
        },
      ],
    },
    {
      id: 'express',
      label: 'Node + Express',
      kind: 'Yes, it has a server',
      redirect: 'http://localhost:3000/auth/logoless/callback',
      install: 'npm install express express-session',
      intro: 'Plain fetch, no OAuth library: two routes. Needs Node 18 or newer.',
      files: [
        {
          file: 'server.js',
          code: `import crypto from 'node:crypto'
import express from 'express'
import session from 'express-session'

const ISSUER = '${issuer}'
const CLIENT_ID = process.env.LOGOLESS_ID
const CLIENT_SECRET = process.env.LOGOLESS_SECRET
const REDIRECT_URI = 'http://localhost:3000/auth/logoless/callback' // register this exact address

const app = express()
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }))

app.get('/auth/logoless', (req, res) => {
  req.session.state = crypto.randomBytes(16).toString('hex')
  req.session.verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(req.session.verifier).digest('base64url')
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email',
    state: req.session.state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  res.redirect(\`\${ISSUER}/oauth/authorize?\${q}\`)
})

app.get('/auth/logoless/callback', async (req, res) => {
  if (req.query.error) return res.status(400).send(req.query.error_description)
  if (!req.query.state || req.query.state !== req.session.state) return res.status(400).send('State does not match.')

  const tokens = await fetch(\`\${ISSUER}/api/oauth/token\`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(\`\${CLIENT_ID}:\${CLIENT_SECRET}\`).toString('base64') },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: REDIRECT_URI,
      code_verifier: req.session.verifier,
    }),
  }).then((r) => r.json())
  if (tokens.error) return res.status(400).send(tokens.error_description)

  const me = await fetch(\`\${ISSUER}/api/oauth/userinfo\`, {
    headers: { Authorization: \`Bearer \${tokens.access_token}\` },
  }).then((r) => r.json())
  req.session.user = { id: me.sub, name: me.name, email: me.email }
  res.redirect('/')
})

app.get('/', (req, res) => {
  res.send(req.session.user ? \`Hello, \${req.session.user.name}\` : '<a href="/auth/logoless">Continue with logoless</a>')
})

app.listen(3000)`,
        },
      ],
    },
    {
      id: 'python',
      label: 'Python',
      kind: 'Yes, it has a server',
      redirect: 'http://localhost:5000/auth/logoless/callback',
      install: 'pip install flask authlib requests',
      intro: 'Flask with Authlib. Authlib reads the discovery document and checks state, nonce and the id_token for you.',
      files: [
        {
          file: 'app.py',
          code: `import os
from flask import Flask, redirect, session, url_for
from authlib.integrations.flask_client import OAuth

app = Flask(__name__)
app.secret_key = os.environ["SESSION_SECRET"]

oauth = OAuth(app)
oauth.register(
    "logoless",
    client_id=os.environ["LOGOLESS_ID"],
    client_secret=os.environ["LOGOLESS_SECRET"],
    server_metadata_url="${issuer}/.well-known/openid-configuration",
    client_kwargs={"scope": "openid profile email", "code_challenge_method": "S256"},
)

@app.route("/")
def home():
    user = session.get("user")
    return f"Hello, {user['name']}" if user else '<a href="/login">Continue with logoless</a>'

@app.route("/login")
def login():
    # this must match a return address you registered exactly
    return oauth.logoless.authorize_redirect(url_for("callback", _external=True))

@app.route("/auth/logoless/callback")
def callback():
    token = oauth.logoless.authorize_access_token()
    session["user"] = token["userinfo"]
    return redirect("/")`,
        },
      ],
    },
  ]
}
