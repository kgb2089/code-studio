import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type Completion,
  type CompletionContext,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, undo } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintGutter, setDiagnostics, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import { openSearchPanel, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, StateEffect, StateField } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Decoration,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type DecorationSet,
} from '@codemirror/view';
import {
  FileCode2,
  FileText,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Diagnostic, FileNode, Language } from '../types/ide';

export interface EditorPaneHandle {
  insertText: (text: string) => void;
  moveCursor: (delta: number) => void;
  undo: () => void;
  redo: () => void;
  openSearch: () => void;
  jumpToLine: (line: number) => void;
  focus: () => void;
}

interface EditorPaneProps {
  openFiles: FileNode[];
  activeFile: FileNode | null;
  language: Language;
  theme: 'dark' | 'light';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  diagnostics: Diagnostic[];
  activeTraceLine: number | null;
  isFullscreen: boolean;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onChangeContent: (fileId: string, content: string) => void;
  onCursorChange: (line: number, col: number) => void;
  onFormat: () => void;
  onRunShortcut: () => void;
  onTraceShortcut: () => void;
  onChangeFontSize: (delta: number) => void;
  onToggleFullscreen: () => void;
}

const setTraceLineEffect = StateEffect.define<number | null>();

const traceLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decos, tr) {
    decos = decos.map(tr.changes);
    for (const eff of tr.effects) {
      if (eff.is(setTraceLineEffect)) {
        if (eff.value === null || eff.value < 1 || eff.value > tr.state.doc.lines) {
          return Decoration.none;
        }
        const line = tr.state.doc.line(eff.value);
        return Decoration.set([Decoration.line({ class: 'cm-active-trace-line' }).range(line.from)]);
      }
    }
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const PYTHON_COMPLETIONS: Completion[] = [
  'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'range', 'break', 'continue',
  'class', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'yield',
  'True', 'False', 'None', 'and', 'or', 'not', 'pass', 'global', 'nonlocal',
].map((kw): Completion => ({ label: kw, type: 'keyword' })).concat(
  [
    { label: 'print', type: 'function', detail: '(...)' },
    { label: 'input', type: 'function', detail: '(prompt="")' },
    { label: 'len', type: 'function', detail: '(obj)' },
    { label: 'int', type: 'function', detail: '(x)' },
    { label: 'float', type: 'function', detail: '(x)' },
    { label: 'str', type: 'function', detail: '(x)' },
    { label: 'list', type: 'function', detail: '(iterable)' },
    { label: 'dict', type: 'function', detail: '()' },
    { label: 'set', type: 'function', detail: '()' },
    { label: 'sorted', type: 'function', detail: '(iterable)' },
    { label: 'enumerate', type: 'function', detail: '(iterable)' },
    { label: 'zip', type: 'function', detail: '(*iterables)' },
    { label: 'map', type: 'function', detail: '(fn, iterable)' },
    { label: 'sum', type: 'function', detail: '(iterable)' },
    { label: 'min', type: 'function', detail: '(...)' },
    { label: 'max', type: 'function', detail: '(...)' },
    { label: 'abs', type: 'function', detail: '(x)' },
    { label: 'append', type: 'method', detail: '(item)' },
    { label: 'pop', type: 'method', detail: '(idx=-1)' },
  ]
);

const C_COMPLETIONS: Completion[] = [
  'int', 'long', 'short', 'char', 'float', 'double', 'void', 'bool', 'size_t', 'unsigned',
  'const', 'static', 'struct', 'typedef', 'enum', 'union', 'sizeof', 'return', 'if', 'else',
  'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'NULL', 'true', 'false',
].map((kw): Completion => ({ label: kw, type: 'keyword' })).concat(
  [
    { label: '#include <stdio.h>', type: 'keyword', detail: '표준 입출력' },
    { label: '#include <stdlib.h>', type: 'keyword', detail: '동적 메모리/유틸' },
    { label: '#include <string.h>', type: 'keyword', detail: '문자열 함수' },
    { label: '#include <math.h>', type: 'keyword', detail: '수학 함수' },
    { label: '#include <stdbool.h>', type: 'keyword', detail: 'bool 타입' },
    { label: 'printf', type: 'function', detail: '(fmt, ...)' },
    { label: 'scanf', type: 'function', detail: '(fmt, &...)' },
    { label: 'malloc', type: 'function', detail: '(size_t size)' },
    { label: 'calloc', type: 'function', detail: '(size_t n, size_t size)' },
    { label: 'realloc', type: 'function', detail: '(void *ptr, size_t size)' },
    { label: 'free', type: 'function', detail: '(void *ptr)' },
    { label: 'strlen', type: 'function', detail: '(const char *s)' },
    { label: 'strcmp', type: 'function', detail: '(s1, s2)' },
    { label: 'strcpy', type: 'function', detail: '(dst, src)' },
    { label: 'memset', type: 'function', detail: '(ptr, val, n)' },
    { label: 'memcpy', type: 'function', detail: '(dst, src, n)' },
    { label: 'qsort', type: 'function', detail: '(base, n, size, cmp)' },
    { label: 'sqrt', type: 'function', detail: '(double x)' },
    { label: 'abs', type: 'function', detail: '(int x)' },
  ]
);

function createKeywordCompletion(lang: Language) {
  const baseList = lang === 'python' ? PYTHON_COMPLETIONS : C_COMPLETIONS;
  return (context: CompletionContext) => {
    const word = context.matchBefore(/#?[A-Za-z_][\w]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    // 현재 문서의 사용자 식별자도 자동완성에 추가
    const docText = context.state.doc.toString();
    const identMatches = docText.match(/\b[A-Za-z_]\w{2,}\b/g) || [];
    const seen = new Set(baseList.map((c) => c.label));
    const extras: Completion[] = [];
    for (const id of identMatches) {
      if (!seen.has(id) && id !== word.text) {
        seen.add(id);
        extras.push({ label: id, type: 'variable' });
      }
      if (extras.length > 40) break;
    }
    return {
      from: word.from,
      options: [...baseList, ...extras],
    };
  };
}

const lightEditorTheme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: '#0f172a' },
  '.cm-gutters': { backgroundColor: '#f8fafc', color: '#64748b', borderRight: '1px solid #e2e8f0' },
  '.cm-activeLine': { backgroundColor: 'rgba(14, 165, 233, 0.06)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(14, 165, 233, 0.1)' },
});

const darkEditorTheme = EditorView.theme({
  '&': { backgroundColor: '#0d1424' },
  '.cm-gutters': { backgroundColor: '#0f172a', borderRight: '1px solid #1e293b' },
});

export const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(function EditorPane(
  {
    openFiles,
    activeFile,
    language,
    theme,
    fontSize,
    tabSize,
    wordWrap,
    diagnostics,
    activeTraceLine,
    isFullscreen,
    onSelectTab,
    onCloseTab,
    onChangeContent,
    onCursorChange,
    onFormat,
    onRunShortcut,
    onTraceShortcut,
    onChangeFontSize,
    onToggleFullscreen,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const activeFileIdRef = useRef<string | null>(activeFile?.id ?? null);
  const onChangeRef = useRef(onChangeContent);
  const onCursorRef = useRef(onCursorChange);
  const onRunRef = useRef(onRunShortcut);
  const onTraceRef = useRef(onTraceShortcut);
  const onFormatRef = useRef(onFormat);

  onChangeRef.current = onChangeContent;
  onCursorRef.current = onCursorChange;
  onRunRef.current = onRunShortcut;
  onTraceRef.current = onTraceShortcut;
  onFormatRef.current = onFormat;
  activeFileIdRef.current = activeFile?.id ?? null;

  const langComp = useRef(new Compartment()).current;
  const themeComp = useRef(new Compartment()).current;
  const fontComp = useRef(new Compartment()).current;
  const wrapComp = useRef(new Compartment()).current;
  const tabComp = useRef(new Compartment()).current;

  const fileExtLang = (name?: string): 'python' | 'c' | 'text' => {
    if (!name) return language;
    const lower = name.toLowerCase();
    if (lower.endsWith('.py')) return 'python';
    if (lower.endsWith('.c') || lower.endsWith('.h')) return 'c';
    return 'text';
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const extLang = fileExtLang(activeFile?.name);
    const state = EditorState.create({
      doc: activeFile?.content || '',
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        lintGutter(),
        traceLineField,
        langComp.of(
          extLang === 'python'
            ? [python(), autocompletion({ override: [createKeywordCompletion('python')] })]
            : extLang === 'c'
              ? [cpp(), autocompletion({ override: [createKeywordCompletion('c')] })]
              : []
        ),
        themeComp.of(
          theme === 'dark'
            ? [oneDark, darkEditorTheme]
            : [syntaxHighlighting(defaultHighlightStyle), lightEditorTheme]
        ),
        fontComp.of(
          EditorView.theme({
            '&': { fontSize: `${fontSize}px`, lineHeight: '1.55' },
          })
        ),
        wrapComp.of(wordWrap ? EditorView.lineWrapping : []),
        tabComp.of([EditorState.tabSize.of(tabSize), indentUnit.of(' '.repeat(tabSize))]),
        keymap.of([
          {
            key: 'Mod-Shift-Enter',
            run: () => {
              onTraceRef.current();
              return true;
            },
          },
          {
            key: 'Mod-Enter',
            run: () => {
              onRunRef.current();
              return true;
            },
          },
          {
            key: 'Mod-Shift-f',
            run: () => {
              onFormatRef.current();
              return true;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && activeFileIdRef.current) {
            onChangeRef.current(activeFileIdRef.current, update.state.doc.toString());
          }
          if (update.selectionSet || update.docChanged) {
            const head = update.state.selection.main.head;
            const line = update.state.doc.lineAt(head);
            onCursorRef.current(line.number, head - line.from + 1);
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // 활성 파일 변경 또는 외부(포맷/복사)에 의한 문서 내용 동기화
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const nextContent = activeFile?.content ?? '';
    const currentContent = view.state.doc.toString();
    if (nextContent !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: nextContent },
      });
    }
    const extLang = fileExtLang(activeFile?.name);
    view.dispatch({
      effects: langComp.reconfigure(
        extLang === 'python'
          ? [python(), autocompletion({ override: [createKeywordCompletion('python')] })]
          : extLang === 'c'
            ? [cpp(), autocompletion({ override: [createKeywordCompletion('c')] })]
            : []
      ),
    });
  }, [activeFile?.id, activeFile?.content, activeFile?.name, language]);

  // 테마/글꼴/줄바꿈/탭 크기 동기화
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        themeComp.reconfigure(
          theme === 'dark'
            ? [oneDark, darkEditorTheme]
            : [syntaxHighlighting(defaultHighlightStyle), lightEditorTheme]
        ),
        fontComp.reconfigure(
          EditorView.theme({
            '&': { fontSize: `${fontSize}px`, lineHeight: '1.55' },
          })
        ),
        wrapComp.reconfigure(wordWrap ? EditorView.lineWrapping : []),
        tabComp.reconfigure([EditorState.tabSize.of(tabSize), indentUnit.of(' '.repeat(tabSize))]),
      ],
    });
  }, [theme, fontSize, wordWrap, tabSize]);

  // 실시간 컴파일/런타임 오류 밑줄 표시 (@codemirror/lint)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !activeFile) return;
    const doc = view.state.doc;
    const cmDiags: CmDiagnostic[] = [];

    for (const d of diagnostics) {
      if (d.file && !activeFile.name.endsWith(d.file) && !d.file.endsWith(activeFile.name)) {
        continue;
      }
      const lineNum = Math.max(1, Math.min(doc.lines, d.line));
      const lineObj = doc.line(lineNum);
      const from = Math.min(lineObj.to, lineObj.from + Math.max(0, d.column - 1));
      const to = Math.min(lineObj.to, Math.max(from + 1, lineObj.to));
      cmDiags.push({
        from,
        to,
        severity: d.severity,
        message: d.message,
      });
    }

    view.dispatch(setDiagnostics(view.state, cmDiags));
  }, [diagnostics, activeFile?.id, activeFile?.name]);

  // 실행 추적 중인 현재 줄 강조 및 스크롤
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setTraceLineEffect.of(activeTraceLine) });
    if (activeTraceLine !== null && activeTraceLine >= 1 && activeTraceLine <= view.state.doc.lines) {
      const line = view.state.doc.line(activeTraceLine);
      view.dispatch({
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      });
    }
  }, [activeTraceLine]);

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      const view = viewRef.current;
      if (!view) return;
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: text },
        selection: { anchor: sel.from + text.length },
      });
      view.focus();
    },
    moveCursor(delta: number) {
      const view = viewRef.current;
      if (!view) return;
      const cur = view.state.selection.main.head;
      const next = Math.max(0, Math.min(view.state.doc.length, cur + delta));
      view.dispatch({ selection: { anchor: next } });
      view.focus();
    },
    undo() {
      if (viewRef.current) {
        undo(viewRef.current);
        viewRef.current.focus();
      }
    },
    redo() {
      if (viewRef.current) {
        redo(viewRef.current);
        viewRef.current.focus();
      }
    },
    openSearch() {
      if (viewRef.current) {
        openSearchPanel(viewRef.current);
        viewRef.current.focus();
      }
    },
    jumpToLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const safe = Math.max(1, Math.min(view.state.doc.lines, line));
      const lineObj = view.state.doc.line(safe);
      view.dispatch({
        selection: { anchor: lineObj.from },
        effects: EditorView.scrollIntoView(lineObj.from, { y: 'center' }),
      });
      view.focus();
    },
    focus() {
      viewRef.current?.focus();
    },
  }));

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--bg-surface)]">
      {/* 파일 탭 바 & 에디터 빠른 도구 */}
      <div className="ide-chrome flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] min-h-[38px] px-1 gap-1">
        <div className="flex items-center overflow-x-auto no-scrollbar gap-0.5 flex-1 min-w-0">
          {openFiles.map((file) => {
            const isActive = file.id === activeFile?.id;
            const isPy = file.name.endsWith('.py');
            const isC = file.name.endsWith('.c') || file.name.endsWith('.h');
            return (
              <div
                key={file.id}
                onClick={() => onSelectTab(file.id)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md cursor-pointer shrink-0 transition-colors border-t-2 ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {isPy || isC ? (
                  <FileCode2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isPy ? 'text-sky-400' : 'text-emerald-400'
                    }`}
                  />
                ) : (
                  <FileText className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                )}
                <span className="max-w-[140px] truncate">{file.name}</span>
                {file.isExample && (
                  <span className="text-[10px] px-1 rounded bg-sky-500/15 text-sky-400">예제</span>
                )}
                <button
                  type="button"
                  aria-label={`${file.name} 탭 닫기`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(file.id);
                  }}
                  className="p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* 에디터 우측 빠른 액션 */}
        <div className="flex items-center gap-0.5 shrink-0 pr-1">
          <button
            type="button"
            onClick={() => viewRef.current && openSearchPanel(viewRef.current)}
            title="검색 및 바꾸기 (Cmd/Ctrl+F)"
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onFormat}
            title="코드 자동 정렬 (Cmd/Ctrl+Shift+F)"
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <div className="hidden sm:flex items-center border-l border-[var(--border-subtle)] pl-1 ml-0.5">
            <button
              type="button"
              onClick={() => onChangeFontSize(-1)}
              title="글꼴 축소"
              className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-[11px] text-[var(--text-muted)] px-1 tabular-nums">{fontSize}</span>
            <button
              type="button"
              onClick={() => onChangeFontSize(1)}
              title="글꼴 확대"
              className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? '전체 화면 종료' : '에디터 전체 화면'}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* CodeMirror 편집 영역 (컨테이너를 항상 마운트해 비동기 파일 로드 후에도 즉시 표시) */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {!activeFile && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg-surface)] text-[var(--text-muted)] gap-2 p-6 text-center">
            <FileCode2 className="w-10 h-10 opacity-40" />
            <p className="text-sm font-medium">열린 파일이 없습니다</p>
            <p className="text-xs">좌측 파일 탐색기에서 파일을 선택하거나 새 파일을 만들어 보세요.</p>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
});
