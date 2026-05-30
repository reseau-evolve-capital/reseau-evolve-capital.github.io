

export type SiteConfig = {
    name: string;
    slogan: string;
    description: string;
    url: string;
    author: {
        name: string;
        role: string;
        bio: string;
        avatar: string;
        social: {
            github: string;
            linkedin: string;
            twitter: string;
            whatsapp: string;
            email: string;
            buyMeACoffee: string;
        };
    };
    contactWidget: {
        messages: string[];
        displayDelay: number;
        messageRotationInterval: number;
    };
}; 