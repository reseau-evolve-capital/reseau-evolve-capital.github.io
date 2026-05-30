import { type Metadata } from "next";
import { type Locale, locales } from "@/config/site-config";
import { LegalPagePresentation } from "@/components/legal/LegalPagePresentation";

type Props = {
    params: Promise<{
        locale: Locale;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === 'fr' ? 'Mentions Légales | Réseau Evolve Capital' : 'Legal Notices | Réseau Evolve Capital',
        description: locale === 'fr'
            ? 'Consultez les mentions légales de Réseau Evolve Capital, informations juridiques et conditions d\'utilisation du site.'
            : 'View the legal notices of Réseau Evolve Capital, legal information and terms of use of the website.',
    };
}

export function generateStaticParams() {
    return locales.map((locale) => ({
        locale
    }));
}

export default async function TermsPage({ params }: Props) {
    const { locale } = await params;
    return <LegalPagePresentation locale={locale} pageType="termsOfService" />;
} 