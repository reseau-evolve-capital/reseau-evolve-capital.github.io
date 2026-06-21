'use client'

// AvatarCropModal — étape de recadrage interactif (cercle 1:1, zoom + drag) avant
// l'upload Supabase. Mobile (plein écran) comme desktop (centré), PWA comprise.
//
// Radix Dialog (focus-trap, Escape, Title + Description requis) + react-easy-crop.
// Présentationnel : zéro logique métier, zéro i18n (labels injectés par l'app).
// onConfirm reçoit le Blob carré recadré ; toute fermeture non-confirmée = annulation.
// Réf : LockMemberModal, CLAUDE.md (tokens, a11y AA, cursor: pointer).

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import Cropper, { type Area } from 'react-easy-crop'

import { Button } from '../../atoms/Button'
import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'
import { getCroppedBlob } from './cropImage'

export interface AvatarCropModalLabels {
  /** Titre de la modale. */
  title?: string
  /** Description a11y (consigne de cadrage). */
  description?: string
  /** Bouton secondaire « Annuler ». */
  cancel?: string
  /** Bouton primaire de validation. */
  confirm?: string
  /** Libellé du CTA pendant la génération du blob. */
  confirming?: string
  /** aria-label du slider de zoom. */
  zoomLabel?: string
  /** aria-label du bouton fermer. */
  close?: string
  /** Message d'erreur si le recadrage échoue. */
  error?: string
}

const DEFAULT_LABELS: Required<AvatarCropModalLabels> = {
  title: 'Ajuster ta photo',
  description: 'Déplace et zoome pour cadrer ton visage dans le cercle.',
  cancel: 'Annuler',
  confirm: 'Utiliser cette photo',
  confirming: 'Traitement…',
  zoomLabel: 'Zoom',
  close: 'Fermer',
  error: "Échec du recadrage de l'image.",
}

export interface AvatarCropModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** URL blob ou data URL de l'image à recadrer. */
  imageSrc: string | null
  /** Reçoit le Blob carré recadré (la modale ne se ferme pas seule après confirm). */
  onConfirm: (blob: Blob) => void | Promise<void>
  /** Appelé à toute fermeture non-confirmée (Escape, overlay, Annuler, croix). */
  onCancel?: () => void
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: AvatarCropModalLabels
}

/**
 * Modale de recadrage avatar (Radix Dialog + react-easy-crop). Cercle 1:1, zoom + drag.
 * Le Blob carré recadré est remonté via onConfirm ; la fermeture est pilotée par l'app.
 */
export function AvatarCropModal({
  open,
  onOpenChange,
  imageSrc,
  onConfirm,
  onCancel,
  labels,
}: AvatarCropModalProps) {
  const t = { ...DEFAULT_LABELS, ...labels }
  const descId = React.useId()

  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [areaPixels, setAreaPixels] = React.useState<Area | null>(null)
  const [processing, setProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Réinitialise crop/zoom/état à chaque ouverture (ou changement d'image).
  React.useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setAreaPixels(null)
      setError(null)
      setProcessing(false)
    }
  }, [open, imageSrc])

  const onCropComplete = React.useCallback((_: Area, areaPx: Area) => {
    setAreaPixels(areaPx)
  }, [])

  // Toute fermeture déclenchée par Radix (Escape, overlay) est une annulation.
  const handleOpenChange = (next: boolean) => {
    if (!next) onCancel?.()
    onOpenChange(next)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleConfirm = async () => {
    if (!imageSrc || !areaPixels || processing) return
    setProcessing(true)
    setError(null)
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels)
      await onConfirm(blob)
      // La fermeture est pilotée par l'app (open=false) après upload — pas d'annulation ici.
    } catch {
      setError(t.error)
      setProcessing(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          aria-describedby={descId}
          className={cn(
            'fixed z-50 flex flex-col bg-card focus:outline-none',
            // Plein écran sur mobile, carte centrée dès `sm`.
            'inset-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-[420px]',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[16px] sm:shadow-[var(--sh-modal)]',
            'motion-safe:animate-in motion-safe:fade-in sm:motion-safe:zoom-in-95 sm:motion-safe:duration-[220ms]'
          )}
        >
          <div className="flex flex-col gap-1 p-5 pb-3">
            <Dialog.Title className="font-display text-[18px] font-bold text-text">
              {t.title}
            </Dialog.Title>
            <Dialog.Description id={descId} className="text-[14px] text-text-sec">
              {t.description}
            </Dialog.Description>
          </div>

          {/* Zone de crop circulaire (fond sombre pour faire ressortir le masque). */}
          <div className="relative flex-1 bg-black sm:h-[320px] sm:flex-none">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          {/* Slider de zoom (doublon clavier/desktop du pinch tactile). */}
          <div className="flex items-center gap-3 p-5 pt-4">
            <Icon name="ZoomOut" size={20} aria-hidden="true" className="text-text-ter" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label={t.zoomLabel}
              className="h-1 flex-1 cursor-pointer accent-brand-yellow"
            />
            <Icon name="ZoomIn" size={20} aria-hidden="true" className="text-text-ter" />
          </div>

          {error && (
            <p role="alert" className="px-5 text-[13px] text-data-negative">
              {error}
            </p>
          )}

          <div className="mt-auto flex items-center justify-end gap-2 p-5 pt-2">
            <Button variant="ghost" onClick={handleCancel} disabled={processing}>
              {t.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              isLoading={processing}
              disabled={processing || !imageSrc}
            >
              {processing ? t.confirming : t.confirm}
            </Button>
          </div>

          <button
            type="button"
            aria-label={t.close}
            onClick={handleCancel}
            className="absolute right-4 top-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-ter outline-none focus-visible:shadow-[var(--sh-glow)]"
          >
            <Icon name="X" size={20} aria-hidden="true" />
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
