"use client";

import Image from "next/image";

export function FaturaFiLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="FaturaFi"
      width={size}
      height={size}
      priority
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
