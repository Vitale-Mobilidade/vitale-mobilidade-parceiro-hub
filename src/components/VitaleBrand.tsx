import coverAsset from "@/assets/vitale-cover.png.asset.json";
import logoAsset from "@/assets/vitale-logo.png.asset.json";

interface VitaleBrandProps {
  variant?: "logo" | "cover";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Marca Vitale Mobilidade.
 * - variant="cover": banner com bikes (usado na capa/intro).
 * - variant="logo" (default): logo discreto (200px) para uso interno no quiz.
 */
export function VitaleBrand({ variant = "logo", size = "md", className = "" }: VitaleBrandProps) {
  if (variant === "cover") {
    const sizes = {
      sm: "max-w-[260px] sm:max-w-xs",
      md: "max-w-sm sm:max-w-md",
      lg: "max-w-md sm:max-w-lg",
    } as const;
    return (
      <img
        src={coverAsset.url}
        alt="Vitale Mobilidade - bikes elétricas"
        width={1030}
        height={440}
        loading="eager"
        decoding="async"
        className={`w-full h-auto mx-auto ${sizes[size]} ${className}`}
      />
    );
  }
  return (
    <img
      src={logoAsset.url}
      alt="Vitale Mobilidade"
      width={200}
      height={62}
      loading="eager"
      decoding="async"
      className={`h-auto mx-auto opacity-90 ${className}`}
      style={{ width: 200, maxWidth: "100%" }}
    />
  );
}
