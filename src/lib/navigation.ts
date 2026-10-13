/**
 * Maps section names to their corresponding section IDs on the home page
 */
export const homeSectionIds = {
  hero: "hero",
  introduction: "introduction",
  valueProposition: "value-proposition",
  clubs: "clubs",
  events: "events",
  resources: "resources",
  membership: "membership",
  partnerships: "partnerships"
} as const;

export type HomeSectionId = keyof typeof homeSectionIds; 