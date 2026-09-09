import React from 'react'
import { cn } from '../../lib/utils'

// ─── Button Component ─────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-aegis-lime text-aegis-black font-semibold',
    'hover:bg-aegis-lime-bright',
    'hover:shadow-lime-md',
    'active:scale-[0.98]',
    'transition-all duration-150',
  ].join(' '),

  ghost: [
    'bg-transparent text-aegis-white',
    'hover:bg-aegis-raised hover:text-aegis-lime',
    'border border-transparent hover:border-aegis-border',
    'transition-all duration-150',
  ].join(' '),

  outline: [
    'bg-transparent text-aegis-lime',
    'border border-aegis-lime/40',
    'hover:border-aegis-lime hover:shadow-lime-sm hover:bg-aegis-lime/5',
    'active:scale-[0.98]',
    'transition-all duration-150',
  ].join(' '),

  danger: [
    'bg-transparent text-aegis-red',
    'border border-aegis-red/40',
    'hover:border-aegis-red hover:bg-aegis-red/5',
    'transition-all duration-150',
  ].join(' '),
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-sm',
  md: 'h-10 px-5 text-sm gap-2 rounded',
  lg: 'h-12 px-7 text-sm gap-2.5 rounded-md',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-body font-medium tracking-wide',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-aegis-lime focus-visible:outline-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <LoadingDot />
          {children}
        </span>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

function LoadingDot() {
  return (
    <span className="flex gap-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current animate-pulse"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}
