'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@evolve/ui'
import { requestMagicLink } from '@/lib/api/auth'

export function ResendButton({ email }: { email: string }) {
  const t = useTranslations('login.checkEmail')
  const [cooldown, setCooldown] = useState(0)

  const mutation = useMutation({
    mutationFn: () => requestMagicLink(email),
    onSuccess: () => setCooldown(30),
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  return (
    <div className="mt-6">
      <Button
        variant="secondary"
        disabled={cooldown > 0 || mutation.isPending || !email}
        isLoading={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {cooldown > 0 ? t('resendCooldown', { seconds: cooldown }) : t('resend')}
      </Button>
      {mutation.isError && (
        <p role="alert" className="mt-2 font-body text-[12px] text-data-negative">
          {mutation.error instanceof Error ? mutation.error.message : t('genericError')}
        </p>
      )}
    </div>
  )
}
