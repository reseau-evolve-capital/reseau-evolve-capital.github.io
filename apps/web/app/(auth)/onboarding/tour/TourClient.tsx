'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  OnboardingShell,
  ProgressHeader,
  CarouselSlider,
  SlideCard,
  Button,
  Link,
} from '@evolve/ui'

const slides = [
  {
    imageSrc: '/onboarding/slide-1.svg',
    imageAlt: 'Illustration quote-part',
    title: 'Ta quote-part',
    body: 'Suis l’évolution de ta quote-part en temps réel, avec les variations et la valorisation de ton portefeuille.',
  },
  {
    imageSrc: '/onboarding/slide-2.svg',
    imageAlt: 'Illustration club',
    title: 'Ton club',
    body: 'Retrouve les informations de ton club, consulte le tableau de bord commun et reste à jour sur les prises de décision.',
  },
  {
    imageSrc: '/onboarding/slide-3.svg',
    imageAlt: 'Illustration réseau',
    title: 'Le réseau',
    body: 'Échange avec les membres du réseau Evolve Capital et développe des synergies au sein de la communauté.',
  },
]

export function TourClient() {
  const router = useRouter()
  const [active, setActive] = useState(0)

  return (
    <OnboardingShell
      // Le tour est la dernière partie de l'étape 03 du fil d'onboarding (réf desktop :
      // « ÉTAPE 03 / 03 »), cohérent avec step-3 (consentements) → indicateur 3/3.
      header={<ProgressHeader step={3} total={3} />}
      footer={
        <div className="flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => router.push('/dashboard')}
            className="w-full"
          >
            Accéder à mon espace
          </Button>
          <Link href="/dashboard" className="text-[14px] text-text-ter">
            Passer le tour
          </Link>
        </div>
      }
    >
      <CarouselSlider
        slides={slides.map((s) => (
          <SlideCard
            key={s.title}
            imageSrc={s.imageSrc}
            imageAlt={s.imageAlt}
            title={s.title}
            body={s.body}
          />
        ))}
        active={active}
        onActiveChange={setActive}
      />
    </OnboardingShell>
  )
}
