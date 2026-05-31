import { ResendButton } from './ResendButton'

function maskEmail(email: string): string {
  return email.replace(/(.{1})(.*)(@.*)/, '$1***$3')
}

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email = '' } = await searchParams
  return (
    <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-card">
      <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.01em] text-text">
        Vérifie ta boîte email
      </h1>
      <p className="mt-3 font-body text-[14px] leading-relaxed text-text-sec">
        On t&apos;a envoyé un lien magique à{' '}
        <strong className="text-text">{maskEmail(email)}</strong>. Il expire dans 10 minutes.
      </p>
      <ResendButton email={email} />
    </section>
  )
}
