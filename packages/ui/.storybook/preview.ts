import type { Preview } from '@storybook/react'
import '@evolve/design-system/styles/index.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Thème global',
      toolbar: {
        title: 'Thème',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      const theme = (context.globals['theme'] as string) ?? 'light'
      if (typeof document !== 'undefined') {
        document.documentElement.dataset['theme'] = theme
      }
      return Story()
    },
  ],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    a11y: { element: '#storybook-root', config: {}, options: {} },
  },
}

export default preview
