import { describe, expect, it } from 'vitest'
import { meetsPasswordPolicy, PASSWORD_MIN_LENGTH } from './passwordPolicy'

describe('password policy', () => {
  it('accepts a password with the required length, a letter, and a number', () => {
    expect(meetsPasswordPolicy('arbitro2026')).toBe(true)
  })

  it('rejects passwords below the minimum length', () => {
    expect(meetsPasswordPolicy(`Ref1${'x'.repeat(PASSWORD_MIN_LENGTH - 5)}`)).toBe(false)
  })

  it('rejects passwords without both a letter and a number', () => {
    expect(meetsPasswordPolicy('onlyletters')).toBe(false)
    expect(meetsPasswordPolicy('1234567890')).toBe(false)
  })
})
