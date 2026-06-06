type AnalyticsEvent = {
    type: string;
    category: string;
    action: string;
    label?: string;
    value?: number;
};

declare global {
    interface Window {
        cfAnalytics?: {
            pushEvent: (event: AnalyticsEvent) => void;
        };
    }
}

export function trackEvent(event: AnalyticsEvent) {
    if (typeof window !== 'undefined' && window.cfAnalytics) {
        window.cfAnalytics.pushEvent(event);
    }
}

// Predefined events
export const analyticsEvents = {
    search: {
        performed: (query: string) => trackEvent({
            type: 'event',
            category: 'Search',
            action: 'Performed',
            label: query
        }),
        noResults: (query: string) => trackEvent({
            type: 'event',
            category: 'Search',
            action: 'No Results',
            label: query
        }),
        resultClicked: (query: string, result: string) => trackEvent({
            type: 'event',
            category: 'Search',
            action: 'Result Clicked',
            label: `${query} -> ${result}`
        })
    },
    form: {
        submitted: (formName: string) => trackEvent({
            type: 'event',
            category: 'Form',
            action: 'Submitted',
            label: formName
        }),
        error: (formName: string, error: string) => trackEvent({
            type: 'event',
            category: 'Form',
            action: 'Error',
            label: `${formName}: ${error}`
        })
    },
    navigation: {
        pageView: (path: string) => trackEvent({
            type: 'pageview',
            category: 'Navigation',
            action: 'Page View',
            label: path
        }),
        projectView: (projectId: string) => trackEvent({
            type: 'event',
            category: 'Navigation',
            action: 'Project View',
            label: projectId
        })
    }
}; 