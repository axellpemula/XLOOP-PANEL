"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface FieldWrapProps {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldWrap({ label, hint, error, htmlFor, children, className }: FieldWrapProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-label font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-label text-banned">{error}</p>
      ) : (
        hint && <p className="text-label text-muted">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return <input ref={ref} className={cn("field", invalid && "field-error", className)} {...props} />;
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return <textarea ref={ref} className={cn("field", invalid && "field-error", className)} {...props} />;
});
