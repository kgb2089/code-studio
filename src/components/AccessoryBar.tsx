import { ArrowLeft, ArrowRight, Redo2, Search, Undo2 } from 'lucide-react';
import type { Language } from '../types/ide';

interface AccessoryBarProps {
  language: Language;
  tabSize: number;
  onInsert: (text: string) => void;
  onMoveCursor: (delta: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSearch: () => void;
}

/**
 * iPad 가상 키보드 사용 시 코딩 기호(Tab, 괄호, 중괄호, 세미콜론, 화살표 등)를
 * 한 번의 터치로 빠르게 입력할 수 있는 보조 키 바입니다.
 */
export function AccessoryBar({
  language,
  tabSize,
  onInsert,
  onMoveCursor,
  onUndo,
  onRedo,
  onSearch,
}: AccessoryBarProps) {
  const keys =
    language === 'c'
      ? [
          { label: 'Tab', insert: ' '.repeat(tabSize) },
          { label: '{', insert: '{' },
          { label: '}', insert: '}' },
          { label: '(', insert: '(' },
          { label: ')', insert: ')' },
          { label: '[', insert: '[' },
          { label: ']', insert: ']' },
          { label: ';', insert: ';' },
          { label: '*', insert: '*' },
          { label: '&', insert: '&' },
          { label: '->', insert: '->' },
          { label: '"', insert: '"' },
          { label: '=', insert: '=' },
          { label: '<', insert: '<' },
          { label: '>', insert: '>' },
          { label: '#', insert: '#' },
        ]
      : [
          { label: 'Tab', insert: ' '.repeat(tabSize) },
          { label: ':', insert: ':' },
          { label: '(', insert: '(' },
          { label: ')', insert: ')' },
          { label: '[', insert: '[' },
          { label: ']', insert: ']' },
          { label: '{', insert: '{' },
          { label: '}', insert: '}' },
          { label: '"', insert: '"' },
          { label: "'", insert: "'" },
          { label: '=', insert: '=' },
          { label: '==', insert: '==' },
          { label: '<', insert: '<' },
          { label: '>', insert: '>' },
          { label: '_', insert: '_' },
          { label: '#', insert: '#' },
        ];

  return (
    <div
      className="ide-chrome flex items-center gap-1 px-2 py-1.5 border-t border-[var(--border-strong)] bg-[var(--bg-panel)] overflow-x-auto"
      role="toolbar"
      aria-label="코딩 보조 키보드"
    >
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onUndo}
        className="shrink-0 h-8 px-2 rounded-md bg-[var(--bg-elevated)] active:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center justify-center"
        title="실행 취소"
      >
        <Undo2 className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onRedo}
        className="shrink-0 h-8 px-2 rounded-md bg-[var(--bg-elevated)] active:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center justify-center"
        title="다시 실행"
      >
        <Redo2 className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => onMoveCursor(-1)}
        className="shrink-0 h-8 px-2 rounded-md bg-[var(--bg-elevated)] active:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center justify-center"
        title="커서 왼쪽"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => onMoveCursor(1)}
        className="shrink-0 h-8 px-2 rounded-md bg-[var(--bg-elevated)] active:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center justify-center"
        title="커서 오른쪽"
      >
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-5 bg-[var(--border-strong)] mx-0.5 shrink-0" />

      {keys.map((k) => (
        <button
          key={k.label}
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onInsert(k.insert)}
          className="shrink-0 min-w-[34px] h-8 px-2 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] active:scale-95 text-[var(--text-primary)] font-mono text-xs font-semibold transition-transform"
        >
          {k.label}
        </button>
      ))}

      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onSearch}
        className="shrink-0 h-8 px-2 rounded-md bg-[var(--bg-elevated)] active:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center justify-center ml-auto"
        title="검색"
      >
        <Search className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
