'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Button } from '../ui/Button'
import { useRouter } from 'next/navigation'
import type { MembershipSection } from '@/lib/content-types'
import { imageUrl } from '@/lib/media'
import type { SectionProps } from './components'
import { analyticsEvents } from '@/lib/analytics'
import Image from 'next/image'
import { useState } from 'react'
import { Check } from 'lucide-react'

interface MemberBubbleProps {
  image: string | null
  name: string
  role: string | null
  index: number
}

const MemberBubble = ({ image, name, role, index }: MemberBubbleProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.1 }}
    className="group relative"
  >
    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-4 ring-white">
      {image && <Image src={image} alt={name} fill className="object-cover" />}
    </div>
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg shadow-lg p-2 whitespace-nowrap z-10">
      <p className="text-sm font-medium">{name}</p>
      {role && <p className="text-xs text-neutral-500">{role}</p>}
    </div>
  </motion.div>
)

interface BenefitItemProps {
  title: string
  description: string | null
  index: number
}

const BenefitItem = ({ title, description, index }: BenefitItemProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    className="flex gap-4"
  >
    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-[#FFF33B] to-[#F3903F] rounded-full flex items-center justify-center">
      <Check className="w-4 h-4 text-white" />
    </div>
    <div>
      <h4 className="font-heading text-lg mb-1">{title}</h4>
      {description && <p className="text-neutral-600">{description}</p>}
    </div>
  </motion.div>
)

export function Membership({ data: content, ctx }: SectionProps<MembershipSection>) {
  const router = useRouter()
  const { locale } = ctx
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Section className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-neutral-50" />
      <div className="absolute inset-0 bg-[radial-gradient(#F3903F_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

      <div className="relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-heading mb-6"
            >
              {content.title}
            </motion.h2>
            {content.description && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-lg text-neutral-600 mb-8"
              >
                {content.description}
              </motion.p>
            )}

            {/* Benefits List */}
            {content.benefits.length > 0 && (
              <div className="space-y-6 mb-8">
                {content.benefits.map((benefit, index) => (
                  <BenefitItem
                    key={`${benefit.title}-${index}`}
                    title={benefit.title}
                    description={benefit.description}
                    index={index}
                  />
                ))}
              </div>
            )}

            {/* Member Bubbles */}
            {content.members.length > 0 && (
              <div className="relative mb-8">
                {content.membersLabel && (
                  <p className="text-sm text-neutral-500 mb-4">{content.membersLabel}</p>
                )}
                <div className="flex flex-wrap gap-4">
                  {content.members.map((member, index) => (
                    <MemberBubble
                      key={`${member.name}-${index}`}
                      image={imageUrl(member.image)}
                      name={member.name}
                      role={member.role}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {content.ctaLabel && (
              <Button
                onClick={() => {
                  analyticsEvents.navigation.ctaClick('membership_join')
                  router.push(`/${locale}/contact`)
                }}
                size="lg"
                className="group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {content.ctaLabel}
                <motion.span className="inline-block ml-2" animate={{ x: isHovered ? 5 : 0 }}>
                  →
                </motion.span>
              </Button>
            )}
          </div>

          {/* Image Collage */}
          <div className="relative grid grid-cols-2 gap-4">
            {content.gallery
              .map((item) => ({ item, src: imageUrl(item.image) }))
              .filter((g): g is { item: typeof g.item; src: string } => g.src !== null)
              .map(({ item, src }, index) => {
              return (
              <motion.div
                key={`${src}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl overflow-hidden ${
                  index === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
                }`}
              >
                <Image
                  src={src}
                  alt={item.alt ?? ''}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </Section>
  )
}
