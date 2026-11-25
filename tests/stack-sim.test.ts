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
import { getLearningTopicById } from '../src/learning';
import type { TraceResult } from '../src/types/trace';

describe('스택 예제 (stack.c / stack.py) 실제 실행 추적 및 시뮬레이션 렌더링 검증', () => {
  it('stack.c 전역 배열(stack[MAX], top)이 계측·컴파일·추적되고 모든 단계가 오류 없이 렌더링된다', async () => {
    const topic = getLearningTopicById('ds-stack')!;
    const inst = instrumentCCode(topic.cCode, 300);
    expect(inst.trackedVarCount).toBeGreaterThanOrEqual(2);

    const dec = new TextDecoder();
    let diag = '';
    const out = await runClang(
      ['clang', '-std=c17', '-Wall', '-Wextra', '-Wno-unused-function', 'stack.c', '-lm', '-o', 'main.wasm'],
      { 'stack.c': inst.instrumentedCode, '__cs_trace.h': inst.traceHeader },
      {
        stdout: (b) => { if (b) diag += dec.decode(b, { stream: true }); },
        stderr: (b) => { if (b) diag += dec.decode(b, { stream: true }); },
      }
    );
    const wasm = out?.['main.wasm'] as Uint8Array;
    expect(wasm, `Clang failed: ${diag}`).toBeDefined();

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
    const mod = await WebAssembly.compile(new Uint8Array(wasm));
    const instWasm = await WebAssembly.instantiate(mod, { wasi_snapshot_preview1: wasi.wasiImport });
    expect(wasi.start(instWasm as any)).toBe(0);

    const traceFile = preopen.dir.contents.get('__cs_trace.jsonl');
    const jsonl = traceFile && traceFile instanceof File ? new TextDecoder().decode(traceFile.data) : '';
    const parsed = parseCTraceJsonl(jsonl, stdout);

    expect(parsed.steps.length).toBeGreaterThan(5);
    // stack과 top이 실제 추적되었는지 확인
    const hasStackVar = parsed.steps.some((s) =>
      s.frames.some((f) => f.locals.some((v) => v.name === 'stack'))
    );
    const hasTopVar = parsed.steps.some((s) =>
      s.frames.some((f) => f.locals.some((v) => v.name === 'top' && v.value.display === '2'))
    );
    expect(hasStackVar).toBe(true);
    expect(hasTopVar).toBe(true);

    const traceResult: TraceResult = {
      language: 'c',
      ok: true,
      isRealExecution: true,
      steps: parsed.steps,
      stdout,
      stderr: '',
      executionTimeMs: 10,
      warnings: [],
    };

    for (let i = 0; i < parsed.steps.length; i++) {
      const html = renderToString(
        React.createElement(TraceVisualizer, {
          language: 'c',
          sourceCode: topic.cCode,
          isTracing: false,
          traceResult,
          currentStepIndex: i,
          isFullscreen: false,
          onChangeStep: () => {},
          onRunTrace: () => {},
          onToggleFullscreen: () => {},
        })
      );
      expect(html.length).toBeGreaterThan(100);
    }
  });

  it('stack.py가 추적되고 모든 80+ 단계가 오류 없이 렌더링된다', async () => {
    const topic = getLearningTopicById('ds-stack')!;
    const py = await loadPyodide({ indexURL: path.resolve('node_modules/pyodide') + '/' });
    await py.runPythonAsync(buildPythonTraceScript());
    py.globals.set('__sc', topic.pythonCode);
    const raw = JSON.parse(
      await py.runPythonAsync(`__cs_run_with_trace(__sc, "stack.py", "", 400)`)
    );
    expect(raw.ok).toBe(true);
    expect(raw.steps.length).toBeGreaterThan(20);

    const traceResult: TraceResult = {
      language: 'python',
      ok: true,
      isRealExecution: true,
      steps: raw.steps,
      stdout: raw.stdout,
      stderr: raw.stderr,
      executionTimeMs: 10,
      warnings: [],
    };

    for (let i = 0; i < raw.steps.length; i++) {
      const html = renderToString(
        React.createElement(TraceVisualizer, {
          language: 'python',
          sourceCode: topic.pythonCode,
          isTracing: false,
          traceResult,
          currentStepIndex: i,
          isFullscreen: false,
          onChangeStep: () => {},
          onRunTrace: () => {},
          onToggleFullscreen: () => {},
        })
      );
      expect(html.length).toBeGreaterThan(100);
    }
  });
});
