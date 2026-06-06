import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

// Écran « lien expiré/invalide » (A3) — atterrissage en cas d'échec de l'échange de token
// dans le route handler /login/verify. RSC brandé FR/EN, aucune logique cliente : un vrai
// <Link> vers /login (a11y : lien réel, pas un onClick JS). Encadré par le layout (auth)
// (centrage + bg-bg-page). Réf : login.verify.* (i18n), CLAUDE.md (jamais d'écran vide).
export default async function VerifyExpiredPage() {
  const t = await getTranslations('login.verify')
  return (
    <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-card">
      <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.01em] text-text">
        {t('expiredTitle')}
      </h1>
      <p className="mt-3 font-body text-[14px] leading-relaxed text-text-sec">{t('expiredBody')}</p>
      <div className="mt-6">
        <Link
          href="/login"
          className="inline-flex h-10 min-h-[44px] items-center justify-center gap-2 rounded-md bg-brand-yellow px-4 font-body text-[14px] font-semibold text-accent-ink transition-all duration-[150ms] hover:opacity-90 focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] active:scale-[0.98] motion-reduce:active:scale-100"
        >
          {t('backToLogin')}
        </Link>
      </div>
    </section>
  )
}
