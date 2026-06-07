'use client'

// Vue newsletter (EDI-006). Pipeline guidé : sélection d'une édition → APERÇU (iframe) →
// ENVOI D'UN TEST → case « j'ai vérifié l'aperçu et l'email de test » qui DÉVERROUILLE le
// bouton « Envoyer la campagne » (confirm=true). Le bouton d'envoi reste désactivé tant que
// la case n'est pas cochée. États succès/erreur explicites (jamais d'undefined/crash).
// a11y : focus visible (composants UI), boutons ≥44px, iframe titrée, statuts en role="status".

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { formatDate } from '@evolve/utils'
import { Heading, Text, Button, Icon, Checkbox, Spinner, EmptyState } from '@evolve/ui'
import type { NewsletterSummary } from '@/lib/strapi-editorial'

type SendState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

interface Props {
  editions: NewsletterSummary[]
  loadError: boolean
}

export function NewsletterView({ editions, loadError }: Props) {
  const t = useTranslations('admin.newsletter')

  const [selectedSlug, setSelectedSlug] = useState<string | null>(editions[0]?.slug ?? null)
  const [verified, setVerified] = useState(false)
  const [testState, setTestState] = useState<SendState>({ kind: 'idle' })
  const [sendState, setSendState] = useState<SendState>({ kind: 'idle' })
  // Aperçu : on charge le HTML de l'email côté client et on l'injecte via `srcDoc`
  // (PAS `src`) — la réponse de /api/newsletter/preview porte X-Frame-Options: DENY +
  // CSP frame-ancestors 'none' (durcissement OPS-004) et ne peut donc PAS être iframée
  // par URL, même en same-origin. `srcDoc` rend le contenu inline → pas de réponse à framer.
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)

  const selected = useMemo(
    () => editions.find((e) => e.slug === selectedSlug) ?? null,
    [editions, selectedSlug]
  )

  // Changer d'édition réinitialise la confirmation et l'aperçu (sécurité : on ne garde jamais
  // une case cochée ni un aperçu d'une édition précédente) — fait dans le handler, pas dans un effet.
  function selectEdition(slug: string) {
    setSelectedSlug(slug)
    setVerified(false)
    setTestState({ kind: 'idle' })
    setSendState({ kind: 'idle' })
    setPreviewHtml(null)
    setPreviewError(false)
  }

  // Récupère le HTML de l'aperçu à chaque changement d'édition (fetch = pas de framing,
  // non bloqué par X-Frame-Options ; setState uniquement dans la réponse async).
  useEffect(() => {
    if (!selectedSlug) return
    const controller = new AbortController()
    fetch(`/api/newsletter/preview?slug=${encodeURIComponent(selectedSlug)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`preview ${res.status}`)
        const html = await res.text()
        setPreviewHtml(html)
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setPreviewError(true)
      })
    return () => controller.abort()
  }, [selectedSlug])

  async function sendTest() {
    if (!selectedSlug) return
    setTestState({ kind: 'pending' })
    try {
      const res = await fetch('/api/newsletter/send-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: selectedSlug }),
      })
      const data = (await res.json().catch(() => ({}))) as { recipients?: number }
      if (!res.ok) {
        setTestState({ kind: 'error', message: t('test.error') })
        return
      }
      setTestState({
        kind: 'success',
        message: t('test.success', { count: data.recipients ?? 0 }),
      })
    } catch {
      setTestState({ kind: 'error', message: t('test.error') })
    }
  }

  async function sendCampaign() {
    if (!selectedSlug || !verified) return
    setSendState({ kind: 'pending' })
    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: selectedSlug, confirm: true }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        // Messages parlants selon la garde côté serveur.
        const map: Record<string, string> = {
          already_sent: t('send.errorAlreadySent'),
          draft: t('send.errorDraft'),
          no_edition: t('send.errorNoEdition'),
          confirm: t('send.errorConfirm'),
        }
        setSendState({ kind: 'error', message: map[data.error ?? ''] ?? t('send.error') })
        return
      }
      setSendState({ kind: 'success', message: t('send.success') })
      setVerified(false)
    } catch {
      setSendState({ kind: 'error', message: t('send.error') })
    }
  }

  const editionLabel = (e: NewsletterSummary): string => {
    const num = e.numeroEdition !== null ? `n°${String(e.numeroEdition).padStart(2, '0')}` : '—'
    const date = e.datePublication ? formatDate(e.datePublication) : ''
    return [`${t('editionPrefix')} ${num}`, e.title || '—', date].filter(Boolean).join(' · ')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Heading level="h1" className="text-[20px]">
          {t('title')}
        </Heading>
        <Text className="text-[14px] text-text-sec">{t('subtitle')}</Text>
      </div>

      {loadError && (
        <p role="status" className="text-[13px] text-data-negative">
          {t('loadError')}
        </p>
      )}

      {editions.length === 0 && !loadError ? (
        <EmptyState title={t('empty.title')} description={t('empty.description')} />
      ) : (
        editions.length > 0 && (
          <div className="flex flex-col gap-5">
            {/* Sélection de l'édition */}
            <div className="flex flex-col gap-2">
              <label htmlFor="edition-select" className="text-[13px] font-semibold text-text">
                {t('selectLabel')}
              </label>
              <select
                id="edition-select"
                value={selectedSlug ?? ''}
                onChange={(e) => selectEdition(e.target.value)}
                className="min-h-[44px] rounded-md border border-border bg-bg px-3 py-2 text-[14px] text-text"
              >
                {editions.map((e) => (
                  <option key={e.slug} value={e.slug}>
                    {editionLabel(e)}
                  </option>
                ))}
              </select>
            </div>

            {/* Aperçu (srcDoc — cf. note plus haut) */}
            {selectedSlug && (
              <div className="flex flex-col gap-2">
                <Text className="text-[13px] font-semibold">{t('preview.title')}</Text>
                {previewError ? (
                  <p
                    role="status"
                    className="rounded-[10px] border border-border bg-card p-4 text-[13px] text-data-negative"
                  >
                    {t('preview.error')}
                  </p>
                ) : previewHtml === null ? (
                  <div className="flex h-[640px] w-full items-center justify-center rounded-[10px] border border-border bg-card">
                    <Spinner size={20} />
                  </div>
                ) : (
                  <iframe
                    key={selectedSlug}
                    srcDoc={previewHtml}
                    title={t('preview.iframeTitle')}
                    sandbox=""
                    className="h-[640px] w-full rounded-[10px] border border-border bg-white"
                  />
                )}
                <Text className="text-[12px] text-text-ter">{t('preview.note')}</Text>
              </div>
            )}

            {/* Étape 1 — envoi d'un test */}
            <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-card p-4">
              <Text className="text-[13px] font-semibold">{t('test.title')}</Text>
              <Text className="text-[12px] text-text-ter">{t('test.note')}</Text>
              <div>
                <Button
                  variant="secondary"
                  onClick={() => void sendTest()}
                  disabled={testState.kind === 'pending' || !selected}
                >
                  {testState.kind === 'pending' ? (
                    <Spinner size={16} />
                  ) : (
                    <Icon name="Mail" size={16} aria-hidden="true" />
                  )}
                  {t('test.button')}
                </Button>
              </div>
              {testState.kind === 'success' && (
                <p role="status" className="text-[12px] text-data-positive">
                  {testState.message}
                </p>
              )}
              {testState.kind === 'error' && (
                <p role="status" className="text-[12px] text-data-negative">
                  {testState.message}
                </p>
              )}
            </div>

            {/* Étape 2 — confirmation + envoi de la campagne */}
            <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-4">
              <Text className="text-[13px] font-semibold">{t('send.title')}</Text>
              <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
                <Checkbox
                  checked={verified}
                  onCheckedChange={(c) => setVerified(c === true)}
                  aria-label={t('send.confirmLabel')}
                  className="mt-0.5"
                />
                <span className="text-[13px] text-text">{t('send.confirmLabel')}</span>
              </label>
              <div>
                <Button
                  variant="primary"
                  onClick={() => void sendCampaign()}
                  disabled={!verified || sendState.kind === 'pending' || !selected}
                >
                  {sendState.kind === 'pending' ? (
                    <Spinner size={16} />
                  ) : (
                    <Icon name="Send" size={16} aria-hidden="true" />
                  )}
                  {t('send.button')}
                </Button>
              </div>
              {sendState.kind === 'success' && (
                <p role="status" className="text-[12px] text-data-positive">
                  {sendState.message}
                </p>
              )}
              {sendState.kind === 'error' && (
                <p role="status" className="text-[12px] text-data-negative">
                  {sendState.message}
                </p>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}
