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
import { Textarea } from "@/components/ui/textarea";
import { adminCall } from "@/lib/admin-api";
import { formatPodcastDateTime } from "@/lib/podcast-dashboard-clock";
import type { InstagramSingleItem } from "../../../supabase/functions/_shared/instagram-single-contract";

type CoverPreview = { previewId: string; imageUrl: string };
const captionLimit = 2200;

export function InstagramPostEditor({
  item,
  onSaved,
}: {
  item: InstagramSingleItem;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState(item.caption);
  const [preview, setPreview] = useState<CoverPreview | null>(null);
  const [fingerprint, setFingerprint] = useState(item.fingerprint);
  const edit = useMutation({
    mutationFn: async (action: "caption" | "cover" | "save") => {
      const revision = { id: item.id, fingerprint };
      if (action === "caption") {
        const result = await adminCall<{ caption: string }>(
          "instagram-single-edit-caption",
          revision,
        );
        setCaption(result.caption);
      } else if (action === "cover") {
        const result = await adminCall<CoverPreview>(
          "instagram-single-edit-cover",
          revision,
        );
        setPreview(result);
      } else {
        await adminCall("instagram-single-edit-save", {
          ...revision,
          ...(caption !== item.caption ? { caption } : {}),
          ...(preview ? { previewId: preview.previewId } : {}),
        });
      }
      return action;
    },
    onSuccess: (action) => {
      if (action === "save") {
        setOpen(false);
        onSaved();
      }
    },
  });
  const changeOpen = (next: boolean) => {
    if (edit.isPending) return;
    if (next) {
      setCaption(item.caption);
      setFingerprint(item.fingerprint);
      setPreview(null);
      edit.reset();
    }
    setOpen(next);
  };
  const changed =
    fingerprint === item.fingerprint &&
    Boolean(preview || caption !== item.caption);
  const imageUrl = preview?.imageUrl ?? item.imageUrl;
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Editar post</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar post</DialogTitle>
          <DialogDescription>
            {item.title}
            {item.due_at && (
              <> · {formatPodcastDateTime(item.due_at)} (São Paulo)</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <div className="space-y-2">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={preview ? "Prévia da nova capa" : "Capa atual"}
                className="w-full max-w-52 rounded-md"
              />
            )}
            <Button
              type="button"
              variant="outline"
              disabled={edit.isPending || fingerprint !== item.fingerprint}
              onClick={() => edit.mutate("cover")}
            >
              Gerar nova capa com IA
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                disabled={edit.isPending}
                onClick={() => setPreview(null)}
              >
                Usar capa atual
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-semibold"
              htmlFor="instagram-edit-caption"
            >
              Legenda
            </label>
            <Textarea
              id="instagram-edit-caption"
              className="min-h-48"
              value={caption}
              maxLength={captionLimit}
              disabled={edit.isPending}
              onChange={(event) => setCaption(event.currentTarget.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={edit.isPending || fingerprint !== item.fingerprint}
                onClick={() => edit.mutate("caption")}
              >
                Regenerar legenda com IA
              </Button>
              <span className="text-xs text-muted-foreground">
                {caption.length} / {captionLimit}
              </span>
            </div>
          </div>
        </div>
        {edit.isPending && (
          <p role="status" className="text-sm">
            {edit.variables === "cover"
              ? "Gerando capa no Lovable…"
              : edit.variables === "caption"
                ? "Gerando legenda…"
                : "Salvando…"}
          </p>
        )}
        {fingerprint !== item.fingerprint && (
          <p role="alert" className="text-sm text-destructive">
            O post mudou. Feche e reabra o editor para carregar a versão mais
            recente.
          </p>
        )}
        {edit.error && (
          <p role="alert" className="text-sm text-destructive">
            {edit.error.message}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={edit.isPending}
            onClick={() => changeOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={edit.isPending || !changed || !caption.trim()}
            onClick={() => edit.mutate("save")}
          >
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
