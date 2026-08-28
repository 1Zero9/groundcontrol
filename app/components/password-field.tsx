"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

interface PasswordFieldProps {
  id: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}

export function PasswordField({
  id,
  name,
  autoComplete,
  required,
  minLength,
  placeholder = "Enter your password",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-input-wrap has-toggle">
      <Lock size={16} className="auth-input-icon" />
      <input
        id={id}
        type={visible ? "text" : "password"}
        name={name}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="auth-input-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
