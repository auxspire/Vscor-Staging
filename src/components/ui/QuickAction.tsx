// src/components/ui/QuickAction.tsx
import React from "react";
import type { LucideIcon } from "lucide-react";

type QuickActionProps = {
  icon: LucideIcon;
  label: string;
  subLabel?: string;
  onClick?: () => void;
  className?: string;
};

export const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  subLabel,
  onClick,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full aspect-[5/4] rounded-3xl shadow-lg border flex flex-col items-start justify-between p-3 active:scale-95 transition-transform ${className}`}
    >
      <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
      <div className="text-left mt-2">
        {subLabel && (
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200/80">
            {subLabel}
          </div>
        )}
        <div className="text-sm font-semibold text-slate-50 leading-snug">
          {label}
        </div>
      </div>
    </button>
  );
};
