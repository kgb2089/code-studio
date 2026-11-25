import {
  Archive,
  CheckCircle2,
  Download,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { formatBytes } from '../engines/engineManager';
import type { AppSettings, EngineStatus, Language } from '../types/ide';
import type { DialogRequest } from './DialogModal';

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  pythonEngine: EngineStatus;
  cEngine: EngineStatus;
  isStandalone: boolean;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onDownloadEngine: (lang: Language) => void;
  onClearReinstallEngine: (lang: Language) => void;
  onResetWorker: (lang: Language) => void;
  onExportAllBackup: () => void;
  onOpenDialog: (dialog: DialogRequest) => void;
}

const OPEN_SOURCE_LICENSES = [
  { name: 'React / React DOM', license: 'MIT', purpose: 'UI 프레임워크' },
  { name: 'CodeMirror 6', license: 'MIT', purpose: 'iPad Safari 호환 코드 에디터' },
  { name: 'Pyodide', license: 'MPL-2.0', purpose: 'WebAssembly Python 3 실행 엔진' },
  { name: '@yowasp/clang (LLVM/Clang)', license: 'ISC / Apache-2.0', purpose: 'WebAssembly C17 컴파일러' },
  { name: '@bjorn3/browser_wasi_shim', license: 'MIT OR Apache-2.0', purpose: '브라우저 WASI 런타임' },
  { name: 'idb', license: 'ISC', purpose: 'IndexedDB 로컬 저장소 래퍼' },
  { name: 'JSZip', license: 'MIT / GPL-3.0', purpose: '프로젝트 ZIP 백업 및 복원' },
  { name: 'Lucide Icons', license: 'ISC', purpose: 'UI 아이콘' },
];

export function SettingsModal({
  open,
  settings,
  pythonEngine,
  cEngine,
  isStandalone,
  onClose,
  onUpdateSettings,
  onDownloadEngine,
  onClearReinstallEngine,
  onResetWorker,
  onExportAllBackup,
  onOpenDialog,
}: SettingsModalProps) {
  if (!open) return null;

  const renderEngineCard = (lang: Language, title: string, status: EngineStatus) => {
    const busy = status.state === 'downloading' || status.state === 'initializing';
    return (
      <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">{title}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  status.cached
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : busy
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-slate-500/20 text-[var(--text-muted)]'
                }`}
              >
                {status.cached
                  ? '오프라인 준비 완료'
                  : busy
                    ? `${status.progress}% 진행 중`
                    : '미설치'}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">
              버전: {status.version} · 용량: {formatBytes(status.totalBytes)}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!status.cached ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onDownloadEngine(lang)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>다운로드</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onResetWorker(lang)}
                  title="워커 재시작"
                  className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onOpenDialog({
                      kind: 'confirm',
                      title: '실행 엔진 재설치',
                      message: `${title} 캐시를 삭제하고 다시 다운로드하시겠습니까?\n작성한 사용자 프로젝트 코드는 그대로 유지됩니다.`,
                      confirmLabel: '재설치',
                      danger: true,
                      onConfirm: () => onClearReinstallEngine(lang),
                    });
                  }}
                  title="캐시 삭제 및 재설치"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>재설치</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 진행률 바 */}
        {(busy || status.cached) && (
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-[var(--bg-root)] overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  status.cached ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
                style={{ width: `${status.cached ? 100 : status.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>{status.message}</span>
              <span className="font-mono">
                {formatBytes(status.downloadedBytes)} / {formatBytes(status.totalBytes)}
              </span>
            </div>
          </div>
        )}
        {status.error && (
          <div className="text-[11px] text-rose-400">오류: {status.error}</div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-strong)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ide-chrome flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]">
          <h2 className="text-sm font-bold m-0">Code Studio 설정 및 오프라인 엔진 관리</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="설정 닫기"
            className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="scroll-pane flex-1 p-4 space-y-5">
          {/* 1. 오프라인 실행 엔진 관리 */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                <HardDrive className="w-4 h-4" />
                <span>오프라인 실행 엔진 (외부 서버 · CDN 미사용)</span>
              </div>
              {isStandalone && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 독립 실행 앱 모드
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] m-0">
              최초 1회 다운로드 후 Service Worker 캐시에 저장되어 비행기 모드나 오프라인 환경에서도
              Python 3와 C17 코드를 컴파일·실행·추적할 수 있습니다.
            </p>
            {renderEngineCard('python', 'Python 3 (Pyodide WASM)', pythonEngine)}
            {renderEngineCard('c', 'C17 컴파일러 (YoWASP Clang/LLVM + WASI)', cEngine)}
          </section>

          {/* 2. 에디터 및 실행 설정 */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold text-[var(--text-primary)] m-0">에디터 및 실행 옵션</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span>화면 테마</span>
                <select
                  value={settings.theme}
                  onChange={(e) => onUpdateSettings({ theme: e.target.value as 'dark' | 'light' })}
                  className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                >
                  <option value="dark">다크 모드</option>
                  <option value="light">라이트 모드</option>
                </select>
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span>글꼴 크기 ({settings.fontSize}px)</span>
                <input
                  type="range"
                  min={12}
                  max={22}
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                  className="w-24 accent-sky-400"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span>실행 시간 제한 (초)</span>
                <select
                  value={settings.timeoutSec}
                  onChange={(e) => onUpdateSettings({ timeoutSec: Number(e.target.value) })}
                  className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                >
                  <option value={5}>5초</option>
                  <option value={10}>10초</option>
                  <option value={20}>20초</option>
                  <option value={30}>30초</option>
                </select>
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span>최대 추적 단계</span>
                <select
                  value={settings.maxTraceSteps}
                  onChange={(e) => onUpdateSettings({ maxTraceSteps: Number(e.target.value) })}
                  className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                >
                  <option value={200}>200단계</option>
                  <option value={400}>400단계</option>
                  <option value={800}>800단계</option>
                </select>
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span>화면 보조 키보드 바</span>
                <select
                  value={settings.showAccessoryBar === 'always' ? 'always' : 'never'}
                  onChange={(e) =>
                    onUpdateSettings({
                      showAccessoryBar: e.target.value as AppSettings['showAccessoryBar'],
                    })
                  }
                  className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                >
                  <option value="never">숨기기 (외장 키보드 권장)</option>
                  <option value="always">표시</option>
                </select>
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span>자동 줄 바꿈</span>
                <input
                  type="checkbox"
                  checked={settings.wordWrap}
                  onChange={(e) => onUpdateSettings({ wordWrap: e.target.checked })}
                  className="w-4 h-4 accent-sky-400"
                />
              </label>
            </div>
          </section>

          {/* 3. 개인정보 보호 & 데이터 백업 */}
          <section className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>100% 로컬 실행 · 브라우저 데이터 보호</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] m-0">
                모든 코드는 외부 서버로 전송되지 않고 기기 내부 IndexedDB에 저장됩니다. iPadOS 저장소 정리에 대비해 주기적으로 ZIP 백업을 권장합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportAllBackup}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shrink-0"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>전체 백업 (ZIP)</span>
            </button>
          </section>

          {/* 4. 오픈소스 라이선스 */}
          <section className="space-y-1.5">
            <h3 className="text-xs font-bold text-[var(--text-primary)] m-0">사용된 오픈소스 라이브러리</h3>
            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden text-[11px]">
              {OPEN_SOURCE_LICENSES.map((lib) => (
                <div
                  key={lib.name}
                  className="flex items-center justify-between px-3 py-1.5 border-b last:border-b-0 border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                >
                  <span className="font-medium text-[var(--text-primary)]">{lib.name}</span>
                  <span className="text-[var(--text-muted)]">
                    {lib.purpose} · <strong className="text-sky-400">{lib.license}</strong>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
