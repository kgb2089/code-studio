/// <reference lib="webworker" />
import { ConsoleStdout, File, OpenFile, PreopenDirectory, WASI } from '@bjorn3/browser_wasi_shim';
import { instrumentCCode, parseCTraceJsonl } from '../engines/cInstrumenter';
import { parseClangDiagnostics } from '../engines/diagnostics';
import type { ExecutionResult } from '../types/ide';
import type { TraceResult } from '../types/trace';

interface CWorkerRequest {
  type: 'init' | 'run' | 'trace';
  id: string;
  baseUrl: string;
  code?: string;
  filename?: string;
  files?: Record<string, string>;
  stdin?: string;
  maxOutputBytes?: number;
  maxSteps?: number;
}

const MAX_OUTPUT_DEFAULT = 512 * 1024;
let clangModule: any = null;
let loadPromise: Promise<any> | null = null;

async function ensureClang(baseUrl: string) {
  if (clangModule) return clangModule;
  if (loadPromise) return loadPromise;

  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const bundleUrl = `${cleanBase}engines/clang/bundle.js`;

  self.postMessage({ type: 'status', phase: 'initializing', message: 'C17(Clang/LLVM) 컴파일러 초기화 중...' });

  loadPromise = (async () => {
    const mod = await import(/* @vite-ignore */ bundleUrl);
    // 첫 워밍업 버전 체크로 WASM 모듈 및 sysroot 언팩 완료
    await mod.runClang(['clang', '--version'], {}, {
      stdout: () => {},
      stderr: () => {},
      fetchProgress: (ev: { doneLength: number; totalLength: number }) => {
        if (ev.totalLength > 0) {
          const pct = Math.min(100, Math.round((ev.doneLength / ev.totalLength) * 100));
          self.postMessage({
            type: 'status',
            phase: 'initializing',
            progress: pct,
            message: `Clang/LLVM WASM 로딩 중 (${pct}%)`,
          });
        }
      },
    });
    clangModule = mod;
    self.postMessage({ type: 'status', phase: 'ready', message: 'Clang/LLVM (C17) 준비 완료' });
    return mod;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

async function compileC(
  clangMod: any,
  entryFilename: string,
  virtualFiles: Record<string, string | Uint8Array>,
  extraFlags: string[] = []
): Promise<{
  ok: boolean;
  wasmBytes?: Uint8Array;
  compileOutput: string;
  compileTimeMs: number;
}> {
  const decoder = new TextDecoder('utf-8');
  let diagOutput = '';
  const c0 = performance.now();

  const args = [
    'clang',
    '-std=c17',
    '-Wall',
    '-Wextra',
    ...extraFlags,
    entryFilename,
    '-lm',
    '-o',
    'main.wasm',
  ];

  try {
    const outFiles = await clangMod.runClang(args, virtualFiles, {
      stdout: (chunk: Uint8Array | null) => {
        if (chunk) diagOutput += decoder.decode(chunk, { stream: true });
      },
      stderr: (chunk: Uint8Array | null) => {
        if (chunk) diagOutput += decoder.decode(chunk, { stream: true });
      },
    });
    const compileTimeMs = Math.round(performance.now() - c0);
    const wasmBytes = outFiles?.['main.wasm'] as Uint8Array | undefined;
    if (!wasmBytes) {
      return { ok: false, compileOutput: diagOutput || '컴파일 결과 바이너리를 생성하지 못했습니다.', compileTimeMs };
    }
    return { ok: true, wasmBytes, compileOutput: diagOutput, compileTimeMs };
  } catch (err: any) {
    const compileTimeMs = Math.round(performance.now() - c0);
    const msg = diagOutput.trim() || (err instanceof Error ? err.message : String(err));
    return { ok: false, compileOutput: msg, compileTimeMs };
  }
}

async function executeWasiBinary(
  wasmBytes: Uint8Array,
  stdinText: string,
  extraTxtFiles: Record<string, string>,
  maxOutputBytes: number
): Promise<{
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  executionTimeMs: number;
  traceJsonl?: string;
  runtimeError?: string;
}> {
  const encoder = new TextEncoder();
  const stdoutDec = new TextDecoder('utf-8');
  const stderrDec = new TextDecoder('utf-8');

  let stdout = '';
  let stderr = '';
  let stdoutLen = 0;
  let stderrLen = 0;
  let truncated = false;

  const stdoutFd = new ConsoleStdout((chunk: Uint8Array) => {
    if (stdoutLen >= maxOutputBytes) {
      truncated = true;
      return;
    }
    const text = stdoutDec.decode(chunk, { stream: true });
    const remaining = maxOutputBytes - stdoutLen;
    if (text.length > remaining) {
      stdout += text.slice(0, remaining);
      stdoutLen = maxOutputBytes;
      truncated = true;
    } else {
      stdout += text;
      stdoutLen += text.length;
    }
  });

  const stderrFd = new ConsoleStdout((chunk: Uint8Array) => {
    if (stderrLen >= maxOutputBytes) {
      truncated = true;
      return;
    }
    const text = stderrDec.decode(chunk, { stream: true });
    const remaining = maxOutputBytes - stderrLen;
    if (text.length > remaining) {
      stderr += text.slice(0, remaining);
      stderrLen = maxOutputBytes;
      truncated = true;
    } else {
      stderr += text;
      stderrLen += text.length;
    }
  });

  const dirEntries = new Map<string, File>();
  for (const [name, content] of Object.entries(extraTxtFiles)) {
    // 단순 파일명만 루트 작업 디렉터리에 마운트
    if (!name.includes('/')) {
      dirEntries.set(name, new File(encoder.encode(content)));
    }
  }
  const preopen = new PreopenDirectory('.', dirEntries);
  const stdinBytes = encoder.encode(stdinText);

  const wasi = new WASI(
    ['main.wasm'],
    [],
    [new OpenFile(new File(stdinBytes)), stdoutFd, stderrFd, preopen]
  );

  const t0 = performance.now();
  let exitCode: number | null = 0;
  let ok = true;
  let runtimeError: string | undefined;

  try {
    const wasmModule = await WebAssembly.compile(new Uint8Array(wasmBytes));
    const instance = await WebAssembly.instantiate(wasmModule, {
      wasi_snapshot_preview1: wasi.wasiImport,
    });
    const code = wasi.start(instance as any);
    exitCode = typeof code === 'number' ? code : 0;
    ok = exitCode === 0;
  } catch (err) {
    ok = false;
    exitCode = null;
    runtimeError = err instanceof Error ? err.message : String(err);
    stderr += (stderr ? '\n' : '') + `런타임 오류 (WebAssembly Trap): ${runtimeError}`;
  }

  stdout += stdoutDec.decode();
  stderr += stderrDec.decode();
  const executionTimeMs = Math.round(performance.now() - t0);

  let traceJsonl: string | undefined;
  const traceEntry = preopen.dir.contents.get('__cs_trace.jsonl');
  if (traceEntry && traceEntry instanceof File) {
    traceJsonl = new TextDecoder('utf-8').decode(traceEntry.data);
  }

  return {
    ok,
    exitCode,
    stdout,
    stderr,
    truncated,
    executionTimeMs,
    traceJsonl,
    runtimeError,
  };
}

function buildVirtualFsTree(files: Record<string, string>): Record<string, any> {
  const tree: Record<string, any> = {};
  for (const [path, content] of Object.entries(files)) {
    const parts = path.replace(/^\/+/, '').split('/').filter(Boolean);
    let cur = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        cur[part] = content;
      } else {
        if (!cur[part] || typeof cur[part] !== 'object') {
          cur[part] = {};
        }
        cur = cur[part];
      }
    }
  }
  return tree;
}

self.onmessage = async (event: MessageEvent<CWorkerRequest>) => {
  const msg = event.data;

  try {
    if (msg.type === 'init') {
      await ensureClang(msg.baseUrl);
      self.postMessage({ type: 'init-result', id: msg.id, ok: true });
      return;
    }

    const clangMod = await ensureClang(msg.baseUrl);
    const entryFilename = msg.filename || 'main.c';
    const rawFiles: Record<string, string> = {
      ...(msg.files || {}),
      [entryFilename]: msg.code ?? msg.files?.[entryFilename] ?? '',
    };

    if (msg.type === 'run') {
      const vfs = buildVirtualFsTree(rawFiles);
      const compiled = await compileC(clangMod, entryFilename, vfs);
      const diagnostics = parseClangDiagnostics(compiled.compileOutput);

      if (!compiled.ok || !compiled.wasmBytes) {
        const result: ExecutionResult = {
          language: 'c',
          ok: false,
          compiled: false,
          stdout: '',
          stderr: compiled.compileOutput,
          compileOutput: compiled.compileOutput,
          diagnostics,
          exitCode: null,
          compileTimeMs: compiled.compileTimeMs,
          executionTimeMs: 0,
          terminatedReason: 'compile_error',
        };
        self.postMessage({ type: 'run-result', id: msg.id, result });
        return;
      }

      const txtFiles: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawFiles)) {
        if (k.endsWith('.txt')) txtFiles[k] = v;
      }

      const execRes = await executeWasiBinary(
        compiled.wasmBytes,
        msg.stdin || '',
        txtFiles,
        msg.maxOutputBytes || MAX_OUTPUT_DEFAULT
      );

      const result: ExecutionResult = {
        language: 'c',
        ok: execRes.ok,
        compiled: true,
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        compileOutput: compiled.compileOutput,
        diagnostics,
        exitCode: execRes.exitCode,
        compileTimeMs: compiled.compileTimeMs,
        executionTimeMs: execRes.executionTimeMs,
        truncatedOutput: execRes.truncated,
        terminatedReason: execRes.ok ? undefined : 'runtime_error',
      };

      self.postMessage({ type: 'run-result', id: msg.id, result });
      return;
    }

    if (msg.type === 'trace') {
      const sourceCode = msg.code || '';
      const maxSteps = msg.maxSteps || 400;
      const inst = instrumentCCode(sourceCode, maxSteps);

      const traceFiles: Record<string, string> = {
        ...(msg.files || {}),
        [entryFilename]: inst.instrumentedCode,
        '__cs_trace.h': inst.traceHeader,
      };
      const vfs = buildVirtualFsTree(traceFiles);
      // 계측 시 미사용 경고로 방해되지 않도록 -Wno-unused-function 추가
      const compiled = await compileC(clangMod, entryFilename, vfs, ['-Wno-unused-function']);

      if (!compiled.ok || !compiled.wasmBytes) {
        // 계측 코드 컴파일 실패 시 원본 코드 컴파일 여부를 안내
        const traceResult: TraceResult = {
          language: 'c',
          ok: false,
          isRealExecution: true,
          steps: [],
          stdout: '',
          stderr: compiled.compileOutput,
          compileOutput: compiled.compileOutput,
          executionTimeMs: compiled.compileTimeMs,
          warnings: [
            '자동 실행 추적 계측 코드 컴파일에 실패했습니다. 문법 오류를 먼저 확인하거나, 지원되는 C 문법 범위(기본 변수, 1차원 배열, 포인터, struct, malloc/free, 함수/재귀)인지 확인해주세요.',
          ],
          unsupportedNotes: inst.unsupportedNotes,
          errorMessage: compiled.compileOutput,
        };
        self.postMessage({ type: 'trace-result', id: msg.id, result: traceResult });
        return;
      }

      const txtFiles: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawFiles)) {
        if (k.endsWith('.txt')) txtFiles[k] = v;
      }

      const execRes = await executeWasiBinary(
        compiled.wasmBytes,
        msg.stdin || '',
        txtFiles,
        msg.maxOutputBytes || MAX_OUTPUT_DEFAULT
      );

      const parsed = parseCTraceJsonl(execRes.traceJsonl || '', execRes.stdout);
      const warnings = [...inst.warnings];
      if (parsed.truncated) {
        warnings.push(`최대 추적 단계(${maxSteps}단계)에 도달하여 이후 단계는 생략되었습니다.`);
      }

      const traceResult: TraceResult = {
        language: 'c',
        ok: execRes.ok && parsed.steps.length > 0,
        isRealExecution: true,
        steps: parsed.steps,
        truncated: parsed.truncated,
        maxSteps,
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        compileOutput: compiled.compileOutput,
        executionTimeMs: compiled.compileTimeMs + execRes.executionTimeMs,
        warnings,
        unsupportedNotes: inst.unsupportedNotes,
        errorMessage: execRes.ok ? undefined : execRes.stderr || execRes.runtimeError,
      };

      self.postMessage({ type: 'trace-result', id: msg.id, result: traceResult });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', id: msg.id, error: message });
  }
};
