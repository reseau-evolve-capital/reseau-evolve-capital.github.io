import type { CitationBloc } from '@/lib/api'

/** Citation : bordure gauche dorée + italique. Attribution optionnelle. */
export default function Citation({ block }: { block: CitationBloc }) {
  if (!block.texte) return null
  return (
    <blockquote className="my-8 border-l-4 border-[#FDC70C] pl-5 text-lg italic leading-relaxed text-gray-800">
      <p>{block.texte}</p>
      {block.attribution ? (
        <footer className="mt-2 text-sm not-italic text-gray-600">— {block.attribution}</footer>
      ) : null}
    </blockquote>
  )
}
