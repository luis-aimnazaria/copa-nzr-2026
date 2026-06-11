/**
 * Utilitários de e-mail: normalização, validação e máscara de
 * privacidade para o ranking.
 */

/** Normaliza para comparação/armazenamento: minúsculas, sem espaços nas pontas. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Validação simples de formato (local@dominio.tld). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(value))
}

/** Máscara de privacidade para o leaderboard: lu***@***.com.br. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  // censura também o primeiro rótulo do domínio (lu***@***.com.br)
  const [, ...domainRest] = domain.split('.')
  const maskedDomain = domainRest.length ? `***.${domainRest.join('.')}` : '***'
  return `${visible}***@${maskedDomain}`
}
