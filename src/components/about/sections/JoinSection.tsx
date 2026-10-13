'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import type { JoinSection as JoinSectionData } from '@/lib/content-types'
import type { SectionProps } from '@/components/sections/components'
import { ArrowRight } from 'lucide-react'
import { analyticsEvents } from '@/lib/analytics'

export function JoinSection({ data: join, ctx }: SectionProps<JoinSectionData>) {
  const { locale } = ctx

  return (
    <Section>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-heading mb-4">{join.title}</h2>
          {join.content && <p className="text-xl text-neutral-600">{join.content}</p>}
        </motion.div>

        {/* Benefits */}
        {join.benefits.length > 0 && (
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {join.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                {benefit.icon && (
                  <div className="w-12 h-12 mb-4">
                    <Image src={benefit.icon} alt={benefit.title} width={48} height={48} />
                  </div>
                )}
                <h3 className="font-heading text-xl mb-2">{benefit.title}</h3>
                {benefit.description && <p className="text-neutral-600">{benefit.description}</p>}
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA */}
        {join.ctaLabel && join.ctaHref && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Button
              size="lg"
              className="group"
              onClick={() => analyticsEvents.navigation.ctaClick('about_join')}
            >
              <a href={`/${locale}${join.ctaHref}`}>{join.ctaLabel}</a>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        )}
      </div>
    </Section>
  )
}
