/// <reference lib="webworker" />
import { parsePythonDiagnostics } from '../engines/diagnostics';
import { buildPythonTraceScript } from '../engines/pythonTracer';
import type { ExecutionResult } from '../types/ide';
import type { TraceResult, TraceStep } from '../types/trace';

interface RunRequest {
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
let pyodideInstance: any = null;
let initPromise: Promise<any> | null = null;
let traceHelperLoaded = false;

async function ensurePyodide(baseUrl: string) {
  if (pyodideInstance) return pyodideInstance;
  if (initPromise) return initPromise;

  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const indexURL = `${cleanBase}engines/pyodide/`;

  self.postMessage({ type: 'status', phase: 'initializing', message: 'Python(Pyodide) 런타임 초기화 중...' });

  initPromise = (async () => {
    const mod = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`);
    const py = await mod.loadPyodide({
      indexURL,
    });
    pyodideInstance = py;
    self.postMessage({ type: 'status', phase: 'ready', message: `Python ${py.version} 준비 완료` });
    return py;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

function writeWorkspaceFiles(py: any, files: Record<string, string>) {
  const root = '/home/pyodide/workspace';
  try {
    py.FS.mkdirTree(root);
  } catch {
    // 이미 존재
  }
  for (const [relPath, content] of Object.entries(files)) {
    const normalized = relPath.replace(/^\/+/, '');
    const fullPath = `${root}/${normalized}`;
    const lastSlash = fullPath.lastIndexOf('/');
    if (lastSlash > 0) {
      try {
        py.FS.mkdirTree(fullPath.slice(0, lastSlash));
      } catch {
        // 무시
      }
    }
    py.FS.writeFile(fullPath, content, { encoding: 'utf8' });
  }
}

/**
 * 이전 단계와 비교해 변경된 변수에 changed / previousDisplay를 표시합니다.
 */
function annotateStepDiffs(steps: TraceStep[]): TraceStep[] {
  const prevMap = new Map<string, string>();
  return steps.map((step) => {
    const frames = step.frames.map((frame, fIdx) => {
      const locals = frame.locals.map((v) => {
        const key = `f:${fIdx}:${frame.functionName}:${v.name}`;
        const prev = prevMap.get(key);
        const changed = prev !== undefined && prev !== v.value.display;
        prevMap.set(key, v.value.display);
        return {
          ...v,
          changed,
          previousDisplay: changed ? prev : undefined,
        };
      });
      return { ...frame, locals };
    });

    const globals = step.globals.map((v) => {
      const key = `g:${v.name}`;
      const prev = prevMap.get(key);
      const changed = prev !== undefined && prev !== v.value.display;
      prevMap.set(key, v.value.display);
      return {
        ...v,
        changed,
        previousDisplay: changed ? prev : undefined,
      };
    });

    const changedList: string[] = [];
    const topFrame = frames[frames.length - 1];
    if (topFrame) {
      for (const lv of topFrame.locals) {
        if (lv.changed) {
          changedList.push(`${lv.name}: ${lv.previousDisplay} → ${lv.value.display}`);
        }
      }
    }
    const description =
      step.event === 'line' && changedList.length > 0
        ? `줄 ${step.line} 실행 — 변경: ${changedList.slice(0, 3).join(', ')}`
        : step.description;

    return { ...step, frames, globals, description };
  });
}

self.onmessage = async (event: MessageEvent<RunRequest>) => {
  const msg = event.data;

  try {
    if (msg.type === 'init') {
      await ensurePyodide(msg.baseUrl);
      self.postMessage({ type: 'init-result', id: msg.id, ok: true });
      return;
    }

    const py = await ensurePyodide(msg.baseUrl);
    const filename = msg.filename || 'main.py';
    const files = msg.files || {};
    writeWorkspaceFiles(py, files);

    if (msg.type === 'run') {
      const maxOutputBytes = msg.maxOutputBytes || MAX_OUTPUT_DEFAULT;
      const start = performance.now();

      py.globals.set('__cs_code', msg.code || '');
      py.globals.set('__cs_stdin', msg.stdin || '');
      py.globals.set('__cs_filename', filename);
      py.globals.set('__cs_max_out', maxOutputBytes);

      const runnerResultJson: string = await py.runPythonAsync(`
import sys, io, os, json, traceback

class __CSLimitedStringIO(io.StringIO):
    def __init__(self, limit):
        super().__init__()
        self._limit = limit
        self._written = 0
        self.truncated = False
    def write(self, s):
        if not s:
            return 0
        remaining = self._limit - self._written
        if remaining <= 0:
            self.truncated = True
            return len(s)
        if len(s) > remaining:
            self.truncated = True
            s = s[:remaining]
        self._written += len(s)
        return super().write(s)

os.chdir("/home/pyodide/workspace")
if "/home/pyodide/workspace" not in sys.path:
    sys.path.append("/home/pyodide/workspace")

__out = __CSLimitedStringIO(int(__cs_max_out))
__err = __CSLimitedStringIO(int(__cs_max_out))
__old_in, __old_out, __old_err = sys.stdin, sys.stdout, sys.stderr
sys.stdin = io.StringIO(__cs_stdin)
sys.stdout = __out
sys.stderr = __err

__ok = True
__exit_code = 0
__ns = {"__name__": "__main__", "__file__": __cs_filename}
try:
    __compiled = compile(__cs_code, __cs_filename, "exec")
    exec(__compiled, __ns, __ns)
except SystemExit as e:
    code = e.code
    if code is None:
        __exit_code = 0
    elif isinstance(code, int):
        __exit_code = code
        __ok = (code == 0)
    else:
        __err.write(str(code) + "\\n")
        __exit_code = 1
        __ok = False
except Exception:
    __ok = False
    __exit_code = 1
    traceback.print_exc(file=__err)
finally:
    sys.stdin, sys.stdout, sys.stderr = __old_in, __old_out, __old_err

json.dumps({
    "ok": __ok,
    "exitCode": __exit_code,
    "stdout": __out.getvalue(),
    "stderr": __err.getvalue(),
    "truncated": __out.truncated or __err.truncated
}, ensure_ascii=False)
`);

      const elapsed = performance.now() - start;
      const parsed = JSON.parse(runnerResultJson);
      const diagnostics = parsed.ok ? [] : parsePythonDiagnostics(parsed.stderr, filename);

      const result: ExecutionResult = {
        language: 'python',
        ok: Boolean(parsed.ok),
        stdout: parsed.stdout || '',
        stderr: parsed.stderr || '',
        diagnostics,
        exitCode: parsed.exitCode ?? (parsed.ok ? 0 : 1),
        executionTimeMs: Math.round(elapsed),
        truncatedOutput: Boolean(parsed.truncated),
        terminatedReason: parsed.ok ? undefined : 'runtime_error',
      };

      self.postMessage({ type: 'run-result', id: msg.id, result });
      return;
    }

    if (msg.type === 'trace') {
      const start = performance.now();
      if (!traceHelperLoaded) {
        await py.runPythonAsync(buildPythonTraceScript());
        traceHelperLoaded = true;
      }

      py.globals.set('__cs_trace_code', msg.code || '');
      py.globals.set('__cs_trace_stdin', msg.stdin || '');
      py.globals.set('__cs_trace_file', filename);
      py.globals.set('__cs_trace_max', msg.maxSteps || 400);

      const rawJson: string = await py.runPythonAsync(`
import os, sys
os.chdir("/home/pyodide/workspace")
if "/home/pyodide/workspace" not in sys.path:
    sys.path.append("/home/pyodide/workspace")
__cs_run_with_trace(__cs_trace_code, __cs_trace_file, __cs_trace_stdin, int(__cs_trace_max))
`);

      const elapsed = performance.now() - start;
      const parsed = JSON.parse(rawJson);
      const steps = annotateStepDiffs((parsed.steps || []) as TraceStep[]);

      const traceResult: TraceResult = {
        language: 'python',
        ok: Boolean(parsed.ok),
        isRealExecution: true,
        steps,
        truncated: Boolean(parsed.truncated),
        maxSteps: parsed.maxSteps || msg.maxSteps || 400,
        stdout: parsed.stdout || '',
        stderr: parsed.stderr || '',
        executionTimeMs: Math.round(elapsed),
        warnings: parsed.truncated
          ? [`최대 추적 단계(${parsed.maxSteps || 400}단계)에 도달하여 이후 단계는 생략되었습니다.`]
          : [],
        errorMessage: parsed.errorMessage || undefined,
      };

      self.postMessage({ type: 'trace-result', id: msg.id, result: traceResult });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({
      type: 'error',
      id: msg.id,
      error: message,
    });
  }
};
