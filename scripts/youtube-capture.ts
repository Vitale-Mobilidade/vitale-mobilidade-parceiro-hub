/** One-shot source pilot; credentials come from a private local file, never CLI arguments. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { youtubeTokenProvider } from "../supabase/functions/_shared/youtube-oauth.ts";
import {
  captureYoutubeTranscript,
  TranscriptError,
} from "../supabase/functions/_shared/youtube-transcript.ts";

async function main() {
  const [credentialsPath, videoId, outputDirectory] = process.argv.slice(2);
  if (!credentialsPath || !videoId || !outputDirectory)
    throw new Error(
      "usage: youtube-capture <private-credentials-file> <video-id> <private-output-directory>",
    );
  const credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
  let accessToken = credentials.access_token;
  if (
    credentials.refresh_token &&
    credentials.client_id &&
    credentials.client_secret
  ) {
    accessToken = await youtubeTokenProvider({
      clientId: credentials.client_id,
      clientSecret: credentials.client_secret,
      refreshToken: credentials.refresh_token,
    })();
  }
  const capture = await captureYoutubeTranscript({ videoId, accessToken });
  const directory = resolve(outputDirectory);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(resolve(directory, `${videoId}.vtt`), capture.originalVtt, {
    mode: 0o600,
  });
  await writeFile(
    resolve(directory, `${videoId}.json`),
    JSON.stringify(capture, null, 2),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      videoId,
      source: capture.source,
      language: capture.language,
      trackKind: capture.trackKind,
      cues: capture.cues.length,
      characters: capture.transcript.length,
    }),
  );
}
main().catch((error) => {
  // Do not print bodies from provider responses, credentials, authorization codes or tokens.
  console.error(
    error instanceof TranscriptError ? error.code : "youtube_capture_failed",
  );
  process.exitCode = 1;
});
