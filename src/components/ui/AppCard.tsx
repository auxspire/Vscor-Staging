// src/components/ui/AppCard.tsx
import React from "react";

/**
 * Tiny local "classnames" helper.
 * Usage: cn("base", condition && "extra", optionalClassName)
 */
function cn(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

type AppCardProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export const AppCard: React.FC<AppCardProps> = ({
  children,
  className,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-3",
        onClick && "cursor-pointer active:scale-[0.99] transition-transform",
        className
      )}
    >
      {children}
    </div>
  );
};

type AppCardTitleProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export const AppCardTitle: React.FC<AppCardTitleProps> = ({
  title,
  subtitle,
  rightSlot,
}) => {
  return (
    <div className="flex items-start justify-between gap-2 mb-1">
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle && (
          <div className="text-[11px] text-gray-500">{subtitle}</div>
        )}
      </div>
      {rightSlot}
    </div>
  );
};
