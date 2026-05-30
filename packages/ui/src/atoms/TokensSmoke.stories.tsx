import type { Meta, StoryObj } from '@storybook/react'

const SmokeTest = () => (
  <div className="bg-card p-6 rounded-md shadow-card min-h-[200px]">
    <div className="bg-brand-yellow text-accent-ink p-4 rounded-md mb-4 font-display font-bold text-[18px]">
      bg-brand-yellow · text-accent-ink · font-display (Tommy Soft)
    </div>
    <div className="text-data-negative font-semibold text-[16px] mb-4">
      text-data-negative (perte — jamais brand-red)
    </div>
    <div className="text-data-positive font-semibold text-[16px] mb-4">
      text-data-positive (gain)
    </div>
    <div className="border border-border rounded-md p-3">
      <input
        className="w-full outline-none bg-transparent text-text placeholder:text-text-ter font-mono text-[13px]"
        placeholder="font-mono · border-border · focus → shadow-glow"
        onFocus={(e) => (e.target.style.boxShadow = 'var(--sh-glow)')}
        onBlur={(e) => (e.target.style.boxShadow = 'none')}
      />
    </div>
  </div>
)

const meta: Meta<typeof SmokeTest> = {
  title: 'Tokens/SmokeTest',
  component: SmokeTest,
  tags: ['autodocs'],
}
export default meta

export const LightMode: StoryObj<typeof SmokeTest> = {}
export const DarkMode: StoryObj<typeof SmokeTest> = {
  parameters: { globals: { theme: 'dark' } },
}
