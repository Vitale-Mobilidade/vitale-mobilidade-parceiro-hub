import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NewsletterSignup } from "./NewsletterSignup";
import {
  newsletterPopupAllowed,
  NEWSLETTER_DISMISS_KEY,
  NEWSLETTER_SUBSCRIBED_KEY,
} from "@/lib/newsletter-exit";

export function NewsletterExitPopup({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const suppressed = useRef(false);
  useEffect(() => {
    setOpen(false);
    const started = Date.now();
    let deepest = 0;
    let previous = window.scrollY;
    const eligible = () => {
      if (
        suppressed.current ||
        Date.now() - started < 15_000 ||
        document.querySelector('[role="dialog"]')
      )
        return false;
      try {
        return newsletterPopupAllowed(
          path,
          localStorage.getItem(NEWSLETTER_DISMISS_KEY),
          localStorage.getItem(NEWSLETTER_SUBSCRIBED_KEY),
        );
      } catch {
        return newsletterPopupAllowed(path, null, null);
      }
    };
    const exit = (event: MouseEvent) => {
      if (
        event.relatedTarget === null &&
        event.clientY <= 0 &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
        eligible()
      )
        setOpen(true);
    };
    const scroll = () => {
      const position = window.scrollY;
      deepest = Math.max(deepest, position);
      if (
        window.matchMedia("(pointer: coarse)").matches &&
        deepest > window.innerHeight &&
        position < previous &&
        position < 80 &&
        eligible()
      )
        setOpen(true);
      previous = position;
    };
    const subscribed = () => {
      suppressed.current = true;
    };
    document.addEventListener("mouseout", exit);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("vitale-newsletter-subscribed", subscribed);
    return () => {
      document.removeEventListener("mouseout", exit);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("vitale-newsletter-subscribed", subscribed);
    };
  }, [path]);
  const close = () => {
    suppressed.current = true;
    try {
      localStorage.setItem(NEWSLETTER_DISMISS_KEY, String(Date.now()));
    } catch {
      /* Suppress for this session. */
    }
    setOpen(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      {open && (
        <DialogContent>
          <DialogTitle className="pr-5 text-2xl">
            Seu próximo pedal começa com uma boa escolha
          </DialogTitle>
          <DialogDescription>
            Receba novidades sobre bikes elétricas, preços e ferramentas.
            Segunda, quarta e sexta, no seu e-mail.
          </DialogDescription>
          <NewsletterSignup compact />
          <button
            type="button"
            onClick={close}
            className="min-h-11 text-sm underline"
          >
            Agora não
          </button>
        </DialogContent>
      )}
    </Dialog>
  );
}
