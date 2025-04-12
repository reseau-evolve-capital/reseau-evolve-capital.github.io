import { type LocalizedText } from './site-config';

export type AboutHero = {
    headline: LocalizedText;
    subheadline: LocalizedText;
    image: string;
    cta: {
        label: LocalizedText;
        href: string;
    };
};

export type TimelineEvent = {
    date: string;
    title: LocalizedText;
    description: LocalizedText;
    image?: string;
};

export type CoreValue = {
    title: LocalizedText;
    description: LocalizedText;
    icon: string;
};

export type TeamMember = {
    name: string;
    role: LocalizedText;
    bio: LocalizedText;
    image: string;
    social?: {
        linkedin?: string;
        twitter?: string;
        email?: string;
    };
};

export type Testimonial = {
    quote: LocalizedText;
    author: string;
    role: LocalizedText;
    image: string;
    clubName: LocalizedText;
};

export type AboutUsContent = {
    hero: AboutHero;
    story: {
        title: LocalizedText;
        subtitle: LocalizedText;
        genesis: {
            title: LocalizedText;
            content: LocalizedText;
            image: string;
        };
        timeline: TimelineEvent[];
        impact: {
            title: LocalizedText;
            description: LocalizedText;
            stats: {
                value: string;
                label: LocalizedText;
            }[];
        };
    };
    mission: {
        title: LocalizedText;
        statement: LocalizedText;
        values: CoreValue[];
    };
    structure: {
        title: LocalizedText;
        overview: {
            title: LocalizedText;
            content: LocalizedText;
            image: string;
        };
        governance: {
            title: LocalizedText;
            content: LocalizedText;
            diagram: string;
        };
        units: {
            title: LocalizedText;
            list: {
                name: LocalizedText;
                description: LocalizedText;
                icon: string;
            }[];
        };
    };
    approach: {
        title: LocalizedText;
        description: LocalizedText;
        education: {
            title: LocalizedText;
            content: LocalizedText;
            features: {
                title: LocalizedText;
                description: LocalizedText;
                icon: string;
            }[];
        };
        community: {
            title: LocalizedText;
            content: LocalizedText;
            image: string;
        };
        investment: {
            title: LocalizedText;
            content: LocalizedText;
            principles: {
                title: LocalizedText;
                description: LocalizedText;
                icon: string;
            }[];
        };
    };
    team: {
        title: LocalizedText;
        subtitle: LocalizedText;
        members: TeamMember[];
        spotlights: {
            title: LocalizedText;
            stories: {
                title: LocalizedText;
                content: LocalizedText;
                image: string;
                member: string;
            }[];
        };
    };
    join: {
        title: LocalizedText;
        content: LocalizedText;
        benefits: {
            title: LocalizedText;
            list: {
                title: LocalizedText;
                description: LocalizedText;
                icon: string;
            }[];
        };
        testimonials: Testimonial[];
        cta: {
            label: LocalizedText;
            href: string;
        };
    };
    contact: {
        title: LocalizedText;
        content: LocalizedText;
        email: string;
        phone: string;
        address: LocalizedText;
        social: {
            linkedin: string;
            twitter: string;
            facebook: string;
            instagram: string;
        };
    };
};


export const aboutUsContent: AboutUsContent = {
    hero: {
        headline: { fr: "Réseau Evolve Capital: Investir Ensemble, Grandir Ensemble", en: "Réseau Evolve Capital: Investing Together, Growing Together" },
        subheadline: { fr: "Le réseau pionnier de clubs d'investissement en France, cultivant l'éducation financière et l'investissement collaboratif.", en: "The pioneering network of investment clubs in France, cultivating financial literacy and collaborative investment." },
        image: "/brand/rec.jpeg", // Replace with actual image path
        cta: {
            label: { fr: "Rejoignez-nous", en: "Join Us" },
            href: "/contact"
        }
    },
    story: {
        title: { fr: "Notre Histoire: Une Vision Partagée", en: "Our Story: A Shared Vision" },
        subtitle: { fr: "De l'idée à l'impact, le récit de notre croissance et de notre engagement.", en: "From idea to impact, the story of our growth and commitment." },
        genesis: {
            title: {
              fr: "La Genèse (2018): L'Étincelle",
              en: "The Genesis (2018): The Spark"
            },
            content: {
              fr: "En 2018, tout commence avec une conviction partagée entre quelques amis passionnés de finance : l'investissement en Bourse ne devrait pas être réservé à une élite.\n\nÀ l'époque, chacun d'eux avait tenté l'aventure seul, confronté aux mêmes écueils : manque de méthode, isolement face aux décisions, difficulté à garder le cap sur le long terme.\n\nL'idée germe alors autour d'un principe simple mais puissant : et si on investissait ensemble ? Pas dans l'informel ou au hasard, mais avec une approche structurée, pédagogique, exigeante… et surtout collaborative.\n\nCe groupe fondateur crée le tout premier club d'investissement du réseau. Il expérimente, documente, ajuste. Rapidement, une méthodologie prend forme, centrée sur l'intelligence collective, la transparence et la montée en compétence de chaque membre.\n\nCe qui n'était qu'un essai devient un mouvement. D'autres clubs voient le jour. Une charte commune s'impose. Le Réseau Evolve Capital est officiellement lancé.\n\nDepuis, la mission est restée la même : démocratiser l'investissement boursier par l'action collective, la pédagogie concrète et l'envie de progresser ensemble.",
              en: "In 2018, it all began with a shared conviction among a few finance enthusiasts: investing in the stock market shouldn't be reserved for a select few.\n\nAt the time, each of them had tried investing solo, facing the same challenges—lack of structure, isolation in decision-making, and difficulty staying the course.\n\nThat's when a powerful idea emerged: what if we invested together? Not informally or at random, but with a structured, educational, demanding—and above all—collaborative approach.\n\nThis founding group created the very first investment club in the network. They experimented, documented, and refined their process. Soon, a methodology emerged, focused on collective intelligence, transparency, and individual skill development.\n\nWhat began as a trial became a movement. More clubs followed. A shared charter took shape. Réseau Evolve Capital was officially born.\n\nSince then, the mission has remained the same: to democratize stock investing through collective action, practical education, and a shared drive to grow together."
            },
            image: "/about/genesis.png"
          },
        timeline: [
            {
              "date": "2018",
              "title": { 
                "fr": "Naissance du projet", 
                "en": "Birth of the Project" 
              },
              "description": { 
                "fr": "Un petit groupe d'investisseurs passionnés lance le premier club, posant les bases de ce qui deviendra le Réseau Evolve Capital.", 
                "en": "A small group of passionate investors launches the first club, laying the groundwork for what would become Réseau Evolve Capital." 
              },
              "image": "/about/timeline-1.png"
            },
            {
              "date": "2020",
              "title": { 
                "fr": "Structuration du réseau", 
                "en": "Network Structuring" 
              },
              "description": { 
                "fr": "Les premiers clubs rejoignent l'initiative avec une charte commune et des outils partagés.", 
                "en": "The first clubs join the initiative with a shared charter and collaborative tools." 
              },
              "image": "/images/timeline-2020.jpg"
            },
            {
              "date": "2021",
              "title": { 
                "fr": "Modèle multi-club", 
                "en": "Multi-Club Model" 
              },
              "description": { 
                "fr": "Création du deuxième club d'investissement, marquant la réplication du modèle collaboratif.", 
                "en": "Creation of the second investment club, marking the replication of the collaborative model." 
              },
              "image": "/images/timeline-2021.jpg"
            },
            {
              "date": "2023",
              "title": { 
                "fr": "Croissance du réseau", 
                "en": "Network Growth" 
              },
              "description": { 
                "fr": "Le REC atteint une nouvelle échelle avec plusieurs clubs actifs, un cadre renforcé et des outils communs de pilotage.", 
                "en": "REC reaches a new scale with multiple active clubs, a reinforced framework, and shared governance tools." 
              },
              "image": "/images/timeline-2023.jpg"
            },
            {
              "date": "2024",
              "title": { 
                "fr": "Diversification & impact local", 
                "en": "Diversification & Local Impact" 
              },
              "description": { 
                "fr": "Lancement du troisième club, premier en dehors de Paris, élargissant la portée du réseau à de nouveaux profils d'investisseurs.", 
                "en": "Launch of the third club, the first outside Paris, expanding the network's reach to new investor profiles." 
              },
              "image": "/images/timeline-2024.jpg"
            },
            {
              "date": "2025",
              "title": {
                "fr": "Cap stratégique & diversification",
                "en": "Strategic Milestone & Diversification"
              },
              "description": {
                "fr": "Le Réseau Evolve Capital dépasse les 650 000 euros gérés collectivement au sein des clubs. Fort de cette dynamique, le réseau amorce une diversification vers d'autres formes d'investissement comme l'immobilier.",
                "en": "Réseau Evolve Capital surpasses €650,000 in assets collectively managed across its clubs. Building on this momentum, the network begins diversifying into new types of investments, including real estate."
              },
              "image": "/images/timeline-2025.jpg"
            }
        ],
        impact: {
            title: { fr: "Notre Impact: Une Croissance Collective", en: "Our Impact: Collective Growth" },
            description: { fr: "Réseau Evolve Capital a permis à ses membres de [Quantify impact, e.g., développer leurs connaissances financières, investir collectivement, etc.]", en: "Réseau Evolve Capital has enabled its members to [Quantify impact, e.g., develop their financial knowledge, invest collectively, etc.]" },
            stats: [
                { value: "100%", label: { fr: "Croissance pendant COVID", en: "Growth during COVID" } },
                { value: "[Number]", label: { fr: "Nombre de clubs", en: "Number of clubs" } },
                { value: "[Value]", label: { fr: "Valeur du portefeuille combiné", en: "Combined portfolio value" } }
            ]
        }
    },
    mission: {
        title: {
          "fr": "Notre Mission : L'Éducation Financière pour Tous",
          "en": "Our Mission: Financial Education for All"
        },
        statement: {
          "fr": "La mission du Réseau Evolve Capital est de démocratiser l'investissement boursier auprès des jeunes, en rendant l'apprentissage de la finance accessible, concret et collectif. À travers un réseau de clubs d'investissement dynamiques, nous accompagnons nos membres avec des ressources pédagogiques solides, des outils collaboratifs et un cadre exigeant. Notre ambition est de former des investisseurs responsables, confiants et autonomes, capables de prendre en main leur avenir financier avec lucidité et rigueur.",
          "en": "Réseau Evolve Capital's mission is to democratize stock market investing for young people, making financial learning accessible, practical, and community-driven. Through a vibrant network of investment clubs, we offer strong educational resources, collaborative tools, and a structured support system. Our goal is to empower responsible, confident, and financially autonomous investors—ready to shape their future with clarity and discipline."
        },
        "values": [
          {
            "title": { "fr": "Collaboration", "en": "Collaboration" },
            "description": { "fr": "Nous croyons au pouvoir du collectif.", "en": "We believe in the power of the collective." },
            "icon": "https://img.icons8.com/ios-filled/100/000000/collaboration.png"
          },
          {
            "title": { "fr": "Transparence", "en": "Transparency" },
            "description": { "fr": "Nous agissons avec intégrité et ouverture.", "en": "We act with integrity and openness." },
            "icon": "https://img.icons8.com/ios-filled/100/000000/iris-scan.png"
          },
          {
            "title": { "fr": "Éducation", "en": "Education" },
            "description": { "fr": "Nous investissons dans le savoir de nos membres.", "en": "We invest in the knowledge of our members." },
            "icon": "https://img.icons8.com/ios-filled/100/000000/graduation-cap.png"
          },
          {
            "title": { "fr": "Ambition", "en": "Ambition" },
            "description": { "fr": "Nous visons l'excellence et la croissance.", "en": "We aim for excellence and growth." },
            "icon": "https://img.icons8.com/ios-filled/100/000000/mountain.png"
          }
        ]
    },
    structure: {
        title: {
          "fr": "Notre Structure : La Force d'un Réseau Organisé",
          "en": "Our Structure: The Strength of an Organized Network"
        },
        overview: {
            title: {
                "fr": "Aperçu du Réseau",
                "en": "Network Overview"
            },
            content: {
                "fr": "Le Réseau Evolve Capital est une structure organisée au service de ses clubs et de leurs membres. Chaque club, autogéré et ancré localement, bénéficie du soutien, des outils et des ressources du réseau. Un Conseil d'Administration, composé des présidents de clubs, impulse une gouvernance démocratique et représentative. Le Bureau Exécutif exécute la stratégie du réseau, appuyé par des unités spécialisées (Comité d'Investissement, Gestion des Risques, Cellule Darwin). Cette organisation concilie l'agilité des clubs avec une coordination nationale, pour renforcer l'éducation financière et l'investissement responsable.",
                "en": "Réseau Evolve Capital has an organized structure to support its clubs and members. Each club, self-managed and locally anchored, benefits from the network's support, tools, and resources. A Board of Directors, composed of club presidents, ensures democratic and representative governance. The Executive Office implements network strategy, supported by specialized units (Investment Committee, Risk Management, Darwin Unit). This structure balances club agility with national coordination to strengthen financial education and responsible investing."
            },
            image: "/about/network.png"
        },
        governance: {
            title: {
                "fr": "Gouvernance",
                "en": "Governance"
            },
            content: {
                "fr": "La gouvernance du Réseau Evolve Capital repose sur deux organes complémentaires : le Conseil d'Administration et le Bureau Exécutif. Le Conseil, constitué des présidents actifs des clubs membres, définit les grandes orientations et veille à la cohérence stratégique du réseau. Il incarne une gouvernance démocratique, ancrée dans la réalité de terrain des clubs. Le Bureau Exécutif, élu par le Conseil, coordonne l'activité du réseau, anime les échanges entre clubs, et met en œuvre les projets structurants. Il pilote la stratégie de développement du réseau sans interférer dans les décisions d'investissement propres à chaque club. Cette organisation bicéphale permet d'allier vision stratégique partagée et efficacité collective.",
                "en": "The governance of Réseau Evolve Capital is built on two complementary bodies: the Board of Directors and the Executive Office. The Board, composed of active presidents from member clubs, defines strategic priorities and ensures overall coherence within the network. It embodies a democratic governance model rooted in club-level realities. The Executive Office, elected by the Board, coordinates network-wide initiatives, facilitates inter-club collaboration, and implements key projects. It drives the network's development strategy without interfering in each club's specific investment decisions. This two-pillar governance model combines shared strategic vision with effective collective action."
            },
            diagram: "/about/governance.png"
        },
        "units": {
            "title": {
                "fr": "Unités Clés",
                "en": "Key Units"
            },
            "list": [
                {
                    "name": {
                        "fr": "Comité d'Investissement",
                        "en": "Investment Committee"
                    },
                    "description": {
                        "fr": "Le comité d'investissement de chaque club analyse le marché boursier et propose des options d'investissement éclairées à ses membres.",
                        "en": "Each club's investment committee analyzes the stock market and proposes informed investment options to its members."
                    },
                    "icon": "https://cdn-icons-png.flaticon.com/512/2002/2002113.png"
                },
                {
                    "name": {
                        "fr": "Cellule de Gestion des Risques",
                        "en": "Risk Management Unit"
                    },
                    "description": {
                        "fr": "La cellule de gestion des risques est une entité transversale qui supervise le fonctionnement de tous les clubs et s'assure de leur conformité et de leur bonne gestion.",
                        "en": "The risk management unit is a cross-functional entity that oversees the operation of all clubs and ensures their compliance and sound management."
                    },
                    "icon": "https://cdn-icons-png.flaticon.com/512/88/88851.png"
                },
                {
                    "name": {
                        "fr": "Cellule Darwin",
                        "en": "Darwin Unit"
                    },
                    "description": {
                        "fr": "La cellule Darwin est le moteur de l'innovation au sein du réseau. Elle crée des outils pour automatiser et faciliter la gestion des clubs, contribuant à l'efficacité globale.",
                        "en": "The Darwin unit is the engine of innovation within the network. It develops tools to automate and facilitate club management, contributing to overall efficiency."
                    },
                    "icon": "https://cdn-icons-png.flaticon.com/512/1199/1199154.png"
                }
            ]
        }
    },
    approach: {
        title: { fr: "Notre Approche: Éducation, Communauté et Performance", en: "Our Approach: Education, Community and Performance" },
        description: {
            fr: "Notre approche se fonde sur trois piliers essentiels : l'éducation financière, le développement d'une communauté soudée et la recherche de performances solides.  Nous mettons un accent particulier sur l'éducation financière de nos membres, car nous sommes convaincus que des investisseurs informés sont la clé du succès.  Nous proposons une variété de ressources, allant des formations et ateliers interactifs aux notes d'information quotidiennes et podcasts.  \n\nAu-delà de l'éducation, nous cultivons un fort esprit de communauté.  Le Réseau Evolve Capital est unique en France, offrant un cadre privilégié pour le partage d'expériences et de connaissances entre passionnés d'investissement.  Cette collaboration est au cœur de notre modèle et permet à nos membres de bénéficier de l'intelligence collective du réseau.\n\n",
            en: "Our approach is based on three essential pillars: financial education, the development of a strong community, and the pursuit of solid performance. We place a particular emphasis on the financial education of our members, as we are convinced that informed investors are the key to success. We offer a variety of resources, ranging from interactive training and workshops to daily information notes and podcasts. \n\nBeyond education, we cultivate a strong community spirit. Réseau Evolve Capital is unique in France, offering a privileged setting for sharing experiences and knowledge among investment enthusiasts. This collaboration is at the heart of our model and allows our members to benefit from the collective intelligence of the network.\n\n"
        },
        education: {
            title: { fr: "Éducation Financière", en: "Financial Education" },
            content: {
                "fr": "Le Réseau Evolve Capital offre une éducation financière complète, des ressources variées et un accompagnement personnalisé.  Notre réseau unique en France favorise le partage d'expériences et l'intelligence collective pour des investissements performants.",
                "en": "Réseau Evolve Capital provides comprehensive financial education, diverse resources, and personalized support. Our unique network in France fosters experience sharing and collective intelligence for successful investments."
            },
            features: [
                {
                    title: { fr: "Formations et Ateliers", en: "Training and Workshops" },
                    description: { fr: "Des sessions interactives pour approfondir vos connaissances.", en: "Interactive sessions to deepen your knowledge." },
                    icon: "https://cdn-icons-png.flaticon.com/512/3139/3139194.png" // Replace with actual icon path
                },
                {
                    title: { fr: "Ressources en ligne", en: "Online Resources" },
                    description: { fr: "Accédez à des articles, guides et outils pour investir efficacement.", en: "Access articles, guides and tools to invest effectively." },
                    icon: "https://cdn-icons-png.flaticon.com/512/2725/2725192.png"
                },
                {
                    title: { fr: "Mentorat", en: "Mentorship" },
                    description: { fr: "Bénéficiez de l'expertise de membres expérimentés.", en: "Benefit from the expertise of experienced members." },
                    icon: "https://cdn-icons-png.flaticon.com/512/94/94698.png"
                },
                {
                    title: { fr: "Notes d'information et Podcasts", en: "Information Notes and Podcasts" },
                    description: { fr: "Ressources éducatives quotidiennes sur divers sujets financiers.", en: "Daily educational resources on various financial topics." },
                    icon: "https://cdn-icons-png.flaticon.com/512/3670/3670517.png"
                }
            ]
        },
        community: {
            title: { fr: "Esprit de Communauté", en: "Community Spirit" },
            content: { fr: "Rejoignez une communauté de passionnés d'investissement et partagez vos expériences.", en: "Join a community of investment enthusiasts and share your experiences." },
            image: "/images/community-image.jpg" // Replace with actual image path
        },
        "investment": {
            "title": {
                "fr": "Notre Philosophie d'Investissement",
                "en": "Our Investment Philosophy"
            },
            "content": {
                "fr": "Notre philosophie d'investissement repose sur une vision à long terme. Nous privilégions une approche fondamentale, analysant en profondeur les entreprises avant toute prise de position.  L'investissement progressif, via la méthode du dollar cost averaging, est au cœur de notre stratégie, nos cotisations mensuelles facilitant cette approche. Nous croyons en la construction patiente de nos positions pour une croissance durable.",
                "en": "Our investment philosophy is based on a long-term vision. We favor a fundamental approach, thoroughly analyzing companies before any position is taken. Progressive investment, through the dollar cost averaging method, is at the heart of our strategy, with our monthly contributions facilitating this approach. We believe in patiently building our positions for sustainable growth."
            },
            "principles": [
                {
                    "title": {
                        "fr": "Vision à long terme",
                        "en": "Long-term Vision"
                    },
                    "description": {
                        "fr": "Nous investissons pour l'avenir, avec un horizon à 10 ans.",
                        "en": "We invest for the future, with a horizon of 10 years."
                    },
                    "icon": "https://cdn-icons-png.flaticon.com/512/309/309228.png" // Example: Clock icon
                },
                {
                    "title": {
                        "fr": "Analyse fondamentale",
                        "en": "Fundamental Analysis"
                    },
                    "description": {
                        "fr": "Nous étudions en profondeur les entreprises avant d'investir.",
                        "en": "We thoroughly study companies before investing."
                    },
                    "icon": "https://cdn-icons-png.flaticon.com/512/48/48697.png" // Example: Magnifying glass icon
                },
                {
                    "title": {
                        "fr": "Dollar Cost Averaging",
                        "en": "Dollar Cost Averaging"
                    },
                    "description": {
                        "fr": "Nous investissons progressivement et régulièrement pour lisser le risque.",
                        "en": "We invest progressively and regularly to smooth out the risk."
                    },
                    "icon": "https://cdn-icons-png.flaticon.com/512/93/93198.png" // Example: Chart with upward trend icon
                }
            ]
        }
    },
    team: {
        title: { fr: "Dirigeants : le bureau exécutif", en: "Leaders: The Executive Team" },
        subtitle: { fr: "Rencontrez les membres passionnés qui font vivre le réseau.", en: "Meet the passionate members who bring the network to life." },
        members: [
            {
                name: "Lionel ZOCLANCLOUNON",
                role: { fr: "Président", en: "President" },
                bio: { fr: "Co-fondateur du Réseau Evolve Capital, Lionel est un entrepreneur web (Lazone / Omniventus) et investisseur engagé. Il milite pour une finance pédagogique, collective et accessible à tous.", en: "Co-founder of Réseau Evolve Capital, Lionel is a web entrepreneur (Lazone / Omniventus) and committed investor. He advocates for a collaborative, accessible, and educational approach to finance." },
                image: "/members/amir.png",
                social: { linkedin: "https://www.linkedin.com/in/lionel-zoclanclounon-061140a3/" }
            },
            {
                name: "Edem AGBEHONOU",
                role: { fr: "Vice-Président", en: "Vice-President" },
                bio: { fr: "Ingénieur, entrepreneur et co-fondateur du réseau, Edem s'investit activement dans la structuration stratégique du REC. Son parcours dans l'associatif et la tech en fait un pilier de la dynamique collective.", en: "Engineer, entrepreneur, and co-founder of the network, Edem plays an active role in shaping REC's strategic direction. His background in tech and community organizing makes him a key pillar of the collective dynamic." },
                image: "/members/edem.jpeg",
                social: { linkedin: "https://www.linkedin.com/in/eagbehonou/" }
            },
            {
                name: "Ruben AFOUDAH",
                role: { fr: "Trésorier", en: "Treasurer" },
                bio: { fr: "Co-fondateur du réseau et analyste senior en gestion de collatéraux, Ruben a conçu la première matrice financière partagée entre les clubs. Il veille à la rigueur et à la transparence des outils du REC.", en: "Co-founder of the network and senior collateral analyst, Ruben designed the first shared financial matrix used across clubs. He ensures the network's tools are rigorous and transparent." },
                image: "/members/ruben.jpeg",
                social: { linkedin: "https://www.linkedin.com/in/ruben-afoudah-2b4362177/" }
            }
        ],
        spotlights: {
            title: { fr: "Histoires de Membres", en: "Member Stories" },
            stories: []
        }
    },
    join: {
        title: { fr: "Rejoignez-nous: Ensemble, Investissons dans l'Avenir", en: "Join Us: Together, Let's Invest in the Future" },
        content: { fr: "Devenez membre et faites partie d'une communauté dynamique d'investisseurs.", en: "Become a member and be part of a dynamic community of investors." },
        benefits: {
            title: { fr: "Avantages Membres", en: "Member Benefits" },
            list: [
                {
                    title: { fr: "Éducation financière", en: "Financial education" },
                    description: { fr: "Accès à des ressources et formations exclusives.", en: "Access to exclusive resources and training." },
                    icon: "/icons/education.png" // Replace with actual icon path
                },
                {
                    title: { fr: "Opportunités d'investissement", en: "Investment opportunities" },
                    description: { fr: "Investissez collectivement et accédez à des projets uniques.", en: "Invest collectively and access unique projects." },
                    icon: "/icons/opportunity.png"
                },
                {
                    title: { fr: "Réseautage", en: "Networking" },
                    description: { fr: "Connectez-vous avec d'autres investisseurs et élargissez votre réseau.", en: "Connect with other investors and expand your network." },
                    icon: "/icons/networking.png"
                },
                {
                    "title": {
                      "fr": "Partage d'expérience",
                      "en": "Experience sharing"
                    },
                    "description": {
                      "fr": "Apprenez des autres membres et partagez vos connaissances.",
                      "en": "Learn from other members and share your knowledge."
                    },
                    "icon": "/icons/sharing.png" // Example: People talking or exchanging ideas
                  },
                // ... more benefits
            ]
        },
        testimonials: [
            // {
            //     quote: {
            //         fr: "Rejoindre REC a transformé ma vision de l'investissement. L'approche collaborative et l'expertise partagée m'ont permis de développer mes compétences bien plus rapidement que si j'avais investi seul.",
            //         en: "Joining REC transformed my investment perspective. The collaborative approach and shared expertise helped me develop my skills much faster than if I had invested alone."
            //     },
            //     author: "Thomas Laurent",
            //     role: {
            //         fr: "Membre depuis 2020",
            //         en: "Member since 2020"
            //     },
            //     image: "/images/testimonials/thomas.jpg",
            //     clubName: {
            //         fr: "Club Darwin",
            //         en: "Darwin Club"
            //     }
            // },
            // {
            //     quote: {
            //         fr: "Ce qui m'a le plus marqué, c'est la qualité des formations et le soutien constant de la communauté. Chaque décision d'investissement est une opportunité d'apprentissage collectif.",
            //         en: "What impressed me most was the quality of training and constant community support. Every investment decision is an opportunity for collective learning."
            //     },
            //     author: "Sophie Dubois",
            //     role: {
            //         fr: "Membre depuis 2021",
            //         en: "Member since 2021"
            //     },
            //     image: "/images/testimonials/sophie.jpg",
            //     clubName: {
            //         fr: "Club Newton",
            //         en: "Newton Club"
            //     }
            // },
            // {
            //     quote: {
            //         fr: "La force de REC réside dans sa méthodologie structurée et son approche pédagogique. En tant que débutant en 2022, j'ai particulièrement apprécié le mentorat et l'accompagnement personnalisé.",
            //         en: "REC's strength lies in its structured methodology and educational approach. As a beginner in 2022, I particularly appreciated the mentoring and personalized support."
            //     },
            //     author: "Marc Lefebvre",
            //     role: {
            //         fr: "Membre depuis 2022",
            //         en: "Member since 2022"
            //     },
            //     image: "/images/testimonials/marc.jpg",
            //     clubName: {
            //         fr: "Club Einstein",
            //         en: "Einstein Club"
            //     }
            // },
            // {
            //     quote: {
            //         fr: "L'aspect collaboratif de REC est unique. Pouvoir échanger avec d'autres investisseurs passionnés et apprendre de leurs expériences est inestimable. C'est bien plus qu'un simple club d'investissement.",
            //         en: "REC's collaborative aspect is unique. Being able to interact with other passionate investors and learn from their experiences is invaluable. It's much more than just an investment club."
            //     },
            //     author: "Julie Moreau",
            //     role: {
            //         fr: "Membre depuis 2021",
            //         en: "Member since 2021"
            //     },
            //     image: "/images/testimonials/julie.jpg",
            //     clubName: {
            //         fr: "Club Darwin",
            //         en: "Darwin Club"
            //     }
            // }
        ],
        cta: {
            label: { fr: "Devenir Membre", en: "Become a Member" },
            href: "/contact"
        }
    },
    contact: {
        title: { fr: "Contactez-nous", en: "Contact Us" },
        content: { fr: "Pour toute question, n'hésitez pas à nous contacter.", en: "For any questions, please do not hesitate to contact us." },
        email: "contact@reseauevolvecapital.com", // Replace with actual email
        phone: "+33 7 52 23 48 82", // Replace with actual phone number
        address: { fr: "32 bis rue du cotentin, 75015 Paris", en: "32 bis rue du cotentin, 75015 Paris" },
        social: {
            linkedin: "https://www.linkedin.com/company/evolve-capital-club/?viewAsMember=true",
            twitter: "https://x.com/evolvecapitalC",
            facebook: "https://www.facebook.com/evolvecapitalclub",
            instagram: "https://www.instagram.com/evolvecapitalclub/"
        }
    }
};