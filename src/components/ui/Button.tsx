'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { buttonVariants } from '@/lib/utils/button-variants';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  href?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, href, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));
    if (asChild && href && children) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }
    if (href) {
      return (
        <Link href={href} className={classes} ref={ref as React.Ref<HTMLAnchorElement>}>
          {children}
        </Link>
      );
    }
    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
