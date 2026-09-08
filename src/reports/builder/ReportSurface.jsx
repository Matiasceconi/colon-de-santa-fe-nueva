import React from "react";
import * as Dialog from "@radix-ui/react-dialog";

// Shared export surface: escape page stacking contexts, trap focus and lock background scroll.
export default function ReportSurface({ children, onClose, title = "PerformancePitch Reports", className = "", ...props }) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/80" />
        <Dialog.Content
          {...props}
          aria-describedby={undefined}
          className={className}
          style={{ ...props.style, zIndex: 91 }}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
