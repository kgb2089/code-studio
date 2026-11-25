import {
  Activity,
  BookOpen,
  Code2,
  Maximize,
  Moon,
  PanelLeft,
  PanelRight,
  Play,
  Settings,
  Square,
  Sun,
} from 'lucide-react';
import type { EngineStatus, Language, RightPanelMode } from '../types/ide';
import { canUseFullscreen } from '../utils/pwa';

interface TopBarProps {
  language: Language;
  isRunning: boolean;
  isTracing: boolean;
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelMode: RightPanelMode;
  activeEngineStatus: EngineStatus;
  onSelectLanguage: (lang: Language) => void;
  onRun: () => void;
  onStop: () => void;
  onTrace: () => void;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
  onOpenLearningMode: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function TopBar({
  language,
  isRunning,
  isTracing,
  theme,
  sidebarOpen,
  rightPanelOpen,
  rightPanelMode,
  activeEngineStatus,
  onSelectLanguage,
  onRun,
  onStop,
  onTrace,
  onToggleSidebar,
  onToggleRightPanel,
  onOpenLearningMode,
  onToggleTheme,
  onOpenSettings,
}: TopBarProps) {
  const busy = isRunning || isTracing;

  const handleNativeFullscreen = () => {
    if (!canUseFullscreen()) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <header className="ide-chrome safe-top flex items-center justify-between gap-2 px-2.5 pb-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] shrink-0">
      {/* 좌측: 사이드바 토글 + 로고 + 언어 선택 */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="사이드바 열기/닫기"
          className={`p-2 rounded-lg transition-colors ${
            sidebarOpen
              ? 'bg-[var(--bg-elevated)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="hidden md:flex items-center gap-1.5 pr-1">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-sm">
            <Code2 className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
            Code Studio
          </span>
        </div>

        {/* 언어 선택 세그먼트 */}
        <div
          className="flex items-center p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
          role="group"
          aria-label="프로그래밍 언어 선택"
        >
          <button
            type="button"
            onClick={() => onSelectLanguage('python')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              language === 'python'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Python 3
          </button>
          <button
            type="button"
            onClick={() => onSelectLanguage('c')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              language === 'c'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            C17
          </button>
        </div>
      </div>

      {/* 중앙: 실행 / 중단 / 실행 추적 / 학습 모드 */}
      <div className="flex items-center gap-1.5">
        {!busy ? (
          <button
            type="button"
            onClick={onRun}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-semibold text-xs shadow-sm transition-all"
            title="코드 실행 (Cmd/Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>실행</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 active:scale-95 text-white font-semibold text-xs shadow-sm transition-all animate-pulse"
            title="실행 강제 중단"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>중단</span>
          </button>
        )}

        <button
          type="button"
          onClick={onTrace}
          disabled={busy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border transition-all disabled:opacity-50 ${
            rightPanelOpen && rightPanelMode === 'trace'
              ? 'bg-sky-500/20 border-sky-400/60 text-sky-400'
              : 'bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
          title="실제 코드 실행 과정 단계별 추적"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">실행 추적</span>
        </button>

        <button
          type="button"
          onClick={onOpenLearningMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border transition-all ${
            rightPanelOpen && rightPanelMode === 'learning'
              ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-400'
              : 'bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
          title="자료구조·알고리즘 학습 모드"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">학습 모드</span>
        </button>
      </div>

      {/* 우측: 엔진 상태 + 우측패널 + 테마 + 전체화면 + 설정 */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenSettings}
          title="실행 엔진 및 오프라인 캐시 관리"
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              activeEngineStatus.cached
                ? 'bg-emerald-400'
                : activeEngineStatus.state === 'downloading' ||
                    activeEngineStatus.state === 'initializing'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-400'
            }`}
          />
          <span>
            {activeEngineStatus.state === 'downloading'
              ? `엔진 다운로드 ${activeEngineStatus.progress}%`
              : activeEngineStatus.cached
                ? `${language === 'python' ? 'Py' : 'C17'} 오프라인 준비`
                : `${language === 'python' ? 'Py' : 'C17'} 미캐시`}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleRightPanel}
          aria-label="시각화 패널 열기/닫기"
          className={`p-2 rounded-lg transition-colors ${
            rightPanelOpen
              ? 'bg-[var(--bg-elevated)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <PanelRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="다크/라이트 테마 전환"
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {canUseFullscreen() && (
          <button
            type="button"
            onClick={handleNativeFullscreen}
            aria-label="전체 화면 전환"
            className="hidden sm:flex p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            <Maximize className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="설정 및 엔진 관리"
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
