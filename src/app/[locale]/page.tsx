

import { type Locale, locales } from "@/config/site-config";
import HomePage from "./HomePage";


type PageProps = {
    params: Promise<{ locale: Locale }>;
};

// Generate the static paths for all locales
export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default async function MainPage({ params }: PageProps) {
    const { locale } = await params;

    return (
        <HomePage locale={locale} />
    );
}