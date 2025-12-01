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
  <section className={`mb-6 ${className}`}>
    <header className="mb-4">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {subtitle && (
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      )}
    </header>
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
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
  const containerStyles = {
    primary: "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25",
    secondary: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25",
    neutral: "bg-white border-2 border-slate-200 text-slate-900 shadow-sm",
  };

  const iconBgStyles = {
    primary: "bg-white/20",
    secondary: "bg-white/20",
    neutral: "bg-slate-100",
  };

  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-3xl p-5 active:scale-[0.97] transition-all flex flex-col justify-between min-h-[100px] ${containerStyles[variant]}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${iconBgStyles[variant]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-bold leading-tight">{label}</p>
        {hint && (
          <p className="text-xs opacity-80 mt-1 group-hover:opacity-100">{hint}</p>
        )}
      </div>
    </button>
  );
};

type StatusTone = "live" | "finished" | "upcoming";

type VSPillProps = {
  tone?: StatusTone;
  children: React.ReactNode;
};

export const VSPill: React.FC<VSPillProps> = ({ tone = "finished", children }) => {
  const toneStyles = {
    live: "bg-red-100 text-red-700 border-red-200",
    upcoming: "bg-blue-100 text-blue-700 border-blue-200",
    finished: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${toneStyles[tone]}`}>
      {children}
    </span>
  );
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-3xl bg-white border border-slate-200 shadow-sm px-5 py-4 flex items-stretch gap-4 active:scale-[0.98] transition-all cursor-pointer hover:border-purple-200 hover:shadow-lg"
    >
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <p className="text-sm text-slate-500 font-medium">
              {tournamentName || "Match"}
            </p>
            {metaLine && (
              <p className="text-xs text-slate-400 mt-0.5">{metaLine}</p>
            )}
          </div>
          {statusLabel && <VSPill tone={statusTone}>{statusLabel}</VSPill>}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-sm font-bold text-slate-700 flex items-center justify-center">
            {teamA.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 leading-snug">
              {teamA}
            </p>
            <p className="text-sm text-slate-500">vs {teamB}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-w-[80px] px-3 bg-slate-50 rounded-2xl">
        <div className="text-2xl font-bold text-slate-900 leading-none">
          {scoreA} - {scoreB}
        </div>
        {rightSlot ? (
          <div className="mt-2">{rightSlot}</div>
        ) : (
          <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">
            {statusTone === "live" ? "LIVE" : statusTone === "upcoming" ? "UPCOMING" : "FINAL"}
          </div>
        )}
      </div>
    </button>
  );
};
