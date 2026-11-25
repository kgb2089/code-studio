import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Play,
  Plus,
  RotateCcw,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  BottomTab,
  Diagnostic,
  EngineStatus,
  ExecutionResult,
  Language,
  TestCase,
  TestCaseRunResult,
} from '../types/ide';
import type { TraceResult } from '../types/trace';

interface BottomPanelProps {
  tab: BottomTab;
  collapsed: boolean;
  stdin: string;
  language: Language;
  isRunning: boolean;
  isRunningTests: boolean;
  result: ExecutionResult | null;
  traceResult: TraceResult | null;
  engineStatus: EngineStatus;
  testCases: TestCase[];
  testResults: TestCaseRunResult[];
  onChangeTab: (tab: BottomTab) => void;
  onToggleCollapse: () => void;
  onChangeStdin: (value: string) => void;
  onClearOutput: () => void;
  onJumpToDiagnostic: (d: Diagnostic) => void;
  onResetEngine: () => void;
  onAddTestCase: () => void;
  onUpdateTestCase: (id: string, patch: Partial<TestCase>) => void;
  onDeleteTestCase: (id: string) => void;
  onRunAllTestCases: () => void;
}

export function BottomPanel({
  tab,
  collapsed,
  stdin,
  language,
  isRunning,
  isRunningTests,
  result,
  traceResult,
  engineStatus,
  testCases,
  testResults,
  onChangeTab,
  onToggleCollapse,
  onChangeStdin,
  onClearOutput,
  onJumpToDiagnostic,
  onResetEngine,
  onAddTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
  onRunAllTestCases,
}: BottomPanelProps) {
  const diagnostics = result?.diagnostics || [];
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warnCount = diagnostics.filter((d) => d.severity === 'warning').length;

  const passedCount = testResults.filter((r) => r.status === 'pass').length;
  const resultById = new Map(testResults.map((r) => [r.testCaseId, r]));

  return (
    <section className="flex flex-col h-full min-h-0 bg-[var(--bg-panel)] border-t border-[var(--border-subtle)]">
      {/* 탭 바 */}
      <div className="ide-chrome flex items-center justify-between gap-2 px-2 py-1 border-b border-[var(--border-subtle)] bg-[var(--bg-root)] shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              onChangeTab('output');
              if (collapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors ${
              tab === 'output' && !collapsed
                ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>실행 결과</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeTab('stdin');
              if (collapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors ${
              tab === 'stdin' && !collapsed
                ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>표준 입력 (stdin)</span>
            {stdin.trim().length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeTab('tests');
              if (collapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors ${
              tab === 'tests' && !collapsed
                ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>테스트 케이스</span>
            {testResults.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  passedCount === testResults.length
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {passedCount}/{testResults.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeTab('problems');
              if (collapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors ${
              tab === 'problems' && !collapsed
                ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>오류/경고</span>
            {(errorCount > 0 || warnCount > 0) && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  errorCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {errorCount + warnCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeTab('debug');
              if (collapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors ${
              tab === 'debug' && !collapsed
                ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>디버그 정보</span>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {result && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] mr-1">
              {result.ok ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  종료 코드 {result.exitCode ?? 0}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-400 font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  {result.terminatedReason === 'compile_error'
                    ? '컴파일 실패'
                    : result.terminatedReason === 'timeout'
                      ? '시간 초과'
                      : result.terminatedReason === 'user'
                        ? '중단됨'
                        : `오류 (${result.exitCode ?? 'trap'})`}
                </span>
              )}
              {typeof result.compileTimeMs === 'number' && (
                <span className="text-[var(--text-muted)]">컴파일 {result.compileTimeMs}ms</span>
              )}
              <span className="text-[var(--text-muted)]">실행 {result.executionTimeMs}ms</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClearOutput}
            title="출력 지우기"
            className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? '패널 펼치기 (Cmd+J)' : '패널 접기 (Cmd+J)'}
            className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          >
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 본문 */}
      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* 실행 결과 탭 */}
          {tab === 'output' && (
            <div className="scroll-pane selectable-text h-full p-3 font-mono text-xs space-y-2">
              {isRunning && (
                <div className="flex items-center gap-2 text-sky-400">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span>
                    {language === 'c'
                      ? 'Clang/LLVM으로 C17 컴파일 및 WASI 실행 중...'
                      : 'Pyodide(Python 3) 실행 중...'}
                  </span>
                </div>
              )}

              {!isRunning && !result && (
                <p className="text-[var(--text-muted)] font-sans">
                  상단 [실행] 버튼(또는 Cmd+Enter)을 누르면 실제 WebAssembly 엔진이 브라우저 내에서 코드를 실행합니다.
                </p>
              )}

              {result && (
                <>
                  {result.language === 'c' && result.compiled === false && (
                    <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300">
                      <div className="font-sans font-semibold text-xs mb-1">C17 컴파일 오류</div>
                      <pre className="whitespace-pre-wrap break-words m-0">{result.compileOutput}</pre>
                    </div>
                  )}

                  {result.stdout && (
                    <div>
                      <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                        표준 출력 (stdout)
                      </div>
                      <pre className="whitespace-pre-wrap break-words m-0 text-[var(--text-primary)] bg-[var(--bg-surface)] p-2.5 rounded-md border border-[var(--border-subtle)]">
                        {result.stdout}
                      </pre>
                    </div>
                  )}

                  {result.stderr && result.compiled !== false && (
                    <div>
                      <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-rose-400 mb-1">
                        표준 오류 (stderr)
                      </div>
                      <pre className="whitespace-pre-wrap break-words m-0 text-rose-300 bg-rose-500/10 p-2.5 rounded-md border border-rose-500/30">
                        {result.stderr}
                      </pre>
                    </div>
                  )}

                  {!result.stdout && !result.stderr && result.ok && (
                    <p className="text-[var(--text-muted)] font-sans">
                      (출력 내용 없이 정상 종료되었습니다. 종료 코드: {result.exitCode ?? 0})
                    </p>
                  )}

                  {result.truncatedOutput && (
                    <p className="text-amber-400 font-sans text-[11px]">
                      ⚠ 출력 크기 제한(512 KB)을 초과하여 뒷부분이 잘렸습니다.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* 표준 입력(stdin) 탭 */}
          {tab === 'stdin' && (
            <div className="flex flex-col h-full p-2.5 gap-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
                <span>
                  실행 전에 입력할 값을 미리 작성하세요. Python의 <code className="text-sky-400">input()</code>과 C언어의{' '}
                  <code className="text-emerald-400">scanf()</code>에 순서대로 전달됩니다.
                </span>
                <button
                  type="button"
                  onClick={() => onChangeStdin('')}
                  className="shrink-0 px-2 py-0.5 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[11px]"
                >
                  비우기
                </button>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => onChangeStdin(e.target.value)}
                placeholder={'예:\n5\n10 20 30 40 50'}
                spellCheck={false}
                className="selectable-text flex-1 w-full resize-none rounded-lg p-2.5 font-mono text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          )}

          {/* 멀티 테스트 케이스 일괄 실행 및 자동 채점 탭 */}
          {tab === 'tests' && (
            <div className="flex flex-col h-full min-h-0">
              <div className="ide-chrome flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/40 shrink-0">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  백준/프로그래머스처럼 여러 입출력 케이스를 한 번에 실행해 PASS/FAIL을 자동 채점합니다.
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onAddTestCase}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>케이스 추가</span>
                  </button>
                  <button
                    type="button"
                    disabled={isRunning || isRunningTests || testCases.length === 0}
                    onClick={onRunAllTestCases}
                    className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isRunningTests ? '채점 중...' : '전체 실행 및 채점'}</span>
                  </button>
                </div>
              </div>

              <div className="scroll-pane flex-1 p-2.5 space-y-2.5">
                {testCases.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">
                    등록된 테스트 케이스가 없습니다. 우측 상단 [케이스 추가]를 눌러 추가해 보세요.
                  </p>
                ) : (
                  testCases.map((tc, idx) => {
                    const res = resultById.get(tc.id);
                    return (
                      <div
                        key={tc.id}
                        className={`rounded-xl border p-2.5 space-y-2 ${
                          res?.status === 'pass'
                            ? 'bg-emerald-500/5 border-emerald-500/35'
                            : res?.status === 'fail' || res?.status === 'error'
                              ? 'bg-rose-500/5 border-rose-500/35'
                              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              {tc.name || `테스트 #${idx + 1}`}
                            </span>
                            {res && (
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  res.status === 'pass'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {res.status === 'pass'
                                  ? `PASS · ${res.executionTimeMs}ms`
                                  : res.status === 'error'
                                    ? 'ERROR'
                                    : `FAIL · ${res.executionTimeMs}ms`}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteTestCase(tc.id)}
                            title="테스트 케이스 삭제"
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <div className="text-[10px] text-[var(--text-muted)] mb-0.5">입력 (stdin)</div>
                            <textarea
                              rows={2}
                              value={tc.input}
                              onChange={(e) => onUpdateTestCase(tc.id, { input: e.target.value })}
                              placeholder="입력값 (없으면 비워두기)"
                              spellCheck={false}
                              className="selectable-text w-full resize-none rounded-md p-1.5 font-mono text-xs bg-[var(--bg-root)]/70 border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                          <div>
                            <div className="text-[10px] text-[var(--text-muted)] mb-0.5">기대 출력 (Expected)</div>
                            <textarea
                              rows={2}
                              value={tc.expectedOutput}
                              onChange={(e) =>
                                onUpdateTestCase(tc.id, { expectedOutput: e.target.value })
                              }
                              placeholder="정답 출력값"
                              spellCheck={false}
                              className="selectable-text w-full resize-none rounded-md p-1.5 font-mono text-xs bg-[var(--bg-root)]/70 border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                        </div>

                        {res && res.status !== 'pass' && (
                          <div className="p-2 rounded-md bg-[var(--bg-root)]/80 border border-rose-500/30 font-mono text-[11px] space-y-1">
                            <div className="text-[10px] font-sans font-semibold text-rose-400">
                              실제 출력 (Actual){res.stderr ? ' / 오류' : ''}
                            </div>
                            <pre className="m-0 whitespace-pre-wrap text-[var(--text-primary)]">
                              {res.actualOutput || '(출력 없음)'}
                            </pre>
                            {res.stderr && (
                              <pre className="m-0 whitespace-pre-wrap text-rose-300">{res.stderr}</pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 오류 및 경고 탭 */}
          {tab === 'problems' && (
            <div className="scroll-pane h-full p-2 space-y-1">
              {diagnostics.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] p-2">
                  감지된 컴파일 오류나 런타임 오류가 없습니다.
                </p>
              ) : (
                diagnostics.map((d, idx) => (
                  <button
                    key={`${d.file}_${d.line}_${idx}`}
                    type="button"
                    onClick={() => onJumpToDiagnostic(d)}
                    className="w-full text-left flex items-start gap-2 p-2 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    {d.severity === 'error' ? (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-[var(--text-primary)] break-words">{d.message}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                        {d.file} : 줄 {d.line}, 열 {d.column}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* 디버그 정보 탭 */}
          {tab === 'debug' && (
            <div className="scroll-pane h-full p-3 text-xs space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">선택 엔진</div>
                  <div className="font-semibold mt-0.5">
                    {language === 'python' ? 'Pyodide (Python 3)' : 'YoWASP Clang (C17)'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">엔진 버전</div>
                  <div className="font-mono mt-0.5 truncate">{engineStatus.version}</div>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">실행 시간</div>
                  <div className="font-mono mt-0.5">
                    {result ? `${result.executionTimeMs} ms` : '-'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)]">추적 단계</div>
                  <div className="font-mono mt-0.5">
                    {traceResult ? `${traceResult.steps.length} 단계` : '-'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div>
                  <div className="font-semibold">Web Worker 실행 엔진 초기화</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    메모리가 많이 쌓였거나 워커 상태가 불안정할 때 엔진을 깨끗하게 재시작합니다.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onResetEngine}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] font-semibold text-xs shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>엔진 초기화</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
