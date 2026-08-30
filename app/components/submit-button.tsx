"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}

export function SubmitButton({ children, pendingLabel, className = "auth-submit-btn" }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 size={16} className="spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
