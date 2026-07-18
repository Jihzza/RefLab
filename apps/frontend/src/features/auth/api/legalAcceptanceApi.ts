import { supabase } from '@/lib/supabaseClient'
import { LEGAL_DOCUMENT_VERSIONS } from '../config'

export interface CurrentLegalAcceptance {
  isAccepted: boolean
  termsVersion: string
  privacyVersion: string
  acceptedAt: string | null
}

interface CurrentLegalAcceptanceRow {
  is_accepted: boolean
  terms_version: string
  privacy_version: string
  accepted_at: string | null
}

export async function getCurrentLegalAcceptance(): Promise<{
  acceptance: CurrentLegalAcceptance | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .rpc('get_current_legal_acceptance')
    .single()

  if (error) {
    return { acceptance: null, error: new Error(error.message) }
  }

  const row = data as CurrentLegalAcceptanceRow | null
  if (!row) {
    return {
      acceptance: null,
      error: new Error('Legal acceptance status was not returned by the server.'),
    }
  }

  return {
    acceptance: {
      isAccepted: row.is_accepted,
      termsVersion: row.terms_version,
      privacyVersion: row.privacy_version,
      acceptedAt: row.accepted_at,
    },
    error: null,
  }
}

export async function acceptCurrentLegalDocuments(expectedUserId: string): Promise<{
  acceptedAt: string | null
  error: Error | null
}> {
  const { data, error } = await supabase.rpc('accept_current_legal_documents', {
    p_expected_user_id: expectedUserId,
    p_terms_version: LEGAL_DOCUMENT_VERSIONS.terms,
    p_privacy_version: LEGAL_DOCUMENT_VERSIONS.privacy,
  })

  if (error) {
    return { acceptedAt: null, error: new Error(error.message) }
  }

  if (typeof data !== 'string') {
    return {
      acceptedAt: null,
      error: new Error('Legal acceptance timestamp was not returned by the server.'),
    }
  }

  return {
    acceptedAt: data,
    error: null,
  }
}
