"use client";

import { useEffect, useMemo, useState } from "react";

type CardImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  fallbackClassName?: string;
};

function buildFallbacks(src: string) {
  const fallbacks: string[] = [];

  if (src.includes("https://assets.tcgdex.net/fr/")) {
    fallbacks.push(src.replace("/fr/", "/en/"));
  }

  if (src.includes("/high.webp")) {
    fallbacks.push(src.replace("/high.webp", "/low.webp"));
    fallbacks.push(src.replace("/high.webp", "/high.png"));
  }

  return Array.from(new Set(fallbacks.filter((url) => url !== src)));
}

export default function CardImage({
  src,
  alt,
  className,
  fallbackText,
  fallbackClassName,
}: CardImageProps) {
  const fallbacks = useMemo(() => buildFallbacks(src), [src]);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setFallbackIndex(0);
    setFailed(false);
  }, [src]);

  if (failed) {
    return fallbackText ? (
      <span className={fallbackClassName}>{fallbackText}</span>
    ) : null;
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        const nextSrc = fallbacks[fallbackIndex];

        if (!nextSrc) {
          setFailed(true);
          return;
        }

        setCurrentSrc(nextSrc);
        setFallbackIndex((index) => index + 1);
      }}
    />
  );
}
