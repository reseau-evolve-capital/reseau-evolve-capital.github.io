import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { safeHref } from '@/lib/links';

export const SOCIAL_NETWORKS = [
    { key: 'linkedin', Icon: Linkedin, label: 'LinkedIn', hover: 'hover:text-[#0077b5]' },
    { key: 'twitter', Icon: Twitter, label: 'Twitter', hover: 'hover:text-[#1DA1F2]' },
    { key: 'facebook', Icon: Facebook, label: 'Facebook', hover: 'hover:text-[#4267B2]' },
    { key: 'instagram', Icon: Instagram, label: 'Instagram', hover: 'hover:text-[#E1306C]' },
] as const;

type SocialKey = (typeof SOCIAL_NETWORKS)[number]['key'];

// Reseaux renseignes et surs, dans l'ordre de SOCIAL_NETWORKS.
export const getSocialLinks = (profiles: Partial<Record<SocialKey, string | null>>) =>
    SOCIAL_NETWORKS.flatMap((network) => {
        const href = safeHref(profiles[network.key]);
        return href ? [{ ...network, href }] : [];
    });

type SocialLinksProps = {
    links: ReturnType<typeof getSocialLinks>;
    variant: 'icon' | 'labeled';
};

export function SocialLinks({ links, variant }: SocialLinksProps) {
    return links.map(({ key, Icon, label, hover, href }) =>
        variant === 'icon' ? (
            <a
                key={key}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-neutral-300 ${hover} transition-colors`}
            >
                <Icon className="w-6 h-6" />
            </a>
        ) : (
            <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 text-neutral-600 ${hover} transition-colors`}
            >
                <Icon className="w-6 h-6" />
                <span>{label}</span>
            </a>
        ),
    );
}
