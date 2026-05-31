import * as React from 'react'
import { Icon, type IconName } from '../../atoms/Icon'
import { Button } from '../../atoms/Button'
import { cn } from '../../lib/cn'

export interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-[14px] p-8 text-center flex flex-col items-center gap-3',
        className
      )}
    >
      {icon && (
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 text-text-ter">
          <Icon name={icon} size={24} />
        </span>
      )}
      <h2 className="font-display font-bold text-[18px] text-text">{title}</h2>
      {description && <p className="text-[14px] text-text-sec max-w-[42ch]">{description}</p>}
      {action && (
        <Button variant="secondary" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
