'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { AnimatedBackground } from '@/components/hero/AnimatedBackground'
import { FloatingElements } from '@/components/hero/FloatingElements'
import { Button } from '@/components/ui/Button'
import { analyticsEvents } from '@/lib/analytics'
import type { HomeHeroSection } from '@/lib/content-types'
import type { SectionProps } from './components'
import { localeHref } from '@/lib/links'

const customElements = [
  { image: '/companies/apple.svg', size: 65, delay: 0, speed: 25, initialPosition: { x: 15, y: 30 } },
  { image: '/companies/lvmh.svg', size: 65, delay: 2, speed: 25, initialPosition: { x: 75, y: 30 } },
  { image: '/companies/essilor.svg', size: 65, delay: 3, speed: 25, initialPosition: { x: 55, y: 38 } },
  { image: '/companies/coca_cola.svg', size: 65, delay: 5, speed: 25, initialPosition: { x: 45, y: 30 } },
  { image: '/companies/microsoft.svg', size: 70, delay: 3, speed: 20, initialPosition: { x: 35, y: 60 } },
  { image: '/companies/amazon.svg', size: 75, delay: 6, speed: 22, initialPosition: { x: 55, y: 40 } },
  { image: '/companies/google.svg', size: 75, delay: 8, speed: 18, initialPosition: { x: 75, y: 70 } },
  { image: '/companies/meta.svg', size: 75, delay: 10, speed: 23, initialPosition: { x: 85, y: 25 } },
  { image: '/companies/tesla.svg', size: 75, delay: 12, speed: 23, initialPosition: { x: 85, y: 25 } },
]

export function HomeHero({ data: content, ctx }: SectionProps<HomeHeroSection>) {
  const { locale } = ctx

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      <AnimatedBackground />
      <FloatingElements elements={customElements} />
      <div className="container mx-auto px-4 z-10">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-6xl font-heading mb-4">
            <span className="block text-neutral-800">{content.title}</span>
            {content.subtitle && <span className="gradient-text">{content.subtitle}</span>}
          </h1>
          {content.description && (
            <p className="text-xl md:text-2xl text-neutral-600 mb-8 max-w-2xl mx-auto">
              {content.description}
            </p>
          )}
          {content.ctaLabel && (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="text-lg"
                onClick={() => analyticsEvents.navigation.ctaClick('hero_join')}
              >
                <Link href={localeHref(locale, content.ctaHref ?? '/contact')}>{content.ctaLabel}</Link>
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
