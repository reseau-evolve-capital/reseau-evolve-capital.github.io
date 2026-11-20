'use client';

import type { ClubDoc, Locale } from '@/lib/content-types';
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
    club: ClubDoc;
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