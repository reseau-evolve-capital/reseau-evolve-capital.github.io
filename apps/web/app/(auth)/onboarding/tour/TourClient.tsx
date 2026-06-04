'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  OnboardingShell,
  ProgressHeader,
  CarouselSlider,
  SlideCard,
  Button,
  Link,
} from '@evolve/ui'

export function TourClient() {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const [active, setActive] = useState(0)

  const slides = [
    {
      imageSrc: '/onboarding/slide-1.svg',
      imageAlt: t('tour.slide1.imageAlt'),
      title: t('tour.slide1.title'),
      body: t('tour.slide1.body'),
    },
    {
      imageSrc: '/onboarding/slide-2.svg',
      imageAlt: t('tour.slide2.imageAlt'),
      title: t('tour.slide2.title'),
      body: t('tour.slide2.body'),
    },
    {
      imageSrc: '/onboarding/slide-3.svg',
      imageAlt: t('tour.slide3.imageAlt'),
      title: t('tour.slide3.title'),
      body: t('tour.slide3.body'),
    },
  ]

  return (
    <OnboardingShell
      // Le tour est la dernière partie de l'étape 03 du fil d'onboarding (réf desktop :
      // « ÉTAPE 03 / 03 »), cohérent avec step-3 (consentements) → indicateur 3/3.
      header={
        <ProgressHeader
          step={3}
          total={3}
          formatLabel={(s, n) => t('progress', { step: s, total: n })}
        />
      }
      footer={
        <div className="flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => router.push('/dashboard')}
            className="w-full"
          >
            {t('tour.enterSpace')}
          </Button>
          <Link href="/dashboard" className="text-[14px] text-text-ter">
            {t('tour.skip')}
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
        regionAriaLabel={t('tour.regionAria')}
        slideAriaLabel={(index, count) => t('tour.slideAria', { index, count })}
      />
    </OnboardingShell>
  )
}
