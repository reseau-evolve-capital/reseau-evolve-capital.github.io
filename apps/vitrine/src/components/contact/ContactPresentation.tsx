'use client';

import { type Locale } from '@/config/site-config';
import { ContactHero } from './sections/ContactHero';
import { ContactFormSection } from './sections/ContactFormSection';
import { ContactInfoSection } from './sections/ContactInfoSection';
//import { FindUsSection } from './sections/FindUsSection';

interface ContactPresentationProps {
    locale: Locale;
}

export function ContactPresentation({ locale }: ContactPresentationProps) {
    return (
        <div className="min-h-screen">
            <ContactHero locale={locale} />
            <ContactFormSection locale={locale} />
            <ContactInfoSection locale={locale} />
            {/* <FindUsSection locale={locale} /> */}
        </div>
    );
} 