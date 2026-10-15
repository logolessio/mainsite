import { ISSUER, SCOPE_IDS, requireDevelopers } from '@/lib/oauth'
import { route } from '@/lib/http'

/** The discovery document: libraries read this to find every address and setting, so people only need to give them logoless.io. */
export const GET = route(async () => {
  await requireDevelopers()
  return Response.json(
    {
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/oauth/authorize`,
      token_endpoint: `${ISSUER}/api/oauth/token`,
      userinfo_endpoint: `${ISSUER}/api/oauth/userinfo`,
      revocation_endpoint: `${ISSUER}/api/oauth/revoke`,
      jwks_uri: `${ISSUER}/.well-known/jwks.json`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['pairwise'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: SCOPE_IDS,
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
      code_challenge_methods_supported: ['S256'],
      claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'auth_time', 'nonce', 'name', 'preferred_username', 'picture', 'profile', 'updated_at', 'email', 'email_verified', 'logoless:stats'],
      authorization_response_iss_parameter_supported: true,
    },
    { headers: { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' } },
  )
})
