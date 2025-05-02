# Blog Feature for Reseau Evolve Capital Website

This document explains how to use and configure the blog feature that's powered by Strapi CMS.

## Overview

The blog feature uses [Strapi](https://strapi.io) as a headless CMS to manage blog content. The Strapi instance is set up in the `./content` directory and provides a REST API that the Next.js frontend consumes to display blog articles.

## Setup & Configuration

### Prerequisites

- Node.js 18+ installed
- Strapi instance running in the `./content` directory

### Environment Variables

Create a `.env.local` file in the root of the project with the following variables:

```
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337/api
NEXT_PUBLIC_STRAPI_API_TOKEN=your-api-token-here
```

For production, make sure to update these values to point to your production Strapi instance.

### Starting the Strapi Backend

To start the Strapi backend:

```bash
cd content
npm run develop
```

This will start the Strapi admin panel at `http://localhost:1337/admin`.

### Running the Next.js Frontend

With the Strapi backend running, you can start the Next.js frontend:

```bash
npm run dev
```

## Content Management

### Creating Articles

1. Log in to the Strapi admin panel
2. Navigate to "Content Manager" > "Articles"
3. Click "Create new entry"
4. Fill in the following fields:
   - Title: The article title
   - Slug: URL-friendly version of the title (auto-generated, but can be customized)
   - Excerpt: A brief summary of the article
   - Content: The main content using the block editor
   - Featured Image: The main image for the article
   - Category: The article category
   - Author: The article author
   - Tags: Relevant tags
   - SEO Meta Title: Title for SEO (defaults to article title if left blank)
   - SEO Meta Description: Description for SEO (defaults to excerpt if left blank)
5. Click "Save" and "Publish" when ready

### Managing Categories

1. Navigate to "Content Manager" > "Categories"
2. Create categories with names and descriptions
3. Articles can then be assigned to these categories

### Authors

1. Navigate to "Content Manager" > "Authors"
2. Create authors with names, bios, avatars, and social media links

## Internationalization

The blog supports multiple languages:

- French (fr) - Default
- English (en)

When creating content, you can switch between languages using the locale selector in the top-right corner of the Strapi admin.

## Static Site Generation

The blog is configured for static site generation with Next.js:

- The main blog page is generated for each configured locale
- Individual article pages are generated for each published article
- Category pages are generated for each category

During the build process, the `generateStaticParams` functions in each page component determine which pages to pre-render.

## Customization

### Styling

Blog components use Tailwind CSS for styling. The main styling for:

- Blog cards: `src/components/blog/BlogCard.tsx`
- Category list: `src/components/blog/CategoryList.tsx`
- Content rendering: `src/components/blog/BlocksRenderer.tsx`

### Content Blocks

Content is rendered using the `@strapi/blocks-react-renderer` package, which handles Strapi's block-based content. Custom styling for blocks can be adjusted in the `BlocksRenderer.tsx` component.

## Troubleshooting

### API Connection Issues

If the frontend cannot connect to the Strapi API:

1. Ensure the Strapi server is running
2. Check that environment variables are correctly set
3. Verify that the API token has the proper permissions in Strapi

### Missing Images

If images are not appearing:

1. Check that media in Strapi is properly uploaded
2. Ensure the `NEXT_PUBLIC_STRAPI_URL` environment variable is correctly set
3. Verify that the Next.js app has access to the Strapi media files

## Further Development

Ideas for extending the blog feature:

- Add a search function for articles
- Implement pagination for the article list
- Add comments functionality
- Create a related articles component
- Implement reading time estimation
- Add social media sharing buttons 