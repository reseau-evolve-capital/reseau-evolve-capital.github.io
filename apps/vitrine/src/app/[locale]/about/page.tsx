import { type Metadata } from "next";
import { type Locale, locales } from "@/config/site-config";
import { AboutPresentation } from "@/components/about/AboutPresentation";

type Props = {
    params: Promise<{
        locale: Locale;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === 'fr' ? 'À Propos | Réseau Evolve Capital' : 'About | Réseau Evolve Capital',
        description: locale === 'fr'
            ? 'Découvrez l\'histoire et la mission de Réseau Evolve Capital, le premier réseau de clubs d\'investissement en France.'
            : 'Discover the story and mission of Réseau Evolve Capital, France\'s premier network of investment clubs.',
    };
}

export function generateStaticParams() {
    return locales.map((locale) => ({
        locale
    }));
}

export default async function AboutPage({ params }: Props) {
    const { locale } = await params;
    return <AboutPresentation locale={locale} />;
} 