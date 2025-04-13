import { Club } from "@/config/site-config";

export const clubs: Club[] = [
    {
        "id": "evolve-capital",
        "name": {
          fr: "Evolve Capital Club",
          en: "Evolve Capital Club"
        },
        "description": {
          "fr": "Club d'investissement pionnier du réseau Evolve Capital.",
          "en": "The pioneering investment club of the Evolve Capital network."
        },
        "location": {
          "fr": "Paris, France",
          "en": "Paris, France"
        },
        "members": 20,
        image: "/clubs/evolve_capital.jpg",
        "coordinates": {
            lat: 48.8847,
            lng: 2.3838
        },
        "shortDescription": {
          "fr": "Premier club du réseau Evolve Capital, dédié à l'investissement stratégique en bourse.",
          "en": "The first club of the Evolve Capital network, dedicated to strategic stock market investing."
        },
        "longDescription": {
          "fr": "Evolve Capital est le club fondateur du réseau Evolve Capital. Depuis 2018, nous réunissons des passionnés d’investissement pour construire ensemble des stratégies performantes et adaptées aux marchés financiers. Forts d’une expertise collective et d’une approche disciplinée, nous avons su naviguer à travers les cycles boursiers et générer une croissance durable.",
          "en": "Evolve Capital is the founding club of the Evolve Capital network. Since 2018, we have brought together investment enthusiasts to collaboratively build high-performing strategies tailored to financial markets. With collective expertise and a disciplined approach, we have successfully navigated market cycles and achieved sustainable growth."
        },
        "foundedDate": "2018",
        "meetingSchedule": {
          "fr": "Réunions mensuelles en présentiel à Paris et sessions en ligne pour le suivi des performances.",
          "en": "Monthly in-person meetings in Paris, with online sessions for performance reviews."
        },
        "investmentStrategy": {
          "focusAreas": {
            "fr": "Technologie, Énergie Verte, ETF, Valeurs de Croissance",
            "en": "Technology, Green Energy, ETFs, Growth Stocks"
          },
          "riskProfile": {
            "fr": "Modéré, axé sur la croissance long terme.",
            "en": "Moderate, focused on long-term growth."
          },
          "decisionProcess": {
            "fr": "Approche collaborative avec validation par le comité d'investissement.",
            "en": "Collaborative approach with validation by the investment committee."
          },
          "minimumInvestment": 300,
          "monthlyContribution": 100
        },
        "performance": [
          {
            "year": 2023,
            "return": 15.2,
            "benchmarkReturn": 12.1,
            "topHoldings": [
              {
                "name": "Apple Inc.",
                "ticker": "AAPL",
                "weight": 20,
                "return": 18.4
              },
              {
                "name": "Tesla Inc.",
                "ticker": "TSLA",
                "weight": 15,
                "return": 25.3
              },
              {
                "name": "Vanguard S&P 500 ETF",
                "ticker": "VOO",
                "weight": 30,
                "return": 11.2
              }
            ]
          }
        ],
        "executiveBoard": [
          {
            "id": "edem-agbehonou",
            "name": "M. AGBEHONOU Edem",
            "role": {
              "fr": "Président",
              "en": "President"
            },
            "image": "/members/edem.jpeg",
            "bio": {
              "fr": "Edem est un Ingénieur en Génie climatique de formation. Il porte un intérêt particulier à l'éducation financière, à l'investissement boursier et immobilier. Il est également entrepreneur dans le BTP et dans l'agribusiness.",
              "en": "Edem is a climate engineering graduate with a strong interest in financial education, stock market and real estate investing. He is also an entrepreneur in construction and agribusiness."
            },
            "linkedin": "https://www.linkedin.com/in/eagbehonou/"
          },
          {
            "id": "radi-hounsonlon",
            "name": "MME. HOUNSONLON Radi",
            "role": {
              "fr": "Secrétaire",
              "en": "Secretary"
            },
            "image": "/members/radi.jpeg",
            "bio": {
              "fr": "Radi est ingénieure généraliste. Une touche à tout avec un attrait pour la lecture. Elle porte de plus en plus d'intérêt à l'investissement boursier et immobilier. Par ailleurs, elle est en collaboration pour le développement d'une plateforme de recherches scientifiques en Afrique. Enfin, elle s'informe sur les opportunités et risques sur des business en Afrique.",
              "en": "Radi is a general engineer with a passion for reading and a growing interest in stock market and real estate investing. She also collaborates on a scientific research platform in Africa and stays informed on business opportunities and risks across the continent."
            },
            "linkedin": "https://www.linkedin.com/in/radi-hounsonlon-53b35929/"
          },
          {
            "id": "valentino-houessou",
            "name": "M. HOUESSOU Valentino",
            "role": {
              "fr": "Trésorier",
              "en": "Treasurer"
            },
            "image": "/members/valentino.jpeg",
            "bio": {
              "fr": "Valentino est ingénieur en informatique et entrepreneur. Il est notamment le co-fondateur de La Zone, une agence digitale et d'outsourcing entre la France et l'Afrique subsaharienne. Il s'intéresse à l'investissement peu importe le secteur, avec une préférence pour l'investissement en Afrique.",
              "en": "Valentino is a software engineer and entrepreneur. He is co-founder of La Zone, a digital and outsourcing agency operating between France and sub-Saharan Africa. He is passionate about investing across sectors, with a preference for African markets."
            },
            "linkedin": "https://www.linkedin.com/in/valentino-houessou/"
          }
        ],
        "story": {
          "origins": {
            "fr": "Evolve Capital est né en 2018 de la volonté d'un groupe de jeunes actifs de reprendre le contrôle sur leur avenir financier. Constatant un manque criant de pédagogie en matière d'investissement boursier, ils décident de fonder un club collaboratif dédié à l'apprentissage, au partage d'expérience et à la prise de décision collective.",
            "en": "Evolve Capital was born in 2018 from the determination of a group of young professionals to take control of their financial future. Noticing a glaring lack of education in stock market investing, they created a collaborative club focused on learning, experience sharing, and collective decision-making."
          },
          "milestones": [
            {
              "title": {
                "fr": "2018",
                "en": "2018"
              },
              "content": {
                "fr": "Genèse du club.",
                "en": "Club genesis."
              }
            },
            {
              "title": {
                "fr": "2020",
                "en": "2020"
              },
              "content": {
                "fr": "Première restructuration majeure et mise en place d'un bureau solide (Président : Lionel Zoclancounon, Trésorier : Ruben Afoudah, Secrétaire : Edem Agbehonou).",
                "en": "Major governance restructuring and formation of a strong executive board (President: Lionel Zoclancounon, Treasurer: Ruben Afoudah, Secretary: Edem Agbehonou)."
              }
            },
            {
              "title": {
                "fr": "2021",
                "en": "2021"
              },
              "content": {
                "fr": "Atteinte du premier palier de 100 000 € d'actifs.",
                "en": "First €100,000 milestone reached."
              }
            },
            {
              "title": {
                "fr": "2023",
                "en": "2023"
              },
              "content": {
                "fr": "Formalisation du modèle de club et naissance du réseau.",
                "en": "Club model formalized and network launched."
              }
            },
            {
              "title": {
                "fr": "2025",
                "en": "2025"
              },
              "content": {
                "fr": "Dépassement des 600 000 € de valorisation.",
                "en": "Portfolio value exceeds €600,000."
              }
            }
          ],
          "futureVision": {
            "fr": "D'ici 2028, Evolve Capital ambitionne d'atteindre un capital collectif de 1 million d'euros, tout en consolidant son rôle de creuset d'apprentissage pour quiconque souhaite devenir un investisseur éclairé. Le club entend également élargir ses horizons au-delà de la bourse, en cultivant un réseau puissant de membres engagés dans leur autonomie financière.",
            "en": "By 2028, Evolve Capital aims to reach €1 million in collective capital, while strengthening its role as a learning hub for anyone aspiring to become a savvy investor. The club also seeks to expand beyond the stock market, fostering a strong network of members committed to financial empowerment."
          }
        },
        "gallery": [
          {
            "image": "/clubs/evolve_capital/ecc_1.jpeg",
            "caption": {
              "fr": "Réunion stratégique du club Evolve Capital.",
              "en": "Strategic meeting of the Evolve Capital club."
            }
          },
          {
            "image": "/clubs/evolve_capital/evolve_capital.jpg",
            "caption": {
              "fr": "Événement de networking et d'investissement.",
              "en": "Networking and investment event."
            }
          },
          {
            "image": "/clubs/evolve_capital/ecc_2.jpeg",
            "caption": {
              "fr": "Rencontre entre membres.",
              "en": "Meeting between members."
            }
          },
          {
            "image": "/clubs/evolve_capital/ecc_3.jpeg",
            "caption": {
              "fr": "une autre rencontre entre membres.",
              "en": "Another meeting between members."
            }
          }
        ],
        "contactInfo": {
          "email": "evolvecapitalclub@gmail.com",
          "phone": "+33 6 28 92 90 68",
          "address": {
            "fr": "Paris, France",
            "en": "Paris, France"
          }
        },
        "joinProcess": {
          "steps": [
            {
              "title": {
                "fr": "Remplir le formulaire d'adhésion",
                "en": "Complete the membership form"
              },
              "description": {
                "fr": "Soumettez votre candidature en ligne pour rejoindre le club.",
                "en": "Submit your application online to join the club."
              }
            },
            {
              "title": {
                "fr": "Entretien avec un membre du bureau",
                "en": "Interview with an executive board member"
              },
              "description": {
                "fr": "Un entretien pour valider votre motivation et vos attentes.",
                "en": "An interview to assess your motivation and expectations."
              }
            },
            {
              "title": {
                "fr": "Versement de la cotisation",
                "en": "Payment of membership fee"
              },
              "description": {
                "fr": "Un montant initial est requis pour l'adhésion au club.",
                "en": "An initial contribution is required for club membership."
              }
            }
          ],
          "requirements": [
            {
              "fr": "Être majeur et résider en France.",
              "en": "Be of legal age and reside in France."
            },
            {
              "fr": "Avoir une volonté d’apprentissage et de collaboration.",
              "en": "Have a willingness to learn and collaborate."
            }
          ]
        },
        "faq": [
          {
            "question": {
              "fr": "Quels sont les frais d'adhésion ?",
              "en": "What are the membership fees?"
            },
            "answer": {
              "fr": "La cotisation mensuelle est au minimum de 100€.",
              "en": "The monthly membership fee is at least €100."
            }
          },
          {
            "question": {
              "fr": "Peut-on quitter un club à tout moment ?",
              "en": "Can I leave a club at any time?"
            },
            "answer": {
              "fr": "Oui, un membre peut sortir d'un club à tout moment. Toutefois, nous évaluons les candidats pour nous assurer qu'ils partagent une vision à long terme. L'engagement minimum recommandé est d'un an.",
              "en": "Yes, members can leave a club at any time. However, we evaluate applicants to ensure they share a long-term vision. A minimum one-year commitment is recommended."
            }
          },
          {
            "question": {
              "fr": "Qui gère l'argent dans un club d'investissement ?",
              "en": "Who manages the money in an investment club?"
            },
            "answer": {
              "fr": "L'argent n'est pas détenu par une seule personne. Un compte-titres est ouvert au nom du club chez un courtier agréé. Seuls les membres peuvent y faire des virements. Pour retirer de l'argent, un procès-verbal de réunion doit être envoyé au courtier, qui exécute alors le virement sortant.",
              "en": "The money is not held by any single person. A brokerage account is opened in the club's name with a certified broker. Only members can fund it, and any withdrawal requires an official meeting record (minutes) sent to the broker, who handles the transfer."
            }
          },
          {
            "question": {
              "fr": "Combien peut-on investir au maximum dans un club ?",
              "en": "What is the maximum amount one can invest in a club?"
            },
            "answer": {
              "fr": "Le plafond annuel est de 5 500 € par foyer fiscal. Une personne seule peut donc investir jusqu'à 5 500 € par an, et un couple marié ne doit pas dépasser ce montant à deux s'ils sont tous les deux membres.",
              "en": "The annual cap is €5,500 per tax household. An individual can invest up to €5,500 per year, and a married couple must not exceed that amount together if both are members."
            }
          },
          {
            "question": {
              "fr": "Qui décide de la stratégie d'investissement ?",
              "en": "Who decides the investment strategy?"
            },
            "answer": {
              "fr": "Contrairement à un fonds d'investissement classique, la stratégie est décidée collectivement par les membres. C'est ce qui fait la richesse pédagogique des clubs d'investissement du réseau.",
              "en": "Unlike traditional investment funds, strategy decisions are made collectively by the members. This collaborative approach is central to the educational value of our clubs."
            }
          },
          {
            "question": {
              "fr": "Peut-on intégrer un club après sa création ?",
              "en": "Can I join a club after it has already started?"
            },
            "answer": {
              "fr": "Oui. Le Réseau Evolve Capital a mis en place un système de gestion permettant l'intégration de nouveaux membres à tout moment dans la vie du club.",
              "en": "Yes. Evolve Capital Network has a management system that allows new members to join at any point during the club"
            }
          },
          {
            "question": {
              "fr": "Combien de membres peut-il y avoir au maximum dans un club ?",
              "en": "What is the maximum number of members in a club?"
            },
            "answer": {
              "fr": "Il peut y avoir 20 membres au maximum.",
              "en": "There can be a maximum of 20 members."
            }
          }
        ]
    },
    {
        "id": "paris-evolve-capital",
        "name": {
          "fr": "Paris Evolve Capital",
          "en": "Paris Evolve Capital"
        },
        "description": {
          "fr": "Club d'investissement du réseau Evolve Capital basé à Paris, alliant expertise et diversité.",
          "en": "Investment club of the Evolve Capital network based in Paris, combining expertise and diversity."
        },
        "location": {
          "fr": "Poissy, France",
          "en": "Poissy, France"
        },
        "members": 19,
        "image": "/clubs/paris_evolve_capital.jpg",
        "coordinates": {
            lat: 48.9472,
            lng: 2.0333
        },
        "shortDescription": {
          "fr": "Un club dynamique et stable, avec une approche stratégique des investissements en bourse.",
          "en": "A dynamic and stable club with a strategic approach to stock market investing."
        },
        "longDescription": {
          "fr": "Paris Evolve Capital (PEC) a été fondé en 2021 pour offrir une approche collective et stratégique aux investissements en bourse. Grâce à un leadership fort et une communauté engagée, le club a su générer une croissance significative tout en maintenant une gestion rigoureuse de ses actifs.",
          "en": "Paris Evolve Capital (PEC) was founded in 2021 to provide a collective and strategic approach to stock market investments. With strong leadership and an engaged community, the club has achieved significant growth while maintaining disciplined asset management."
        },
        "foundedDate": "2021",
        "meetingSchedule": {
          "fr": "Réunions mensuelles en présentiel à Paris, avec sessions en ligne pour le suivi des performances.",
          "en": "Monthly in-person meetings in Paris, with online sessions for performance tracking."
        },
        "investmentStrategy": {
          "focusAreas": {
            "fr": "Technologie, Industrie, Marchés émergents",
            "en": "Technology, Industry, Emerging Markets"
          },
          "riskProfile": {
            "fr": "Modéré, avec un accent sur la diversification et la croissance long terme.",
            "en": "Moderate, with a focus on diversification and long-term growth."
          },
          "decisionProcess": {
            "fr": "Analyse rigoureuse et prise de décision collective avec validation par le comité d'investissement.",
            "en": "Thorough analysis and collective decision-making with validation by the investment committee."
          },
          "minimumInvestment": 300,
          "monthlyContribution": 200
        },
        "performance": [
          {
            "year": 2024,
            "return": 16.23,
            "benchmarkReturn": 12.5,
            "topHoldings": []
          }
        ],
        "executiveBoard": [
          {
            "id": "anael-ezin",
            "name": "M. EZIN Anaël",
            "role": {
              "fr": "Président",
              "en": "President"
            },
            "image": "/members/anael.png",
            "bio": {
              "fr": "Président en exercice du club, il porte un intérêt particulier aux investissements boursiers car il aspire à atteindre une liberté financière. Actuaire dans une compagnie d'assurance, il est passionné par les nouvelles technologies et pendant ses moments de loisirs il s'adonne au bricolage.",
              "en": "Current president of the club, he has a strong interest in stock market investing as he aims for financial freedom. An actuary at an insurance company, he's passionate about new technologies and enjoys DIY projects in his free time."
            },
            "linkedin": "https://www.linkedin.com/in/anael-ezin/"
          },
          {
            "id": "manhirath-amoussa",
            "name": "Mme AMOUSSA Manhirath",
            "role": {
              "fr": "Trésorière",
              "en": "Treasurer"
            },
            "image": "/members/manhirath.png",
            "bio": {
              "fr": "Trésorière et consultante en actuariat, elle aime beaucoup tout ce qui a trait à l'ouverture d'esprit, aux challenges et à la prise de risque.",
              "en": "Treasurer and actuarial consultant, she greatly values open-mindedness, challenges, and risk-taking."
            },
            "linkedin": "https://www.linkedin.com/in/manhirath-amoussa-2bb85414a/"
          },
          {
            "id": "anissa-toure",
            "name": "Mme TOURE Anissa",
            "role": {
              "fr": "Secrétaire",
              "en": "Secretary"
            },
            "image": "/members/anissa.png",
            "bio": {
              "fr": "Secrétaire en exercice du club. Chargée de projet solidarité durable, internationale et développement. Elle est intéressée par toutes les thématiques portées sur l'investissement pour une liberté financière.",
              "en": "Current secretary of the club. Project manager in sustainable and international development. She is interested in all topics related to investing for financial freedom."
            },
            "linkedin": "https://www.linkedin.com/in/anissa-toure-a986a01a5/"
          }
        ],
        "story": {
          "origins": {
            "fr": "Fondé en 2021, le Paris Evolve Capital est né de la volonté d’un groupe d’investisseurs passionnés de structurer une approche collaborative pour maximiser les opportunités du marché.",
            "en": "Founded in 2021, Paris Evolve Capital was born from the desire of a group of passionate investors to structure a collaborative approach to maximize market opportunities."
          },
          "milestones": [
            {
              "title": {
                "fr": "2023",
                "en": "2023"
              },
              "content": {
                "fr": "Croissance du portefeuille au-delà de 60 000€.",
                "en": "Portfolio growth beyond €60,000."
              }
            },
            {
              "title": {
                "fr": "2024",
                "en": "2024"
              },
              "content": {
                "fr": "Objectif de 100 000€ atteint.",
                "en": "Target of €100,000 reached."
              }
            }
          ],
          "futureVision": {
            "fr": "Notre objectif est d'atteindre 1.000.000 € d'actifs sous gestion d'ici 2031.",
            "en": "Our goal is to reach 1.000.000 € in assets under management by 2031."
          }
        },
        "gallery": [
          {
            "image": "/clubs/paris_evolve_capital/pec_1.jpeg",
            "caption": {
              "fr": "Rencontre membres du PEC.",
              "en": "PEC members meeting."
            }
          },
          {
            "image": "/clubs/paris_evolve_capital.jpg",
            "caption": {
              "fr": "Événement d’échange entre membres et experts en finance.",
              "en": "Networking event with members and financial experts."
            }
          }
        ],
        "contactInfo": {
          "email": "paris.evolvecapital@gmail.com",
          "phone": "+33 7 60 25 34 41",
          "address": {
            "fr": "Paris, France",
            "en": "Paris, France"
          }
        },
        "joinProcess": {
          "steps": [
            {
              "title": {
                "fr": "Remplir le formulaire d'adhésion",
                "en": "Complete the membership form"
              },
              "description": {
                "fr": "Soumettez votre candidature en ligne pour rejoindre le club.",
                "en": "Submit your application online to join the club."
              }
            },
            {
              "title": {
                "fr": "Entretien avec un membre du bureau",
                "en": "Interview with an executive board member"
              },
              "description": {
                "fr": "Un entretien pour valider votre motivation et vos attentes.",
                "en": "An interview to assess your motivation and expectations."
              }
            },
            {
              "title": {
                "fr": "Versement de la cotisation",
                "en": "Payment of membership fee"
              },
              "description": {
                "fr": "Un montant initial est requis pour l'adhésion au club.",
                "en": "An initial contribution is required for club membership."
              }
            }
          ],
          "requirements": [
            {
              "fr": "Être majeur et résider en France.",
              "en": "Be of legal age and reside in France."
            },
            {
              "fr": "Avoir une volonté d’apprentissage et de collaboration.",
              "en": "Have a willingness to learn and collaborate."
            }
          ]
        },
        "faq": [
          {
            "question": {
              "fr": "Quels sont les frais d'adhésion ?",
              "en": "What are the membership fees?"
            },
            "answer": {
              "fr": "La cotisation mensuelle est au minimum de 100€.",
              "en": "The monthly membership fee is at least €100."
            }
          },
          {
            "question": {
              "fr": "Peut-on quitter un club à tout moment ?",
              "en": "Can I leave a club at any time?"
            },
            "answer": {
              "fr": "Oui, un membre peut sortir d'un club à tout moment. Toutefois, nous évaluons les candidats pour nous assurer qu'ils partagent une vision à long terme. L'engagement minimum recommandé est d'un an.",
              "en": "Yes, members can leave a club at any time. However, we evaluate applicants to ensure they share a long-term vision. A minimum one-year commitment is recommended."
            }
          },
          {
            "question": {
              "fr": "Qui gère l'argent dans un club d'investissement ?",
              "en": "Who manages the money in an investment club?"
            },
            "answer": {
              "fr": "L'argent n'est pas détenu par une seule personne. Un compte-titres est ouvert au nom du club chez un courtier agréé. Seuls les membres peuvent y faire des virements. Pour retirer de l'argent, un procès-verbal de réunion doit être envoyé au courtier, qui exécute alors le virement sortant.",
              "en": "The money is not held by any single person. A brokerage account is opened in the club's name with a certified broker. Only members can fund it, and any withdrawal requires an official meeting record (minutes) sent to the broker, who handles the transfer."
            }
          },
          {
            "question": {
              "fr": "Combien peut-on investir au maximum dans un club ?",
              "en": "What is the maximum amount one can invest in a club?"
            },
            "answer": {
              "fr": "Le plafond annuel est de 5 500 € par foyer fiscal. Une personne seule peut donc investir jusqu'à 5 500 € par an, et un couple marié ne doit pas dépasser ce montant à deux s'ils sont tous les deux membres.",
              "en": "The annual cap is €5,500 per tax household. An individual can invest up to €5,500 per year, and a married couple must not exceed that amount together if both are members."
            }
          },
          {
            "question": {
              "fr": "Qui décide de la stratégie d'investissement ?",
              "en": "Who decides the investment strategy?"
            },
            "answer": {
              "fr": "Contrairement à un fonds d'investissement classique, la stratégie est décidée collectivement par les membres. C'est ce qui fait la richesse pédagogique des clubs d'investissement du réseau.",
              "en": "Unlike traditional investment funds, strategy decisions are made collectively by the members. This collaborative approach is central to the educational value of our clubs."
            }
          },
          {
            "question": {
              "fr": "Peut-on intégrer un club après sa création ?",
              "en": "Can I join a club after it has already started?"
            },
            "answer": {
              "fr": "Oui. Le Réseau Evolve Capital a mis en place un système de gestion permettant l'intégration de nouveaux membres à tout moment dans la vie du club.",
              "en": "Yes. Evolve Capital Network has a management system that allows new members to join at any point during the club"
            }
          },
          {
            "question": {
              "fr": "Combien de membres peut-il y avoir au maximum dans un club ?",
              "en": "What is the maximum number of members in a club?"
            },
            "answer": {
              "fr": "Il peut y avoir 20 membres au maximum.",
              "en": "There can be a maximum of 20 members."
            }
          }
        ]
      }
    ,
    {
        "id": "vision-evolve-capital-club",
        "name": {
          "fr": "Vision Evolve Capital",
          "en": "Vision Evolve Capital"
        },
        "description": {
            "fr": "Vision Evolve Capital est un club d'investissement innovant, dirigé majoritairement par des femmes, dédié à l'autonomisation financière et à l'éducation en investissement.",
            "en": "Vision Evolve Capital is an innovative investment club, predominantly led by women, dedicated to financial empowerment and investment education."
          },
          
        "location": {
         fr: "Garenne-Colombes",
         en: "Garenne-Colombes"
        },
        "members": 20,
        "image": "/clubs/vision_evolve_capital.jpg",
        "coordinates": {
            lat: 48.9044,
            lng: 2.2486
        },
        "shortDescription": {
            "fr": "Un club d'investissement unique favorisant la participation féminine active dans le monde financier.",
            "en": "A unique investment club promoting active female participation in the financial world."
          },

        "longDescription": {
            "fr": "Fondé en février 2024, Vision Evolve Capital est né de la rencontre entre Louisia Minkala et Lionel Zoclancounon lors d'une conférence de BlackNetwork. Inspirée par la présentation de Lionel sur les clubs d'investissement, Louisia a décidé de relever le défi en créant un club axé sur l'inclusion des femmes dans le domaine de l'investissement. Sous sa présidence, le club s'engage à fournir une éducation financière de qualité et à encourager les femmes à prendre en main leur avenir financier.",
            "en": "Founded in February 2024, Vision Evolve Capital emerged from a networking conference of BlackNetwork where Louisia Minkala met Lionel Zoclancounon. Inspired by Lionel's presentation on investment clubs, Louisia took on the challenge of creating a club focused on women's inclusion in the investment realm. Under her leadership, the club is committed to providing quality financial education and encouraging women to take control of their financial future."
          },
          
        "foundedDate": "2024-02",
        "meetingSchedule": {
          "fr": "Sessions mensuelles avec des réunions stratégiques et des formations sur l’investissement.",
          "en": "Monthly sessions with strategic meetings and investment training."
        },
        "investmentStrategy": {
          "focusAreas": {
            "fr": "Diversifié, avec une approche progressive inspirée des clubs EC et PEC.",
            "en": "Diversified, with a progressive approach inspired by the EC and PEC clubs."
          },
          "riskProfile": {
            "fr": "Équilibré, avec une gestion rigoureuse des risques et une vision long terme.",
            "en": "Balanced, with rigorous risk management and a long-term vision."
          },
          "decisionProcess": {
            "fr": "Prise de décision collective, en s’inspirant des meilleures pratiques des clubs EC et PEC.",
            "en": "Collective decision-making, inspired by best practices from EC and PEC clubs."
          },
          "minimumInvestment": 300,
          "monthlyContribution": 100
        },
        "performance": [
            {
              "year": 2024,
              "return": 18,
              "benchmarkReturn": -2.5,
              "topHoldings": [
                {
                  "name": "META",
                  "ticker": "META",
                  "weight": 40,
                  "return": 40.4
                },
                {
                  "name": "Microsoft",
                  "ticker": "MSFT",
                  "weight": 18,
                  "return": 1.4
                }
              ]
            }
          ],
        "executiveBoard": [
          {
            "id": "louisia-minkala",
            "name": "Louisia MINKALA",
            "role": {
              "fr": "Présidente",
              "en": "President"
            },
            "image": "/clubs/vision_evolve_capital/louisia.jpeg",
            "bio": {
              "fr": "Conseillère en gestion de patrimoine et présidente de VEC, elle aide les femmes indépendantes à optimiser leurs finances.",
              "en": "Wealth management advisor and president of VEC, she helps self-employed women optimize their finances."
            },
            "linkedin": ""
          },
          {
            "id": "fabrice-koulidji",
            "name": "Fabrice KOULIDJI",
            "role": {
              "fr": "Trésorier",
              "en": "Treasurer"
            },
            "image": "/clubs/vision_evolve_capital/fabrice.jpeg",
            "bio": {
              "fr": "Étudiant en finance d'entreprise et gestion de projet chez Natixis, passionné d'innovation et d'investissement.",
              "en": "Corporate finance student and project manager at Natixis, passionate about innovation and investing."
            },
            "linkedin": ""
          },
          {
            "id": "imane-alao-toukourou",
            "name": "Imane Alao TOUKOUROU",
            "role": {
              "fr": "Secrétaire Général",
              "en": "General Secretary"
            },
            "image": "/clubs/vision_evolve_capital/imane.jpeg",
            "bio": {
              "fr": "Chef de projet en data et entrepreneur, passionné par l’apprentissage continu et la vision stratégique.",
              "en": "Data project manager and entrepreneur, passionate about continuous learning and strategic vision."
            },
            "linkedin": ""
          }
        ],
        "story": {
          "origins": {
            "fr": "Fondé en février 2024, Vision Evolve Capital (VEC) est né d'une rencontre marquante entre Louisia Minkala et Lionel Zoclancounon lors d'une conférence de BlackNetwork. Séduite par la présentation de Lionel sur les clubs d'investissement et leur portée éducative, Louisia a rapidement décidé de rejoindre l'aventure. Elle en devient la première présidente, avec la volonté affirmée de favoriser l'inclusion des femmes dans les dynamiques d'apprentissage financier. Bien que mixte, le VEC se distingue par la forte présence féminine en son sein, en faisant un club pionnier sur cet aspect au sein du réseau. Sous l'impulsion de Louisia, VEC s'affirme comme un espace d'apprentissage collaboratif, d'investissement stratégique et de sororité économique, tout en bénéficiant des bonnes pratiques des autres clubs du réseau.",
            
            "en": "Founded in February 2024, Vision Evolve Capital (VEC) was born from a meaningful encounter between Louisia Minkala and Lionel Zoclancounon at a networking conference of BlackNetwork. Inspired by Lionel's presentation on investment clubs and their role in financial education, Louisia quickly embraced the idea and chose to take part. She became the club's first president, driven by a clear mission to boost financial literacy among women. Although open to all, VEC stands out within the network for its strong female representation, making it a unique and forward-thinking club. Under Louisia's leadership, VEC has become a space for collaborative learning, strategic investing, and financial empowerment—drawing from the shared experience of the Evolve Capital network."
          },
          "milestones": [
            {
              "title": {
                "fr": "2024",
                "en": "2024"
              },
              "content": {
                "fr": "Lancement du club. En à peine huit mois, le VEC atteint une valorisation de portefeuille de 30 000 €.",
                "en": "Club launch. In less than eight months, VEC reached a portfolio valuation of €30,000."
              }
            }
          ],
          "futureVision": {
            "fr": "D'ici 2026, VEC ambitionne d'atteindre 100 000 € d'actifs sous gestion, tout en renforçant les synergies entre ses membres. Le club souhaite devenir une référence dans l'accompagnement financier des jeunes actifs, en particulier des femmes, à travers une pédagogie de terrain, des ateliers pratiques et un esprit d'entraide structuré.",
            
            "en": "By 2026, VEC aims to reach €100,000 in assets under management and foster greater collaboration among its members. The club aspires to become a benchmark for financial education among young professionals—especially women—through hands-on learning, peer support, and a structured approach to long-term investing."
          }
        },
        "gallery": [
          {
            "image": "/clubs/vision_evolve_capital/vec_1.jpeg",
            "caption": {
              "fr": "Lancement officiel du club Vision Evolve Capital en 2024.",
              "en": "Official launch of Vision Evolve Capital in 2024."
            }
          },
          {
            "image": "/clubs/vision_evolve_capital/vec_2.jpeg",
            "caption": {
              "fr": "Réunion stratégique des membres de VEC.",
              "en": "Strategic meeting of VEC members."
            }
          },
          {
            "image": "/clubs/vision_evolve_capital/vec_3.jpeg",
            "caption": {
              "fr": "Réunion d'analyse de portefeuille de VEC.",
              "en": "Portfolio analysis meeting of VEC."
            }
          },
          {
            "image": "/clubs/vision_evolve_capital/vec_4.jpeg",
            "caption": {
              "fr": "Réunion d'analyse de portefeuille de VEC.",
              "en": "Portfolio analysis meeting of VEC."
            }
          },
          {
            "image": "/clubs/vision_evolve_capital/vec_5.jpeg",
            "caption": {
              "fr": "Première Assemblée Générale de VEC.",
              "en": "First General Assembly of VEC."
            }
          }
        ],
        "contactInfo": {
          "email": "vision.evolvecapital@gmail.com",
          "phone": "+33 6 12 77 32 36",
          "address": {
            "fr": "Garenne-Colombes, France",
            "en": "Garenne-Colombes, France"
          }
        },
        "joinProcess": {
          "steps": [
            {
              "title": {
                "fr": "Remplir le formulaire d'adhésion",
                "en": "Complete the membership form"
              },
              "description": {
                "fr": "Soumettez votre candidature en ligne pour rejoindre le club.",
                "en": "Submit your application online to join the club."
              }
            },
            {
              "title": {
                "fr": "Entretien avec un membre du bureau",
                "en": "Interview with an executive board member"
              },
              "description": {
                "fr": "Un entretien pour valider votre motivation et vos attentes.",
                "en": "An interview to assess your motivation and expectations."
              }
            },
            {
              "title": {
                "fr": "Versement de la cotisation",
                "en": "Payment of membership fee"
              },
              "description": {
                "fr": "Un montant initial est requis pour l'adhésion au club.",
                "en": "An initial contribution is required for club membership."
              }
            }
          ],
          "requirements": [
            {
              "fr": "Être majeur et résider en France.",
              "en": "Be of legal age and reside in France."
            },
            {
              "fr": "Avoir une volonté d’apprentissage et de collaboration.",
              "en": "Have a willingness to learn and collaborate."
            }
          ]
        },
        "faq": [
          {
            "question": {
              "fr": "Quels sont les frais d'adhésion ?",
              "en": "What are the membership fees?"
            },
            "answer": {
              "fr": "La cotisation mensuelle est au minimum de 100€.",
              "en": "The monthly membership fee is at least €100."
            }
          },
          {
            "question": {
              "fr": "Peut-on quitter un club à tout moment ?",
              "en": "Can I leave a club at any time?"
            },
            "answer": {
              "fr": "Oui, un membre peut sortir d'un club à tout moment. Toutefois, nous évaluons les candidats pour nous assurer qu'ils partagent une vision à long terme. L'engagement minimum recommandé est d'un an.",
              "en": "Yes, members can leave a club at any time. However, we evaluate applicants to ensure they share a long-term vision. A minimum one-year commitment is recommended."
            }
          },
          {
            "question": {
              "fr": "Qui gère l'argent dans un club d'investissement ?",
              "en": "Who manages the money in an investment club?"
            },
            "answer": {
              "fr": "L'argent n'est pas détenu par une seule personne. Un compte-titres est ouvert au nom du club chez un courtier agréé. Seuls les membres peuvent y faire des virements. Pour retirer de l'argent, un procès-verbal de réunion doit être envoyé au courtier, qui exécute alors le virement sortant.",
              "en": "The money is not held by any single person. A brokerage account is opened in the club's name with a certified broker. Only members can fund it, and any withdrawal requires an official meeting record (minutes) sent to the broker, who handles the transfer."
            }
          },
          {
            "question": {
              "fr": "Combien peut-on investir au maximum dans un club ?",
              "en": "What is the maximum amount one can invest in a club?"
            },
            "answer": {
              "fr": "Le plafond annuel est de 5 500 € par foyer fiscal. Une personne seule peut donc investir jusqu'à 5 500 € par an, et un couple marié ne doit pas dépasser ce montant à deux s'ils sont tous les deux membres.",
              "en": "The annual cap is €5,500 per tax household. An individual can invest up to €5,500 per year, and a married couple must not exceed that amount together if both are members."
            }
          },
          {
            "question": {
              "fr": "Qui décide de la stratégie d'investissement ?",
              "en": "Who decides the investment strategy?"
            },
            "answer": {
              "fr": "Contrairement à un fonds d'investissement classique, la stratégie est décidée collectivement par les membres. C'est ce qui fait la richesse pédagogique des clubs d'investissement du réseau.",
              "en": "Unlike traditional investment funds, strategy decisions are made collectively by the members. This collaborative approach is central to the educational value of our clubs."
            }
          },
          {
            "question": {
              "fr": "Peut-on intégrer un club après sa création ?",
              "en": "Can I join a club after it has already started?"
            },
            "answer": {
              "fr": "Oui. Le Réseau Evolve Capital a mis en place un système de gestion permettant l'intégration de nouveaux membres à tout moment dans la vie du club.",
              "en": "Yes. Evolve Capital Network has a management system that allows new members to join at any point during the club"
            }
          },
          {
            "question": {
              "fr": "Combien de membres peut-il y avoir au maximum dans un club ?",
              "en": "What is the maximum number of members in a club?"
            },
            "answer": {
              "fr": "Il peut y avoir 20 membres au maximum.",
              "en": "There can be a maximum of 20 members."
            }
          }
        ]
      }
      
      
]