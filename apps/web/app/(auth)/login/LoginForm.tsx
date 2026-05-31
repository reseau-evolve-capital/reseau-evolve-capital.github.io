'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { AuthCard, type AuthCardState } from '@evolve/ui'
import { requestMagicLink } from '@/lib/api/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [clientError, setClientError] = useState<string | undefined>()

  const mutation = useMutation({
    mutationFn: requestMagicLink,
    onSuccess: () => router.push(`/login/check-email?email=${encodeURIComponent(email)}`),
  })

  function submit() {
    setClientError(undefined)
    if (!EMAIL_RE.test(email)) {
      setClientError('Email invalide')
      return
    }
    mutation.mutate(email)
  }

  const state: AuthCardState =
    clientError !== undefined || mutation.isError
      ? 'error'
      : mutation.isPending
        ? 'loading'
        : 'idle'

  return (
    <AuthCard
      email={email}
      onEmailChange={setEmail}
      onSubmit={submit}
      state={state}
      errorMessage={
        clientError ?? (mutation.error instanceof Error ? mutation.error.message : undefined)
      }
      onRetry={() => {
        mutation.reset()
        setClientError(undefined)
      }}
    />
  )
}
