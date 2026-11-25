import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPyodide } from 'pyodide';
import { parsePythonDiagnostics } from '../src/engines/diagnostics';
import { buildPythonTraceScript } from '../src/engines/pythonTracer';

let pyPromise: Promise<any> | null = null;
function getPyodide() {
  if (!pyPromise) {
    pyPromise = loadPyodide({
      indexURL: path.resolve(process.cwd(), 'node_modules/pyodide') + '/',
    });
  }
  return pyPromise;
}

async function runPython(code: string, stdin = '') {
  const py = await getPyodide();
  py.globals.set('__t_code', code);
  py.globals.set('__t_stdin', stdin);
  const resJson: string = await py.runPythonAsync(`
import sys, io, json, traceback
out, err = io.StringIO(), io.StringIO()
old = (sys.stdin, sys.stdout, sys.stderr)
sys.stdin, sys.stdout, sys.stderr = io.StringIO(__t_stdin), out, err
ok = True
try:
    exec(compile(__t_code, "main.py", "exec"), {"__name__": "__main__"})
except Exception:
    ok = False
    traceback.print_exc(file=err)
finally:
    sys.stdin, sys.stdout, sys.stderr = old
json.dumps({"ok": ok, "stdout": out.getvalue(), "stderr": err.getvalue()})
`);
  return JSON.parse(resJson) as { ok: boolean; stdout: string; stderr: string };
}

describe('Python 3 실제 실행 및 추적 엔진 (Pyodide)', () => {
  it('Python Hello World를 정확히 실행한다', async () => {
    const res = await runPython('print("Hello, Code Studio!")');
    expect(res.ok).toBe(true);
    expect(res.stdout).toBe('Hello, Code Studio!\n');
    expect(res.stderr).toBe('');
  });

  it('Python input()과 print()를 처리한다', async () => {
    const code = `
a = int(input())
b = int(input())
print(f"합={a + b}, 곱={a * b}")
`;
    const res = await runPython(code, '7\n6\n');
    expect(res.ok).toBe(true);
    expect(res.stdout).toBe('합=13, 곱=42\n');
  });

  it('Python 배열, 반복문, 재귀 함수를 정확히 실행한다', async () => {
    const code = `
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

arr = [fib(i) for i in range(7)]
print(arr)
`;
    const res = await runPython(code);
    expect(res.ok).toBe(true);
    expect(res.stdout).toBe('[0, 1, 1, 2, 3, 5, 8]\n');
  });

  it('Python 런타임 오류와 발생 줄 번호를 정확히 파싱한다', async () => {
    const code = `x = 10
y = 0
z = x / y
print(z)
`;
    const res = await runPython(code);
    expect(res.ok).toBe(false);
    expect(res.stderr).toContain('ZeroDivisionError');
    const diags = parsePythonDiagnostics(res.stderr, 'main.py');
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].line).toBe(3);
    expect(diags[0].message).toContain('ZeroDivisionError');
  });

  it('sys.settrace로 재귀 호출 스택, 변수, 배열, 연결 리스트 객체를 실제로 추적한다', async () => {
    const py = await getPyodide();
    await py.runPythonAsync(buildPythonTraceScript());

    const code = `class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

arr = [3, 1, 2]
arr.sort()
ans = fact(3)
head = Node(10, Node(20))
print(ans, arr, head.val)
`;

    py.globals.set('__tc', code);
    const jsonStr: string = await py.runPythonAsync(
      `__cs_run_with_trace(__tc, "main.py", "", 300)`
    );
    const trace = JSON.parse(jsonStr);

    expect(trace.ok).toBe(true);
    expect(trace.stdout).toBe('6 [1, 2, 3] 10\n');
    expect(trace.steps.length).toBeGreaterThan(10);

    // 재귀 호출 깊이 확인 (전역 + fact(3) + fact(2) + fact(1) -> 최소 4 프레임)
    const maxDepth = Math.max(...trace.steps.map((s: any) => s.frames.length));
    expect(maxDepth).toBeGreaterThanOrEqual(4);

    // 마지막 단계에서 변수 ans=6, arr=[1, 2, 3], 힙 노드(Node) 추적 확인
    const lastStep = trace.steps[trace.steps.length - 1];
    const topVars = lastStep.frames[0]?.locals || [];
    const ansVar = topVars.find((v: any) => v.name === 'ans');
    expect(ansVar?.value.display).toBe('6');
    const arrVar = topVars.find((v: any) => v.name === 'arr');
    expect(arrVar?.value.display).toBe('[1, 2, 3]');
    const nodeHeap = lastStep.heap.filter((h: any) => h.typeName === 'Node');
    expect(nodeHeap.length).toBe(2);
    expect(nodeHeap.some((h: any) => h.nextAddress)).toBe(true);
  });
});
