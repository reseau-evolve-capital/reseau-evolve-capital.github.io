import type { StorybookConfig } from '@storybook/nextjs-vite'
import tailwindcss from '@tailwindcss/vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  docs: { autodocs: 'tag' },
  viteFinal: async (config) => {
    config.plugins = config.plugins ?? []
    config.plugins.push(tailwindcss())
    return config
  },
}

export default config
