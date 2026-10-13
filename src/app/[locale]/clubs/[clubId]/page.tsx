import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClub } from '@/lib/content';
import type { Locale } from '@/lib/content-types';
import { imageUrl } from '@/lib/media';
import { loadSiteContent } from '@/lib/site-content';
import { locales } from '@/lib/site';
import { ClubPresentation } from '@/components/clubs/ClubPresentation';

type Props = {
    params: Promise<{
        locale: Locale;
        clubId: string;
    }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
    const { clubs } = await loadSiteContent();
    return locales.flatMap((locale) =>
        clubs[locale].map((club) => ({ locale, clubId: club.slug })),
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, clubId } = await params;
    const club = await getClub(clubId, locale);
    if (!club) return {};
    const image = imageUrl(club.image);

    return {
        title: club.seo?.metaTitle ?? club.name,
        description: club.seo?.metaDescription ?? club.shortDescription ?? undefined,
        openGraph: {
            title: club.name,
            description: club.shortDescription ?? undefined,
            images: image ? [{ url: image }] : [],
        },
    };
}

export default async function ClubPage({ params }: Props) {
    const { locale, clubId } = await params;
    const club = await getClub(clubId, locale);

    if (!club) {
        notFound();
    }

    return <ClubPresentation club={club} locale={locale} />;
}
