/** Local OAuth pilot. Bind only loopback; state + PKCE; no token/code logging. */
import { createServer } from "node:http";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function main() {
  const [clientPath, privateOutput] = process.argv.slice(2);
  if (!clientPath || !privateOutput) throw new Error("arguments_required");
  const document = JSON.parse(await readFile(clientPath, "utf8"));
  const client = document.installed;
  if (!client?.client_id || !client?.client_secret)
    throw new Error("desktop_oauth_client_required");
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(64).toString("base64url");
  let completed = false;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/callback") {
      res.writeHead(404).end();
      return;
    }
    const supplied = Buffer.from(url.searchParams.get("state") ?? "");
    const expected = Buffer.from(state);
    if (
      completed ||
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      res.writeHead(403).end("Autorização inválida.");
      return;
    }
    completed = true;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    try {
      const code = url.searchParams.get("code");
      if (!code || url.searchParams.has("error"))
        throw new Error("authorization_denied");
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: client.client_id,
          client_secret: client.client_secret,
          code,
          code_verifier: verifier,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!response.ok) throw new Error("token_exchange_failed");
      const tokens = await response.json();
      if (!tokens.access_token || !tokens.refresh_token)
        throw new Error("offline_authorization_missing");
      const output = resolve(privateOutput);
      await mkdir(dirname(output), { recursive: true, mode: 0o700 });
      await writeFile(
        output,
        JSON.stringify({
          ...tokens,
          client_id: client.client_id,
          client_secret: client.client_secret,
          authorized_at: new Date().toISOString(),
        }),
        { mode: 0o600, flag: "wx" },
      );
      res.end(
        "Canal conectado para o teste de captura. Você pode fechar esta aba.",
      );
      console.log("youtube_authorization_saved");
    } catch {
      res
        .writeHead(400)
        .end("Não foi possível concluir a conexão. Nenhum artigo foi gerado.");
      console.error("youtube_authorization_failed");
      process.exitCode = 1;
    } finally {
      clearTimeout(timer);
      server.close();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("loopback_unavailable");
  const redirectUri = `http://127.0.0.1:${address.port}/callback`;
  const timer = setTimeout(() => {
    console.error("youtube_authorization_timeout");
    server.close();
  }, 10 * 60_000);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.force-ssl",
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  }).toString();
  // Authorization URL contains no token, client secret or authorization code.
  console.log(url.toString());
}
main().catch(() => {
  console.error("youtube_authorization_setup_failed");
  process.exitCode = 1;
});
