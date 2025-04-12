import { type Metadata } from "next";
import { type Locale, locales } from "@/config/site-config";
import { ContactPresentation } from "@/components/contact/ContactPresentation";

type Props = {
    params: Promise<{
        locale: Locale;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === 'fr' ? 'Contact | Réseau Evolve Capital' : 'Contact | Réseau Evolve Capital',
        description: locale === 'fr'
            ? 'Contactez l\'équipe du Réseau Evolve Capital pour en savoir plus sur nos clubs d\'investissement et comment rejoindre notre communauté.'
            : 'Contact the Réseau Evolve Capital team to learn more about our investment clubs and how to join our community.',
    };
}

export function generateStaticParams() {
    return locales.map((locale) => ({
        locale
    }));
}

export default async function ContactPage({ params }: Props) {
    const { locale } = await params;
    return <ContactPresentation locale={locale} />;
} 