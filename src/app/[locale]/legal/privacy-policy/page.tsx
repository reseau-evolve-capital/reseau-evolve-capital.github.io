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
        title: locale === 'fr' ? 'Politique de Confidentialité | Réseau Evolve Capital' : 'Privacy Policy | Réseau Evolve Capital',
        description: locale === 'fr'
            ? 'Découvrez comment Réseau Evolve Capital protège vos données personnelles et respecte votre vie privée.'
            : 'Learn how Réseau Evolve Capital protects your personal data and respects your privacy.',
    };
}

export function generateStaticParams() {
    return locales.map((locale) => ({
        locale
    }));
}

export default async function PrivacyPolicyPage({ params }: Props) {
    const { locale } = await params;
    return <LegalPagePresentation locale={locale} pageType="privacyPolicy" />;
} 