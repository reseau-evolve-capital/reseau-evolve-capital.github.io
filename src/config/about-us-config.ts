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
            href: "/join"
        }
    },
    story: {
        title: { fr: "Notre Histoire: Une Vision Partagée", en: "Our Story: A Shared Vision" },
        subtitle: { fr: "De l'idée à l'impact, le récit de notre croissance et de notre engagement.", en: "From idea to impact, the story of our growth and commitment." },
        genesis: {
            title: { fr: "La Genèse (2018): L'Étincelle", en: "The Genesis (2018): The Spark" },
            content: { fr: "En 2018, Réseau Evolve Capital est né d'une vision simple : rendre l'investissement accessible et collaboratif.  [Add detailed story of the founders and their motivation]", en: "In 2018, Réseau Evolve Capital was born from a simple vision: to make investment accessible and collaborative. [Add detailed story of the founders and their motivation]" },
            image: "/images/genesis-image.jpg" // Replace with actual image path
        },
        timeline: [
            {
                date: "2018",
                title: { fr: "Création du REC", en: "Creation of REC" },
                description: { fr: "Fondation du Réseau Evolve Capital.", en: "Foundation of Réseau Evolve Capital." },
                image: "/images/timeline-2018.jpg" // Replace with image path if available
            },
            {
                date: "2020",
                title: { fr: "Début de la croissance", en: "Growth Start" },
                description: { fr: "Les premiers clubs rejoignent le réseau.", en: "The first clubs join the network." },
                image: "/images/timeline-2020.jpg"
            },
            {
                date: "2021",
                title: { fr: "2ème club", en: "2nd Club" },
                description: { fr: "Création du deuxième club.", en: "Creation of the second club." },
                image: "/images/timeline-2021.jpg"
            },
            {
                date: "2023",
                title: { fr: "Croissance fulgurante", en: "Rapid Growth" },
                description: { fr: "Le réseau connaît une expansion rapide.", en: "The network experiences rapid expansion." },
                image: "/images/timeline-2023.jpg"
            },
            {
                date: "2024",
                title: { fr: "3ème club", en: "3rd Club" },
                description: { fr: "Création du troisième club.", en: "Creation of the third club." },
                image: "/images/timeline-2024.jpg"
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
        title: { fr: "Notre Mission: L'Éducation Financière pour Tous", en: "Our Mission: Financial Education for All" },
        statement: {
            fr: "La mission du Réseau Evolve Capital est de démocratiser l'investissement boursier auprès des jeunes en France, en offrant un accès simplifié et un accompagnement de qualité à travers un réseau de clubs d'investissement dynamiques. Nous nous engageons à pérenniser et à développer ces clubs, en fournissant des ressources éducatives complètes et en favorisant un environnement collaboratif où le partage d'expériences est au cœur de notre démarche. Notre objectif est de former des investisseurs responsables et éclairés, capables de prendre en main leur avenir financier.",
            en: "The mission of Réseau Evolve Capital is to democratize stock market investment among young people in France by providing simplified access and quality support through a network of dynamic investment clubs. We are committed to perpetuating and developing these clubs by providing comprehensive educational resources and fostering a collaborative environment where the sharing of experiences is central to our approach. Our goal is to train responsible and informed investors, capable of taking control of their financial future."
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
        title: { fr: "Notre Structure: La Force d'un Réseau Organisé", en: "Our Structure: The Strength of an Organized Network" },
        overview: {
            title: { fr: "Aperçu du Réseau", en: "Network Overview" },
            content: {
                "fr": "Le Réseau Evolve Capital est une structure organisée au service de ses clubs.  Chaque club, autonome dans sa gestion, bénéficie du soutien et des ressources du réseau.  Un Conseil d'Administration, composé des présidents de clubs, assure une gouvernance démocratique.  Le Bureau Exécutif met en œuvre la politique du réseau, appuyé par des unités spécialisées (Comité d'Investissement, Gestion des Risques, Cellule Darwin).  Cette organisation équilibre agilité locale et coordination nationale pour promouvoir l'éducation financière et l'investissement responsable.",
                "en": "Réseau Evolve Capital has an organized structure to support its clubs. Each club, while managing its own affairs, benefits from network support and resources. A Board of Directors, comprised of club presidents, ensures democratic governance. The Executive Office implements network policy, supported by specialized units (Investment Committee, Risk Management, Darwin Unit). This structure balances local agility and national coordination to promote financial education and responsible investing."
            },
            image: "/images/structure-overview.jpg" // Replace with actual image path
        },
        governance: {
            title: { fr: "Gouvernance", en: "Governance" },
            content: {
                "fr": "La gouvernance du Réseau Evolve Capital est assurée par deux organes principaux : le Conseil d'Administration et le Bureau Exécutif. Le Conseil d'Administration, composé des présidents actifs de chaque club membre, détient le pouvoir de décision et contrôle l'activité du réseau. Il se réunit régulièrement pour définir les orientations stratégiques et s'assurer de la cohérence des actions menées. Le Bureau Exécutif, élu par le Conseil d'Administration, est responsable de la gestion opérationnelle du réseau et de la mise en œuvre des décisions prises. Il est garant de la cohésion entre les clubs et veille au bon fonctionnement de l'ensemble des organes. Cette structure bicéphale permet d'allier une vision stratégique d'ensemble, portée par les clubs, à une gestion efficace et réactive, assurée par le Bureau Exécutif.",
                "en": "The governance of Réseau Evolve Capital is ensured by two main bodies: the Board of Directors and the Executive Office. The Board of Directors, composed of the active presidents of each member club, holds the decision-making power and oversees the network's activities. It meets regularly to define strategic directions and ensure the coherence of actions taken. The Executive Office, elected by the Board of Directors, is responsible for the operational management of the network and the implementation of decisions made. It ensures cohesion between the clubs and oversees the proper functioning of all bodies. This two-headed structure allows for a comprehensive strategic vision, driven by the clubs, combined with efficient and responsive management, ensured by the Executive Office."
            },

            diagram: "/about/governance.jpeg" // Replace with actual diagram path
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
                    "icon": "https://cdn-icons-png.flaticon.com/512/2002/2002113.png" // Example: lightbulb or idea icon
                },
                {
                    "name": {
                        "fr": "Cellule de Gestion des Risques",
                        "en": "Risk Management Unit"
                    },
                    "description": {
                        "fr": "La cellule de gestion des risques est une entité transversale qui supervise le fonctionnement de tous les clubs et s'assure de leur conformité et de leur bonne gestion.",
                        "en": "The risk management unit is a cross-functional entity that oversees the operation of all clubs and ensures their compliance and good management."
                    },
                    "icon": "https://cdn-icons-png.flaticon.com/512/88/88851.png" // Example: shield or checkmark icon
                },
                {
                    "name": {
                        "fr": "Cellule Darwin",
                        "en": "Darwin Unit"
                    },
                    "description": {
                        "fr": "La cellule Darwin est le moteur de l'innovation au sein du réseau. Elle crée des outils pour automatiser et faciliter la gestion des clubs, contribuant à l'efficacité globale.",
                        "en": "The Darwin unit is the engine of innovation within the network. It creates tools to automate and facilitate the management of clubs, contributing to overall efficiency."
                    },
                    "icon": "https://cdn-icons-png.flaticon.com/512/1199/1199154.png" // Example: gear or settings icon
                }
            ]
        }
    },
    approach: {
        title: { fr: "Notre Approche: Éducation, Communauté et Performance", en: "Our Approach: Education, Community and Performance" },
        description: {
            fr: "Notre approche se fonde sur trois piliers essentiels : l'éducation financière, le développement d'une communauté soudée et la recherche de performances solides.  Nous mettons un accent particulier sur l'éducation de nos membres, car nous sommes convaincus que des investisseurs informés sont la clé du succès.  Nous proposons une variété de ressources, allant des formations et ateliers interactifs aux notes d'information quotidiennes et podcasts, en passant par un programme de mentorat pour un accompagnement personnalisé.  \n\nAu-delà de l'éducation, nous cultivons un fort esprit de communauté.  Le Réseau Evolve Capital est unique en France, offrant un cadre privilégié pour le partage d'expériences et de connaissances entre passionnés d'investissement.  Cette collaboration est au cœur de notre modèle et permet à nos membres de bénéficier de l'intelligence collective du réseau.\n\nEnfin, notre philosophie d'investissement est axée sur la performance à long terme.  Nous adoptons une approche rigoureuse et diversifiée, tout en tenant compte des spécificités fiscales avantageuses pour les clubs d'investissement.  Notre portefeuille a ainsi démontré sa résilience et sa capacité de croissance, même dans des contextes économiques difficiles, comme lors de la crise du COVID, où nous avons enregistré une croissance de 100%.",
            en: "Our approach is based on three essential pillars: financial education, the development of a strong community, and the pursuit of solid performance. We place a particular emphasis on the education of our members, as we are convinced that informed investors are the key to success. We offer a variety of resources, ranging from interactive training and workshops to daily information notes and podcasts, as well as a mentorship program for personalized support.\n\nBeyond education, we cultivate a strong community spirit. Réseau Evolve Capital is unique in France, offering a privileged setting for sharing experiences and knowledge among investment enthusiasts. This collaboration is at the heart of our model and allows our members to benefit from the collective intelligence of the network.\n\nFinally, our investment philosophy is focused on long-term performance. We adopt a rigorous and diversified approach, while taking into account the specific tax advantages for investment clubs. Our portfolio has thus demonstrated its resilience and growth capacity, even in difficult economic contexts, such as during the COVID crisis, where we recorded 100% growth."
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
                        "fr": "Nous investissons pour l'avenir, avec un horizon de 5 à 10 ans.",
                        "en": "We invest for the future, with a horizon of 5 to 10 years."
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
        title: { fr: "Notre Équipe: Les Acteurs du Succès", en: "Our Team: The Actors of Success" },
        subtitle: { fr: "Rencontrez les membres passionnés qui font vivre le réseau.", en: "Meet the passionate members who bring the network to life." },
        members: [
            // Add TeamMember objects here, using the information extracted from the images
            {
                name: "Lionel ZOCLANCLOUNON",
                role: { fr: "Président", en: "President" },
                bio: { fr: "[Add bio in French]", en: "[Add bio in English]" },
                image: "/images/lionel.jpg", // Replace with actual image path
                social: { linkedin: "[LinkedIn URL]" }
            },
            {
                name: "Edem AGBEHONOU",
                role: { fr: "Vice-Président", en: "Vice-President" },
                bio: { fr: "[Add bio in French]", en: "[Add bio in English]" },
                image: "/images/edem.jpg", // Replace with actual image path
                social: { linkedin: "[LinkedIn URL]" }
            },
            {
                name: "Ruben AFOUDAH",
                role: { fr: "Trésorier", en: "Treasurer" },
                bio: { fr: "[Add bio in French]", en: "[Add bio in English]" },
                image: "/images/ruben.jpg", // Replace with actual image path
                social: { linkedin: "[LinkedIn URL]" }
            }
            // ... more members
        ],
        spotlights: {
            title: { fr: "Histoires de Membres", en: "Member Stories" },
            stories: [
                // Add stories here
            ]
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
            href: "/join"
        }
    },
    contact: {
        title: { fr: "Contactez-nous", en: "Contact Us" },
        content: { fr: "Pour toute question, n'hésitez pas à nous contacter.", en: "For any questions, please do not hesitate to contact us." },
        email: "contact@reseauevolvecapital.com", // Replace with actual email
        phone: "+33 [Phone Number]", // Replace with actual phone number
        address: { fr: "[Address in French]", en: "[Address in English]" },
        social: {
            linkedin: "[LinkedIn URL]",
            twitter: "[Twitter URL]",
            facebook: "[Facebook URL]",
            instagram: "[Instagram URL]"
        }
    }
};