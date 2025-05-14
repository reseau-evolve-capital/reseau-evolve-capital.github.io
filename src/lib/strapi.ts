import { strapi } from '@strapi/client';

// Configuration for the Strapi client
const strapiClient = strapi({
  baseURL: `${process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337/api'}`,
  // If an API token is provided, use it for authentication
  ...(process.env.NEXT_PUBLIC_STRAPI_API_TOKEN && {
    auth: process.env.NEXT_PUBLIC_STRAPI_API_TOKEN,
  }),
});

export default strapiClient; 