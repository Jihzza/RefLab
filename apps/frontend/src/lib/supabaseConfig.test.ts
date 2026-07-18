import { describe, expect, it } from 'vitest'
import {
  buildSupabaseAuthStorageKey,
  isolateProductionBackendFromPreview,
} from './supabaseConfig'

const PRODUCTION_URL = 'https://iqebkyjcoqggwhausgje.supabase.co'
const PUBLIC_KEY = 'public-key'

describe('Netlify preview backend isolation', () => {
  it.each([
    'deploy-preview-42--reflab.netlify.app',
    'codex-redesign--reflab.netlify.app',
    '6a5b2bcf9ce8b700082916f2--reflab.netlify.app',
    'deploy-preview-42--reflab.netlify.app.',
  ])('replaces the production backend on %s', (hostname) => {
    expect(
      isolateProductionBackendFromPreview(hostname, PRODUCTION_URL, PUBLIC_KEY),
    ).toEqual({
      url: 'https://preview-backend-disabled.invalid',
      anonKey: 'preview-backend-disabled',
      productionBackendIsolated: true,
    })
  })

  it.each([
    'https://iqebkyjcoqggwhausgje.supabase.co.',
    'https://IQEBKYJCOQGGWHAUSGJE.SUPABASE.CO./rest/v1',
  ])('also isolates the DNS-equivalent production URL %s', (productionUrl) => {
    expect(
      isolateProductionBackendFromPreview(
        'deploy-preview-42--reflab.netlify.app',
        productionUrl,
        PUBLIC_KEY,
      ),
    ).toEqual({
      url: 'https://preview-backend-disabled.invalid',
      anonKey: 'preview-backend-disabled',
      productionBackendIsolated: true,
    })
  })

  it('does not change the production site configuration', () => {
    expect(
      isolateProductionBackendFromPreview('reflab.netlify.app', PRODUCTION_URL, PUBLIC_KEY),
    ).toEqual({
      url: PRODUCTION_URL,
      anonKey: PUBLIC_KEY,
      productionBackendIsolated: false,
    })
  })

  it('allows an approved staging backend on a preview', () => {
    const stagingUrl = 'https://staging-project.supabase.co'
    expect(
      isolateProductionBackendFromPreview(
        'deploy-preview-42--reflab.netlify.app',
        stagingUrl,
        PUBLIC_KEY,
      ),
    ).toEqual({
      url: stagingUrl,
      anonKey: PUBLIC_KEY,
      productionBackendIsolated: false,
    })
  })

  it('does not trust lookalike preview hostnames', () => {
    expect(
      isolateProductionBackendFromPreview(
        'deploy-preview-42--reflab.netlify.app.evil.example',
        PRODUCTION_URL,
        PUBLIC_KEY,
      ).productionBackendIsolated,
    ).toBe(false)
  })

  it('derives the same auth storage namespace as supabase-js', () => {
    expect(buildSupabaseAuthStorageKey(PRODUCTION_URL)).toBe(
      'sb-iqebkyjcoqggwhausgje-auth-token',
    )
    expect(
      buildSupabaseAuthStorageKey('https://preview-backend-disabled.invalid'),
    ).toBe('sb-preview-backend-disabled-auth-token')
  })
})
