'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const Switch = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      role="switch"
      ref={ref}
      className={cn('h-5 w-9 rounded-full accent-zinc-900 dark:accent-zinc-50', className)}
      {...props}
    />
  )
);
Switch.displayName = 'Switch';
export { Switch };
