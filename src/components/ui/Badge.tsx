'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 shadow-sm hover:shadow-md',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-500 text-white hover:bg-primary-600 hover:scale-105',
        secondary: 'border-transparent bg-purple-100 text-purple-700 hover:bg-purple-200 hover:scale-105',
        outline: 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400',
        success: 'border-transparent bg-green-500 text-white hover:bg-green-600 hover:scale-105',
        error: 'border-transparent bg-red-500 text-white hover:bg-red-600 hover:scale-105',
        warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-600 hover:scale-105',
        selected: 'border-transparent bg-purple-100 text-purple-700 hover:bg-purple-200 hover:scale-105',
        explained: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200 hover:scale-105',
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
          className="ml-2 -mr-1 h-5 w-5 rounded-full hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-all duration-150 hover:scale-110"
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
