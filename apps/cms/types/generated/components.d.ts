import type { Schema, Struct } from '@strapi/strapi'

export interface BlocsCitation extends Struct.ComponentSchema {
  collectionName: 'components_blocs_citations'
  info: {
    description: 'Exergue / pull-quote. Bordure gauche dor\u00E9e + italique c\u00F4t\u00E9 rendu.'
    displayName: 'Citation'
    icon: 'quote'
  }
  attributes: {
    attribution: Schema.Attribute.String
    texte: Schema.Attribute.Text & Schema.Attribute.Required
  }
}

export interface BlocsCta extends Struct.ComponentSchema {
  collectionName: 'components_blocs_ctas'
  info: {
    description: "Bouton d'appel \u00E0 l'action. url externe OU urlInterne (route connue r\u00E9solue par le renderer). Le \u00AB Lire en ligne \u00BB du mail est r\u00E9solu dynamiquement, pas saisi (cf. EDI-006)."
    displayName: 'CTA'
    icon: 'cursor'
  }
  attributes: {
    libelle: Schema.Attribute.String & Schema.Attribute.Required
    url: Schema.Attribute.String
    urlInterne: Schema.Attribute.Enumeration<['quote-part', 'blog', 'contact', 'espace-membre']>
  }
}

export interface BlocsEtagere extends Struct.ComponentSchema {
  collectionName: 'components_blocs_etageres'
  info: {
    description: "Rubrique \u00AB L'\u00C9tag\u00E8re \u00BB : liste r\u00E9p\u00E9table de recommandations (titre, auteur, pourquoi)."
    displayName: 'Etagere'
    icon: 'bulletList'
  }
  attributes: {
    items: Schema.Attribute.Component<'blocs.etagere-item', true>
  }
}

export interface BlocsEtagereItem extends Struct.ComponentSchema {
  collectionName: 'components_blocs_etagere_items'
  info: {
    description: "Une entr\u00E9e de l'\u00E9tag\u00E8re : titre, auteur, et pourquoi le lire."
    displayName: 'EtagereItem'
    icon: 'book'
  }
  attributes: {
    auteur: Schema.Attribute.String
    pourquoi: Schema.Attribute.Text
    titre: Schema.Attribute.String & Schema.Attribute.Required
  }
}

export interface BlocsGalerie extends Struct.ComponentSchema {
  collectionName: 'components_blocs_galeries'
  info: {
    description: "N images (absorbe \u00AB plus d'images demain \u00BB sans migration). Grille responsive en web, pile verticale en email."
    displayName: 'Galerie'
    icon: 'images'
  }
  attributes: {
    disposition: Schema.Attribute.Enumeration<['grille', 'colonne']> &
      Schema.Attribute.DefaultTo<'grille'>
    images: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required
    legende: Schema.Attribute.String
  }
}

export interface BlocsImage extends Struct.ComponentSchema {
  collectionName: 'components_blocs_images'
  info: {
    description: 'Image unique avec variante sombre optionnelle (rendu <picture> clair/sombre), l\u00E9gende et alt obligatoire.'
    displayName: 'Image'
    icon: 'picture'
  }
  attributes: {
    alt: Schema.Attribute.String & Schema.Attribute.Required
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required
    imageDark: Schema.Attribute.Media<'images'>
    legende: Schema.Attribute.String
  }
}

export interface BlocsLabelRubrique extends Struct.ComponentSchema {
  collectionName: 'components_blocs_label_rubriques'
  info: {
    description: 'Intertitre de rubrique (\u00C9DITO, LA BOUSSOLE\u2026). Rendu = marqueur carr\u00E9 dor\u00E9 + texte sombre (jamais jaune-sur-blanc).'
    displayName: 'LabelRubrique'
    icon: 'hashtag'
  }
  attributes: {
    texte: Schema.Attribute.String & Schema.Attribute.Required
  }
}

export interface BlocsLeChiffre extends Struct.ComponentSchema {
  collectionName: 'components_blocs_le_chiffres'
  info: {
    description: 'Infographie data (g\u00E9n\u00E9r\u00E9e via PROMPT_infographie_le_chiffre.md). Variante claire requise + sombre optionnelle + fallback texte si image bloqu\u00E9e.'
    displayName: 'LeChiffre'
    icon: 'chartBubble'
  }
  attributes: {
    fallbackTexte: Schema.Attribute.String
    imageClaire: Schema.Attribute.Media<'images'> & Schema.Attribute.Required
    imageSombre: Schema.Attribute.Media<'images'>
    legende: Schema.Attribute.String
    source: Schema.Attribute.String
  }
}

export interface BlocsRichText extends Struct.ComponentSchema {
  collectionName: 'components_blocs_rich_texts'
  info: {
    description: 'Prose libre (\u00E9dito, boussole, mot du r\u00E9seau, paragraphe). Champ blocks Strapi rendu en HTML s\u00E9mantique.'
    displayName: 'RichText'
    icon: 'align-left'
  }
  attributes: {
    contenu: Schema.Attribute.Blocks & Schema.Attribute.Required
  }
}

export interface BlocsSeparateur extends Struct.ComponentSchema {
  collectionName: 'components_blocs_separateurs'
  info: {
    description: 'Filet de s\u00E9paration entre rubriques. `style` au cas o\u00F9 (Strapi refuse un composant sans attribut).'
    displayName: 'Separateur'
    icon: 'minus'
  }
  attributes: {
    style: Schema.Attribute.Enumeration<['filet', 'espace']> & Schema.Attribute.DefaultTo<'filet'>
  }
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocs.citation': BlocsCitation
      'blocs.cta': BlocsCta
      'blocs.etagere': BlocsEtagere
      'blocs.etagere-item': BlocsEtagereItem
      'blocs.galerie': BlocsGalerie
      'blocs.image': BlocsImage
      'blocs.label-rubrique': BlocsLabelRubrique
      'blocs.le-chiffre': BlocsLeChiffre
      'blocs.rich-text': BlocsRichText
      'blocs.separateur': BlocsSeparateur
    }
  }
}
