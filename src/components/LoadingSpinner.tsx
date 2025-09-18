'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text, 
  className 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn('flex items-center justify-center space-x-2', className)}
    >
      <Loader2 className={cn('animate-spin text-primary-500', sizeClasses[size])} />
      {text && (
        <span className="text-sm text-gray-600 animate-pulse">{text}</span>
      )}
    </motion.div>
  );
};

export default LoadingSpinner;
