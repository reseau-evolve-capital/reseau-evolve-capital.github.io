import * as React from 'react'
import { Button, type ButtonSize } from '../Button'
import { Icon, type IconName } from '../Icon'

export interface IconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  icon: IconName
  'aria-label': string
  size?: ButtonSize
  variant?: 'ghost' | 'secondary'
}

export function IconButton({ icon, size = 'md', variant = 'ghost', ...props }: IconButtonProps) {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20
  return (
    <Button variant={variant} size={size} {...props}>
      <Icon name={icon} size={iconSize} />
    </Button>
  )
}
