import { CheckCircle2, CloudOff, Cpu, Smartphone, Wifi } from 'lucide-react';
import type { EngineStatus, Language } from '../types/ide';

interface StatusBarProps {
  language: Language;
  isRunning: boolean;
  isTracing: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  cursor: { line: number; col: number };
  pythonEngine: EngineStatus;
  cEngine: EngineStatus;
  onOpenSettings: () => void;
}

export function StatusBar({
  language,
  isRunning,
  isTracing,
  isOnline,
  isStandalone,
  cursor,
  pythonEngine,
  cEngine,
  onOpenSettings,
}: StatusBarProps) {
  const bothCached = pythonEngine.cached && cEngine.cached;
  const activeCached = language === 'python' ? pythonEngine.cached : cEngine.cached;

  return (
    <footer className="ide-chrome safe-bottom flex items-center justify-between gap-2 px-2.5 py-1 text-[11px] border-t border-[var(--border-subtle)] bg-[var(--bg-root)] text-[var(--text-secondary)] shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-semibold text-[var(--accent)]">
          {language === 'python' ? 'Python 3 (Pyodide)' : 'C17 (Clang/LLVM)'}
        </span>

        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          {isRunning
            ? '실행 중...'
            : isTracing
              ? '실행 추적 중...'
              : '대기 중'}
        </span>

        <button
          type="button"
          onClick={onOpenSettings}
          className="hidden sm:flex items-center gap-1 hover:text-[var(--text-primary)]"
          title="오프라인 엔진 캐시 관리"
        >
          <CheckCircle2
            className={`w-3 h-3 ${
              bothCached
                ? 'text-emerald-400'
                : activeCached
                  ? 'text-sky-400'
                  : 'text-[var(--text-muted)]'
            }`}
          />
          <span>
            {bothCached
              ? '오프라인 실행 완전 준비'
              : activeCached
                ? '현재 언어 오프라인 준비'
                : '엔진 다운로드 필요'}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden md:inline font-mono text-[var(--text-muted)]">
          줄 {cursor.line}, 열 {cursor.col}
        </span>

        {isStandalone && (
          <span className="hidden sm:flex items-center gap-1 text-emerald-400" title="홈 화면 독립 실행 앱 모드">
            <Smartphone className="w-3 h-3" />
            <span>앱 모드</span>
          </span>
        )}

        <span
          className={`flex items-center gap-1 font-medium ${
            isOnline ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
          <span>{isOnline ? '온라인' : '오프라인'}</span>
        </span>
      </div>
    </footer>
  );
}
