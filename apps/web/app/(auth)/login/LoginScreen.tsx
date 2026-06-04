'use client'
// Écran de connexion — split-panel desktop (F7), fidèle à la réf
// `Login & Onboarding - Desktop-standalone.html` :
//   - panneau gauche MARQUE, toujours sombre (scope `data-theme="dark"`),
//   - panneau droit FORMULAIRE thémé (clair/sombre via ThemeToggle) + réassurance.
// Mobile : seul le panneau formulaire s'affiche (logo en tête).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Logo, Button, Input, FormField, ThemeToggle, Icon } from '@evolve/ui'
import { requestMagicLink } from '@/lib/api/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Lien d'aide → site vitrine public (existant). i18n-ready (copy FR par défaut).
const HELP_URL = 'https://reseauevolvecapital.com'
// Logo de marque servi par l'app.
const LOGO_SRC = '/logo.jpg'

// Panneau marque TOUJOURS sombre : on utilise les tokens NEUTRES (`--n-*`, non
// surchargés par le mode sombre) plutôt que les tokens sémantiques — un scope
// `data-theme="dark"` imbriqué ne marche pas (les alias `@theme` sont résolus
// à :root, donc la surcharge sombre ne se propage pas via l'alias).
function BrandStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[22px] font-bold leading-none text-neutral-50">
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
    </div>
  )
}

/** Visualisation décorative « réseau de clubs » (4 nœuds reliés, 1 actif jaune). */
function ClubNetworkViz() {
  return (
    <svg
      viewBox="0 0 320 180"
      className="mt-2 w-full max-w-[360px] rounded-[14px] border border-neutral-800 bg-neutral-900 p-2"
      role="img"
      aria-label="Schéma d'un réseau de clubs connectés"
    >
      <g stroke="var(--color-neutral-700)" strokeWidth="1.5">
        <line x1="70" y1="55" x2="250" y2="55" />
        <line x1="70" y1="55" x2="70" y2="130" />
        <line x1="70" y1="55" x2="250" y2="130" />
        <line x1="250" y1="55" x2="70" y2="130" />
        <line x1="250" y1="55" x2="250" y2="130" />
        <line x1="70" y1="130" x2="250" y2="130" />
      </g>
      {/* nœud actif (jaune) */}
      <circle cx="70" cy="55" r="22" fill="var(--color-brand-yellow)" />
      {/* nœuds secondaires */}
      {[
        [250, 55],
        [70, 130],
        [250, 130],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="18"
          fill="var(--color-neutral-1000)"
          stroke="var(--color-neutral-700)"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [clientError, setClientError] = useState<string | undefined>()

  const mutation = useMutation({
    mutationFn: requestMagicLink,
    onSuccess: () => router.push(`/login/check-email?email=${encodeURIComponent(email)}`),
  })

  const isLoading = mutation.isPending
  // On surface le message d'erreur réel du serveur (ex. « … n'est pas encore invité »)
  // plutôt qu'un message générique — comportement repris de l'ancien AuthCard.
  const errorMessage =
    clientError ?? (mutation.error instanceof Error ? mutation.error.message : undefined)

  function submit() {
    setClientError(undefined)
    if (!EMAIL_RE.test(email)) {
      setClientError('Adresse email invalide.')
      return
    }
    mutation.mutate(email)
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-card md:flex-row">
      {/* Panneau marque — TOUJOURS sombre (tokens neutres, indépendants du thème) */}
      <aside className="relative hidden flex-col justify-between bg-neutral-1000 p-10 text-neutral-50 md:flex md:w-[44%] lg:w-[40%] lg:p-12">
        <div className="flex flex-col gap-9">
          <Logo variant="full" src={LOGO_SRC} />
          <div className="flex flex-col gap-5">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-brand-yellow">
              Réseau de clubs d&apos;investissement
            </p>
            <h1 className="font-display text-[38px] font-bold leading-[1.06] text-neutral-50 lg:text-[44px]">
              Rends visible ce que ton club{' '}
              <span className="box-decoration-clone bg-brand-yellow px-1.5 text-neutral-900">
                construit ensemble.
              </span>
            </h1>
            <p className="max-w-[44ch] text-[15px] leading-relaxed text-neutral-400">
              Un espace unique pour suivre le portefeuille, les cotisations et la quote-part de
              chaque membre — avec la rigueur d&apos;un fonds, à l&apos;échelle d&apos;un cercle.
            </p>
          </div>
          <ClubNetworkViz />
        </div>
        <div className="flex gap-10">
          <BrandStat value="4" label="Clubs" />
          <BrandStat value="48" label="Membres" />
          <BrandStat value="1,2 M€" label="Sous gestion" />
        </div>
      </aside>

      {/* Panneau formulaire — thémé */}
      <main className="flex flex-1 flex-col px-6 py-6 md:px-12 lg:px-20">
        <div className="flex items-center justify-end gap-3">
          <ThemeToggle />
          <a
            href={HELP_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded px-1 text-[13px] text-text-sec transition-colors hover:text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
          >
            Besoin d&apos;aide ?
          </a>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-[420px]">
            <Logo variant="full" src={LOGO_SRC} className="mb-8 md:hidden" />

            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-text-ter">
              Espace membre · Connexion
            </p>
            <h2 className="mt-3 font-display text-[34px] font-bold leading-tight text-text">
              Bienvenue.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-sec">
              Entre ton email, on t&apos;envoie un lien de connexion — pas de mot de passe à
              retenir.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
              noValidate
              className="mt-7 flex flex-col gap-4"
            >
              <FormField label="Email" error={errorMessage}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="email"
                    autoComplete="email"
                    placeholder="lea@cercle-arago.fr"
                    value={email}
                    disabled={isLoading}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </FormField>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                aria-label={isLoading ? 'Envoi en cours…' : undefined}
                className="w-full"
              >
                Recevoir mon lien →
              </Button>
            </form>

            <p className="mt-3 text-center text-[13px] text-text-ter">
              Lien valable 15 min. Aucun mot de passe, aucun spam.
            </p>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[12px] text-text-ter">OU</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              disabled
              aria-disabled="true"
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border border-border px-4 py-3 text-[14px] font-semibold text-text-ter opacity-70"
            >
              <Icon name="KeyRound" size={20} aria-hidden="true" />
              Se connecter avec une passkey
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-ter">
                V1
              </span>
            </button>

            <p className="mt-6 text-center text-[13px] text-text-sec">
              Première venue ? Ton club t&apos;envoie une invitation —{' '}
              <a
                href={HELP_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded font-semibold text-text underline-offset-2 hover:underline focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
              >
                en savoir plus
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
