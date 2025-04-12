import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { recClubs, type Locale } from "@/config/site-config";
import { ClubPresentation } from "@/components/clubs/ClubPresentation";

type Props = {
    params: Promise<{
        locale: Locale;
        clubId: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const data = await params;
    const club = recClubs.find((c) => c.id === data.clubId);
    if (!club) return {};

    return {
        title: club.name[data.locale],
        description: club.shortDescription[data.locale],
        openGraph: {
            title: club.name[data.locale],
            description: club.shortDescription[data.locale],
            images: [{ url: club.image }],
        },
    };
}

export async function generateStaticParams() {
    return recClubs.flatMap((club) => [
        { locale: 'fr', clubId: club.id },
        { locale: 'en', clubId: club.id },
    ]);
}

export default async function ClubPage({ params }: Props) {
    const data = await params;
    const club = recClubs.find((c) => c.id === data.clubId);

    if (!club) {
        notFound();
    }

    return <ClubPresentation club={club} locale={data.locale} />;
} 