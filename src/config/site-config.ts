export type NavItem = {
  href: string;
  title: {
    fr: string;
    en: string;
  };
}

export type Locale = 'fr' | 'en';

export type LocalizedText = {
  fr: string;
  en: string;
}

export type StatItem = {
  value: string;
  label: LocalizedText;
}

export type ServiceItem = {
  title: LocalizedText;
  description: LocalizedText;
  icon: string;
}

export type PageContent = {
  home: {
    hero: {
      title: LocalizedText;
      subtitle: LocalizedText;
      description: LocalizedText;
      cta: LocalizedText;
    };
    stats: {
      title: LocalizedText;
      items: StatItem[];
    };
    services: {
      title: LocalizedText;
      items: ServiceItem[];
    };
  };
}

export const defaultLocale: Locale = 'fr';
export const locales: Locale[] = ['fr', 'en'];

export const siteConfig = {
  name: {
    fr: "Réseau Evolve Capital",
    en: "Evolve Capital Network"
  },
  description: {
    fr: "Promouvoir l'éducation financière et les clubs d'investissement auprès des jeunes en France.",
    en: "Promoting financial education and investment clubs among young people in France"
  },
  url: 'https://www.reseauevolvecapital.com',
  author: {
    name: 'Lionel Zoclanclounon',
    role: 'President / Investor / entrepreneur',
    bio: 'Passionate about building innovative solutions...',
    avatar: '/images/avatar.png',
    social: {
      github: 'https://github.com/LionelZoc',
      linkedin: 'https://www.linkedin.com/in/lionel-zoclanclounon-061140a3/',
      twitter: 'https://x.com/amir_muerte',
      whatsapp: 'https://wa.me/33752234882',
      email: 'lionel@omniventus.com',
      buyMeACoffee: 'https://www.buymeacoffee.com/lionel.z'
    }
  },
  mainNav: [
    {
      href: "/",
      title: {
        fr: "Accueil",
        en: "Home"
      },
    },
    {
      href: "/about",
      title: {
        fr: "À Propos",
        en: "About"
      }
    },
    {
      href: "/services",
      title: {
        fr: "Services",
        en: "Services"
      }
    },
    {
      href: "/events",
      title: {
        fr: "Événements",
        en: "Events"
      }
    },
    {
      href: "/contact",
      title: {
        fr: "Contact",
        en: "Contact"
      }
    },
  ] as NavItem[],
  links: {
    linkedin: "https://linkedin.com/company/reseau-evolve-capital",
    instagram: "https://instagram.com/reseau.evolve.capital",
  },
} as const 

export const pageContent: PageContent = {
  home: {
    hero: {
      title: {
        fr: "Investissez dans votre avenir avec",
        en: "Invest in your future with"
      },
      subtitle: {
        fr: "Réseau Evolve Capital",
        en: "Evolve Capital Network"
      },
      description: {
        fr: "Promouvoir l'éducation financière et les clubs d'investissement auprès des jeunes en France.",
        en: "Promoting financial education and investment clubs among young people in France."
      },
      cta: {
        fr: "Rejoignez-nous",
        en: "Join Us"
      }
    },
    stats: {
      title: {
        fr: "Notre Impact",
        en: "Our Impact"
      },
      items: [
        { 
          value: "100+", 
          label: {
            fr: "Membres",
            en: "Members"
          }
        },
        { 
          value: "3", 
          label: {
            fr: "Clubs",
            en: "Clubs"
          }
        },
        { 
          value: "800k€", 
          label: {
            fr: "Actifs sous gestion",
            en: "Assets Under Management"
          }
        },
        { 
          value: "5", 
          label: {
            fr: "Années d'expérience",
            en: "Years of Experience"
          }
        }
      ]
    },
    services: {
      title: {
        fr: "Nos Services",
        en: "Our Services"
      },
      items: [
        {
          title: {
            fr: "Éducation Financière",
            en: "Financial Education"
          },
          description: {
            fr: "Formation sur l'investissement boursier et la gestion de patrimoine",
            en: "Training on stock market investment and wealth management"
          },
          icon: "📚"
        },
        {
          title: {
            fr: "Clubs d'Investissement",
            en: "Investment Clubs"
          },
          description: {
            fr: "Accompagnement dans la création et la gestion de clubs d'investissement",
            en: "Support in creating and managing investment clubs"
          },
          icon: "🤝"
        },
        {
          title: {
            fr: "Networking",
            en: "Networking"
          },
          description: {
            fr: "Événements et rencontres entre investisseurs",
            en: "Events and meetings between investors"
          },
          icon: "🌐"
        }
      ]
    }
  }
} as const;