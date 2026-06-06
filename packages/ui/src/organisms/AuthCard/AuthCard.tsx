import { Logo } from '../../atoms/Logo'
import { Heading } from '../../atoms/Heading'
import { Text } from '../../atoms/Text'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { FormField } from '../../molecules/FormField'
import { cn } from '../../lib/cn'

/** État de la carte d'authentification */
export type AuthCardState = 'idle' | 'loading' | 'success' | 'error'

export interface AuthCardProps {
  /** Valeur actuelle du champ email */
  email: string
  /** Appelé à chaque modification de l'email */
  onEmailChange: (value: string) => void
  /** Appelé lors de la soumission du formulaire */
  onSubmit: () => void
  /** État courant de la carte */
  state?: AuthCardState
  /** Message d'erreur affiché sous le champ (état error) */
  errorMessage?: string
  /** Appelé si l'utilisateur clique sur "Réessayer" (état error) */
  onRetry?: () => void
  className?: string
}

/**
 * Carte d'authentification présentationnelle — magic link.
 * Aucune logique réseau ni formulaire géré (react-hook-form interdit).
 * L'état et les handlers vivent dans apps/web.
 */
export function AuthCard({
  email,
  onEmailChange,
  onSubmit,
  state = 'idle',
  errorMessage,
  onRetry,
  className,
}: AuthCardProps) {
  const isLoading = state === 'loading'

  // --- État succès : confirmation email envoyé ---
  if (state === 'success') {
    return (
      <section
        aria-label="Confirmation de lien magique"
        className={cn(
          'w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-[var(--sh-card)]',
          className
        )}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo className="mb-2" />
          <Heading level="h2">Vérifie ta boîte email ✨</Heading>
          <Text variant="body" color="text-sec">
            On t'a envoyé un lien magique. Clique dessus pour te connecter.
          </Text>
        </div>
      </section>
    )
  }

  // --- États idle / loading / error ---
  return (
    <section
      aria-label="Connexion à Evolve Capital"
      className={cn(
        'w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-[var(--sh-card)]',
        className
      )}
    >
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Logo />
        <Heading level="h2">Connecte-toi à Evolve Capital</Heading>
        <Text variant="body" color="text-sec">
          On t'envoie un lien magique par email
        </Text>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <FormField label="Email" error={state === 'error' ? errorMessage : undefined}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="email"
              autoComplete="email"
              placeholder="ton@email.com"
              value={email}
              disabled={isLoading}
              onChange={(e) => onEmailChange(e.target.value)}
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
          Recevoir le lien magique
        </Button>
      </form>

      {state === 'error' && onRetry && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="md" onClick={onRetry}>
            Réessayer
          </Button>
        </div>
      )}
    </section>
  )
}
