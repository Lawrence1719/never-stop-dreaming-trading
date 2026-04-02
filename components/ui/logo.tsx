"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type LogoProps = {
  variant: 'square' | 'long';
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  zoom?: number;
};

export function Logo({ variant, className, priority = false, width: customWidth, height: customHeight, zoom }: LogoProps) {
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

  const intrinsicWidth = variant === 'square' ? 48 : 180;
  const intrinsicHeight = variant === 'square' ? 48 : 45;
  const width = customWidth ?? intrinsicWidth;
  const height = customHeight ?? intrinsicHeight;
  const scale = zoom ?? (variant === "square" ? 2.2 : 2.6);
  const transformOrigin = "center";
  const wrapperClassName = cn(
    "relative inline-flex shrink-0 overflow-hidden",
    variant === "square" ? "items-center justify-center" : "items-center justify-start",
    className
  );

  if (!mounted) {
    return (
      <span
        className={wrapperClassName}
        style={{ width, height, backgroundColor: "transparent" }}
        aria-label="Never Stop Dreaming"
      />
    );
  }

  return (
    <span
      className={wrapperClassName}
      style={{ width, height, backgroundColor: "transparent" }}
      aria-label="Never Stop Dreaming"
    >
      <Image
        src={src}
        alt="Never Stop Dreaming"
        width={width}
        height={height}
        sizes={`${width}px`}
        style={{
          width,
          height,
          objectFit: "contain",
          transform: `scale(${scale})`,
          transformOrigin,
        }}
        priority={priority}
      />
    </span>
  );
}
