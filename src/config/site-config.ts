import { clubs } from "./club-config";
export type NavItem = {
  href: string;
  title: {
    fr: string;
    en: string;
  };
}
// export type ClubMember = {
//   name: string;
//   role: "President" | "Secretary" | "Treasurer" | "Member";
//   image?: string;
// };

export type InvestmentStrategy = {
  focusAreas: LocalizedText; // e.g., "Tech, Green Energy, ETFs"
  riskProfile: LocalizedText; // e.g., "Moderate, Long-term growth"
  decisionProcess: LocalizedText; // How the club makes investment decisions
  minimumInvestment: number;
  monthlyContribution: number;
};

export type MeetingSchedule = {
  frequency: LocalizedText; // e.g., "Monthly"
  format: LocalizedText; // e.g., "In-person, Online"
  location?: LocalizedText;
};


export type ClubMember = {
  id: string;
  name: string;
  role: LocalizedText;
  image: string;
  bio: LocalizedText;
  linkedin?: string;
  twitter?: string;
}

export type ClubPerformance = {
  year: number;
  return: number;
  benchmarkReturn: number;
  topHoldings: {
    name: string;
    ticker: string;
    weight: number;
    return: number;
  }[];
}

export type ClubSectionTitles = {
  strategy: {
    title: LocalizedText;
    focusAreas: LocalizedText;
    riskProfile: LocalizedText;
    decisionProcess: LocalizedText;
    investmentRequirements: LocalizedText;
    minimumInvestment: LocalizedText;
    monthlyContribution: LocalizedText;
  };
  story: {
    title: LocalizedText;
    origins: LocalizedText;
    milestones: LocalizedText;
    vision: LocalizedText;
  };
  gallery: LocalizedText;
  executiveBoard: LocalizedText;
  faq: LocalizedText;
  contact: {
    info: LocalizedText;
    join: LocalizedText;
  };
}

export type Club = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  location: LocalizedText;
  members: number;
  image: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  shortDescription: LocalizedText;
  longDescription: LocalizedText;
  foundedDate: string;
  meetingSchedule: LocalizedText;
  investmentStrategy: InvestmentStrategy;
  performance: ClubPerformance[];
  executiveBoard: ClubMember[];
  // NEW FIELDS FOR DETAIL PAGE
  story: {
    origins: LocalizedText;
    milestones: LocalizedText | {
      title: LocalizedText;
      content: LocalizedText;
    }[];
    futureVision: LocalizedText;
  };
  gallery: {
    image: string;
    caption: LocalizedText;
  }[];
  contactInfo: {
    email: string;
    phone?: string;
    address: LocalizedText;
  };
  joinProcess: {
    steps: {
      title: LocalizedText;
      description: LocalizedText;
    }[];
    requirements: LocalizedText[];
  };
  faq: {
    question: LocalizedText;
    answer: LocalizedText;
  }[];
};

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

type FooterLink = {
  href: string;
  label: LocalizedText;
};

type FooterSection = {
  title: LocalizedText;
  items: FooterLink[];
};

type FooterContent = {
  newsletter: {
    title: LocalizedText;
    description: LocalizedText;
    placeholder: LocalizedText;
    button: LocalizedText;
    success: LocalizedText;
  };
  links: {
    company: FooterSection;
    resources: FooterSection;
    membership: FooterSection;
  };
  social: {
    title: LocalizedText;
  };
  copyright: LocalizedText;
};

export type PageContent = {
  home: {
    hero: {
      title: LocalizedText;
      subtitle: LocalizedText;
      description: LocalizedText;
      cta: LocalizedText;
    };
    introduction: {
      title: LocalizedText;
      description: LocalizedText;
      stats: StatItem[];
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
    valueProposition: {
      title: LocalizedText;
      description: LocalizedText;
      benefits: {
        icon: string;
        title: LocalizedText;
        description: LocalizedText;
      }[];
      testimonialsTitle: LocalizedText;
      testimonials: {
        content: LocalizedText;
        author: LocalizedText;
        role: LocalizedText;
        image: string;
      }[];
      findClubCTA: LocalizedText;
      createClubCTA: LocalizedText;
    };
    howItWorks: {
      title: LocalizedText;
      description: LocalizedText;
      steps: {
        title: LocalizedText;
        description: LocalizedText;
        icon: string;
      }[];
      video?: {
        title: LocalizedText;
        description: LocalizedText;
        thumbnail: string;
        url: string;
      };
    };
    featuredClubs: {
      title: LocalizedText;
      description: LocalizedText;
      clubs: Club[];
      cta: LocalizedText;
    };
    events: {
      title: LocalizedText;
      description: LocalizedText;
      filters: {
        all: LocalizedText;
        upcoming: LocalizedText;
        past: LocalizedText;
      };
      events: {
        title: LocalizedText;
        description: LocalizedText;
        date: LocalizedText;
        time: LocalizedText;
        location: LocalizedText;
        image: string;
        capacity: number;
        registeredCount: number;
        isPast: boolean;
        tags: LocalizedText[];
        link: string;
      }[];
      cta: LocalizedText;
    };
    mediaResources: {
      title: LocalizedText;
      description: LocalizedText;
      filters: {
        all: LocalizedText;
        article: LocalizedText;
        video: LocalizedText;
        podcast: LocalizedText;
      };
      resources: {
        type: 'article' | 'video' | 'podcast';
        title: LocalizedText;
        description: LocalizedText;
        image: string;
        duration?: LocalizedText;
        date: LocalizedText;
        link: string;
        featured?: boolean;
      }[];
      cta: LocalizedText;
    };
    membership: {
      title: LocalizedText;
      description: LocalizedText;
      benefits: {
        title: LocalizedText;
        description: LocalizedText;
      }[];
      membersLabel: LocalizedText;
      members: {
        name: LocalizedText;
        role: LocalizedText;
        image: string;
      }[];
      gallery: {
        url: string;
        alt: LocalizedText;
      }[];
      cta: LocalizedText;
    };
    partnerships: {
      title: LocalizedText;
      description: LocalizedText;
      partnersTitle: LocalizedText;
      partners: {
        name: LocalizedText;
        type: LocalizedText;
        logo: string;
      }[];
      sponsorshipTitle: LocalizedText;
      sponsorshipTiers: {
        title: LocalizedText;
        description: LocalizedText;
        benefits: LocalizedText[];
      }[];
      ctaTitle: LocalizedText;
      ctaDescription: LocalizedText;
      cta: LocalizedText;
    };
    footer: FooterContent;
  };
}

export const defaultLocale: Locale = 'fr';
export const locales: Locale[] = ['fr', 'en'];

export const recClubs: Club[] = clubs;

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
    introduction: {
      title: {
        fr: "Qui Sommes-Nous ?",
        en: "Who We Are"
      },
      description: {
        fr: "Le Réseau Evolve Capital est né de la volonté de démocratiser l'investissement boursier auprès des jeunes en France. Notre mission est de promouvoir l'éducation financière et les clubs d'investissement.",
        en: "The Réseau Evolve Capital was born from the desire to democratize stock market investment among young people in France. Our mission is to promote financial education and investment clubs."
      },
      stats: [
        {
          value: "100+",
          label: {
            fr: "Membres Actifs",
            en: "Active Members"
          }
        },
        {
          value: "3+",
          label: {
            fr: "Clubs Créés",
            en: "Clubs Created"
          }
        },
        {
          value: "800K€",
          label: {
            fr: "Actifs Gérés",
            en: "Assets Managed"
          }
        },
        {
          value: "6",
          label: {
            fr: "Années d'Expérience",
            en: "Years of Experience"
          }
        }
      ],
      cta: {
        fr: "Découvrir Notre Histoire",
        en: "Discover Our Story"
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
    },
    valueProposition: {
      title: {
        fr: "Pourquoi Rejoindre un Club d'Investissement ?",
        en: "Why Join an Investment Club?"
      },
      description: {
        fr: "Découvrez les avantages uniques de l'investissement en groupe et comment nos clubs peuvent vous aider à atteindre vos objectifs financiers.",
        en: "Discover the unique benefits of group investing and how our clubs can help you achieve your financial goals."
      },
      benefits: [
        {
          icon: "🎓",
          title: {
            fr: "Apprentissage Collectif",
            en: "Collective Learning"
          },
          description: {
            fr: "Profitez de l'expérience et des connaissances de chaque membre pour progresser ensemble.",
            en: "Benefit from each member's experience and knowledge to progress together."
          }
        },
        {
          icon: "💪",
          title: {
            fr: "Force du Groupe",
            en: "Group Strength"
          },
          description: {
            fr: "Accédez à un plus grand pouvoir d'investissement grâce à la mise en commun des ressources.",
            en: "Access greater investment power through pooled resources."
          }
        },
        {
          icon: "🔍",
          title: {
            fr: "Analyse Approfondie",
            en: "Deep Analysis"
          },
          description: {
            fr: "Bénéficiez d'une analyse plus complète grâce aux perspectives variées du groupe.",
            en: "Benefit from more comprehensive analysis through diverse group perspectives."
          }
        },
        {
          icon: "🤝",
          title: {
            fr: "Networking",
            en: "Networking"
          },
          description: {
            fr: "Développez votre réseau professionnel et personnel dans le monde de la finance.",
            en: "Develop your professional and personal network in the finance world."
          }
        },
        {
          icon: "📊",
          title: {
            fr: "Gestion du Risque",
            en: "Risk Management"
          },
          description: {
            fr: "Minimisez les risques grâce à une approche collective et diversifiée.",
            en: "Minimize risks through a collective and diversified approach."
          }
        },
        {
          icon: "🎯",
          title: {
            fr: "Objectifs Partagés",
            en: "Shared Goals"
          },
          description: {
            fr: "Atteignez vos objectifs financiers en équipe avec une vision commune.",
            en: "Achieve your financial goals as a team with a shared vision."
          }
        }
      ],
      testimonialsTitle: {
        fr: "Ce Que Disent Nos Membres",
        en: "What Our Members Say"
      },
      testimonials: [
        {
          content: {
            fr: "Rejoindre REC a été un tournant dans ma vie d'investisseur. J'ai appris plus en 6 mois avec le club qu'en 2 ans seul.",
            en: "Joining REC was a turning point in my investor life. I learned more in 6 months with the club than in 2 years alone."
          },
          author: {
            fr: "Francklin HODONOU",
            en: "Francklin HODONOU"
          },
          role: {
            fr: "Membre depuis 2024",
            en: "Member since 2024"
          },
          image: "/testimonials/francklin.jpg"
        },
        {
          content: {
            "fr": "Depuis six ans au REC, j'ai gagné bien plus que des performances : méthode, partage, et une vraie culture financière.",
            "en": "For six years at REC, I have gained much more than performance: method, sharing, and a real financial culture."
          },
          author: {
            fr: "Francis TAKPA",
            en: "Francis TAKPA"
          },
          role: {
            fr: "Membre depuis 2019",
            en: "Member since 2019"
          },
          image: "/testimonials/francis.jpeg"
        },
        {
          content: {
            "fr": "Aventure humaine unique. J'y ai grandi en leadership, appris du collectif et trouvé ma place en tant que membre actif.",
            "en": "Unique human adventure. I grew up in leadership, learned from the collective, and found my place as an active member."
          },
          author: {
            fr: "Olivier OUEDRAOGO",
            en: "Olivier OUEDRAOGO"
          },
          role: {
            fr: "Membre depuis 2018",
            en: "Member since 2018"
          },
          image: "/members/olivier.jpeg"
        },
        {
          content: {
            fr: "Avec le REC, j'ai appris ensemble ce que je n'aurais jamais osé explorer seul. Curiosité, entraide et progrès collectif.",
            en: "With the REC, I learned together what I would never have dared to explore alone. Curiosity, mutual support and collective progress."
          },
          author: {
            fr: "Adler KEDOTE",
            en: "Adler KEDOTE"
          },
          role: {
            fr: "Membre depuis 2019",
            en: "Member since 2019"
          },
          image: "/testimonials/adler.jpeg"
        },
        {
          content: {
            fr: "REC est bien plus qu'un club d'investissement. C'est une communauté de soutien où chacun partage ses expériences et réussites.",
            en: "REC is much more than an investment club. It's a support community where everyone shares their experiences and successes."
          },
          author: {
            fr: "Johanna LECHAT",
            en: "Johanna LECHAT"
          },
          role: {
            fr: "Membre depuis 2023",
            en: "Member since 2023"
          },
          image: "/testimonials/johanna.jpg"
        },
        {
          content: {
            fr: "Rejoindre REC a approfondi ma compréhension des marchés. Les formations et conseils reçus ont été inestimables.",
            en: "Joining REC deepened my understanding of the markets. The training and advice I've received have been invaluable."
          },
          author: {
            fr: "Guillaume POUCHAIN",
            en: "Guillaume POUCHAIN"
          },
          role: {
            fr: "Membre depuis 2021",
            en: "Member since 2021"
          },
          image: "/testimonials/guillaume.jpeg"
        }
        
        // Add more testimonials...
      ],
      findClubCTA: {
        fr: "Trouver un Club",
        en: "Find a Club"
      },
      createClubCTA: {
        fr: "Créer un Club",
        en: "Create a Club"
      }
    },
    howItWorks: {
      title: {
        fr: "Comment ça marche ?",
        en: "How It Works"
      },
      description: {
        fr: "Découvrez le processus simple pour rejoindre ou créer un club d'investissement au sein de notre réseau.",
        en: "Discover the simple process to join or create an investment club within our network."
      },
      steps: [
        {
          title: {
            fr: "Choisissez votre parcours",
            en: "Choose your path"
          },
          description: {
            fr: "Décidez si vous souhaitez rejoindre un club existant ou en créer un nouveau avec votre propre équipe.",
            en: "Decide whether you want to join an existing club or create a new one with your own team."
          },
          icon: "🎯"
        },
        {
          title: {
            fr: "Complétez votre profil",
            en: "Complete your profile"
          },
          description: {
            fr: "Remplissez votre profil d'investisseur et partagez vos objectifs financiers et votre expérience.",
            en: "Fill out your investor profile and share your financial goals and experience."
          },
          icon: "👤"
        },
        {
          title: {
            fr: "Rencontrez la communauté",
            en: "Meet the community"
          },
          description: {
            fr: "Participez à une session d'introduction et rencontrez d'autres membres partageant vos intérêts.",
            en: "Attend an introduction session and meet other members who share your interests."
          },
          icon: "🤝"
        },
        {
          title: {
            fr: "Formation initiale",
            en: "Initial training"
          },
          description: {
            fr: "Suivez notre programme de formation pour maîtriser les bases de l'investissement en club.",
            en: "Complete our training program to master the basics of club investing."
          },
          icon: "📚"
        },
        {
          title: {
            fr: "Démarrez votre aventure",
            en: "Start your journey"
          },
          description: {
            fr: "Commencez à investir avec votre club et bénéficiez du support continu de notre réseau.",
            en: "Start investing with your club and benefit from our network's ongoing support."
          },
          icon: "🚀"
        }
      ],
      video: {
        title: {
          fr: "Comprendre les clubs d'investissement",
          en: "Understanding Investment Clubs"
        },
        description: {
          fr: "Une courte vidéo explicative sur le fonctionnement des clubs d'investissement.",
          en: "A short explainer video about how investment clubs work."
        },
        thumbnail: "/videos/investment-club-thumb.jpg",
        url: "/videos/investment-club-explainer.mp4"
      }
    },
    featuredClubs: {
      title: {
        fr: "Nos Clubs d'Investissement",
        en: "Our Investment Clubs"
      },
      description: {
        fr: "Découvrez nos clubs actifs à travers la France et trouvez celui qui correspond à vos objectifs.",
        en: "Discover our active clubs across France and find the one that matches your goals."
      },
      clubs: recClubs,
      cta: {
        fr: "Explorer Tous les Clubs",
        en: "Explore All Clubs"
      }
    },
    events: {
      title: {
        fr: "Nos Événements",
        en: "Our Events"
      },
      description: {
        fr: "Découvrez nos prochains événements et webinaires pour enrichir vos connaissances en investissement.",
        en: "Discover our upcoming events and webinars to enrich your investment knowledge."
      },
      filters: {
        all: {
          fr: "Tous les événements",
          en: "All events"
        },
        upcoming: {
          fr: "À venir",
          en: "Upcoming"
        },
        past: {
          fr: "Passés",
          en: "Past"
        }
      },
      
      "events": [
        {
          "title": {
            "fr": "REC-CONNECT Bois de Vincennes",
            "en": "REC-CONNECT Bois de Vincennes"
          },
          "description": {
            "fr": "Rejoignez-nous pour une partie de mini-golf sur le thème des monuments de Paris, suivie d'un pique-nique convivial au bord du lac dans le Parc Floral des Bois de Vincennes. Apportez vos boissons et apéritifs préférés !",
            "en": "Join us for a mini-golf game themed around Paris monuments, followed by a friendly picnic by the lake in the Parc Floral of Bois de Vincennes. Bring your favorite drinks and appetizers!"
          },
          "date": {
            "fr": "29 juin 2024",
            "en": "June 29, 2024"
          },
          "time": {
            "fr": "12h00 - 17h00",
            "en": "12:00 PM - 5:00 PM"
          },
          "location": {
            "fr": "Parc Floral du Bois de Vincennes, Paris, France",
            "en": "Parc Floral of Bois de Vincennes, Paris, France"
          },
          "image": "/events/rec-connect-bois-de-vincennes.jpeg",
          "capacity": 100,
          "registeredCount": 80,
          "isPast": true,
          "tags": [
            {
              "fr": "Mini-golf",
              "en": "Mini-golf"
            },
            {
              "fr": "Pique-nique",
              "en": "Picnic"
            }
          ],
          "link": "https://www.instagram.com/reel/C_U-PUjCkwP/?igsh=MWE3ZG03aThtNThjcQ%3D%3D"
        },
        {
          "title": {
            "fr": "REC-CONNECT Fontainebleau",
            "en": "REC-CONNECT Fontainebleau"
          },
          "description": {
            "fr": "Participez à une visite de groupe exceptionnelle au château de Fontainebleau, suivie d'un pique-nique convivial. Apportez vos boissons et apéritifs préférés pour partager un moment de convivialité et faire de nouvelles rencontres.",
            "en": "Join an exceptional group visit to the Château de Fontainebleau, followed by a friendly picnic. Bring your favorite drinks and appetizers to share a convivial moment and meet new people."
          },
          "date": {
            "fr": "3 septembre 2023",
            "en": "September 3, 2023"
          },
          "time": {
            "fr": "12h00 - 17h00",
            "en": "12:00 PM - 5:00 PM"
          },
          "location": {
            "fr": "Château de Fontainebleau, Fontainebleau, France",
            "en": "Château de Fontainebleau, Fontainebleau, France"
          },
          "image": "/events/rec-connect-fontainebleau.jpg",
          "capacity": 100,
          "registeredCount": 80,
          "isPast": true,
          "tags": [
            {
              "fr": "Visite culturelle",
              "en": "Cultural Visit"
            },
            {
              "fr": "Pique-nique",
              "en": "Picnic"
            }
          ],
          "link": "https://www.instagram.com/reel/CwxUiJQNfvT/?igsh=MTdjcDY1azZyNWc3cA=="
        },
        {
          "title": {
            "fr": "REC-CONNECT Arènes de Lutèce",
            "en": "REC-CONNECT Arènes de Lutèce"
          },
          "description": {
            "fr": "Participez à un tournoi de pétanque dans les mythiques Arènes de Lutèce, suivi d'un pique-nique convivial sur place. Que vous soyez novice ou expert, c'est l'occasion de créer du capital social dans une ambiance amicale et unique.",
            "en": "Join a pétanque tournament in the mythical Arènes de Lutèce, followed by a friendly picnic on-site. Whether you're a novice or expert, it's an opportunity to build social capital in a friendly and unique atmosphere."
          },
          "date": {
            "fr": "5 octobre 2024",
            "en": "October 5, 2024"
          },
          "time": {
            "fr": "12h00 - 17h00",
            "en": "12:00 PM - 5:00 PM"
          },
          "location": {
            "fr": "Arènes de Lutèce, 75005 Paris, France",
            "en": "Arènes de Lutèce, 75005 Paris, France"
          },
          "image": "/events/rec-connect-arenes-de-lutece.jpeg",
          "capacity": 100,
          "registeredCount": 80,
          "isPast": true,
          "tags": [
            {
              "fr": "Pétanque",
              "en": "Pétanque"
            },
            {
              "fr": "Pique-nique",
              "en": "Picnic"
            }
          ],
          "link": "https://www.instagram.com/reel/DAMVuPBsnfT/?igsh=MTU1Y3k3NDR0bWJsZw=="
        }
      ],
      
      cta: {
        fr: "Voir tous les événements",
        en: "View all events"
      }
    },
    mediaResources: {
      title: {
        fr: "Ressources & Actualités",
        en: "Resources & News"
      },
      description: {
        fr: "Restez informé avec nos dernières publications, vidéos et podcasts sur l'investissement et la finance.",
        en: "Stay informed with our latest publications, videos and podcasts about investing and finance."
      },
      filters: {
        all: {
          fr: "Tout",
          en: "All"
        },
        article: {
          fr: "Articles",
          en: "Articles"
        },
        video: {
          fr: "Vidéos",
          en: "Videos"
        },
        podcast: {
          fr: "Podcasts",
          en: "Podcasts"
        }
      },
      resources: [
        {
          type: 'article',
          title: {
            fr: "Guide Complet des Clubs d'Investissement",
            en: "Complete Guide to Investment Clubs"
          },
          description: {
            fr: "Découvrez notre guide complet sur la création et la gestion d'un club d'investissement : aspects juridiques, organisation des réunions, stratégies d'investissement, gestion du portefeuille et bonnes pratiques pour réussir collectivement.",
            en: "Discover our comprehensive guide on creating and managing an investment club: legal aspects, meeting organization, investment strategies, portfolio management and best practices for collective success."
          },
          image: "/resources/guide-clubs.png",
          date: {
            fr: "10 Mars 2024",
            en: "March 10, 2024"
          },
          link: "/guide-club-investissement",
          featured: true
        },
        {
          type: 'video',
          title: {
            fr: "Analyse fondamentale : Les Bases",
            en: "Fundamental Analysis: The Basics"
          },
          description: {
            fr: "Apprenez à analyser une action en moins de 5 minutes.",
            en: "Learn how to analyze a stock in less than 5 minutes."
          },
          image: "/resources/technical-analysis.png",
          duration: {
            fr: "15 min",
            en: "15 min"
          },
          date: {
            fr: "5 Mars 2024",
            en: "March 5, 2024"
          },
          link: "https://youtu.be/aQcwW8q1IYE"
        },
        // {
        //   type: 'podcast',
        //   title: {
        //     fr: "Investir dans la Tech en 2024",
        //     en: "Investing in Tech in 2024"
        //   },
        //   description: {
        //     fr: "Discussion sur les opportunités et les risques du secteur technologique.",
        //     en: "Discussion about opportunities and risks in the tech sector."
        //   },
        //   image: "/resources/podcast.png",
        //   duration: {
        //     fr: "45 min",
        //     en: "45 min"
        //   },
        //   date: {
        //     fr: "1 Mars 2024",
        //     en: "March 1, 2024"
        //   },
        //   link: "/podcast"
        // },
        {
          "type": "podcast",
          "title": {
            "fr": "S'initier à la bourse grâce aux clubs d'investissement avec Edem AGBEHONOU",
            "en": "Introduction to the Stock Market through Investment Clubs with Edem AGBEHONOU"
          },
          "description": {
            "fr": "Dans cet épisode, Edem AGBEHONOU discute de la manière dont les clubs d'investissement peuvent aider les débutants à comprendre et à s'engager sur le marché boursier.",
            "en": "In this episode, Edem AGBEHONOU discusses how investment clubs can help beginners understand and engage in the stock market."
          },
          "image": "/resources/podcast.png",
          "duration": {
            "fr": "Durée non spécifiée",
            "en": "Duration not specified"
          },
          "date": {
            "fr": "Date non spécifiée",
            "en": "Date not specified"
          },
          "link": "https://open.spotify.com/episode/13pVwKCs99xWNSuLHfmwaS?si=B8mOaBaQQ66PlK95QMFo8A"
        }
        
      ],
      cta: {
        fr: "Voir Toutes les Ressources",
        en: "View All Resources"
      }
    },
    membership: {
      title: {
        fr: "Rejoignez Notre Communauté d'Investisseurs",
        en: "Join Our Investor Community"
      },
      description: {
        fr: "Faites partie d'un réseau dynamique d'investisseurs passionnés et accédez à des ressources exclusives pour développer vos compétences.",
        en: "Be part of a dynamic network of passionate investors and access exclusive resources to develop your skills."
      },
      benefits: [
        {
          title: {
            fr: "Apprentissage Continu",
            en: "Continuous Learning"
          },
          description: {
            fr: "Accédez à des formations, webinaires et ressources exclusives.",
            en: "Access exclusive training, webinars and resources."
          }
        },
        {
          title: {
            fr: "Réseau de Qualifié",
            en: "Qualified Network"
          },
          description: {
            fr: "Connectez-vous avec des investisseurs expérimentés et des experts du secteur.",
            en: "Connect with experienced investors and industry experts."
          }
        },
        {
          title: {
            fr: "Opportunités Uniques",
            en: "Unique Opportunities"
          },
          description: {
            fr: "Découvrez des opportunités d'investissement exclusives.",
            en: "Discover exclusive investment opportunities."
          }
        }
      ],
      membersLabel: {
        fr: "Ils font déjà partie de notre réseau :",
        en: "They are already part of our network:"
      },
      members: [
        {
          name: {
            fr: "Louisia MIKALA",
            en: "Louisia MIKALA"
          },
          role: {
            fr: "Conseil en gestion de patrimoine",
            en: "Wealth Management Consultant"
          },
          image: "/members/louisia.jpeg"
        },
        {
          name: {
            fr: "Ruben AFOUDAH",
            en: "Ruben AFOUDAH"
          },
          role: {
            fr: "Senior Collateral Analyst ",
            en: "Senior Collateral Analyst"
          },
          image: "/members/ruben.jpeg"
        },
        // Add more members...
      ],
      gallery: [
        {
          url: "/gallery/meeting.jpeg",
          alt: {
            fr: "Réunion de club d'investissement",
            en: "Investment club meeting"
          }
        },
        {
          url: "/gallery/workshop.jpeg",
          alt: {
            fr: "Atelier d'analyse",
            en: "Analysis workshop"
          }
        },
        {
          url: "/gallery/networking.jpeg",
          alt: {
            fr: "Événement networking",
            en: "Networking event"
          }
        }
      ],
      cta: {
        fr: "Devenir Membre",
        en: "Become a Member"
      }
    },
    partnerships: {
      title: {
        fr: "Nos Partenaires & Sponsors",
        en: "Our Partners & Sponsors"
      },
      description: {
        fr: "Collaborez avec nous pour soutenir l'éducation financière et le développement des clubs d'investissement en France.",
        en: "Partner with us to support financial education and the development of investment clubs in France."
      },
      partnersTitle: {
        fr: "Ils nous font confiance",
        en: "They trust us"
      },
      partners: [
        {
          name: {
            fr: "Bourse Direct",
            en: "Bourse Direct"
          },
          type: {
            fr: "Courtier Partenaire",
            en: "Broker Partner"
          },
          logo: "/partners/bourse-direct.jpg"
        },
        {
          name: {
            fr: "Omniventus",
            en: "Omniventus"
          },
          type: {
            fr: "Entreprise Mécène",
            en: "Patron"
          },
          logo: "/partners/omniventus.svg"
        },
        // Add more partners...
      ],
      sponsorshipTitle: {
        fr: "Opportunités de Partenariat",
        en: "Partnership Opportunities"
      },
      sponsorshipTiers: [
        {
          title: {
            fr: "Institutionnel",
            en: "Institutional "
          },
          description: {
            fr: "Devenez un acteur majeur du développement des clubs d'investissement.",
            en: "Become a major player in the development of investment clubs."
          },
          benefits: [
            {
              fr: "Visibilité premium sur tous nos supports",
              en: "Premium visibility on all our platforms"
            },
            {
              fr: "Accès privilégié à notre réseau",
              en: "Privileged access to our network"
            },
            {
              fr: "Co-création d'événements",
              en: "Event co-creation"
            }
          ]
        },
        {
          title: {
            fr: "Commercial",
            en: "Business"
          },
          description: {
            fr: "Établissez des relations privilégiées avec notre communauté.",
            en: "Establish privileged relationships with our community."
          },
          benefits: [
            {
              fr: "Présence sur nos événements",
              en: "Presence at our events"
            },
            {
              fr: "Communication dédiée",
              en: "Dedicated communication"
            },
            {
              fr: "Offres exclusives",
              en: "Exclusive offers"
            }
          ]
        },
        {
          title: {
            fr: "Média",
            en: "Media"
          },
          description: {
            fr: "Participez à la diffusion de l'éducation financière.",
            en: "Participate in spreading financial education."
          },
          benefits: [
            {
              fr: "Échange de contenus",
              en: "Content exchange"
            },
            {
              fr: "Interviews exclusives",
              en: "Exclusive interviews"
            },
            {
              fr: "Couverture événementielle",
              en: "Event coverage"
            }
          ]
        }
      ],
      ctaTitle: {
        fr: "Intéressé par un Partenariat ?",
        en: "Interested in a Partnership?"
      },
      ctaDescription: {
        fr: "Discutons de la manière dont nous pouvons collaborer pour soutenir l'investissement collectif.",
        en: "Let's discuss how we can collaborate to support collective investment."
      },
      cta: {
        fr: "Contactez-nous",
        en: "Contact Us"
      }
    },
    footer: {
      newsletter: {
        title: {
          fr: "Restez informé",
          en: "Stay informed"
        },
        description: {
          fr: "Recevez nos dernières actualités et opportunités d'investissement.",
          en: "Get our latest news and investment opportunities."
        },
        placeholder: {
          fr: "Votre email",
          en: "Your email"
        },
        button: {
          fr: "S'inscrire",
          en: "Subscribe"
        },
        success: {
          fr: "Merci pour votre inscription !",
          en: "Thanks for subscribing!"
        }
      },
      links: {
        company: {
          title: {
            fr: "À propos",
            en: "Company"
          },
          items: [
            { href: "/about", label: { fr: "Notre Histoire", en: "Our Story" } },
            { href: "/#clubs", label: { fr: "Clubs d'Investissement", en: "Investment Clubs" } },
            { href: "/#events", label: { fr: "Événements", en: "Events" } },
            { href: "/#partnerships", label: { fr: "Partenariats", en: "Partnerships" } }
          ]
        },
        resources: {
          title: {
            fr: "Ressources",
            en: "Resources"
          },
          items: [
            { href: "/#resources", label: { fr: "Centre de Ressources", en: "Resource Center" } },
            { href: "/?activeResource=article#resources", label: { fr: "Articles", en: "Articles" } },
            { href: "/?activeResource=video#resources", label: { fr: "Vidéos", en: "Videos" } },
            { href: "/?activeResource=podcast#resources", label: { fr: "Podcasts", en: "Podcasts" } }
          ]
        },
        membership: {
          title: {
            fr: "Adhésion",
            en: "Membership"
          },
          items: [
            { href: "/contact", label: { fr: "Devenir Membre", en: "Become a Member" } },
            //{ href: "/membership/benefits", label: { fr: "Avantages", en: "Benefits" } },
            { href: "/membership/faq", label: { fr: "FAQ", en: "FAQ" } },
            //{ href: "/contact", label: { fr: "Contact", en: "Contact" } }
          ]
        }
      },
      social: {
        title: {
          fr: "Suivez-nous",
          en: "Follow us"
        }
      },
      copyright: {
        fr: "© 2025 Réseau Evolve Capital. Tous droits réservés.",
        en: "© 2025 Réseau Evolve Capital. All rights reserved."
      }
    }
  }
};

export const siteConfig = {
  name: {
    fr: "Réseau Evolve Capital",
    en: "Evolve Capital Network"
  },
  openGraph: {
    image: '/brand/opengraph.png',
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
      href: "/blog",
      title: {
        fr: "Blog",
        en: "Blog"
      }
    },
    {
      href: "/contact",
      title: {
        fr: "Contact",
        en: "Contact"
      }
    },
    // {
    //   href: "/services",
    //   title: {
    //     fr: "Services",
    //     en: "Services"
    //   }
    // },
    // {
    //   href: "/events",
    //   title: {
    //     fr: "Événements",
    //     en: "Events"
    //   }
    // },
    // {
    //   href: "/contact",
    //   title: {
    //     fr: "Contact",
    //     en: "Contact"
    //   }
    // },
  ] as NavItem[],
  links: {
    linkedin: "https://www.linkedin.com/company/evolve-capital-club/",
    instagram: "https://www.instagram.com/evolvecapitalclub/profilecard/?igsh=MW15enR5b3ZzNzI2YQ%3D%3D",
    facebook: "https://www.facebook.com/share/18kPJAd9NM/?mibextid=wwXIfr",
    twitter: "https://x.com/evolvecapitalC",
    youtube: "https://youtube.com/@evolvecapitalclub?si=6iUPCYA79mr34E7-"
    
  },
  pageContent: pageContent,
  sectionTitles: {
    strategy: {
      title: {
        fr: "Stratégie d'investissement",
        en: "Investment Strategy"
      },
      investmentRequirements: {
        fr: "Conditions d'investissement",
        en: "Investment Requirements"
      },
      focusAreas: {
        fr: "Domaines d'investissement",
        en: "Investment Focus"
      },
      riskProfile: {
        fr: "Profil de risque",
        en: "Risk Profile"
      },
      decisionProcess: {
        fr: "Processus de décision",
        en: "Decision Process"
      },
      minimumInvestment: {
        fr: "Cotisation de départ",
        en: "Initial Contribution"
      },
      monthlyContribution: {
        fr: "Cotisation mensuelle",
        en: "Monthly Contribution"
      }
    },
    story: {
      title: {
        fr: "Notre Histoire",
        en: "Our Story"
      },
      origins: {
        fr: "Origines",
        en: "Origins"
      },
      milestones: {
        fr: "Etapes clés",
        en: "Milestones"
      },
      vision: {
        fr: "Vision",
        en: "Vision"
      }
    },
    gallery: {
      fr: "Galerie",
      en: "Gallery"
    },
    executiveBoard: {
      fr: "Bureau", 
      en: "Executive Board"
    },
    faq: {
      fr: "FAQ",
      en: "FAQ"
    },
    contact: {
      info: {
        fr: "Contact",
        en: "Contact"
      },
      join: {
        fr: "Rejoignez-nous",
        en: "Join Us"
      }
    }
    
  } as ClubSectionTitles

} as const;
