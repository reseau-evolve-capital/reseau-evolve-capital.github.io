'use client';

import { type Club, type Locale } from '@/config/site-config';
import {
    HeroSection,
    StorySection,
    StrategySection,
    TeamSection,
    GallerySection,
    FaqSection,
    ContactSection
} from './sections';

interface ClubPresentationProps {
    club: Club;
    locale: Locale;
}

export function ClubPresentation({ club, locale }: ClubPresentationProps) {
    return (
        <div className="min-h-screen">
            <HeroSection club={club} locale={locale} />
            <StorySection club={club} locale={locale} />
            <StrategySection club={club} locale={locale} />
            <TeamSection club={club} locale={locale} />
            <GallerySection club={club} locale={locale} />
            <FaqSection club={club} locale={locale} />
            <ContactSection club={club} locale={locale} />
        </div>
    );
} 