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
    'relative overflow-hidden bg-aegis-lime text-[#050806] font-semibold',
    'hover:bg-aegis-lime-bright shadow-[0_0_20px_rgba(168,224,99,0.35)]',
    'hover:shadow-[0_0_35px_rgba(168,224,99,0.55)]',
    'active:scale-[0.98]',
    'transition-all duration-300',
  ].join(' '),

  ghost: [
    'bg-transparent text-aegis-off',
    'hover:bg-[rgba(168,224,99,0.06)] hover:text-aegis-white',
    'border border-transparent hover:border-[rgba(168,224,99,0.15)]',
    'transition-all duration-200',
  ].join(' '),

  outline: [
    'bg-[rgba(9,20,13,0.7)] text-aegis-lime',
    'border border-aegis-lime/30 backdrop-blur-md',
    'hover:border-aegis-lime/70 hover:bg-[rgba(168,224,99,0.1)]',
    'hover:shadow-[0_0_20px_rgba(168,224,99,0.25)]',
    'active:scale-[0.98]',
    'transition-all duration-300',
  ].join(' '),

  danger: [
    'bg-[rgba(224,80,80,0.08)] text-aegis-red',
    'border border-aegis-red/40',
    'hover:border-aegis-red hover:bg-aegis-red/15',
    'transition-all duration-200',
  ].join(' '),
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-4 text-xs gap-1.5 rounded-full font-mono tracking-wide',
  md: 'h-10 px-5 text-sm gap-2 rounded-full font-medium tracking-wide',
  lg: 'h-12 px-7 text-sm gap-2.5 rounded-full font-medium tracking-wide',
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
