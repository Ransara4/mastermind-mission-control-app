'use client';

import * as React from 'react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType>({
  isOpen: false,
  setIsOpen: () => {},
});

function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setIsOpen, isOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-dark-border bg-dark-panel2 px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple ${className || ''}`}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      {children}
      <svg className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  return <span>{value || placeholder}</span>;
}

function SelectContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;
  return (
    <div
      ref={ref}
      className={`absolute z-50 mt-1 w-full rounded-md border border-dark-border bg-dark-panel2 shadow-lg shadow-black/30 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  );
}

function SelectItem({
  value,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { onValueChange, setIsOpen, value: selectedValue } = React.useContext(SelectContext);
  return (
    <div
      className={`cursor-pointer px-3 py-2 text-sm text-dark-text hover:bg-cm-purple/10 ${
        selectedValue === value ? 'bg-cm-purple/10 font-medium' : ''
      } ${className || ''}`}
      onClick={() => {
        onValueChange?.(value);
        setIsOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
