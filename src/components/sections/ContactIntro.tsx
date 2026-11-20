import type { ContactIntroSection } from '@/lib/content-types'
import { ContactSection } from '@/components/about/sections/ContactSection'
import { ContactHero } from '@/components/contact/sections/ContactHero'
import type { SectionProps } from './components'

export function ContactIntro(props: SectionProps<ContactIntroSection>) {
  return props.data.variant === 'hero' ? <ContactHero {...props} /> : <ContactSection {...props} />
}
