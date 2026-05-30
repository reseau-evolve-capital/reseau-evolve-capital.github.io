import { type Locale } from "@/config/site-config";

/**
 * Creates a path for anchor links that works with locale
 * For on-page anchors, it returns #section-id
 * For cross-page anchors, it returns /locale/#section-id
 */
export const getAnchorPath = (
  locale: Locale, 
  sectionId: string, 
  isHome: boolean = false
): string => {
  if (isHome) {
    // If we're already on the home page, just use the anchor
    return `#${sectionId}`;
  } else {
    // If we're on another page, navigate to the home page with the anchor
    return `/${locale}/#${sectionId}`;
  }
};

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