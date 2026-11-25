import type { Language } from '../types/ide';

/**
 * 지원 범위 내 코드 포맷터 (외부 서버 없이 클라이언트 즉시 처리)
 * - Python: 탭→스페이스 정규화, 후행 공백 제거, 과도한 빈 줄 정리
 * - C: 중괄호 기반 자동 들여쓰기, 후행 공백 제거, 깔끔한 줄바꿈 정리
 */
export function formatCode(code: string, language: Language, tabSize = 4): string {
  const indentUnit = ' '.repeat(tabSize);
  const rawLines = code.replace(/\r\n/g, '\n').split('\n');

  if (language === 'python') {
    const out: string[] = [];
    let consecutiveBlank = 0;
    for (const raw of rawLines) {
      const replacedTabs = raw.replace(/\t/g, indentUnit).replace(/[ \t]+$/g, '');
      if (replacedTabs.trim() === '') {
        consecutiveBlank++;
        if (consecutiveBlank <= 2) out.push('');
      } else {
        consecutiveBlank = 0;
        out.push(replacedTabs);
      }
    }
    return out.join('\n').trimEnd() + '\n';
  }

  // C17 기본 포맷터 (중괄호 깊이 기준 들여쓰기, 문자열/주석 내부는 보존)
  const out: string[] = [];
  let depth = 0;
  let inBlockComment = false;
  let consecutiveBlank = 0;

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      consecutiveBlank++;
      if (consecutiveBlank <= 1) out.push('');
      continue;
    }
    consecutiveBlank = 0;

    if (inBlockComment) {
      out.push(indentUnit.repeat(depth) + trimmed);
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }

    // 전처리기 지시문은 0칸 들여쓰기
    if (trimmed.startsWith('#')) {
      out.push(trimmed);
      continue;
    }

    // 닫는 중괄호로 시작하면 먼저 depth 감소
    const leadingClose = trimmed.match(/^\}+/);
    let lineDepth = depth;
    if (leadingClose) {
      lineDepth = Math.max(0, depth - leadingClose[0].length);
    }
    // case / default 라벨은 1단계 덜 들여쓰기
    if (/^(case\b|default\s*:)/.test(trimmed)) {
      lineDepth = Math.max(0, lineDepth - 1);
    }

    out.push(indentUnit.repeat(lineDepth) + trimmed);

    // 줄 내부의 순수 중괄호 수 계산 (문자열/주석 제외)
    let open = 0;
    let close = 0;
    let inStr: string | null = null;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      const next = trimmed[i + 1];
      if (inStr) {
        if (ch === '\\') {
          i++;
        } else if (ch === inStr) {
          inStr = null;
        }
        continue;
      }
      if (ch === '/' && next === '/') break;
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = ch;
        continue;
      }
      if (ch === '{') open++;
      else if (ch === '}') close++;
    }
    depth = Math.max(0, depth + open - close);
  }

  return out.join('\n').trimEnd() + '\n';
}
