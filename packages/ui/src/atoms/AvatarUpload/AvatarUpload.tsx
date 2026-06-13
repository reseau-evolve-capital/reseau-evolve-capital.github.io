'use client'
import { useRef, useState, type DragEvent } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon/Icon'
import { Spinner } from '../Spinner/Spinner'

export interface AvatarUploadProps {
  /** URL de prévisualisation de l'image déjà sélectionnée */
  previewUrl?: string | null
  /** Callback appelé dès qu'un fichier est sélectionné ou déposé */
  onFileSelected: (file: File) => void
  /** Message d'erreur à afficher sous le bouton */
  error?: string
  /** Affiche l'état d'envoi en cours */
  isUploading?: boolean
  /** aria-label du bouton de dépôt — défaut "Ajouter une photo de profil (optionnel)" */
  uploadAriaLabel?: string
  /** Libellé de l'état vide sous l'icône appareil photo — défaut "Photo" */
  emptyLabel?: string
  /** Libellé texte affiché pendant l'envoi — défaut "Envoi…" */
  uploadingLabel?: string
  /** aria-label du spinner d'envoi — défaut "Envoi en cours" */
  uploadingAriaLabel?: string
  className?: string
}

export function AvatarUpload({
  previewUrl,
  onFileSelected,
  error,
  isUploading,
  uploadAriaLabel = 'Ajouter une photo de profil (optionnel)',
  emptyLabel = 'Photo',
  uploadingLabel = 'Envoi…',
  uploadingAriaLabel = 'Envoi en cours',
  className,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) onFileSelected(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    // `shrink-0` sur le wrapper racine (le vrai enfant flex d'une fiche en flex-row) :
    // c'est lui qui garantit que la colonne avatar ne se comprime jamais à côté du nom.
    <div className={cn('flex shrink-0 flex-col items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        aria-label={uploadAriaLabel}
        className={cn(
          // Responsive : 88px sur mobile (laisse respirer le nom à côté sur les fiches denses),
          // 120px dès `sm`. `shrink-0` ici est une ceinture de sécurité ; la garantie flex-row
          // vit sur le wrapper racine (vrai enfant flex de la fiche).
          'relative grid h-[88px] w-[88px] shrink-0 place-items-center overflow-hidden rounded-full sm:h-[120px] sm:w-[120px]',
          'border-2 border-dashed border-border text-text-ter',
          'transition-colors duration-[150ms]',
          'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
          dragOver && 'border-brand-yellow'
        )}
      >
        {/* Prévisualisation — affichée dès qu'une URL est disponible */}
        {previewUrl && <img src={previewUrl} alt="" className="h-full w-full object-cover" />}

        {/* État vide — uniquement sans preview et sans upload en cours */}
        {!previewUrl && !isUploading && (
          <span className="flex flex-col items-center gap-1 select-none text-text-ter">
            <Icon name="Camera" size={20} aria-hidden="true" />
            <span className="text-[12px]">{emptyLabel}</span>
          </span>
        )}

        {/* Overlay d'envoi — visible par-dessus la preview ou l'état vide */}
        {isUploading && (
          <span
            aria-live="polite"
            className="absolute inset-0 grid place-items-center rounded-full bg-card/70"
          >
            <span className="flex flex-col items-center gap-1 text-text-ter select-none">
              <Spinner size={20} aria-label={uploadingAriaLabel} />
              <span className="text-[12px]">{uploadingLabel}</span>
            </span>
          </span>
        )}
      </button>

      {/* Input caché — déclenché par le clic sur le bouton */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p role="alert" className="text-[12px] text-data-negative">
          {error}
        </p>
      )}
    </div>
  )
}
