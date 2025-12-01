import React from "react";
import { CirclePlay, BarChart3, Goal, ArrowLeft, Trophy } from "lucide-react";
import vscorLogo from "../../assets/vscor-logo.png";

type TabType = "live" | "scoring" | "stats" | "tournaments";

type MobileShellProps = {
  children: React.ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
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
  headerSubtitle,
  showBackButton = false,
  onBack,
  hideBottomNav = false,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showHeader && (
        <header className="sticky top-0 z-50 bg-white border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-4">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors -ml-1"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
            )}
            
            {!showBackButton && (
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white shadow-md shadow-purple-500/10 border border-slate-100 flex items-center justify-center">
                <img 
                  src={vscorLogo} 
                  alt="VScor" 
                  className="w-10 h-10 object-contain"
                />
              </div>
            )}
            
            <div className="flex-1">
              {headerTitle ? (
                <div>
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">{headerTitle}</h1>
                  {headerSubtitle && (
                    <p className="text-sm text-slate-500 mt-0.5">{headerSubtitle}</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xs uppercase tracking-widest text-purple-600 font-bold mb-1">VScor</p>
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">Football Management</h1>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto pb-28">
        {children}
      </main>

      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 pb-2 pt-3 z-50 shadow-lg shadow-slate-900/5">
          <div className="flex justify-around items-center max-w-md mx-auto">
            <TabButton
              icon={Goal}
              label="Home"
              isActive={activeTab === "scoring"}
              onClick={() => onTabChange("scoring")}
              isPrimary
            />
            
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
  isPrimary?: boolean;
};

const TabButton: React.FC<TabButtonProps> = ({ icon: Icon, label, isActive, onClick, isPrimary }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-1 px-2 min-w-[60px] transition-colors ${
        isActive ? "text-purple-600" : "text-slate-400"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
        isPrimary 
          ? "bg-purple-600 text-white shadow-md shadow-purple-500/30" 
          : isActive 
            ? "bg-purple-50 text-purple-600" 
            : "text-slate-400"
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
};

export default MobileShell;
