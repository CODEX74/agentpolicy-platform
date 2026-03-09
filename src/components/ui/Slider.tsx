'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const Slider = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      type="range"
      ref={ref}
      className={cn('w-full accent-zinc-900 dark:accent-zinc-50', className)}
      {...props}
    />
  )
);
Slider.displayName = 'Slider';
export { Slider };
