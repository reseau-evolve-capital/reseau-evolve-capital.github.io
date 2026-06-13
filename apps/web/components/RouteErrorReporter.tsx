'use client'
import { useEffect } from 'react'

import * as Sentry from '@sentry/nextjs'

interface Props {
  error: Error & { digest?: string }
  routeSegment?: string
}

export function RouteErrorReporter({ error, routeSegment }: Props) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { route_segment: routeSegment },
    })
  }, [error, routeSegment])

  return null
}
