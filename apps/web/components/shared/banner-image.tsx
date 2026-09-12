"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface BannerImageProps {
  /** Path under `public/` */
  src: string;
  /** Which part of the picture the crop keeps */
  objectPosition: string;
  /** Width hint for the responsive image set */
  sizes: string;
}

/**
 * A decorative scene filling its positioned parent. It stays transparent until the file has loaded,
 * then fades in over the parent's tint, so a slow connection sees a colour settle into a picture
 * rather than a white box snapping into one.
 * @param src - Path of the picture
 * @param objectPosition - Part of the picture the crop keeps
 * @param sizes - Width hint for the responsive image set
 * @returns The image
 */
export function BannerImage({ src, objectPosition, sizes }: BannerImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Image
      src={src}
      alt=""
      fill
      preload
      sizes={sizes}
      onLoad={() => setIsLoaded(true)}
      // `preload` often finishes the file before React hydrates, and a load event fired before
      // hydration is never delivered - the picture would then stay transparent for good. The ref
      // runs at hydration and catches that case.
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0) setIsLoaded(true);
      }}
      style={{ objectPosition }}
      className={cn(
        "object-cover opacity-0 transition-opacity duration-[var(--duration-slow)] ease-out-soft",
        isLoaded && "opacity-100"
      )}
    />
  );
}
