// Password rules for creating a cloud account, checked on the device before anything
// is sent. The same rules should be switched on in Supabase (Authentication >
// Sign In / Providers > Email > Password requirements) so they are enforced there too.

export const MIN_LENGTH = 8
export const MAX_LENGTH = 72 // longer passwords are cut by the password hashing

const RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= MIN_LENGTH },
  { id: 'upper', label: 'An uppercase letter', test: (p) => /\p{Lu}/u.test(p) },
  { id: 'number', label: 'A number', test: (p) => /\p{N}/u.test(p) },
  { id: 'symbol', label: 'A symbol (!@#$)', test: (p) => /[^\p{L}\p{N}\s]/u.test(p) },
]

/** Each rule with whether the password meets it. */
export const passwordChecks = (pw) => RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(pw) }))

/** Every rule met: the only passwords that may be used. */
export const passwordValid = (pw) => RULES.every((r) => r.test(pw))

/** { bars: 0-4, label } for the strength meter: bars follow the rules met, a long password earns the top bar. */
export function passwordStrength(pw) {
  if (!pw) return { bars: 0, label: '' }
  const met = RULES.filter((r) => r.test(pw)).length
  if (met === RULES.length) return pw.length >= 12 ? { bars: 4, label: 'Strong' } : { bars: 3, label: 'Good' }
  if (met >= 2) return { bars: 2, label: 'Fair' }
  return { bars: 1, label: 'Weak' }
}

export const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())
