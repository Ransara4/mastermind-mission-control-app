import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const variantClasses: Record<string, string> = {
  default: 'bg-cm-purple text-white hover:bg-purple2',
  outline: 'border border-dark-border bg-dark-panel hover:bg-dark-panel2 text-dark-text',
  ghost: 'hover:bg-dark-panel2 text-dark-text',
  destructive: 'bg-dark-danger text-white hover:bg-dark-danger/80',
};

const sizeClasses: Record<string, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 px-3 text-sm',
  lg: 'h-12 px-6',
  icon: 'h-10 w-10',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cm-purple disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
