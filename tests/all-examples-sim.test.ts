import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { runClang } from '@yowasp/clang';
import { ConsoleStdout, File, OpenFile, PreopenDirectory, WASI } from '@bjorn3/browser_wasi_shim';
import { loadPyodide } from 'pyodide';
import { TraceVisualizer } from '../src/components/TraceVisualizer';
import { instrumentCCode, parseCTraceJsonl } from '../src/engines/cInstrumenter';
import { buildPythonTraceScript } from '../src/engines/pythonTracer';
import { ALL_LEARNING_TOPICS } from '../src/learning';
import type { TraceResult } from '../src/types/trace';

describe('전체 28개 학습 예제 (Python 28종 + C17 28종) 실제 실행 추적 & 시뮬레이션 전수 검증', () => {
  it('Python 28개 전체 예제 + 엣지 케이스가 추적 및 시뮬레이션 렌더링에 성공한다', async () => {
    const py = await loadPyodide({ indexURL: path.resolve('node_modules/pyodide') + '/' });
    await py.runPythonAsync(buildPythonTraceScript());

    const failures: string[] = [];

    const extraPy = [
      { id: 'edge-empty', code: '' },
      { id: 'edge-print-only', code: 'print("hi")' },
      { id: 'edge-neg-float', code: 'arr = [-5, 0, 3.5, -2]\narr.sort()\nprint(arr)' },
      { id: 'edge-deque', code: 'from collections import deque\nq = deque([1, 2, 3])\nq.popleft()\nq.append(4)\nprint(list(q))' },
      { id: 'edge-set', code: 's = {3, 1, 2}\ns.add(4)\ns.discard(1)\nprint(sorted(s))' },
      { id: 'edge-2d-dp', code: 'dp = [[0]*4 for _ in range(3)]\nfor i in range(1, 3):\n    for j in range(1, 4):\n        dp[i][j] = i * j\nprint(dp)' },
    ];

    const cases = [
      ...ALL_LEARNING_TOPICS.map((t) => ({ id: t.id, code: t.pythonCode })),
      ...extraPy,
    ];

    for (const tc of cases) {
      py.globals.set('__sc', tc.code);
      const raw = JSON.parse(
        await py.runPythonAsync(`__cs_run_with_trace(__sc, "${tc.id}.py", "", 250)`)
      );
      if (!raw.ok) {
        failures.push(`[PY EXEC FAIL] ${tc.id}: ${raw.errorMessage}`);
        continue;
      }
      if (tc.code.trim().length > 0 && raw.steps.length === 0) {
        failures.push(`[PY ZERO STEPS] ${tc.id}`);
        continue;
      }
      const traceResult: TraceResult = {
        language: 'python',
        ok: raw.ok,
        isRealExecution: true,
        steps: raw.steps,
        stdout: raw.stdout,
        stderr: raw.stderr,
        executionTimeMs: 1,
        warnings: [],
      };
      // 첫/중간/마지막 단계 + 랜덤 샘플 렌더링 확인
      const sampleIdxs = Array.from(
        new Set([0, Math.floor(raw.steps.length / 2), Math.max(0, raw.steps.length - 1)])
      ).filter((i) => i < raw.steps.length);
      for (const idx of sampleIdxs) {
        try {
          const html = renderToString(
            React.createElement(TraceVisualizer, {
              language: 'python',
              sourceCode: tc.code,
              isTracing: false,
              traceResult,
              currentStepIndex: idx,
              isFullscreen: false,
              onChangeStep: () => {},
              onRunTrace: () => {},
              onToggleFullscreen: () => {},
            })
          );
          if (html.length < 50) failures.push(`[PY RENDER SHORT] ${tc.id}@${idx}`);
        } catch (err) {
          failures.push(`[PY RENDER CRASH] ${tc.id}@${idx}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    expect(failures).toEqual([]);
  }, 60000);

  it('C17 28개 전체 예제 + 엣지 케이스가 계측 컴파일·실행·추적 및 렌더링에 성공한다', async () => {
    const failures: string[] = [];
    const dec = new TextDecoder();

    const extraC = [
      { id: 'edge-c-printf', code: '#include <stdio.h>\nint main(void) { printf("hi\\n"); return 0; }' },
      { id: 'edge-c-singleline-if', code: '#include <stdio.h>\nint main(void) {\n int a = 3, b = 5;\n if (a < b)\n   a = 10;\n else\n   b = 20;\n printf("%d %d\\n", a, b);\n return 0;\n}' },
      { id: 'edge-c-for-nobrace', code: '#include <stdio.h>\nint main(void) {\n int s = 0;\n for (int i = 1; i <= 5; i++)\n   s += i;\n printf("%d\\n", s);\n return 0;\n}' },
      { id: 'edge-c-double', code: '#include <stdio.h>\nint main(void) {\n double x = 1.5, y = 2.5;\n double a[3] = {1.1, 2.2, 3.3};\n a[1] = x + y;\n printf("%.1f\\n", a[1]);\n return 0;\n}' },
    ];

    const cases = [
      ...ALL_LEARNING_TOPICS.map((t) => ({ id: t.id, code: t.cCode })),
      ...extraC,
    ];

    for (const tc of cases) {
      const inst = instrumentCCode(tc.code, 250);
      let diag = '';
      let wasm: Uint8Array | undefined;
      try {
        const out = await runClang(
          ['clang', '-std=c17', '-Wall', '-Wextra', '-Wno-unused-function', 'main.c', '-lm', '-o', 'main.wasm'],
          { 'main.c': inst.instrumentedCode, '__cs_trace.h': inst.traceHeader },
          {
            stdout: (b) => { if (b) diag += dec.decode(b, { stream: true }); },
            stderr: (b) => { if (b) diag += dec.decode(b, { stream: true }); },
          }
        );
        wasm = out?.['main.wasm'] as Uint8Array | undefined;
      } catch (e) {
        failures.push(`[C COMPILE FAIL] ${tc.id}: ${diag || String(e)}`);
        continue;
      }

      if (!wasm) {
        failures.push(`[C NO WASM] ${tc.id}: ${diag}`);
        continue;
      }

      let stdout = '';
      const outDec = new TextDecoder();
      const preopen = new PreopenDirectory('.', new Map());
      const wasi = new WASI(
        ['main.wasm'],
        [],
        [
          new OpenFile(new File(new Uint8Array())),
          new ConsoleStdout((c) => { stdout += outDec.decode(c, { stream: true }); }),
          new ConsoleStdout(() => {}),
          preopen,
        ]
      );
      try {
        const mod = await WebAssembly.compile(new Uint8Array(wasm));
        const instWasm = await WebAssembly.instantiate(mod, { wasi_snapshot_preview1: wasi.wasiImport });
        const exitCode = wasi.start(instWasm as any);
        if (exitCode !== 0) {
          failures.push(`[C EXIT ${exitCode}] ${tc.id}`);
          continue;
        }
      } catch (err) {
        failures.push(`[C TRAP] ${tc.id}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      const traceFile = preopen.dir.contents.get('__cs_trace.jsonl');
      const jsonl = traceFile && traceFile instanceof File ? new TextDecoder().decode(traceFile.data) : '';
      const parsed = parseCTraceJsonl(jsonl, stdout);
      if (parsed.steps.length === 0) {
        failures.push(`[C ZERO STEPS] ${tc.id}`);
        continue;
      }

      const traceResult: TraceResult = {
        language: 'c',
        ok: true,
        isRealExecution: true,
        steps: parsed.steps,
        stdout,
        stderr: '',
        executionTimeMs: 1,
        warnings: [],
      };

      const sampleIdxs = Array.from(
        new Set([0, Math.floor(parsed.steps.length / 2), Math.max(0, parsed.steps.length - 1)])
      ).filter((i) => i < parsed.steps.length);
      for (const idx of sampleIdxs) {
        try {
          const html = renderToString(
            React.createElement(TraceVisualizer, {
              language: 'c',
              sourceCode: tc.code,
              isTracing: false,
              traceResult,
              currentStepIndex: idx,
              isFullscreen: false,
              onChangeStep: () => {},
              onRunTrace: () => {},
              onToggleFullscreen: () => {},
            })
          );
          if (html.length < 50) failures.push(`[C RENDER SHORT] ${tc.id}@${idx}`);
        } catch (err) {
          failures.push(`[C RENDER CRASH] ${tc.id}@${idx}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    expect(failures).toEqual([]);
  }, 120000);
});
