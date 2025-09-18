'use client';

import { Toaster as Sonner } from 'sonner';
import { theme } from '@/lib/theme';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-text-primary group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-text-secondary',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-background-secondary group-[.toast]:text-text-secondary',
        },
        style: {
          background: theme.colors.background,
          color: theme.colors.textPrimary,
          border: `1px solid ${theme.colors.border}`,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
