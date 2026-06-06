// Déclaration de types locale pour jest-axe (pas de @types/jest-axe publié pour v9)
declare module 'jest-axe' {
  export interface JestAxeConfigureOptions {
    rules?: Record<string, { enabled: boolean }>
    runOnly?: { type: string; values: string[] }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AxeResults = any

  export function configureAxe(options?: JestAxeConfigureOptions): typeof axe
  export function axe(
    html: Element | string,
    options?: JestAxeConfigureOptions
  ): Promise<AxeResults>
  export const toHaveNoViolations: {
    toHaveNoViolations(results: AxeResults): { pass: boolean; message: () => string }
  }
}

// Augmentation de vitest pour toHaveNoViolations
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<R = unknown> {
    toHaveNoViolations(): R
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
