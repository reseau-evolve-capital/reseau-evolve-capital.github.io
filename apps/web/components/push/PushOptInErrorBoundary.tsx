'use client'

import { Component, type ReactNode } from 'react'

/**
 * Garde anti-crash (PUSH-001) : une erreur dans le pre-prompt push ne doit JAMAIS faire
 * tomber le dashboard. On avale l'erreur et on ne rend rien. (Mirror PWA-001.)
 */
export class PushOptInErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(): void {
    // Silencieux : le pre-prompt est non-critique (l'in-app couvre la découverte des votes).
  }

  render(): ReactNode {
    if (this.state.hasError) return null
    return this.props.children
  }
}
