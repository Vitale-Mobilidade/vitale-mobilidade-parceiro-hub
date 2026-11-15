import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { adminCall } from "@/lib/admin-api";

export function PodcastCoverEditor({
  id,
  revision,
  title,
}: {
  id: string;
  revision: number;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [previewRevision, setPreviewRevision] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const generate = useMutation({
    mutationFn: (requestedRevision: number) =>
      adminCall<{ image: string }>("podcast-cover-generate", {
        id,
        revision: requestedRevision,
      }),
    onSuccess: ({ image: generated }, requestedRevision) => {
      setImage(generated);
      setPreviewRevision(requestedRevision);
    },
  });
  const apply = useMutation({
    mutationFn: () =>
      adminCall("podcast-cover-apply", {
        id,
        revision: previewRevision,
        image,
      }),
    onSuccess: () => {
      setImage(null);
      setSaved(true);
    },
  });
  const busy = generate.isPending || apply.isPending;
  const error = generate.error ?? apply.error;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Capa do podcast
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capa do podcast</DialogTitle>
          <DialogDescription>{title} · 1:1</DialogDescription>
        </DialogHeader>
        {image && (
          <img
            src={image}
            alt="Prévia da capa quadrada do podcast"
            className="w-full max-w-72 rounded-md"
          />
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm">
            Capa do podcast atualizada.
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setSaved(false);
              apply.reset();
              generate.mutate(revision);
            }}
          >
            {generate.isPending ? "Gerando no Lovable…" : "Gerar prévia com IA"}
          </Button>
          <Button
            type="button"
            disabled={busy || !image}
            onClick={() => apply.mutate()}
          >
            {apply.isPending ? "Salvando…" : "Salvar capa do podcast"}
          </Button>
        </DialogFooter>
        <p className="text-sm text-muted-foreground">
          Gerar com IA usa créditos.
        </p>
      </DialogContent>
    </Dialog>
  );
}
