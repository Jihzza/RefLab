/**
 * Stable identifiers for the exact legal-document content shipped by this
 * frontend. A substantive Terms or Privacy change must increment the matching
 * value and ship with the same server-side version configuration.
 *
 * Version identifiers do not imply legal review or approval.
 */
export const LEGAL_DOCUMENT_VERSIONS = Object.freeze({
  terms: 'terms-2026-07-18-v1',
  privacy: 'privacy-2026-07-18-v1',
})

/** Client-side usability check. The same minimum must be enforced in Supabase Auth. */
export const MIN_PASSWORD_LENGTH = 12
