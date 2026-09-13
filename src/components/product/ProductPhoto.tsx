"use client";

import { useEffect, useState } from "react";
import { productImage } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

/** Product image with a branded placeholder when the photo is missing or fails. */
export function ProductPhoto({
  src,
  alt,
  title,
  className,
  width,
  height,
  sizes,
}: {
  src?: string | null;
  alt: string;
  title?: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
}) {
  const fallback = productImage(title || alt);
  const [current, setCurrent] = useState(src || fallback);

  useEffect(() => {
    setCurrent(src || fallback);
  }, [src, fallback]);

  return (
    <img
      src={current}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
      className={cn(className)}
    />
  );
}
