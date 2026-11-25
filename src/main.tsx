import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { isStandaloneMode, registerServiceWorker } from './utils/pwa';

interface ErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Code Studio] 렌더링 오류:', error, info);
    const splash = document.getElementById('app-splash');
    if (splash) splash.remove();
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-950 text-slate-100 text-center gap-4">
          <h1 className="text-lg font-bold text-rose-400">Code Studio 초기화 중 오류가 발생했습니다</h1>
          <pre className="max-w-lg w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-left overflow-auto whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold text-sm"
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

(window as any).__CS_BOOT_STAGE = 'main.tsx 로드 완료 (React 마운트 중)';

if (isStandaloneMode()) {
  document.documentElement.classList.add('pwa-standalone');
}

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);

(window as any).__CS_BOOT_STAGE = 'React 마운트 호출 완료';
const splashEl = document.getElementById('app-splash');
if (splashEl) {
  splashEl.classList.add('hidden');
  window.setTimeout(() => splashEl.remove(), 300);
}
