import { type LocalizedText } from './site-config';

export type LegalSection = {
  title: LocalizedText;
  content: LocalizedText[];
};

export type LegalPage = {
  title: LocalizedText;
  lastUpdated: string; // Format: YYYY-MM-DD
  sections: LegalSection[];
};

export type LegalPages = {
  privacyPolicy: LegalPage;
  termsOfService: LegalPage;
};

export const legalConfig: LegalPages = {
  privacyPolicy: {
    title: {
      fr: "Politique de Confidentialité",
      en: "Privacy Policy"
    },
    lastUpdated: "2025-04-12",
    sections: [
      {
        title: {
          fr: "Introduction",
          en: "Introduction"
        },
        content: [
          {
            fr: "Chez Réseau Evolve Capital, nous respectons votre vie privée et nous nous engageons à protéger vos données personnelles. Cette politique de confidentialité vous informe sur la façon dont nous traitons vos données personnelles lorsque vous visitez notre site web et vous informe de vos droits en matière de protection des données.",
            en: "At Réseau Evolve Capital, we respect your privacy and are committed to protecting your personal data. This privacy policy informs you about how we handle your personal data when you visit our website and tells you about your privacy rights."
          },
          {
            fr: "Notre site web s'adresse aux personnes intéressées par l'investissement et la finance, et n'est pas destiné aux enfants. Nous ne collectons pas sciemment de données concernant des enfants.",
            en: "Our website is intended for individuals interested in investment and finance, and is not intended for children. We do not knowingly collect data relating to children."
          }
        ]
      },
      {
        title: {
          fr: "Les Données Que Nous Collectons",
          en: "The Data We Collect"
        },
        content: [
          {
            fr: "Nous pouvons collecter, utiliser, stocker et transférer différents types de données personnelles vous concernant, que nous avons regroupées comme suit :",
            en: "We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:"
          },
          {
            fr: "<strong>Données d'identité</strong> : prénom, nom, nom d'utilisateur ou identifiant similaire.",
            en: "<strong>Identity Data</strong>: first name, last name, username or similar identifier."
          },
          {
            fr: "<strong>Données de contact</strong> : adresse e-mail, numéro de téléphone, adresse postale.",
            en: "<strong>Contact Data</strong>: email address, telephone number, postal address."
          },
          {
            fr: "<strong>Données techniques</strong> : adresse IP, données de connexion, type et version du navigateur, fuseau horaire et emplacement, types et versions de plug-ins du navigateur, système d'exploitation et plate-forme, et autres technologies sur les appareils que vous utilisez pour accéder à notre site web.",
            en: "<strong>Technical Data</strong>: IP address, login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access our website."
          },
          {
            fr: "<strong>Données d'utilisation</strong> : informations sur la façon dont vous utilisez notre site web.",
            en: "<strong>Usage Data</strong>: information about how you use our website."
          },
          {
            fr: "<strong>Données de marketing et de communication</strong> : vos préférences pour recevoir des communications marketing de notre part et de la part de nos tiers, et vos préférences de communication.",
            en: "<strong>Marketing and Communications Data</strong>: your preferences in receiving marketing from us and our third parties and your communication preferences."
          }
        ]
      },
      {
        title: {
          fr: "Comment Nous Utilisons Vos Données",
          en: "How We Use Your Data"
        },
        content: [
          {
            fr: "Nous n'utiliserons vos données personnelles que lorsque la loi nous y autorise. Le plus souvent, nous utiliserons vos données personnelles dans les circonstances suivantes :",
            en: "We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:"
          },
          {
            fr: "- Pour vous fournir des informations sur les clubs d'investissement et les événements que vous avez demandés.",
            en: "- To provide you with information about investment clubs and events that you have requested from us."
          },
          {
            fr: "- Pour gérer notre relation avec vous, notamment en vous informant des modifications apportées à nos conditions ou à notre politique de confidentialité.",
            en: "- To manage our relationship with you which will include notifying you about changes to our terms or privacy policy."
          },
          {
            fr: "- Pour vous permettre de participer à des fonctions interactives de notre service, lorsque vous choisissez de le faire.",
            en: "- To enable you to partake in interactive features of our service, when you choose to do so."
          },
          {
            fr: "- Pour vous envoyer notre newsletter si vous vous y êtes inscrit.",
            en: "- To send you our newsletter if you have subscribed to it."
          }
        ]
      },
      {
        title: {
          fr: "Cookies et Technologies Similaires",
          en: "Cookies and Similar Technologies"
        },
        content: [
          {
            fr: "Nous utilisons des cookies et des technologies similaires pour distinguer vos préférences des autres utilisateurs de notre site web. Cela nous aide à vous offrir une bonne expérience lorsque vous naviguez sur notre site web et nous permet également d'améliorer notre site.",
            en: "We use cookies and similar technologies to distinguish your preferences from other users of our website. This helps us to provide you with a good experience when you browse our website and also allows us to improve our site."
          },
          {
            fr: "Un cookie est un petit fichier de lettres et de chiffres que nous stockons sur votre navigateur ou sur le disque dur de votre ordinateur. Les cookies contiennent des informations qui sont transférées sur le disque dur de votre ordinateur.",
            en: "A cookie is a small file of letters and numbers that we store on your browser or the hard drive of your computer. Cookies contain information that is transferred to your computer's hard drive."
          },
          {
            fr: "Vous pouvez bloquer les cookies en activant le paramètre de votre navigateur qui vous permet de refuser tout ou partie des cookies. Cependant, si vous utilisez les paramètres de votre navigateur pour bloquer tous les cookies (y compris les cookies essentiels), il se peut que vous ne puissiez pas accéder à tout ou partie de notre site.",
            en: "You can block cookies by activating the setting on your browser that allows you to refuse the setting of all or some cookies. However, if you use your browser settings to block all cookies (including essential cookies) you may not be able to access all or parts of our site."
          }
        ]
      },
      {
        title: {
          fr: "Vos Droits",
          en: "Your Rights"
        },
        content: [
          {
            fr: "En vertu de certaines circonstances, vous avez des droits en vertu des lois sur la protection des données concernant vos données personnelles, notamment le droit de :",
            en: "Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:"
          },
          {
            fr: "- <strong>Demander l'accès</strong> à vos données personnelles.",
            en: "- <strong>Request access</strong> to your personal data."
          },
          {
            fr: "- <strong>Demander la correction</strong> de vos données personnelles.",
            en: "- <strong>Request correction</strong> of your personal data."
          },
          {
            fr: "- <strong>Demander l'effacement</strong> de vos données personnelles.",
            en: "- <strong>Request erasure</strong> of your personal data."
          },
          {
            fr: "- <strong>Vous opposer au traitement</strong> de vos données personnelles.",
            en: "- <strong>Object to processing</strong> of your personal data."
          },
          {
            fr: "- <strong>Demander la limitation du traitement</strong> de vos données personnelles.",
            en: "- <strong>Request restriction of processing</strong> of your personal data."
          },
          {
            fr: "- <strong>Demander le transfert</strong> de vos données personnelles.",
            en: "- <strong>Request the transfer</strong> of your personal data."
          },
          {
            fr: "- <strong>Droit de retirer votre consentement</strong> lorsque nous nous appuyons sur le consentement pour traiter vos données personnelles.",
            en: "- <strong>Right to withdraw consent</strong> where we are relying on consent to process your personal data."
          }
        ]
      },
      {
        title: {
          fr: "Contact",
          en: "Contact"
        },
        content: [
          {
            fr: "Si vous avez des questions concernant cette politique de confidentialité ou nos pratiques en matière de confidentialité, veuillez nous contacter à l'adresse suivante : contact@reseauevolvecapital.com",
            en: "If you have any questions about this privacy policy or our privacy practices, please contact us at: contact@reseauevolvecapital.com"
          }
        ]
      }
    ]
  },
  termsOfService: {
    title: {
      fr: "Mentions Légales",
      en: "Legal Notices"
    },
    lastUpdated: "2025-04-12",
    sections: [
      {
        title: {
          fr: "Informations Légales",
          en: "Legal Information"
        },
        content: [
          {
            fr: "<strong>Réseau Evolve Capital</strong>",
            en: "<strong>Réseau Evolve Capital</strong>"
          },
          {
            fr: "Association déclarée conformément à la loi du 1er juillet 1901",
            en: "Association declared in accordance with the French law of July 1, 1901"
          },
          {
            fr: "Siège social : 181 boulevard Macdonald, 75019 Paris, France",
            en: "Headquarters: 181 boulevard Macdonald, 75019 Paris, France"
          },
          {
            fr: "Email : contact@reseauevolvecapital.com",
            en: "Email: contact@reseauevolvecapital.com"
          },
          {
            fr: "Représentant légal : Lionel ZOCLANCLOUNON , Le Président de l'association",
            en: "Legal representative: Lionel ZOCLANCLOUNON, The President of the association"
          }
        ]
      },
      {
        title: {
          fr: "Hébergement",
          en: "Hosting"
        },
        content: [
          {
            fr: "Ce site web est hébergé par GitHub Pages, un service de GitHub, Inc.",
            en: "This website is hosted by GitHub Pages, a service of GitHub, Inc."
          },
          {
            fr: "GitHub, Inc.<br/>88 Colin P Kelly Jr St<br/>San Francisco, CA 94107<br/>United States",
            en: "GitHub, Inc.<br/>88 Colin P Kelly Jr St<br/>San Francisco, CA 94107<br/>United States"
          }
        ]
      },
      {
        title: {
          fr: "Propriété Intellectuelle",
          en: "Intellectual Property"
        },
        content: [
          {
            fr: "L'ensemble de ce site (structure, présentation, textes, logos, images, photographies, vidéos, sons, etc.) constitue une œuvre protégée par la législation française et internationale en vigueur sur le droit d'auteur et, d'une façon générale, sur la propriété intellectuelle.",
            en: "The entire website (structure, presentation, texts, logos, images, photographs, videos, sounds, etc.) constitutes a work protected by French and international legislation in force on copyright and, in general, on intellectual property."
          },
          {
            fr: "Toute reproduction, représentation, utilisation ou adaptation, sous quelque forme que ce soit, de tout ou partie des éléments de ce site, y compris les applications informatiques, sans l'accord préalable et écrit de Réseau Evolve Capital, est strictement interdite et constituerait un délit de contrefaçon.",
            en: "Any reproduction, representation, use or adaptation, in any form whatsoever, of all or part of the elements of this site, including computer applications, without the prior written agreement of Réseau Evolve Capital, is strictly prohibited and would constitute an infringement."
          }
        ]
      },
      {
        title: {
          fr: "Limitation de Responsabilité",
          en: "Limitation of Liability"
        },
        content: [
          {
            fr: "Les informations contenues sur ce site sont aussi précises que possible et le site est périodiquement mis à jour, mais peut toutefois contenir des inexactitudes, des omissions ou des lacunes. Si vous constatez une erreur ou ce qui peut être un dysfonctionnement, merci de nous le signaler par email en décrivant le problème de la manière la plus précise possible.",
            en: "The information contained on this site is as accurate as possible and the site is periodically updated, but may nevertheless contain inaccuracies, omissions or gaps. If you notice an error or what may be a malfunction, please report it by email, describing the problem as precisely as possible."
          },
          {
            fr: "Tout contenu téléchargé se fait aux risques et périls de l'utilisateur et sous sa seule responsabilité. En conséquence, Réseau Evolve Capital ne saurait être tenu responsable d'un quelconque dommage subi par l'ordinateur de l'utilisateur ou d'une quelconque perte de données consécutives au téléchargement.",
            en: "Any downloaded content is done at the user's own risk and under their sole responsibility. Consequently, Réseau Evolve Capital cannot be held responsible for any damage suffered by the user's computer or any loss of data resulting from the download."
          },
          {
            fr: "Les liens hypertextes mis en place sur ce site internet en direction d'autres sites internet ne sauraient engager la responsabilité de Réseau Evolve Capital, notamment quant au contenu de ces sites.",
            en: "The hypertext links set up on this website to other websites cannot engage the responsibility of Réseau Evolve Capital, particularly with regard to the content of these sites."
          }
        ]
      },
      {
        title: {
          fr: "Loi Applicable et Juridiction",
          en: "Applicable Law and Jurisdiction"
        },
        content: [
          {
            fr: "Les présentes mentions légales et conditions d'utilisation du site sont soumises au droit français. En cas de litige relatif à l'interprétation, l'exécution ou la résiliation des présentes, les tribunaux de Paris seront seuls compétents.",
            en: "These legal notices and terms of use of the site are subject to French law. In the event of a dispute relating to the interpretation, execution or termination of these, the courts of Paris will have exclusive jurisdiction."
          }
        ]
      }
    ]
  }
}; 