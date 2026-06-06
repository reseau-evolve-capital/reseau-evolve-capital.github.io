import { type LocalizedText } from './site-config';

type FormField = {
  label: LocalizedText;
  type: 'text' | 'email' | 'textarea' | 'select';
  required: boolean;
  options?: LocalizedText[];
};

type FormConfig = {
  form: {
    title: LocalizedText;
    fields: FormField[];
    submitButton: LocalizedText;
  };
};

export const formConfig: FormConfig = {
    "form": {
      "title": {
        "fr": "Écrivez-nous",
        "en": "Write to Us"
      },
      "fields": [
        {
          "label": { "fr": "Nom", "en": "Name" },
          "type": "text",
          "required": true
        },
        {
          "label": { "fr": "Adresse e-mail", "en": "Email address" },
          "type": "email",
          "required": true
        },
        {
          "label": { "fr": "Objet de votre message", "en": "Subject of your message" },
          "type": "select",
          "options": [
            { "fr": "Rejoindre un club", "en": "Join a club" },
            { "fr": "Proposer un partenariat", "en": "Propose a partnership" },
            { "fr": "Demander des informations", "en": "Request information" },
            { "fr": "Autre", "en": "Other" }
          ],
          "required": true
        },
        {
          "label": { "fr": "Votre message", "en": "Your message" },
          "type": "textarea",
          "required": true
        }
      ],
      "submitButton": {
        "fr": "Envoyer le message",
        "en": "Send Message"
      }
    }
  }