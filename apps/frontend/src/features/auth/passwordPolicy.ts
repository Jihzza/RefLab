export const PASSWORD_MIN_LENGTH = 10

export const PASSWORD_REQUIREMENT_KEY =
  'Password must be at least 10 characters and include a letter and a number'

const HAS_ASCII_LETTER = /[A-Za-z]/
const HAS_DIGIT = /[0-9]/

/**
 * Mirrors the policy required by the launch preflight. Supabase Auth must be
 * configured to the same policy before registrations are opened. Keeping this
 * check client-side gives users a useful error before the server rejects a new
 * or reset password.
 */
export function meetsPasswordPolicy(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH
    && HAS_ASCII_LETTER.test(password)
    && HAS_DIGIT.test(password)
}
