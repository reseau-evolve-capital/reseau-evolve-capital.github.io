

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
      clubs: {
        name: LocalizedText;
        description: LocalizedText;
        location: LocalizedText;
        members: number;
        image: string;
        coordinates: {
          lat: number;
          lng: number;
        };
      }[];
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
        fr: "Réseau Evolve Capital est né de la volonté de démocratiser l'investissement boursier auprès des jeunes en France. Notre mission est de promouvoir l'éducation financière et les clubs d'investissement.",
        en: "Réseau Evolve Capital was born from the desire to democratize stock market investment among young people in France. Our mission is to promote financial education and investment clubs."
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
          value: "5+",
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
          value: "5",
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
            fr: "Thomas Laurent",
            en: "Thomas Laurent"
          },
          role: {
            fr: "Membre depuis 2021",
            en: "Member since 2021"
          },
          image: "/testimonials/thomas.png"
        },
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
      clubs: [
        {
          name: {
            fr: "Evolve Capital Club",
            en: "Evolve Capital Club"
          },
          description: {
            fr: "Focus sur les entreprises technologiques et l'innovation.",
            en: "Focus on technology companies and innovation."
          },
          location: {
            fr: "Paris",
            en: "Paris"
          },
          members: 20,
          image: "/clubs/evolve_capital.jpg",
          coordinates: {
            lat: 48.8847,
            lng: 2.3838
          }
        },
        {
          name: {
            fr: "Paris Evolve Capital",
            en: "Paris Evolve Capital"
          },
          description: {
            fr: "Portefeuille diversifié avec un focus sur la technologie et le renouvelable.",
            en: "Diversified portfolio with a focus on technology and renewable energy."
          },
          location: {
            fr: "Poissy",
            en: "Poissy"
          },
          members: 19,
          image: "/clubs/paris_evolve_capital.jpg",
          coordinates: {
            lat: 48.9472,
            lng: 2.0333
          }
        },
        {
          name: {
            fr: "Vision Evolve Capital",
            en: "Vision Evolve Capital"
          },
          description: {
            fr: "Investissement équilibré dans les entreprises leader de marché.",
            en: "Balanced investment in leading market companies."
          },
          location: {
            fr: "Garenne-Colombes",
            en: "Garenne-Colombes"
          },
          members: 20,
          image: "/clubs/vision_evolve_capital.jpg",
          coordinates: {
            lat: 48.9044,
            lng: 2.2486
          }
        },
        // {
        //   name: {
        //     fr: "Club Lyon Finance",
        //     en: "Lyon Finance Club"
        //   },
        //   description: {
        //     fr: "Focus sur les marchés internationaux.",
        //     en: "Focus on international markets."
        //   },
        //   location: {
        //     fr: "Lyon",
        //     en: "Lyon"
        //   },
        //   members: 14,
        //   image: "/clubs/lyon.jpg",
        //   coordinates: {
        //     lat: 45.7640,
        //     lng: 4.8357
        //   }
        // }
      ],
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
        {
          type: 'podcast',
          title: {
            fr: "Investir dans la Tech en 2024",
            en: "Investing in Tech in 2024"
          },
          description: {
            fr: "Discussion sur les opportunités et les risques du secteur technologique.",
            en: "Discussion about opportunities and risks in the tech sector."
          },
          image: "/resources/podcast.png",
          duration: {
            fr: "45 min",
            en: "45 min"
          },
          date: {
            fr: "1 Mars 2024",
            en: "March 1, 2024"
          },
          link: "/podcast"
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
            fr: "Réseau Qualifié",
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
            fr: "Partenaire Institutionnel",
            en: "Institutional Partner"
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
            fr: "Partenaire Commercial",
            en: "Business Partner"
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
            fr: "Partenaire Média",
            en: "Media Partner"
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
            { href: "/clubs", label: { fr: "Clubs d'Investissement", en: "Investment Clubs" } },
            { href: "/events", label: { fr: "Événements", en: "Events" } },
            { href: "/partnerships", label: { fr: "Partenariats", en: "Partnerships" } }
          ]
        },
        resources: {
          title: {
            fr: "Ressources",
            en: "Resources"
          },
          items: [
            { href: "/resources", label: { fr: "Centre de Ressources", en: "Resource Center" } },
            { href: "/resources/articles", label: { fr: "Articles", en: "Articles" } },
            { href: "/resources/videos", label: { fr: "Vidéos", en: "Videos" } },
            { href: "/resources/podcasts", label: { fr: "Podcasts", en: "Podcasts" } }
          ]
        },
        membership: {
          title: {
            fr: "Adhésion",
            en: "Membership"
          },
          items: [
            { href: "/membership", label: { fr: "Devenir Membre", en: "Become a Member" } },
            { href: "/membership/benefits", label: { fr: "Avantages", en: "Benefits" } },
            { href: "/membership/faq", label: { fr: "FAQ", en: "FAQ" } },
            { href: "/contact", label: { fr: "Contact", en: "Contact" } }
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
        fr: "© 2024 Réseau Evolve Capital. Tous droits réservés.",
        en: "© 2024 Réseau Evolve Capital. All rights reserved."
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
    linkedin: "https://www.linkedin.com/company/evolve-capital-club/",
    instagram: "https://www.instagram.com/evolvecapitalclub/profilecard/?igsh=MW15enR5b3ZzNzI2YQ%3D%3D",
    facebook: "https://www.facebook.com/share/18kPJAd9NM/?mibextid=wwXIfr",
    twitter: "https://x.com/evolvecapitalC",
    youtube: "https://youtube.com/@evolvecapitalclub?si=6iUPCYA79mr34E7-"
    
  },
  pageContent: pageContent

} as const;
