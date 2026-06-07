import type { EtagereBloc } from '@/lib/api'

/** « L'étagère » : liste de recommandations (titre + auteur + pourquoi). */
export default function Etagere({ block }: { block: EtagereBloc }) {
  const items = (block.items ?? []).filter((item) => item && item.titre)
  if (items.length === 0) return null

  return (
    <ul className="my-6 space-y-5">
      {items.map((item, index) => (
        <li key={`${item.titre}-${index}`} className="border-l-2 border-[#FDC70C] pl-4">
          <p className="font-semibold text-[#231F20]">
            {item.titre}
            {item.auteur ? (
              <span className="font-normal text-gray-600"> — {item.auteur}</span>
            ) : null}
          </p>
          {item.pourquoi ? (
            <p className="mt-1 text-sm italic text-gray-700">{item.pourquoi}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
