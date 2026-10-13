import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceAlertDialog } from "@/components/radar/PriceAlertDialog";

/** Alert reference comes only from the current public Radar price, never the quiz budget. */
export function QuizPriceAlert({
  bikeId,
  bikeName,
  currentPrice,
  onOpen,
}: {
  bikeId: string;
  bikeName: string;
  currentPrice?: number;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (
    typeof currentPrice !== "number" ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0
  )
    return null;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="mt-3 min-h-12 w-full gap-2 whitespace-normal rounded-xl border-action text-action hover:bg-mint/20"
        aria-label={`Avise-me quando o preço de ${bikeName} baixar`}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" /> Avise-me
        quando o preço baixar
      </Button>
      {open && (
        <PriceAlertDialog
          open={open}
          onOpenChange={setOpen}
          bikeId={bikeId}
          bikeName={bikeName}
          currentPrice={currentPrice}
        />
      )}
    </>
  );
}
