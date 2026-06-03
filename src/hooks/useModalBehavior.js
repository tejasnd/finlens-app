import { useEffect, useRef } from "react";

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

// Encapsulates three shared modal behaviours:
//   1. Close on Escape key
//   2. Close on backdrop click (pass the backdrop onClick handler to the backdrop element)
//   3. Focus trap — Tab/Shift+Tab cycle stays inside the modal
//
// Usage:
//   const { containerRef, backdropProps } = useModalBehavior(onClose, { disabled: isAIRunning });
//   <div className="modal-bg" {...backdropProps}>
//     <div className="modal" ref={containerRef} onClick={e => e.stopPropagation()}>
//
// `disabled` — when true, Escape and backdrop click are suppressed (e.g. while async work is running)
export function useModalBehavior(onClose, { disabled = false } = {}) {
  const containerRef = useRef(null);

  // Escape key + focus trap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !disabled) {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const el = containerRef.current;
        if (!el) return;
        const focusable = [...el.querySelectorAll(FOCUSABLE)];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, disabled]);

  // Move focus into the modal on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const first = el.querySelector(FOCUSABLE);
    first?.focus();
  }, []);

  const backdropProps = {
    onClick: disabled ? undefined : onClose,
  };

  return { containerRef, backdropProps };
}
