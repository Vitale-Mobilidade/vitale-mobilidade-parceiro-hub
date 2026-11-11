import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminCall, type ArticleRow } from "@/lib/admin-api";
import { getReleasedPodcastAudio } from "@/lib/editorial.functions";
import { podcastArticleEpisodeUrl } from "@/lib/podcast-editorial";
import {
  hasMp3Signature,
  PODCAST_AUDIO_BUCKET,
  validPodcastAudioName,
  validPodcastAudioSize,
} from "../../../supabase/functions/_shared/podcast-audio-contract";

type WorkDriveCandidate = { status: "ready"; fileName: string; size: number; sourceId: string };
type WorkDriveResult = WorkDriveCandidate | {
  status: "already_attached" | "imported" | "folder_missing" | "audio_missing" | "review";
};

type AudioInfo = { fileName: string; size: number };
type AudioStatus =
  { enabled: false } | { enabled: true; audio: AudioInfo | null };

const actionClass =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50";

export function VideoPodcastAudio({ videoId, article }: {
  videoId: string;
  article?: ArticleRow;
}) {
  const client = useQueryClient();
  const queryKey = ["admin", "podcast-audio", videoId] as const;
  const status = useQuery({
    queryKey,
    queryFn: () =>
      adminCall<AudioStatus>("podcast-audio-status", { youtubeId: videoId }),
    retry: false,
  });
  const articleEpisodeUrl = article?.status === "published" && article.slug
    ? podcastArticleEpisodeUrl(article.slug)
    : null;
  const release = useQuery({
    queryKey: ["admin", "podcast-episode-link", videoId],
    queryFn: () => getReleasedPodcastAudio({ data: videoId }),
    enabled: !!articleEpisodeUrl && status.data?.enabled === true,
    retry: false,
  });
  const episodeUrl = release.data ? articleEpisodeUrl : null;
  const [copyFeedback, setCopyFeedback] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"upload" | "preview" | "workdrive" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState<WorkDriveCandidate | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const transferred = useRef<{ file: File; uploadId: string } | null>(null);

  function selectFiles(files: FileList | null) {
    if (busy || !files?.length) return;
    const count = files.length;
    const candidate = files[0];
    setFile(null);
    transferred.current = null;
    if (input.current) input.current.value = "";
    setMessage("");
    if (count !== 1) {
      setError("Selecione um MP3 por vídeo.");
      return;
    }
    if (
      !validPodcastAudioName(candidate.name.trim()) ||
      !validPodcastAudioSize(candidate.size)
    ) {
      setError("Selecione um arquivo MP3 de até 50 MB.");
      return;
    }
    setError("");
    setFile(candidate);
  }

  async function upload() {
    if (!file || busy) return;
    setBusy("upload");
    setError("");
    setMessage("");
    try {
      const fileName = file.name.trim();
      if (
        !validPodcastAudioName(fileName) ||
        !validPodcastAudioSize(file.size) ||
        !(await hasMp3Signature(
          file.size,
          async (start, length) =>
            new Uint8Array(
              await file.slice(start, start + length).arrayBuffer(),
            ),
        ))
      ) {
        throw new Error("Selecione um arquivo MP3 válido de até 50 MB.");
      }
      let saved = transferred.current;
      if (saved?.file !== file) {
        const reservation = await adminCall<{
          uploadId: string;
          path: string;
          token: string;
        }>("podcast-audio-reserve", { youtubeId: videoId, size: file.size });
        const result = await supabase.storage
          .from(PODCAST_AUDIO_BUCKET)
          .uploadToSignedUrl(
            reservation.path,
            reservation.token,
            file.slice(0, file.size, "audio/mpeg"),
            { contentType: "audio/mpeg", cacheControl: "0" },
          );
        if (result.error)
          throw new Error("O envio falhou. Selecione o MP3 e tente novamente.");
        saved = { file, uploadId: reservation.uploadId };
        transferred.current = saved;
      }
      await adminCall<AudioInfo>("podcast-audio-attach", {
        youtubeId: videoId,
        uploadId: saved.uploadId,
        fileName,
        size: file.size,
      });
      void client.invalidateQueries({ queryKey });
      transferred.current = null;
      setPreviewUrl(null);
      setFile(null);
      if (input.current) input.current.value = "";
      setMessage("MP3 anexado a este vídeo.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível anexar o MP3.",
      );
      void client.invalidateQueries({ queryKey });
    } finally {
      setBusy(null);
    }
  }

  async function preview() {
    if (busy) return;
    setBusy("preview");
    setError("");
    try {
      const { url } = await adminCall<{ url: string }>(
        "podcast-audio-preview",
        { youtubeId: videoId },
      );
      setPreviewUrl(url);
    } catch {
      setError("Não foi possível carregar a prévia do áudio.");
    } finally {
      setBusy(null);
    }
  }

  async function workDrive(importAudio: boolean) {
    if (busy || (importAudio && !candidate)) return;
    setBusy("workdrive");
    setError("");
    setMessage("");
    if (!importAudio) setCandidate(null);
    try {
      const result = await adminCall<WorkDriveResult>(
        importAudio ? "podcast-audio-workdrive-import" : "podcast-audio-workdrive-check",
        { youtubeId: videoId, sourceId: candidate?.sourceId, size: candidate?.size },
      );
      if (result.status === "ready") {
        setCandidate(result);
        setMessage(`WorkDrive: ${result.fileName} · ${(result.size / (1024 * 1024)).toFixed(1)} MB`);
        return;
      }
      setCandidate(null);
      setMessage({
        already_attached: "Este vídeo já tem áudio no Admin.",
        imported: "MP3 do WorkDrive anexado.",
        folder_missing: "Nenhuma pasta corresponde ao vídeo.",
        audio_missing: "A pasta ainda não tem MP3.",
        review: "Confira a pasta e deixe um único MP3 final compatível.",
      }[result.status]);
      if (result.status === "imported" || result.status === "already_attached")
        await client.invalidateQueries({ queryKey });
    } catch (failure) {
      setCandidate(null);
      setError(failure instanceof Error ? failure.message : "Não foi possível consultar o WorkDrive.");
    } finally {
      setBusy(null);
    }
  }

  if (status.data?.enabled === false) return null;
  const audio = status.data?.enabled ? status.data.audio : null;
  const label = audio ? "Substituir MP3" : "Anexar MP3";
  return (
    <fieldset
      className="min-w-0 space-y-3 rounded-lg border border-line p-3"
      aria-busy={busy !== null}
    >
      <legend className="px-1 text-sm font-semibold">Áudio do podcast</legend>
      {status.isPending && (
        <p className="text-sm" role="status">
          Consultando o áudio…
        </p>
      )}
      {status.isError && (
        <p className="text-sm text-red-800" role="alert">
          Não foi possível consultar o áudio do podcast.
        </p>
      )}
      {status.data?.enabled && !status.isError && (
        <>
          {episodeUrl && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold">
                Link do episódio
                <input readOnly value={episodeUrl} onFocus={(event) => event.currentTarget.select()}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal" />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <a href={episodeUrl} target="_blank" rel="noopener noreferrer" className={actionClass}>
                  Abrir episódio
                </a>
                <button type="button" className={actionClass} onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(episodeUrl);
                    setCopyFeedback("Link copiado.");
                  } catch {
                    setCopyFeedback("Selecione o endereço para copiar o link.");
                  }
                }}>
                  Copiar link
                </button>
              </div>
              <p role="status" className="text-xs">{copyFeedback}</p>
            </div>
          )}
          {audio && (
            <div className="space-y-2">
              <p className="break-all text-sm">
                {audio.fileName} · {(audio.size / (1024 * 1024)).toFixed(1)} MB
              </p>
              <button
                className={actionClass}
                type="button"
                disabled={!!busy}
                onClick={preview}
              >
                {previewUrl ? "Atualizar prévia" : "Ouvir prévia"}
              </button>
              {previewUrl && (
                <audio
                  controls
                  preload="none"
                  className="w-full"
                  aria-label="Prévia do MP3"
                  src={previewUrl}
                  onError={() =>
                    setError(
                      "Prévia indisponível. Atualize para tentar novamente.",
                    )
                  }
                />
              )}
            </div>
          )}
          {!audio && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={actionClass} disabled={!!busy} onClick={() => workDrive(false)}>
                {busy === "workdrive" ? "Consultando WorkDrive…" : "Consultar WorkDrive"}
              </button>
              {candidate && (
                <button type="button" className={actionClass} disabled={!!busy} onClick={() => workDrive(true)}>
                  Anexar MP3 do WorkDrive
                </button>
              )}
            </div>
          )}
          <div
            className={`rounded-lg border-2 border-dashed p-3 ${dragging ? "border-emerald-600 bg-emerald-50" : "border-line"}`}
            onDragOver={(event) => {
              if (!event.dataTransfer.types.includes("Files")) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = busy ? "none" : "copy";
              if (!busy) setDragging(true);
            }}
            onDragLeave={(event) => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !event.currentTarget.contains(event.relatedTarget)
              )
                setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              selectFiles(event.dataTransfer.files);
            }}
          >
            <p className="mb-2 text-sm font-medium">
              Arraste e solte um MP3 aqui
            </p>
            <input
              ref={input}
              type="file"
              accept=".mp3,audio/mpeg"
              disabled={!!busy}
              aria-label="Escolher arquivo MP3"
              className="block w-full text-sm file:mr-2 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-2 file:font-semibold hover:file:bg-emerald-50"
              onChange={(event) => selectFiles(event.currentTarget.files)}
            />
            {file && (
              <p className="mt-2 break-all text-sm" role="status">
                Selecionado: {file.name}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Até 50 MB. O áudio fica privado.
          </p>
          <button
            className={actionClass}
            type="button"
            disabled={!file || !!busy}
            onClick={upload}
          >
            {busy === "upload" ? "Enviando MP3…" : label}
          </button>
        </>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </fieldset>
  );
}
