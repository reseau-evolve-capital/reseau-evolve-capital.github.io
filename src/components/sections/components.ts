import type { ComponentType } from 'react'
import type { RenderContext } from './registry'

export type SectionProps<T> = { data: T; ctx: RenderContext }

export const SECTION_COMPONENTS: Record<string, ComponentType<SectionProps<never>>> = {}
