import type { Diagnostic } from '../types/ide';

/**
 * Clang 표준 오류 출력에서 파일명, 줄, 열, 심각도, 메시지를 추출합니다.
 * 예: main.c:12:5: error: expected ';' after expression
 */
export function parseClangDiagnostics(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = output.split(/\r?\n/);
  const regex = /^([^:\n]+):(\d+):(\d+):\s*(fatal error|error|warning|note):\s*(.+)$/;

  for (const raw of lines) {
    const m = raw.match(regex);
    if (!m) continue;
    const [, file, lineStr, colStr, rawSev, message] = m;
    // 내부 추적 헤더(__cs_trace.h) 경고는 사용자 진단에서 제외
    if (file.includes('__cs_trace.h')) continue;
    const severity: Diagnostic['severity'] =
      rawSev === 'error' || rawSev === 'fatal error'
        ? 'error'
        : rawSev === 'warning'
          ? 'warning'
          : 'info';
    diagnostics.push({
      file: file.replace(/^\.\//, ''),
      line: Math.max(1, Number(lineStr)),
      column: Math.max(1, Number(colStr)),
      severity,
      message: message.trim(),
      raw,
    });
  }

  return diagnostics;
}

/**
 * Python Traceback 출력에서 사용자 코드의 오류 줄 번호와 메시지를 추출합니다.
 */
export function parsePythonDiagnostics(stderr: string, defaultFile = 'main.py'): Diagnostic[] {
  if (!stderr.trim()) return [];
  const diagnostics: Diagnostic[] = [];
  const lines = stderr.split(/\r?\n/);

  // 마지막 비어있지 않은 줄이 보통 "SyntaxError: ..." 또는 "ZeroDivisionError: ..."
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
  const errorSummary = nonEmpty[nonEmpty.length - 1] || 'Python 실행 오류';

  const fileLineRegex = /File "([^"]+)", line (\d+)/g;
  let lastMatch: { file: string; line: number } | null = null;
  let match: RegExpExecArray | null;

  while ((match = fileLineRegex.exec(stderr)) !== null) {
    const file = match[1];
    const line = Number(match[2]);
    // 내부 Pyodide / 트레이서 프레임 무시
    if (
      file.includes('/lib/python') ||
      file.includes('_pyodide') ||
      file === '<string>' ||
      file === '<code_studio_runner>'
    ) {
      if (file === '<string>' && !lastMatch) {
        lastMatch = { file: defaultFile, line };
      }
      continue;
    }
    lastMatch = {
      file: file.replace(/^\/home\/pyodide\/workspace\//, ''),
      line,
    };
  }

  if (lastMatch) {
    diagnostics.push({
      file: lastMatch.file === '<user_code>' ? defaultFile : lastMatch.file,
      line: Math.max(1, lastMatch.line),
      column: 1,
      severity: 'error',
      message: errorSummary,
      raw: stderr,
    });
  } else if (stderr.trim()) {
    diagnostics.push({
      file: defaultFile,
      line: 1,
      column: 1,
      severity: 'error',
      message: errorSummary,
      raw: stderr,
    });
  }

  return diagnostics;
}
