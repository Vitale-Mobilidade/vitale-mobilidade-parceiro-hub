import { memberPublicNavigationEnabled } from "@/lib/member-accounts-feature";
import { useRouterState } from "@tanstack/react-router";
import { memberLoginHref, memberReturnPath } from "@/lib/member-community";
import { useEffect, useState } from "react";
import { Heart, UserRound } from "lucide-react";
import { RADAR_FAVORITES_HREF } from "@/lib/radar-favorites";
import { useMemberSession } from "@/hooks/use-member-session";
import { supabase } from "@/integrations/supabase/client";
import {
  classifiedsAccountSchema,
  type ClassifiedsAccount,
} from "@/lib/bike-classifieds";
import {
  classifiedsCall,
  signedMemberImages,
} from "@/lib/bike-classifieds-api";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
export function AccountMenu() {
  const locationKey = useRouterState({
    select: (state) =>
      `${state.location.pathname}${state.location.searchStr}#${state.location.hash}`,
  });
  const [loginHref, setLoginHref] = useState(() =>
    memberLoginHref(memberReturnPath(locationKey)),
  );
  useEffect(() => {
    const sync = () =>
      setLoginHref(
        memberLoginHref(
          window.location.pathname +
            window.location.search +
            window.location.hash,
        ),
      );
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [locationKey]);
  const { session, loading } = useMemberSession();
  const userId = session?.user.id;
  const [account, setAccount] = useState<ClassifiedsAccount | null>(null);
  const [avatar, setAvatar] = useState<string>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setAccount(null);
    setAvatar(undefined);
    async function refresh() {
      if (!userId) return;
      try {
        const a = classifiedsAccountSchema.parse(
          await classifiedsCall("account"),
        );
        const urls = a.avatarPath
          ? await signedMemberImages([a.avatarPath])
          : null;
        if (active) {
          setAccount(a);
          setAvatar(a.avatarPath ? urls?.get(a.avatarPath) : undefined);
        }
      } catch {
        if (active) {
          setAccount(null);
          setAvatar(undefined);
        }
      }
    }
    void refresh();
    const listener = () => void refresh();
    window.addEventListener("vitale-profile-updated", listener);
    const timer = window.setInterval(listener, 240000);
    return () => {
      active = false;
      window.removeEventListener("vitale-profile-updated", listener);
      window.clearInterval(timer);
    };
  }, [userId]);
  if (!session && !memberPublicNavigationEnabled) return null;
  if (!session)
    return (
      <a
        href={loginHref}
        onClick={(event) => {
          event.currentTarget.href = memberLoginHref(
            window.location.pathname +
              window.location.search +
              window.location.hash,
          );
        }}
        aria-busy={loading}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-white/30 px-3 text-base font-bold text-white hover:bg-white/10"
      >
        <UserRound className="h-5 w-5" aria-hidden="true" />
        <span>Entrar</span>
      </a>
    );
  return (
    <div data-heatmap-private>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-base font-bold text-white hover:bg-white/10"
          aria-label="Abrir menu da minha conta"
        >
          {avatar ? (
            <img
              src={avatar}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-mint-foreground">
              {Array.from(
                (
                  account?.displayName ??
                  String(session.user.user_metadata?.display_name ?? "")
                ).trim(),
              )[0]?.toLocaleUpperCase("pt-BR") || (
                <UserRound className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2">
          <DropdownMenuItem asChild>
            <a href="/conta?modo=perfil" className="min-h-11">
              Editar meu perfil
            </a>
          </DropdownMenuItem>
          {memberPublicNavigationEnabled && (
            <DropdownMenuItem asChild>
              <a href={RADAR_FAVORITES_HREF} className="min-h-11">
                <Heart className="mr-2 h-4 w-4" aria-hidden="true" />
                Bikes favoritas
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href="/anuncie-sua-bike" className="min-h-11">
              Anuncie sua bike
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/conta/anuncios" className="min-h-11">
              Meus anúncios
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11"
            onSelect={async () => {
              const { error } = await supabase.auth.signOut({ scope: "local" });
              if (error)
                setError("Não foi possível sair. Tente pela Minha conta.");
            }}
          >
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </div>
  );
}
