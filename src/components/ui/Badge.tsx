'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-white hover:bg-primary-hover',
        secondary: 'border-transparent bg-primary-light text-primary hover:bg-primary-light/80',
        outline: 'border-border text-text-primary hover:bg-background-secondary',
        success: 'border-transparent bg-semantic-success text-white',
        error: 'border-transparent bg-semantic-error text-white',
        warning: 'border-transparent bg-semantic-warning text-white',
        selected: 'border-transparent bg-highlight-purple text-primary',
        explained: 'border-transparent bg-highlight-green text-green-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean;
  onRemove?: () => void;
}

function Badge({ className, variant, removable, onRemove, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1 -mr-1 h-4 w-4 rounded-full hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-primary"
          type="button"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Remove</span>
        </button>
      )}
    </div>
  );
}

export { Badge, badgeVariants };
