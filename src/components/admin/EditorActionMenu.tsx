import { useEffect, useRef, type ReactNode } from "react";

/** Small controlled action menu: one owner coordinates Capa/Mais; no persistent native details state. */
export function EditorActionMenu({
  id,
  label,
  open,
  onOpenChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onOpenChange]);
  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50"
        aria-label={label === "Mais" ? "Mais ações" : label}
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
      >
        {label}
      </button>
      <div
        id={id}
        hidden={!open}
        className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-lg"
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("button")) onOpenChange(false);
        }}
      >
        {children}
      </div>
    </div>
  );
}