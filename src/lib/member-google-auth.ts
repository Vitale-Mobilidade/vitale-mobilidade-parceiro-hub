import { supabase } from "@/integrations/supabase/client";
import { rememberGoogleMemberContext } from "./member-google-context";
/** The supported broker handles Google OAuth state/redirects; existing Supabase owns the session. */
export async function startGoogleMemberSignIn(
  returnTo: string,
  invitationCode?: string,
) {
  rememberGoogleMemberContext(returnTo, invitationCode);
  const { createLovableAuth } = await import("@lovable.dev/cloud-auth-js");
  const result = await createLovableAuth().signInWithOAuth("google", {
    redirect_uri: `${window.location.origin}/conta/google`,
  });
  if (result.error)
    throw new Error(
      "Não foi possível entrar com Google. Tente novamente ou entre com e-mail e senha.",
    );
  if (result.redirected) return;
  const { error } = await supabase.auth.setSession(result.tokens);
  if (error)
    throw new Error(
      "Não foi possível concluir seu acesso com Google. Tente novamente.",
    );
  window.location.assign(`${window.location.origin}/conta/google`);
}
