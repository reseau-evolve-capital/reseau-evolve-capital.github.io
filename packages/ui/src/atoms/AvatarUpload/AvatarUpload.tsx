import { useRef, useState, type DragEvent } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon/Icon'

export interface AvatarUploadProps {
  /** URL de prévisualisation de l'image déjà sélectionnée */
  previewUrl?: string | null
  /** Callback appelé dès qu'un fichier est sélectionné ou déposé */
  onFileSelected: (file: File) => void
  /** Message d'erreur à afficher sous le bouton */
  error?: string
  /** Affiche l'état d'envoi en cours */
  isUploading?: boolean
  className?: string
}

export function AvatarUpload({
  previewUrl,
  onFileSelected,
  error,
  isUploading,
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
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        aria-label="Ajouter une photo de profil (optionnel)"
        className={cn(
          'relative grid h-[120px] w-[120px] place-items-center overflow-hidden rounded-full',
          'border-2 border-dashed border-border text-text-ter',
          'transition-colors duration-[150ms]',
          'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
          dragOver && 'border-brand-yellow'
        )}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 select-none text-text-ter">
            {isUploading ? (
              <span className="text-[12px]">Envoi…</span>
            ) : (
              <>
                <Icon name="Camera" size={20} aria-hidden="true" />
                <span className="text-[12px]">Photo</span>
              </>
            )}
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
