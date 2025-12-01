import React from "react";
import { CirclePlay, BarChart3, Home, ArrowLeft, Trophy } from "lucide-react";

type TabType = "live" | "scoring" | "stats" | "tournaments";

type MobileShellProps = {
  children: React.ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showHeader?: boolean;
  headerTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  hideBottomNav?: boolean;
};

const MobileShell: React.FC<MobileShellProps> = ({
  children,
  activeTab,
  onTabChange,
  showHeader = true,
  headerTitle,
  showBackButton = false,
  onBack,
  hideBottomNav = false,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showHeader && (
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors -ml-2"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
          )}
          
          {!showBackButton && (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <CirclePlay className="w-5 h-5 text-white" />
            </div>
          )}
          
          <div className="flex-1">
            {headerTitle ? (
              <h1 className="text-lg font-semibold text-slate-900">{headerTitle}</h1>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-widest text-purple-600 font-semibold">VScor</p>
                <h1 className="text-base font-semibold text-slate-900 -mt-0.5">Match Centre</h1>
              </>
            )}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 z-50">
          <div className="flex justify-around items-end">
            <TabButton
              icon={CirclePlay}
              label="Live"
              isActive={activeTab === "live"}
              onClick={() => onTabChange("live")}
            />
            
            <TabButton
              icon={Trophy}
              label="Tournaments"
              isActive={activeTab === "tournaments"}
              onClick={() => onTabChange("tournaments")}
            />
            
            <button
              onClick={() => onTabChange("scoring")}
              className="flex flex-col items-center -mt-4"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  activeTab === "scoring"
                    ? "bg-purple-600 shadow-purple-500/40"
                    : "bg-purple-500 shadow-purple-400/30"
                }`}
              >
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className={`mt-1 text-xs font-medium ${
                activeTab === "scoring" ? "text-purple-600" : "text-slate-500"
              }`}>
                Home
              </span>
            </button>
            
            <TabButton
              icon={BarChart3}
              label="Stats"
              isActive={activeTab === "stats"}
              onClick={() => onTabChange("stats")}
            />
          </div>
        </nav>
      )}
    </div>
  );
};

type TabButtonProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
};

const TabButton: React.FC<TabButtonProps> = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
      isActive ? "text-purple-600" : "text-slate-400"
    }`}
  >
    <Icon className="w-6 h-6" />
    <span className="text-xs font-medium">{label}</span>
    {isActive && (
      <div className="w-6 h-1 rounded-full bg-purple-600 mt-0.5" />
    )}
  </button>
);

export default MobileShell;
