import { Skeleton } from '@evolve/ui'

// PWA-002 — Skeleton brandé du shell (anti-écran-noir au lancement à froid).
//
// Au boot SSR de la PWA, après le splash crème, on affichait un écran vide ~3 s
// pendant le chargement du layout (app) + de la page. Ce `loading.tsx` au niveau
// du groupe (app) sert de fallback de Suspense : il reproduit la STRUCTURE du shell
// réel (`app/(app)/layout.tsx`) — sidebar desktop + topbar + zone contenu + BottomNav
// mobile — pour qu'il n'y ait ni écran noir ni saut de mise en page majeur (CLS) au
// moment où le chrome réel prend le relais.
//
// Dimensions calquées 1:1 sur les organismes :
//   Sidebar  → `w-64 h-screen sticky bg-card border-r px-3 py-4 gap-4` (hidden md:flex)
//   AppTopbar→ `h-16 sticky bg-card border-b px-4 md:px-6`
//   main     → `px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8` + inner `max-w-[1280px]`
//   BottomNav→ `md:hidden fixed bottom-0 h-20 bg-card border-t`
//
// Tokens uniquement (le `Skeleton` de @evolve/ui utilise `bg-neutral-200` + gère
// light/dark et `prefers-reduced-motion` via `animate-pulse motion-reduce:animate-none`).
// Aucune copie visible → pas d'i18n nécessaire (pur squelette, aria-hidden).
export default function AppShellLoading() {
  return (
    <div aria-hidden="true" className="md:flex md:min-h-screen">
      {/* SIDEBAR (desktop) — miroir de <Sidebar> : logo, label de section, 5 entrées
          de nav (min-h-44px), carte « Club actif » poussée en bas. */}
      <aside className="hidden md:flex md:flex-col w-64 h-screen sticky top-0 bg-card border-r border-border px-3 py-4 gap-4">
        <div className="px-2">
          <Skeleton width={140} height={28} radius="8px" />
        </div>
        <div className="px-3 mt-2">
          <Skeleton width={96} height={11} radius="6px" />
        </div>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={44} radius="10px" />
          ))}
        </div>
        <div className="mt-auto border border-border rounded-[10px] p-3 flex flex-col gap-2">
          <Skeleton width={72} height={11} radius="6px" />
          <Skeleton width="80%" height={14} radius="6px" />
          <Skeleton width="60%" height={12} radius="6px" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOPBAR — miroir de <AppTopbar> : hauteur h-16, surface card, bordure basse.
            Gauche = statut sync (desktop) / logo (mobile) ; droite = pilule date +
            contrôles + avatar. */}
        <header className="sticky top-0 z-40 h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Skeleton width={120} height={16} radius="6px" />
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <Skeleton width={180} height={28} radius="9999px" className="hidden md:block" />
            <Skeleton width={40} height={40} radius="9999px" />
          </div>
        </header>

        {/* ZONE CONTENU — mêmes paddings + max-width que le <main> réel pour aligner
            le squelette sur le contenu (pas de saut skeleton → page). Composition
            reprise de dashboard/loading.tsx (hero + 3 cartes). */}
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-[1280px]">
            <div className="flex flex-col gap-4">
              <Skeleton height={128} radius="14px" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton height={112} radius="10px" />
                <Skeleton height={112} radius="10px" />
                <Skeleton height={112} radius="10px" />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* BOTTOMNAV (mobile) — miroir de <BottomNav> : fixée en bas, h-20, surface card,
          bordure haute, 4 cellules réparties. */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-20 bg-card border-t border-border flex items-stretch justify-around">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="flex flex-1 flex-col items-center justify-center gap-1">
            <Skeleton width={24} height={24} radius="6px" />
            <Skeleton width={48} height={10} radius="6px" />
          </span>
        ))}
      </nav>
    </div>
  )
}
