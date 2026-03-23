"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type LogoProps = {
  variant: 'square' | 'long';
  className?: string;
  priority?: boolean;
};

export function Logo({ variant, className, priority = false }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const src = variant === 'square'
    ? (isDark ? '/nsd_dark_logo.png' : '/nsd_light_logo.png')
    : (isDark ? '/nsd_dark_long_logo.png' : '/nsd_light_long_logo.png');

  const width = variant === 'square' ? 150 : 400;
  const height = variant === 'square' ? 150 : 120;

  const imgClass = variant === 'square'
    ? 'h-[150px] w-[150px] object-contain'
    : 'h-[120px] w-auto object-contain object-left';

  return (
    <Image
      src={src}
      alt="Never Stop Dreaming"
      width={width}
      height={height}
      className={cn(imgClass, className)}
      priority={priority}
    />
  );
}
