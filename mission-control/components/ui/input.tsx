import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-full rounded-md border border-dark-border bg-dark-panel2 px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
