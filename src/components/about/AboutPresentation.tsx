'use client';

import { type Locale } from '@/config/site-config';
import {
    HeroSection,
    StorySection,
    MissionSection,
    StructureSection,
    ApproachSection,
    TeamSection,
    JoinSection,
    ContactSection
} from './sections';

interface AboutPresentationProps {
    locale: Locale;
}

export function AboutPresentation({ locale }: AboutPresentationProps) {
    return (
        <div className="min-h-screen">
            <HeroSection locale={locale} />
            <StorySection locale={locale} />
            <MissionSection locale={locale} />
            <StructureSection locale={locale} />
            <ApproachSection locale={locale} />
            <TeamSection locale={locale} />
            <JoinSection locale={locale} />
            <ContactSection locale={locale} />
        </div>
    );
} 