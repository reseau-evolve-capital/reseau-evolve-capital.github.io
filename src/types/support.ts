export type FAQItem = {
    question: string;
    answer: string;
    category?: string;
};

export type SBOMItem = {
    name: string;
    version: string;
    license: string;
    url?: string;
};

export type SupportContact = {
    type: 'email' | 'phone' | 'address' | 'social';
    value: string;
    label: string;
    icon?: string;
};

export type SupportStatus = {
    status: 'operational' | 'partial_outage' | 'major_outage' | 'maintenance';
    message?: string;
    lastUpdated: string;
};

export type SupportConfig = {
    appName: string;
    appId: string;
    version: string;
    supportEmail: string;
    legalAddress: {
        company: string;
        street: string;
        city: string;
        country: string;
        postalCode: string;
    };
    contacts: SupportContact[];
    faq: FAQItem[];
    sbom?: SBOMItem[];
    supportHours: {
        timezone: string;
        hours: string;
        days: string;
    };
    responseTime: string;
    links: {
        privacyPolicy: string;
        termsOfService: string;
        appStore?: string;
        playStore?: string;
    };
    status: SupportStatus;
}; 