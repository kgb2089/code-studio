import { describe, expect, it } from 'vitest';
import { runClang } from '@yowasp/clang';
import { ConsoleStdout, File, OpenFile, PreopenDirectory, WASI } from '@bjorn3/browser_wasi_shim';
import { instrumentCCode, parseCTraceJsonl } from '../src/engines/cInstrumenter';
import { parseClangDiagnostics } from '../src/engines/diagnostics';

async function compileAndRunC(
  source: string,
  stdin = '',
  extraFiles: Record<string, string> = {}
) {
  const dec = new TextDecoder();
  let diagOut = '';
  let wasmBytes: Uint8Array | undefined;

  try {
    const out = await runClang(
      ['clang', '-std=c17', '-Wall', '-Wextra', '-Wno-unused-function', 'main.c', '-lm', '-o', 'main.wasm'],
      { ...extraFiles, 'main.c': source },
      {
        stdout: (b) => { if (b) diagOut += dec.decode(b, { stream: true }); },
        stderr: (b) => { if (b) diagOut += dec.decode(b, { stream: true }); },
      }
    );
    wasmBytes = out?.['main.wasm'] as Uint8Array | undefined;
  } catch {
    return {
      compiled: false,
      ok: false,
      exitCode: null as number | null,
      stdout: '',
      stderr: diagOut,
      diagnostics: parseClangDiagnostics(diagOut),
      traceJsonl: '',
    };
  }

  if (!wasmBytes) {
    return {
      compiled: false,
      ok: false,
      exitCode: null as number | null,
      stdout: '',
      stderr: diagOut,
      diagnostics: parseClangDiagnostics(diagOut),
      traceJsonl: '',
    };
  }

  let stdout = '';
  let stderr = '';
  const outDec = new TextDecoder();
  const errDec = new TextDecoder();
  const preopen = new PreopenDirectory('.', new Map());
  const wasi = new WASI(
    ['main.wasm'],
    [],
    [
      new OpenFile(new File(new TextEncoder().encode(stdin))),
      new ConsoleStdout((chunk) => { stdout += outDec.decode(chunk, { stream: true }); }),
      new ConsoleStdout((chunk) => { stderr += errDec.decode(chunk, { stream: true }); }),
      preopen,
    ]
  );

  let exitCode: number | null = 0;
  let ok = true;
  try {
    const mod = await WebAssembly.compile(new Uint8Array(wasmBytes));
    const inst = await WebAssembly.instantiate(mod, { wasi_snapshot_preview1: wasi.wasiImport });
    exitCode = wasi.start(inst as any);
    ok = exitCode === 0;
  } catch (err) {
    ok = false;
    exitCode = null;
    stderr += err instanceof Error ? err.message : String(err);
  }

  stdout += outDec.decode();
  stderr += errDec.decode();

  const traceFile = preopen.dir.contents.get('__cs_trace.jsonl');
  const traceJsonl =
    traceFile && traceFile instanceof File ? new TextDecoder().decode(traceFile.data) : '';

  return {
    compiled: true,
    ok,
    exitCode,
    stdout,
    stderr,
    diagnostics: parseClangDiagnostics(diagOut),
    traceJsonl,
  };
}

describe('C17 실제 컴파일 및 실행 엔진 (YoWASP Clang + WASI)', () => {
  it('C Hello World를 실제 컴파일하고 실행한다', async () => {
    const res = await compileAndRunC(`
#include <stdio.h>
int main(void) {
    printf("Hello, C17!\\n");
    return 0;
}
`);
    expect(res.compiled).toBe(true);
    expect(res.ok).toBe(true);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toBe('Hello, C17!\n');
  });

  it('C scanf()와 printf()로 표준 입출력을 처리한다', async () => {
    const res = await compileAndRunC(
      `
#include <stdio.h>
int main(void) {
    int a = 0, b = 0;
    if (scanf("%d %d", &a, &b) != 2) return 1;
    printf("sum=%d diff=%d\\n", a + b, a - b);
    return 0;
}
`,
      '25 17\n'
    );
    expect(res.ok).toBe(true);
    expect(res.stdout).toBe('sum=42 diff=8\n');
  });

  it('C 배열 정렬을 정확히 컴파일·실행한다', async () => {
    const res = await compileAndRunC(`
#include <stdio.h>
int main(void) {
    int arr[] = {9, 3, 7, 1, 5};
    int n = 5;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
            }
        }
    }
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    return 0;
}
`);
    expect(res.ok).toBe(true);
    expect(res.stdout).toBe('1 3 5 7 9 ');
  });

  it('C 포인터, 구조체, malloc/calloc/realloc/free 동적 메모리를 지원한다', async () => {
    const res = await compileAndRunC(`
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = (int *)calloc(3, sizeof(int));
    p[0] = 10; p[1] = 20; p[2] = 30;
    p = (int *)realloc(p, 5 * sizeof(int));
    p[3] = 40; p[4] = 50;
    int sum = 0;
    for (int i = 0; i < 5; i++) sum += *(p + i);
    printf("sum=%d\\n", sum);
    free(p);
    return 0;
}
`);
    expect(res.ok).toBe(true);
    expect(res.stdout).toBe('sum=150\n');
  });

  it('잘못된 C 문법의 컴파일 오류와 줄 번호를 정확히 보고한다', async () => {
    const res = await compileAndRunC(`#include <stdio.h>
int main(void) {
    int x = 10
    printf("%d\\n", x);
    return 0;
}
`);
    expect(res.compiled).toBe(false);
    expect(res.diagnostics.length).toBeGreaterThan(0);
    expect(res.diagnostics[0].severity).toBe('error');
    expect(res.diagnostics[0].line).toBe(3);
  });

  it('실제 C 계측 실행 추적: 배열, 재귀 호출 스택, 포인터 및 동적 메모리 연결 리스트를 추적한다', async () => {
    const code = `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int val;
    struct Node *next;
} Node;

int fact(int n) {
    if (n <= 1) {
        return 1;
    }
    int sub = fact(n - 1);
    return n * sub;
}

int main(void) {
    int arr[3] = {3, 1, 2};
    arr[0] = 1;
    arr[1] = 2;
    arr[2] = 3;
    int ans = fact(3);
    Node *n1 = (Node *)malloc(sizeof(Node));
    n1->val = 10;
    Node *n2 = (Node *)malloc(sizeof(Node));
    n2->val = 20;
    n2->next = NULL;
    n1->next = n2;
    printf("%d %d\\n", ans, n1->next->val);
    free(n2);
    free(n1);
    return 0;
}
`;
    const inst = instrumentCCode(code, 300);
    const res = await compileAndRunC(inst.instrumentedCode, '', {
      '__cs_trace.h': inst.traceHeader,
    });

    expect(res.compiled).toBe(true);
    expect(res.ok).toBe(true);
    expect(res.stdout).toBe('6 20\n');

    const parsed = parseCTraceJsonl(res.traceJsonl, res.stdout);
    expect(parsed.steps.length).toBeGreaterThan(15);

    // 재귀 호출 스택 깊이 확인 (main + fact(3) + fact(2) + fact(1) >= 4)
    const maxStack = Math.max(...parsed.steps.map((s) => s.frames.length));
    expect(maxStack).toBeGreaterThanOrEqual(4);

    // 힙 블록(malloc 2개) 및 연결 리스트 nextAddress 확인
    const hasLinkedNodes = parsed.steps.some(
      (s) => s.heap.filter((h) => h.kind === 'struct' && h.nextAddress).length > 0
    );
    expect(hasLinkedNodes).toBe(true);

    // 마지막 단계에서 free(n2), free(n1) 이후 모든 힙 블록이 freed=true로 기록되었는지 확인
    const lastStep = parsed.steps[parsed.steps.length - 1];
    expect(lastStep.heap.length).toBe(2);
    expect(lastStep.heap.every((h) => h.freed)).toBe(true);
  });
});
