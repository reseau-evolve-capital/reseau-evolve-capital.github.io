'use client'

import { useEffect } from 'react'
import { analyticsEvents } from '@/lib/analytics'

interface BlogArticleTrackerProps {
  slug: string
  category?: string
}

export function BlogArticleTracker({ slug, category }: BlogArticleTrackerProps) {
  useEffect(() => {
    analyticsEvents.blog.articleRead(slug, category)
  }, [slug, category])
  return null
}
