import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import {
  classifiedsCall,
  removeMemberImage,
  signedMemberImages,
  uploadMemberImage,
} from "@/lib/bike-classifieds-api";
import {
  classifiedsAccountSchema,
  classifiedsError,
  type ClassifiedsAccount,
} from "@/lib/bike-classifieds";
import { memberError } from "@/lib/member-community";
export function ProfilePhoto({ embedded = false }: { embedded?: boolean }) {
  const [account, setAccount] = useState<ClassifiedsAccount | null>(null);
  const [avatar, setAvatar] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function refresh() {
    const a = classifiedsAccountSchema.parse(await classifiedsCall("account"));
    setAccount(a);
    const images = a.avatarPath
      ? await signedMemberImages([a.avatarPath])
      : null;
    setAvatar(a.avatarPath ? images?.get(a.avatarPath) : undefined);
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      const a = classifiedsAccountSchema.parse(
        await classifiedsCall("account"),
      );
      const images = a.avatarPath
        ? await signedMemberImages([a.avatarPath])
        : null;
      if (active) {
        setAccount(a);
        setAvatar(a.avatarPath ? images?.get(a.avatarPath) : undefined);
      }
    })().catch(() => {
      if (active) setError("Não foi possível carregar a foto do perfil.");
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const listener = () => void refresh().catch(() => {});
    window.addEventListener("vitale-profile-updated", listener);
    return () => window.removeEventListener("vitale-profile-updated", listener);
  }, []);
  async function action(file?: File) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (file) {
        if (account?.avatarPath) throw new Error("avatar_remove_first");
        await uploadMemberImage(file);
      } else if (account?.avatarPath && account.avatarId) {
        await removeMemberImage(account.avatarPath, account.avatarId);
      } else await classifiedsCall("remove_avatar");
      await refresh();
      window.dispatchEvent(new Event("vitale-profile-updated"));
      setMessage(file ? "Foto salva." : "Foto removida.");
    } catch (e) {
      setError(classifiedsError(e) || memberError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={
        embedded
          ? "mt-6 border-b border-line pb-6"
          : "mt-6 rounded-2xl border border-line bg-white p-5 sm:p-8"
      }
      aria-labelledby="profile-photo-title"
    >
      <h2 id="profile-photo-title" className="text-xl font-bold text-ink">
        Sua foto de perfil
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ela aparece no menu da sua conta e nos seus anúncios publicados.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-5">
        {avatar ? (
          <img
            src={avatar}
            alt="Sua foto de perfil"
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-full bg-surface">
            <UserRound className="h-9 w-9 text-action" aria-hidden="true" />
          </div>
        )}
        {account?.canUploadAvatar ? (
          <div className="space-y-3">
            {account.avatarPath ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void action()}
                className="min-h-11 font-semibold text-action underline disabled:opacity-50"
              >
                Remover foto para trocar
              </button>
            ) : (
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-action px-4 text-sm font-semibold text-action focus-within:ring-2 focus-within:ring-action">
                Adicionar foto
                <input
                  aria-label="Adicionar foto de perfil"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = "";
                    if (file) void action(file);
                  }}
                  className="sr-only"
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              JPEG, PNG ou WebP, até 10 MB.
            </p>
          </div>
        ) : (
          <p className="max-w-xs text-sm">
            Valide seu e-mail e celular para adicionar uma foto.
          </p>
        )}
      </div>
      {busy && (
        <p role="status" className="mt-3">
          Enviando alteração…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-action">
          {message}
        </p>
      )}
    </section>
  );
}
