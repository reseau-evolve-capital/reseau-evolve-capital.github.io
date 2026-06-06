import { getTranslations } from 'next-intl/server'
import { ResendButton } from './ResendButton'
import { CheckEmailAnimation } from './CheckEmailAnimation'

function maskEmail(email: string): string {
  return email.replace(/(.{1})(.*)(@.*)/, '$1***$3')
}

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email = '' } = await searchParams
  const t = await getTranslations('login.checkEmail')
  return (
    <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-card">
      <CheckEmailAnimation />
      <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.01em] text-text">
        {t('title')}
      </h1>
      <p className="mt-3 font-body text-[14px] leading-relaxed text-text-sec">
        {t.rich('sentTo', {
          email: maskEmail(email),
          strong: (chunks) => <strong className="text-text">{chunks}</strong>,
        })}
      </p>
      <ResendButton email={email} />
    </section>
  )
}
