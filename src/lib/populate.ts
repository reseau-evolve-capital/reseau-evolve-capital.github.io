export const SECTION_POPULATE = {
  'sections.home-hero': { populate: '*' },
  'sections.introduction': { populate: { stats: true } },
  'sections.value-proposition': { populate: { benefits: true, testimonials: { populate: ['image'] } } },
  'sections.featured-clubs': { populate: '*' },
  'sections.events': { populate: { events: { populate: ['image', 'tags'] } } },
  'sections.media-resources': { populate: { resources: { populate: ['image'] } } },
  'sections.membership': { populate: { benefits: true, members: { populate: ['image'] }, gallery: { populate: ['image'] } } },
  'sections.partnerships': { populate: { partners: { populate: ['logo'] }, sponsorshipTiers: { populate: ['benefits'] } } },
  'sections.about-hero': { populate: ['image'] },
  'sections.story': { populate: { genesisImage: true, timeline: true } },
  'sections.mission': { populate: { values: true } },
  'sections.structure': { populate: { overviewImage: true, governanceDiagram: true, units: true } },
  'sections.approach': { populate: { educationFeatures: true, investmentPrinciples: true } },
  'sections.team': { populate: { members: { populate: ['image'] } } },
  'sections.join': { populate: { benefits: true } },
  'sections.contact-intro': { populate: '*' },
  'sections.contact-form': { populate: { formFields: { populate: ['options'] } } },
  'sections.contact-info': { populate: '*' },
  'sections.legal': { populate: '*' },
  'blocs.rich-text': { populate: '*' },
  'blocs.cta': { populate: '*' },
  'blocs.image': { populate: '*' },
  'blocs.galerie': { populate: '*' },
  'blocs.citation': { populate: '*' },
  'blocs.le-chiffre': { populate: '*' },
  'blocs.separateur': { populate: '*' },
} as const

export const PAGE_POPULATE = { seo: { populate: ['ogImage'] }, sections: { on: SECTION_POPULATE } }

export const CLUB_POPULATE = {
  image: true, coordinates: true, investmentStrategy: true, seo: { populate: ['ogImage'] },
  performance: { populate: ['topHoldings'] }, executiveBoard: { populate: ['image'] },
  story: { populate: ['milestones'] }, gallery: { populate: ['image'] }, contactInfo: true,
  joinProcess: { populate: ['steps', 'requirements'] }, faq: true,
}

export const GLOBAL_POPULATE = { defaultSeo: { populate: ['ogImage'] }, navigation: true, footerLinkGroups: { populate: ['links'] } }
