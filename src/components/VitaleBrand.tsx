interface VitaleBrandProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Marca textual "Vitale Mobilidade" — usada no quiz para reforçar identidade
 * sem depender de logo pixelizado.
 */
export function VitaleBrand({ size = "md", className = "" }: VitaleBrandProps) {
  const sizes = {
    sm: "text-base",
    md: "text-xl lg:text-2xl",
    lg: "text-3xl lg:text-4xl",
  } as const;
  return (
    <span className={`font-bold tracking-tight ${sizes[size]} ${className}`}>
      <span className="text-primary">Vitale</span>{" "}
      <span className="text-foreground/80">Mobilidade</span>
    </span>
  );
}
