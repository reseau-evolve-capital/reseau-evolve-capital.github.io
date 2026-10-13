import type { EditorialBloc, StrapiBlocksContentArray, StrapiMediaRef } from '@/lib/api'

export type Locale = 'fr' | 'en'
export type Seo = { metaTitle: string | null; metaDescription: string | null; ogImage: StrapiMediaRef | null }

// Composants items.* et club.* (attributs Strapi, camelCase).
export type StatItem = { value: string; label: string }
export type LabelItem = { text: string }
export type FeatureItem = { title: string; description: string | null; icon: string | null }
export type BenefitItem = { icon: string | null; title: string; description: string | null }
export type OptionItem = { label: string; value: string }
export type FormFieldItem = {
  name: string
  label: string
  type: 'text' | 'email' | 'textarea' | 'select'
  required: boolean | null
  options: OptionItem[]
}
export type EventItem = {
  title: string
  description: string | null
  date: string | null
  time: string | null
  location: string | null
  image: StrapiMediaRef | null
  capacity: number | null
  registeredCount: number | null
  isPast: boolean | null
  tags: LabelItem[]
  link: string | null
}
export type ResourceItem = {
  type: 'article' | 'video' | 'podcast'
  title: string
  description: string | null
  image: StrapiMediaRef | null
  duration: string | null
  date: string | null
  link: string | null
  featured: boolean | null
}
export type PersonItem = { name: string; role: string | null; image: StrapiMediaRef | null }
export type GalleryImageItem = { image: StrapiMediaRef; alt: string | null; caption: string | null }
export type PartnerItem = { name: string; type: string | null; logo: StrapiMediaRef | null }
export type SponsorshipTierItem = { title: string; description: string | null; benefits: LabelItem[] }
export type TeamMemberItem = {
  name: string
  role: string | null
  bio: string | null
  image: StrapiMediaRef | null
  linkedin: string | null
  twitter: string | null
  email: string | null
}
export type TestimonialItem = {
  content: string
  author: string
  role: string | null
  image: StrapiMediaRef | null
}
export type TimelineEventItem = { date: string | null; title: string; description: string | null }
export type FaqItem = { question: string; answer: string }
export type LinkItem = { label: string; href: string }
export type LinkGroupItem = { title: string; links: LinkItem[] }

export type HoldingItem = { name: string; ticker: string | null; weight: number | null; return: number | null }
export type PerformanceItem = {
  year: number
  return: number | null
  benchmarkReturn: number | null
  topHoldings: HoldingItem[]
}
export type MilestoneItem = { title: string; content: string | null }
export type StepItem = { title: string; description: string | null }

// Sections de page (dynamic zone `sections`).
export type HomeHeroSection = {
  __component: 'sections.home-hero'
  id: number
  anchorId: string | null
  title: string
  subtitle: string | null
  description: string | null
  ctaLabel: string | null
  ctaHref: string | null
}

export type IntroductionSection = {
  __component: 'sections.introduction'
  id: number
  anchorId: string | null
  title: string
  description: string | null
  stats: StatItem[]
  ctaLabel: string | null
  ctaHref: string | null
}

export type ValuePropositionSection = {
  __component: 'sections.value-proposition'
  id: number
  anchorId: string | null
  title: string
  description: string | null
  benefits: BenefitItem[]
  testimonialsTitle: string | null
  testimonials: TestimonialItem[]
}

export type FeaturedClubsSection = {
  __component: 'sections.featured-clubs'
  id: number
  anchorId: string | null
  title: string
  description: string | null
}

export type EventsSection = {
  __component: 'sections.events'
  id: number
  anchorId: string | null
  title: string
  description: string | null
  filterAll: string | null
  filterUpcoming: string | null
  filterPast: string | null
  events: EventItem[]
  ctaLabel: string | null
}

export type MediaResourcesSection = {
  __component: 'sections.media-resources'
  id: number
  anchorId: string | null
  title: string
  description: string | null
  filterAll: string | null
  filterArticle: string | null
  filterVideo: string | null
  filterPodcast: string | null
  resources: ResourceItem[]
  ctaLabel: string | null
}

export type MembershipSection = {
  __component: 'sections.membership'
  id: number
  anchorId: string | null
  title: string
  description: string | null
  benefits: BenefitItem[]
  membersLabel: string | null
  members: PersonItem[]
  gallery: GalleryImageItem[]
  ctaLabel: string | null
}

export type PartnershipsSection = {
  __component: 'sections.partnerships'
  id: number
  anchorId: string | null
  title: string
  description: string | null
  partnersTitle: string | null
  partners: PartnerItem[]
  sponsorshipTitle: string | null
  sponsorshipTiers: SponsorshipTierItem[]
  ctaTitle: string | null
  ctaDescription: string | null
  ctaLabel: string | null
}

export type AboutHeroSection = {
  __component: 'sections.about-hero'
  id: number
  anchorId: string | null
  headline: string
  subheadline: string | null
  image: StrapiMediaRef | null
  ctaLabel: string | null
  ctaHref: string | null
}

export type StorySection = {
  __component: 'sections.story'
  id: number
  anchorId: string | null
  title: string
  subtitle: string | null
  genesisTitle: string | null
  genesisContent: string | null
  genesisImage: StrapiMediaRef | null
  timeline: TimelineEventItem[]
}

export type MissionSection = {
  __component: 'sections.mission'
  id: number
  anchorId: string | null
  title: string
  statement: string | null
  values: FeatureItem[]
}

export type StructureSection = {
  __component: 'sections.structure'
  id: number
  anchorId: string | null
  title: string
  overviewTitle: string | null
  overviewContent: string | null
  overviewImage: StrapiMediaRef | null
  governanceTitle: string | null
  governanceContent: string | null
  governanceDiagram: StrapiMediaRef | null
  unitsTitle: string | null
  units: FeatureItem[]
}

export type ApproachSection = {
  __component: 'sections.approach'
  id: number
  anchorId: string | null
  title: string
  description: string | null
  educationTitle: string | null
  educationContent: string | null
  educationFeatures: FeatureItem[]
  investmentTitle: string | null
  investmentContent: string | null
  investmentPrinciples: FeatureItem[]
}

export type TeamSection = {
  __component: 'sections.team'
  id: number
  anchorId: string | null
  title: string
  subtitle: string | null
  members: TeamMemberItem[]
}

export type JoinSection = {
  __component: 'sections.join'
  id: number
  anchorId: string | null
  title: string
  content: string | null
  benefits: FeatureItem[]
  ctaLabel: string | null
  ctaHref: string | null
}

export type ContactIntroSection = {
  __component: 'sections.contact-intro'
  id: number
  anchorId: string | null
  title: string
  content: string | null
  variant: 'about' | 'hero'
}

export type ContactFormSection = {
  __component: 'sections.contact-form'
  id: number
  anchorId: string | null
  title: string
  formFields: FormFieldItem[]
  submitLabel: string
}

export type ContactInfoSection = {
  __component: 'sections.contact-info'
  id: number
  anchorId: string | null
}

export type LegalSection = {
  __component: 'sections.legal'
  id: number
  anchorId: string | null
  title: string
  lastUpdated: string | null
  body: StrapiBlocksContentArray
}

export type SectionData =
  | HomeHeroSection
  | IntroductionSection
  | ValuePropositionSection
  | FeaturedClubsSection
  | EventsSection
  | MediaResourcesSection
  | MembershipSection
  | PartnershipsSection
  | AboutHeroSection
  | StorySection
  | MissionSection
  | StructureSection
  | ApproachSection
  | TeamSection
  | JoinSection
  | ContactIntroSection
  | ContactFormSection
  | ContactInfoSection
  | LegalSection
  | EditorialBloc

export type PageDoc = {
  documentId: string
  slug: string
  title: string
  seo: Seo | null
  sections: SectionData[]
}

export type ClubDoc = {
  documentId: string
  slug: string
  order: number | null
  featured: boolean | null
  name: string
  shortDescription: string | null
  description: string | null
  location: string | null
  members: number | null
  image: StrapiMediaRef | null
  coordinates: { lat: number; lng: number } | null
  foundedDate: string | null
  meetingSchedule: string | null
  investmentStrategy: {
    focusAreas: string | null
    riskProfile: string | null
    decisionProcess: string | null
    minimumInvestment: number | null
    monthlyContribution: number | null
  } | null
  performance: PerformanceItem[]
  executiveBoard: TeamMemberItem[]
  story: { origins: string | null; milestones: MilestoneItem[]; futureVision: string | null } | null
  gallery: GalleryImageItem[]
  contactInfo: { email: string | null; phone: string | null; address: string | null } | null
  joinProcess: { steps: StepItem[]; requirements: LabelItem[] } | null
  faq: FaqItem[]
  seo: Seo | null
}

export type GlobalDoc = {
  documentId: string
  siteName: string
  siteDescription: string | null
  defaultSeo: Seo | null
  navigation: LinkItem[]
  footerLinkGroups: LinkGroupItem[]
  newsletterTitle: string | null
  newsletterDescription: string | null
  newsletterPlaceholder: string | null
  newsletterButton: string | null
  newsletterSuccess: string | null
  socialTitle: string | null
  copyright: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactAddress: string | null
  linkedin: string | null
  twitter: string | null
  facebook: string | null
  instagram: string | null
  youtube: string | null
}
