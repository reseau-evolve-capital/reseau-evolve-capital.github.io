'use client'

import { Component, type ReactNode } from 'react'

/**
 * Garde anti-crash (PWA-001, exigence #1) : une erreur dans la bannière d'installation
 * ne doit JAMAIS faire tomber le dashboard. On avale l'erreur et on ne rend rien.
 */
export class InstallBannerErrorBoundary extends Component<
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
    // Silencieux : la bannière est non-critique. (Un provider d'observabilité pourrait
    // logger ici en V1 ; aujourd'hui on ne casse simplement pas l'app.)
  }

  render(): ReactNode {
    if (this.state.hasError) return null
    return this.props.children
  }
}
