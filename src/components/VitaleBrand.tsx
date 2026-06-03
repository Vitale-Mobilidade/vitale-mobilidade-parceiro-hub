import coverAsset from "@/assets/vitale-cover.png.asset.json";

interface VitaleBrandProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Capa visual "Vitale Mobilidade" — banner com bikes elétricas e logo.
 */
export function VitaleBrand({ size = "md", className = "" }: VitaleBrandProps) {
  const sizes = {
    sm: "max-w-[260px] sm:max-w-xs",
    md: "max-w-xs sm:max-w-md",
    lg: "max-w-sm sm:max-w-lg",
  } as const;
  return (
    <img
      src={coverAsset.url}
      alt="Vitale Mobilidade - bikes elétricas"
      width={1030}
      height={440}
      loading="eager"
      decoding="async"
      className={`w-full h-auto ${sizes[size]} ${className}`}
    />
  );
}
