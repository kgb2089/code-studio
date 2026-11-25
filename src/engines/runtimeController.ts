import type { ExecutionResult, Language } from '../types/ide';
import type { TraceResult } from '../types/trace';

type WorkerStatusCallback = (lang: Language, phase: string, message: string, progress?: number) => void;

interface PendingJob<T> {
  id: string;
  resolve: (value: T) => void;
  reject: (err: Error) => void;
  timer: number;
}

/**
 * Python(Pyodide) 및 C(YoWASP Clang + WASI) Web Worker 생명주기를 관리하는 컨트롤러.
 * - 실행 중 UI 프리징 방지
 * - 시간 제한(Timeout) 초과 시 워커 강제 종료 후 자동 재생성
 * - 사용자 강제 중단(Stop) 및 엔진 초기화(Reset) 지원
 */
export class RuntimeController {
  private workers: Partial<Record<Language, Worker>> = {};
  private pending: Partial<Record<Language, PendingJob<any>>> = {};
  private onStatus?: WorkerStatusCallback;

  constructor(onStatus?: WorkerStatusCallback) {
    this.onStatus = onStatus;
  }

  private getBaseUrl(): string {
    return new URL('./', window.location.href).href;
  }

  private spawnWorker(lang: Language): Worker {
    const existing = this.workers[lang];
    if (existing) return existing;

    const worker =
      lang === 'python'
        ? new Worker(new URL('../workers/python.worker.ts', import.meta.url), { type: 'module' })
        : new Worker(new URL('../workers/c.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event: MessageEvent<any>) => {
      const data = event.data;
      if (data.type === 'status') {
        this.onStatus?.(lang, data.phase, data.message, data.progress);
        return;
      }

      const job = this.pending[lang];
      if (!job || data.id !== job.id) return;

      window.clearTimeout(job.timer);
      delete this.pending[lang];

      if (data.type === 'error') {
        job.reject(new Error(data.error || '알 수 없는 실행 오류'));
      } else if (data.type === 'init-result') {
        job.resolve(true);
      } else if (data.type === 'run-result' || data.type === 'trace-result') {
        job.resolve(data.result);
      }
    };

    worker.onerror = (err) => {
      const job = this.pending[lang];
      if (job) {
        window.clearTimeout(job.timer);
        delete this.pending[lang];
        job.reject(new Error(err.message || 'Web Worker 실행 중 오류가 발생했습니다.'));
      }
      this.terminateWorker(lang);
    };

    this.workers[lang] = worker;
    return worker;
  }

  private terminateWorker(lang: Language) {
    const w = this.workers[lang];
    if (w) {
      w.terminate();
      delete this.workers[lang];
    }
  }

  /**
   * 실행 엔진 초기화(워밍업)
   */
  public async initEngine(lang: Language): Promise<void> {
    const worker = this.spawnWorker(lang);
    const id = `${lang}_init_${Date.now()}`;
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.terminateWorker(lang);
        delete this.pending[lang];
        reject(new Error(`${lang === 'python' ? 'Python' : 'C'} 엔진 초기화 시간이 초과되었습니다.`));
      }, 120000);

      this.pending[lang] = {
        id,
        resolve: () => resolve(),
        reject,
        timer,
      };
      worker.postMessage({ type: 'init', id, baseUrl: this.getBaseUrl() });
    });
  }

  /**
   * 실제 코드 실행
   */
  public async runCode(params: {
    language: Language;
    code: string;
    filename: string;
    files: Record<string, string>;
    stdin: string;
    timeoutSec: number;
  }): Promise<ExecutionResult> {
    const { language, code, filename, files, stdin, timeoutSec } = params;
    // 이전 실행이 남아있다면 중단
    if (this.pending[language]) {
      this.stop(language);
    }

    const worker = this.spawnWorker(language);
    const id = `${language}_run_${Date.now()}`;
    const timeoutMs = Math.max(2000, timeoutSec * 1000);

    return new Promise<ExecutionResult>((resolve) => {
      const timer = window.setTimeout(() => {
        this.terminateWorker(language);
        delete this.pending[language];
        resolve({
          language,
          ok: false,
          stdout: '',
          stderr: `실행 시간 제한(${timeoutSec}초)을 초과하여 강제 중단되었습니다.\n무한 반복문이 있는지 확인하세요.`,
          diagnostics: [],
          exitCode: null,
          executionTimeMs: timeoutMs,
          terminatedReason: 'timeout',
        });
      }, timeoutMs);

      this.pending[language] = {
        id,
        resolve,
        reject: (err) => {
          resolve({
            language,
            ok: false,
            stdout: '',
            stderr: err.message,
            diagnostics: [],
            exitCode: null,
            executionTimeMs: 0,
            terminatedReason: 'runtime_error',
          });
        },
        timer,
      };

      worker.postMessage({
        type: 'run',
        id,
        baseUrl: this.getBaseUrl(),
        code,
        filename,
        files,
        stdin,
      });
    });
  }

  /**
   * 실제 코드 실행 추적 (Python: sys.settrace, C: Clang 계측 실행)
   */
  public async traceCode(params: {
    language: Language;
    code: string;
    filename: string;
    files: Record<string, string>;
    stdin: string;
    timeoutSec: number;
    maxSteps: number;
  }): Promise<TraceResult> {
    const { language, code, filename, files, stdin, timeoutSec, maxSteps } = params;
    if (this.pending[language]) {
      this.stop(language);
    }

    const worker = this.spawnWorker(language);
    const id = `${language}_trace_${Date.now()}`;
    const timeoutMs = Math.max(4000, timeoutSec * 1000);

    return new Promise<TraceResult>((resolve) => {
      const timer = window.setTimeout(() => {
        this.terminateWorker(language);
        delete this.pending[language];
        resolve({
          language,
          ok: false,
          isRealExecution: true,
          steps: [],
          stdout: '',
          stderr: `실행 추적 시간 제한(${timeoutSec}초)을 초과하여 중단되었습니다.`,
          executionTimeMs: timeoutMs,
          warnings: ['무한 반복문이 있거나 입력 크기가 너무 큽니다.'],
          errorMessage: '실행 추적 시간 초과',
        });
      }, timeoutMs);

      this.pending[language] = {
        id,
        resolve,
        reject: (err) => {
          resolve({
            language,
            ok: false,
            isRealExecution: true,
            steps: [],
            stdout: '',
            stderr: err.message,
            executionTimeMs: 0,
            warnings: [],
            errorMessage: err.message,
          });
        },
        timer,
      };

      worker.postMessage({
        type: 'trace',
        id,
        baseUrl: this.getBaseUrl(),
        code,
        filename,
        files,
        stdin,
        maxSteps,
      });
    });
  }

  /**
   * 실행 강제 중단 (무한 루프 즉시 정지)
   */
  public stop(lang: Language): void {
    const job = this.pending[lang];
    if (job) {
      window.clearTimeout(job.timer);
      delete this.pending[lang];
      job.resolve({
        language: lang,
        ok: false,
        isRealExecution: true,
        steps: [],
        stdout: '',
        stderr: '사용자가 실행을 중단했습니다.',
        diagnostics: [],
        exitCode: null,
        executionTimeMs: 0,
        warnings: [],
        terminatedReason: 'user',
        errorMessage: '사용자가 실행을 중단했습니다.',
      });
    }
    this.terminateWorker(lang);
  }

  /**
   * 실행 엔진(Worker) 완전 초기화
   */
  public reset(lang: Language): void {
    this.stop(lang);
    this.onStatus?.(lang, 'idle', '엔진이 초기화되었습니다.');
  }

  public dispose(): void {
    this.terminateWorker('python');
    this.terminateWorker('c');
  }
}
