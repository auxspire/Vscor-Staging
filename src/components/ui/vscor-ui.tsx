// src/components/ui/vscor-ui.tsx
import React from "react";
import type { LucideIcon } from "lucide-react";

type VSSectionProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export const VSSection: React.FC<VSSectionProps> = ({
  title,
  subtitle,
  children,
  className = "",
}) => (
  <section className={`mb-5 ${className}`}>
    <header className="flex items-baseline justify-between mb-2 px-1">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </header>
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 shadow-[0_14px_40px_rgba(0,0,0,0.55)]">
      {children}
    </div>
  </section>
);

type VSQuickActionProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  variant?: "primary" | "secondary" | "neutral";
  onClick?: () => void;
};

export const VSQuickAction: React.FC<VSQuickActionProps> = ({
  icon: Icon,
  label,
  hint,
  variant = "neutral",
  onClick,
}) => {
  const palette =
    variant === "primary"
      ? "from-purple-500/90 to-indigo-500/90 text-white"
      : variant === "secondary"
      ? "from-emerald-500/90 to-teal-500/90 text-white"
      : "from-slate-100 to-slate-200 text-slate-900";

  const chipBg =
    variant === "primary"
      ? "bg-white/15 text-white"
      : variant === "secondary"
      ? "bg-white/15 text-white"
      : "bg-white text-slate-900";

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl p-3 bg-gradient-to-br shadow-lg shadow-black/40 border border-white/10 active:scale-95 transition-all duration-150 flex flex-col justify-between min-h-[88px]"
    >
      <div
        className={`w-9 h-9 rounded-2xl flex items-center justify-center mb-2 ${chipBg}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[13px] font-semibold leading-tight">{label}</p>
        {hint && (
          <p className="text-[11px] opacity-80 mt-0.5 group-hover:opacity-100">
            {hint}
          </p>
        )}
      </div>
      <div
        className={`absolute inset-0 rounded-2xl -z-10 opacity-90 bg-gradient-to-br ${palette}`}
      />
    </button>
  );
};

type StatusTone = "live" | "finished" | "upcoming";

type VSPillProps = {
  tone?: StatusTone;
  children: React.ReactNode;
};

export const VSPill: React.FC<VSPillProps> = ({ tone = "finished", children }) => {
  const base =
    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em]";
  const toneClass =
    tone === "live"
      ? "bg-red-500/90 text-white animate-pulse"
      : tone === "upcoming"
      ? "bg-blue-500/90 text-white"
      : "bg-slate-700/80 text-slate-50";

  return <span className={`${base} ${toneClass}`}>{children}</span>;
};

type VSMatchCardProps = {
  teamA: string;
  teamB: string;
  scoreA?: number | null;
  scoreB?: number | null;
  tournamentName?: string | null;
  statusLabel?: string | null;
  statusTone?: StatusTone;
  metaLine?: string | null;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
};

export const VSMatchCard: React.FC<VSMatchCardProps> = ({
  teamA,
  teamB,
  scoreA = 0,
  scoreB = 0,
  tournamentName,
  statusLabel,
  statusTone = "finished",
  metaLine,
  onClick,
  rightSlot,
}) => {
  const badgeTone: StatusTone = statusTone;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-gradient-to-br from-slate-900/90 to-black/90 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.7)] px-3 py-3 flex items-stretch gap-3 active:scale-[0.98] transition-transform"
    >
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <p className="text-[11px] text-slate-400">
              {tournamentName || "Friendly / Tournament"}
            </p>
            {metaLine && (
              <p className="text-[10px] text-slate-500 mt-0.5">{metaLine}</p>
            )}
          </div>
          {statusLabel && <VSPill tone={badgeTone}>{statusLabel}</VSPill>}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-50 flex items-center justify-center">
              {teamA.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-50 leading-snug">
                {teamA}
              </p>
              <p className="text-[11px] text-slate-400">vs {teamB}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-w-[64px] px-2">
        <div className="text-xl font-semibold text-slate-50 leading-none">
          {scoreA} - {scoreB}
        </div>
        {rightSlot ? (
          <div className="mt-1">{rightSlot}</div>
        ) : (
          <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.12em]">
            {badgeTone === "live" ? "LIVE" : badgeTone === "upcoming" ? "UPCOMING" : "FINAL"}
          </div>
        )}
      </div>
    </button>
  );
};
