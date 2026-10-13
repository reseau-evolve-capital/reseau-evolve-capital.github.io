'use client';

import { type Locale } from '@/config/site-config';
import { aboutUsContent } from '@/config/about-us-config';
import { formConfig } from '@/config/form';
import type { ContactFormSection as ContactFormData, ContactInfoSection as ContactInfoData, ContactIntroSection, GlobalDoc } from '@/lib/content-types';
import { ContactHero } from './sections/ContactHero';
import { ContactFormSection } from './sections/ContactFormSection';
import { ContactInfoSection } from './sections/ContactInfoSection';

interface ContactPresentationProps {
    locale: Locale;
}

// Transitoire : supprime en B8 (la page contact est alors servie par Strapi). Adapte la config legacy aux props des sections.
export function ContactPresentation({ locale }: ContactPresentationProps) {
    const { contact } = aboutUsContent;
    const { form } = formConfig;
    const ctx = {
        locale,
        clubs: [],
        isHome: false,
        global: {
            contactEmail: contact.email,
            contactPhone: contact.phone,
            contactAddress: null,
            ...contact.social,
        } as unknown as GlobalDoc,
    };
    const intro: ContactIntroSection = {
        __component: 'sections.contact-intro', id: 0, anchorId: null,
        title: contact.title[locale], content: contact.content[locale], variant: 'hero',
    };
    const formData: ContactFormData = {
        __component: 'sections.contact-form', id: 0, anchorId: null,
        title: form.title[locale], submitLabel: form.submitButton[locale],
        formFields: form.fields.map((f) => ({
            name: f.type === 'email' ? 'email' : f.type === 'textarea' ? 'message' : f.type === 'select' ? 'subject' : f.label.en.toLowerCase().replace(/\s+/g, ''),
            label: f.label[locale], type: f.type, required: f.required,
            options: (f.options ?? []).map((o) => ({ value: o.en.toLowerCase().replace(/\s+/g, '-'), label: o[locale] })),
        })),
    };
    const info: ContactInfoData = { __component: 'sections.contact-info', id: 0, anchorId: null };

    return (
        <div className="min-h-screen">
            <ContactHero data={intro} ctx={ctx} />
            <ContactFormSection data={formData} ctx={ctx} />
            <ContactInfoSection data={info} ctx={ctx} />
        </div>
    );
}
