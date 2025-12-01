// src/components/ui/VCard.tsx
import React from "react";

type VCardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "solid" | "subtle" | "glass" | "outline";
  onClick?: () => void;
};

const base =
  "rounded-2xl p-3 sm:p-4 transition-all border shadow-[0_12px_40px_rgba(15,23,42,0.6)]";

const variants: Record<NonNullable<VCardProps["variant"]>, string> = {
  solid: "bg-gradient-to-br from-purple-600/90 to-indigo-600/90 border-purple-400/60",
  subtle: "bg-slate-900/70 border-slate-700/80",
  glass: "bg-slate-900/40 border-slate-700/60 backdrop-blur-md",
  outline: "bg-slate-950/60 border-slate-800",
};

export const VCard: React.FC<VCardProps> = ({
  children,
  className = "",
  variant = "subtle",
  onClick,
}) => {
  const clickable = onClick
    ? "cursor-pointer hover:-translate-y-0.5 hover:border-purple-400/70"
    : "";

  return (
    <div className={`${base} ${variants[variant]} ${clickable} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};
