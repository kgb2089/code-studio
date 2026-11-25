import {
  Activity,
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Language } from '../types/ide';
import type { HeapBlock, TraceResult, TraceStep, TraceValue, TraceVariable } from '../types/trace';

interface TraceVisualizerProps {
  language: Language;
  sourceCode: string;
  isTracing: boolean;
  traceResult: TraceResult | null;
  currentStepIndex: number;
  isFullscreen: boolean;
  onChangeStep: (index: number) => void;
  onRunTrace: () => void;
  onToggleFullscreen: () => void;
}

type ArrayViewMode = 'auto' | 'bars' | 'cells' | 'stack' | 'queue';

interface EnrichedStep {
  rawIndex: number;
  step: TraceStep;
  codeLine: string;
  narrative: string;
  comparedIndices: number[];
  compareExpr?: string;
  swappedPair: [number, number] | null;
  changedIndices: number[];
  comparisonsSoFar: number;
  mutationsSoFar: number;
  callsSoFar: number;
  hasVisualData: boolean;
  isMeaningful: boolean;
}

function isNumericItems(items: TraceValue[]): boolean {
  if (items.length === 0) return false;
  return items.every((it) => it.kind === 'primitive' && Number.isFinite(Number(it.display)));
}

function is2DArray(items: TraceValue[]): boolean {
  return (
    items.length > 0 &&
    items.length <= 16 &&
    items.every((row) => row.kind === 'array' && Array.isArray(row.items))
  );
}

function resolveAutoMode(name: string, items: TraceValue[]): Exclude<ArrayViewMode, 'auto'> {
  const lower = name.toLowerCase();
  if (/^(stack|stk|st)$/.test(lower) || lower.includes('stack')) return 'stack';
  if (/^(queue|q|dq|deque)$/.test(lower) || lower.includes('queue')) return 'queue';
  if (isNumericItems(items) && items.length >= 2) return 'bars';
  return 'cells';
}

/**
 * 한 단계에서 보이는 모든 변수를 추출하고, Python에서 같은 배열 참조(nums, arr)는 하나로 병합합니다.
 */
function extractStepVars(step: TraceStep) {
  const topVars = step.frames[step.frames.length - 1]?.locals || [];
  const allVarsMap = new Map<string, TraceVariable>();
  for (const gv of step.globals || []) allVarsMap.set(gv.name, gv);
  for (const lv of topVars) allVarsMap.set(lv.name, lv);
  const allVars = Array.from(allVarsMap.values());

  // 같은 메모리 주소/객체 ID를 가리키는 1D 배열은 이름 병합 (예: nums / arr)
  const arrays1DByAddr = new Map<string, { names: string[]; variable: TraceVariable }>();
  const arrays1DNoAddr: Array<{ names: string[]; variable: TraceVariable }> = [];
  const arrays2D: TraceVariable[] = [];
  const graphDicts: TraceVariable[] = [];
  const pointers: TraceVariable[] = [];
  const scalars: TraceVariable[] = [];
  const intVarMap = new Map<string, number>();
  const visitedSet = new Set<string>();
  const distMap: Record<string, string> = {};
  let currentNode: string | null = null;

  for (const v of allVars) {
    if (v.value.kind === 'array' && v.value.items) {
      if (is2DArray(v.value.items)) {
        arrays2D.push(v);
      } else {
        const addr = v.value.address || v.value.targetAddress;
        if (addr) {
          const existing = arrays1DByAddr.get(addr);
          if (existing) {
            if (!existing.names.includes(v.name)) existing.names.push(v.name);
          } else {
            arrays1DByAddr.set(addr, { names: [v.name], variable: v });
          }
        } else {
          arrays1DNoAddr.push({ names: [v.name], variable: v });
        }
      }
      if (/^(visited|vis|order|seen)$/i.test(v.name)) {
        for (const it of v.value.items) visitedSet.add(it.display);
      }
    } else if (v.value.kind === 'object' && v.value.fields) {
      if (/^(graph|adj|g)$/i.test(v.name)) {
        graphDicts.push(v);
      } else if (/^(dist|distance|d)$/i.test(v.name)) {
        for (const [k, dv] of Object.entries(v.value.fields)) distMap[k] = dv.display;
      }
    } else if (v.value.kind === 'pointer') {
      pointers.push(v);
    } else if (v.value.kind === 'primitive' || v.value.kind === 'string') {
      scalars.push(v);
      const num = Number(v.value.display);
      if (Number.isInteger(num)) intVarMap.set(v.name, num);
      if (/^(u|cur|curr|node|current)$/i.test(v.name)) currentNode = v.value.display;
    }
  }

  const arrays1D = [...Array.from(arrays1DByAddr.values()), ...arrays1DNoAddr].map((entry) => {
    const rawItems = entry.variable.value.items || [];
    const primaryName = entry.names[0]?.toLowerCase() || '';
    // C 고정 배열 스택(stack[64] + top), 큐(q[64] + front/rear), 힙(heap[64] + sz)을 실제 활성 범위만 슬라이싱
    if (
      entry.variable.value.type.includes('[') &&
      rawItems.length >= 8
    ) {
      if ((/^(stack|stk|st)$/.test(primaryName) || primaryName.includes('stack')) && intVarMap.has('top')) {
        const top = intVarMap.get('top')!;
        const sliced = top < 0 ? [] : rawItems.slice(0, Math.min(rawItems.length, top + 1));
        return {
          ...entry,
          variable: { ...entry.variable, value: { ...entry.variable.value, items: sliced } },
        };
      }
      if (
        (/^(q|queue|buf|dq)$/.test(primaryName) || primaryName.includes('queue')) &&
        intVarMap.has('front') &&
        intVarMap.has('rear')
      ) {
        const front = Math.max(0, intVarMap.get('front')!);
        const rear = Math.max(front, Math.min(rawItems.length, intVarMap.get('rear')!));
        const sliced = rawItems.slice(front, rear);
        return {
          ...entry,
          variable: { ...entry.variable, value: { ...entry.variable.value, items: sliced } },
        };
      }
      if (/^heap$/.test(primaryName) && (intVarMap.has('sz') || intVarMap.has('size'))) {
        const sz = Math.max(0, Math.min(rawItems.length, intVarMap.get('sz') ?? intVarMap.get('size') ?? 0));
        const sliced = rawItems.slice(0, sz);
        return {
          ...entry,
          variable: { ...entry.variable, value: { ...entry.variable.value, items: sliced } },
        };
      }
    }
    return entry;
  });
  return {
    arrays1D,
    arrays2D,
    graphDicts,
    pointers,
    scalars,
    intVarMap,
    visitedSet,
    distMap,
    currentNode,
  };
}

/**
 * 간단한 인덱스 표현식(예: j, j + 1, mid, i - 1, 0)을 현재 스코프의 정수 변수로 평가합니다.
 */
function evalSimpleIndexExpr(expr: string, intVars: Map<string, number>): number | null {
  const clean = expr.trim();
  if (/^\d+$/.test(clean)) return Number(clean);
  if (intVars.has(clean)) return intVars.get(clean)!;
  const m = clean.match(/^([A-Za-z_]\w*)\s*([+-])\s*(\d+)$/);
  if (m && intVars.has(m[1])) {
    const base = intVars.get(m[1])!;
    const offset = Number(m[3]);
    return m[2] === '+' ? base + offset : base - offset;
  }
  return null;
}

/**
 * 전체 TraceStep[]을 학습 모드처럼 직관적인 시뮬레이션 이벤트(비교, 교환, 변경, 호출, 누적 카운터)로 보강합니다.
 */
function buildEnrichedSteps(steps: TraceStep[], sourceCode: string): EnrichedStep[] {
  const codeLines = sourceCode.split(/\r?\n/);
  let comparisonsSoFar = 0;
  let mutationsSoFar = 0;
  let callsSoFar = 0;

  let prevPrimaryArray: TraceValue[] | null = null;
  let prevStdoutLen = 0;

  return steps.map((step, rawIndex) => {
    const codeLine = (codeLines[step.line - 1] || '').trim();
    const vars = extractStepVars(step);
    const primaryArr = vars.arrays1D[0]?.variable.value.items || null;
    const primaryArrName = vars.arrays1D[0]?.names[0] || '';

    // 1. 배열 변경 & 교환(Swap) & push/pop 크기 변화 감지
    const changedIndices: number[] = [];
    let swappedPair: [number, number] | null = null;
    let lengthDelta = 0;
    let pushedDisplay: string | undefined;
    let poppedDisplay: string | undefined;

    if (primaryArr && prevPrimaryArray && primaryArr.length === prevPrimaryArray.length) {
      for (let i = 0; i < primaryArr.length; i++) {
        if (primaryArr[i]?.display !== prevPrimaryArray[i]?.display) {
          changedIndices.push(i);
        }
      }
      if (
        changedIndices.length === 2 &&
        primaryArr[changedIndices[0]]?.display === prevPrimaryArray[changedIndices[1]]?.display &&
        primaryArr[changedIndices[1]]?.display === prevPrimaryArray[changedIndices[0]]?.display
      ) {
        swappedPair = [changedIndices[0], changedIndices[1]];
      }
      if (changedIndices.length > 0) mutationsSoFar++;
    } else if (primaryArr && prevPrimaryArray && primaryArr.length !== prevPrimaryArray.length) {
      lengthDelta = primaryArr.length - prevPrimaryArray.length;
      if (lengthDelta > 0 && primaryArr.length > 0) {
        changedIndices.push(primaryArr.length - 1);
        pushedDisplay = primaryArr[primaryArr.length - 1]?.display;
      } else if (lengthDelta < 0 && prevPrimaryArray.length > 0) {
        poppedDisplay = prevPrimaryArray[prevPrimaryArray.length - 1]?.display;
      }
      mutationsSoFar++;
    }

    // 2. 코드 줄에서 배열 원소 비교(if arr[j] > arr[j + 1] 등) 감지
    const comparedIndices: number[] = [];
    let compareExpr: string | undefined;
    const isCondLine = /^(if|elif|else\s+if|while)\b/.test(codeLine);
    if (isCondLine && primaryArr) {
      const idxRegex = /\b[A-Za-z_]\w*\s*\[\s*([^\]]+)\s*\]/g;
      let m: RegExpExecArray | null;
      while ((m = idxRegex.exec(codeLine)) !== null) {
        const val = evalSimpleIndexExpr(m[1], vars.intVarMap);
        if (val !== null && val >= 0 && val < primaryArr.length && !comparedIndices.includes(val)) {
          comparedIndices.push(val);
        }
      }
      if (comparedIndices.length > 0) {
        comparisonsSoFar++;
        if (comparedIndices.length >= 2) {
          const a = comparedIndices[0];
          const b = comparedIndices[1];
          const opMatch = codeLine.match(/(<=|>=|==|!=|<|>)/);
          const op = opMatch ? opMatch[1] : 'vs';
          compareExpr = `${primaryArr[a].display} ${op} ${primaryArr[b].display}`;
        } else {
          const a = comparedIndices[0];
          compareExpr = `[${a}] = ${primaryArr[a].display}`;
        }
      }
    }

    if (step.event === 'call' && step.functionName !== '<전역>') {
      callsSoFar++;
    }

    const stdoutGrew = step.stdout.length > prevStdoutLen;
    prevStdoutLen = step.stdout.length;

    const changedScalars = vars.scalars.filter((s) => s.changed);
    const hasVisualData =
      vars.arrays1D.length > 0 ||
      vars.arrays2D.length > 0 ||
      vars.graphDicts.length > 0 ||
      step.heap.length > 0 ||
      vars.scalars.length > 0 ||
      step.frames.length > 1;

    // 3. 직관적인 한국어 시뮬레이션 설명 생성
    let narrative = step.description;
    if (swappedPair && primaryArr) {
      const [i, j] = swappedPair;
      narrative = `🔄 교환(Swap): ${primaryArrName}[${i}](${primaryArr[i]?.display}) ↔ ${primaryArrName}[${j}](${primaryArr[j]?.display})`;
    } else if (lengthDelta > 0 && primaryArr) {
      narrative = `➕ ${primaryArrName} 추가(Push): ${pushedDisplay ?? ''} (크기 ${prevPrimaryArray?.length ?? 0} → ${primaryArr.length})`;
    } else if (lengthDelta < 0 && primaryArr) {
      narrative = `➖ ${primaryArrName} 제거(Pop): ${poppedDisplay ?? ''} (크기 ${prevPrimaryArray?.length ?? 0} → ${primaryArr.length})`;
    } else if (changedIndices.length > 0 && primaryArr) {
      const summary = changedIndices
        .filter((idx) => idx >= 0 && idx < primaryArr.length)
        .slice(0, 3)
        .map((idx) => `${primaryArrName}[${idx}]=${primaryArr[idx]?.display ?? ''}`)
        .join(', ');
      narrative = `✏️ 배열 값 변경: ${summary}`;
    } else if (comparedIndices.length >= 2 && primaryArr) {
      const [a, b] = comparedIndices;
      narrative = `🔍 원소 비교: ${primaryArrName}[${a}](${primaryArr[a].display}) vs ${primaryArrName}[${b}](${primaryArr[b].display})`;
    } else if (comparedIndices.length === 1 && primaryArr) {
      const a = comparedIndices[0];
      narrative = `🔍 조건 확인: ${primaryArrName}[${a}] = ${primaryArr[a].display}`;
    } else if (step.event === 'call' && step.functionName !== '<전역>') {
      narrative = `📞 함수 호출: ${step.functionName}() 진입 (스택 깊이 ${step.frames.length})`;
    } else if (step.event === 'return' && step.functionName !== '<전역>') {
      const ret = step.frames[step.frames.length - 1]?.returnValue?.display;
      narrative = ret !== undefined ? `✅ ${step.functionName}() → ${ret} 반환` : `✅ ${step.functionName}() 반환`;
    } else if (stdoutGrew) {
      const lines = step.stdout.trimEnd().split('\n');
      narrative = `🖨 출력: ${lines[lines.length - 1]}`;
    } else if (changedScalars.length > 0) {
      narrative = `📌 변수 갱신: ${changedScalars
        .slice(0, 3)
        .map((v) => `${v.name}: ${v.previousDisplay} → ${v.value.display}`)
        .join(', ')}`;
    } else if (primaryArr && !prevPrimaryArray) {
      narrative = `✨ 배열 ${primaryArrName} 생성: [${primaryArr.map((x) => x.display).join(', ')}]`;
    }

    // 시뮬레이션 모드에서 보여줄 "의미 있는 핵심 단계" 판정
    const isMeaningful =
      swappedPair !== null ||
      lengthDelta !== 0 ||
      changedIndices.length > 0 ||
      comparedIndices.length > 0 ||
      stdoutGrew ||
      changedScalars.length > 0 ||
      (primaryArr !== null && prevPrimaryArray === null) ||
      (step.event === 'call' && step.functionName !== '<전역>') ||
      (step.event === 'return' && step.functionName !== '<전역>') ||
      step.heap.length > 0 ||
      rawIndex === steps.length - 1;

    prevPrimaryArray = primaryArr ? [...primaryArr] : prevPrimaryArray;

    return {
      rawIndex,
      step,
      codeLine,
      narrative,
      comparedIndices,
      compareExpr,
      swappedPair,
      changedIndices,
      comparisonsSoFar,
      mutationsSoFar,
      callsSoFar,
      hasVisualData,
      isMeaningful,
    };
  });
}

/**
 * 실제 실행 중인 1차원 배열을 학습 모드와 동일한 시뮬레이션 스테이지(막대+교환아크+비교배지 / 배열 / 스택 / 큐)로 렌더링합니다.
 */
function RealArraySimulationView({
  label,
  items,
  changedIndices,
  comparedIndices,
  compareExpr,
  swappedPair,
  indexPointers,
}: {
  label: string;
  items: TraceValue[];
  changedIndices: Set<number>;
  comparedIndices: Set<number>;
  compareExpr?: string;
  swappedPair: [number, number] | null;
  indexPointers: Array<{ label: string; idx: number }>;
}) {
  const [userMode, setUserMode] = useState<ArrayViewMode>('auto');
  const effectiveMode = userMode === 'auto' ? resolveAutoMode(label.split(' ')[0], items) : userMode;
  const canBars = isNumericItems(items);
  const numericValues = useMemo(
    () => (canBars ? items.map((it) => Number(it.display)) : []),
    [canBars, items]
  );

  return (
    <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden shadow-sm">
      <div className="ide-chrome flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/40">
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-bold text-[var(--text-primary)]">{label}</span>
          <span className="text-[var(--text-muted)]">({items.length})</span>
          {swappedPair && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-sans font-bold animate-pulse">
              ⇄ 교환됨
            </span>
          )}
          {!swappedPair && comparedIndices.size > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-sans font-bold">
              비교 중 {compareExpr ? `(${compareExpr})` : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 text-[10px]">
          {(
            [
              ['bars', '막대', !canBars],
              ['cells', '배열', false],
              ['stack', '스택', false],
              ['queue', '큐', false],
            ] as const
          ).map(([m, text, disabled]) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => setUserMode(m)}
              className={`px-2 py-0.5 rounded font-semibold transition-colors disabled:opacity-30 ${
                effectiveMode === m
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 overflow-x-auto bg-[var(--bg-root)]/25">
        {/* 1) VisuAlgo 스타일 막대 그래프 + 교환 곡선 화살표 + 비교 브래킷 */}
        {effectiveMode === 'bars' && canBars && (() => {
          const maxVal = Math.max(1, ...numericValues.map((v) => Math.abs(v)));
          const barW = Math.max(28, Math.min(48, Math.floor(390 / Math.max(1, items.length)) - 8));
          const gap = 8;
          const padX = 18;
          const width = Math.max(260, items.length * (barW + gap) + padX * 2);
          const baselineY = 176;
          const maxBarH = 112;
          const height = indexPointers.length > 0 ? 222 : 202;

          const barCenterX = (idx: number) => padX + idx * (barW + gap) + barW / 2;

          return (
            <svg width={width} height={height} className="block mx-auto">
              {/* 교환 곡선 아크 */}
              {swappedPair && (() => {
                const [a, b] = swappedPair;
                const x1 = barCenterX(a);
                const x2 = barCenterX(b);
                const midX = (x1 + x2) / 2;
                return (
                  <g>
                    <path
                      d={`M ${x1} 36 Q ${midX} 6 ${x2} 36`}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                    />
                    <rect x={midX - 24} y={6} width={48} height={18} rx={9} fill="#f43f5e" />
                    <text x={midX} y={18} textAnchor="middle" className="fill-white text-[10px] font-bold">
                      ⇄ SWAP
                    </text>
                  </g>
                );
              })()}

              {/* 비교 브래킷 */}
              {!swappedPair && comparedIndices.size >= 2 && (() => {
                const pair = Array.from(comparedIndices).slice(0, 2);
                const x1 = barCenterX(pair[0]);
                const x2 = barCenterX(pair[1]);
                const midX = (x1 + x2) / 2;
                return (
                  <g>
                    <path
                      d={`M ${x1} 36 L ${x1} 24 L ${x2} 24 L ${x2} 36`}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2"
                    />
                    {compareExpr && (
                      <>
                        <rect x={midX - 34} y={5} width={68} height={18} rx={9} fill="#f59e0b" />
                        <text x={midX} y={17} textAnchor="middle" className="fill-slate-950 text-[10px] font-mono font-bold">
                          {compareExpr}
                        </text>
                      </>
                    )}
                  </g>
                );
              })()}

              {numericValues.map((val, idx) => {
                const barH = Math.max(20, Math.round((Math.abs(val) / maxVal) * maxBarH));
                const x = padX + idx * (barW + gap);
                const y = baselineY - barH;
                const ptrsHere = indexPointers.filter((p) => p.idx === idx);
                const isChanged = changedIndices.has(idx);
                const isCompared = comparedIndices.has(idx);
                const isPtr = ptrsHere.length > 0;

                let fill = '#38bdf8';
                if (isPtr) fill = '#60a5fa';
                if (isCompared) fill = '#fbbf24';
                if (isChanged) fill = '#f43f5e';

                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={barH}
                      rx={6}
                      fill={fill}
                      stroke={isChanged ? '#fda4af' : isCompared ? '#fde68a' : 'none'}
                      strokeWidth={isChanged || isCompared ? 2 : 0}
                      style={{ transition: 'all 240ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                    />
                    <text
                      x={x + barW / 2}
                      y={y - 7}
                      textAnchor="middle"
                      className="fill-[var(--text-primary)] text-xs font-mono font-bold"
                      style={{ transition: 'all 240ms ease' }}
                    >
                      {val}
                    </text>
                    <text
                      x={x + barW / 2}
                      y={baselineY + 16}
                      textAnchor="middle"
                      className="fill-[var(--text-muted)] text-[10px] font-mono"
                    >
                      [{idx}]
                    </text>
                    {ptrsHere.length > 0 && (
                      <text
                        x={x + barW / 2}
                        y={baselineY + 34}
                        textAnchor="middle"
                        className="fill-amber-400 text-[10px] font-mono font-bold"
                      >
                        ▲ {ptrsHere.map((p) => p.label).join(',')}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          );
        })()}

        {/* 2) 배열 박스 뷰 */}
        {effectiveMode === 'cells' && (() => {
          const cellW = 58;
          const cellH = 44;
          const padX = 14;
          const topY = indexPointers.length > 0 ? 32 : 10;
          const width = Math.max(240, padX * 2 + items.length * cellW);
          const height = topY + cellH + 26;

          return (
            <svg width={width} height={height} className="block mx-auto">
              {items.map((item, idx) => {
                const x = padX + idx * cellW;
                const ptrsHere = indexPointers.filter((p) => p.idx === idx);
                const isChanged = changedIndices.has(idx);
                const isCompared = comparedIndices.has(idx);
                const isPtr = ptrsHere.length > 0;
                const fill = isChanged
                  ? 'rgba(244, 63, 94, 0.3)'
                  : isCompared || isPtr
                    ? 'rgba(251, 191, 36, 0.24)'
                    : 'rgba(56, 189, 248, 0.14)';
                const stroke = isChanged ? '#f43f5e' : isCompared || isPtr ? '#fbbf24' : '#475569';
                return (
                  <g key={idx}>
                    {ptrsHere.length > 0 && (
                      <>
                        <text x={x + cellW / 2} y={14} textAnchor="middle" className="fill-amber-400 text-[11px] font-mono font-bold">
                          {ptrsHere.map((p) => p.label).join(',')}
                        </text>
                        <line x1={x + cellW / 2} y1={18} x2={x + cellW / 2} y2={topY - 3} stroke="#fbbf24" strokeWidth="1.5" />
                      </>
                    )}
                    <rect
                      x={x + 3}
                      y={topY}
                      width={cellW - 6}
                      height={cellH}
                      rx={8}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isChanged || isCompared || isPtr ? 2 : 1}
                      style={{ transition: 'all 220ms ease' }}
                    />
                    <text x={x + cellW / 2} y={topY + cellH / 2 + 4} textAnchor="middle" className="fill-[var(--text-primary)] text-xs font-mono font-bold">
                      {item.display.length > 6 ? item.display.slice(0, 5) + '…' : item.display}
                    </text>
                    <text x={x + cellW / 2} y={topY + cellH + 16} textAnchor="middle" className="fill-[var(--text-muted)] text-[10px] font-mono">
                      [{idx}]
                    </text>
                  </g>
                );
              })}
            </svg>
          );
        })()}

        {/* 3) 수직 스택 */}
        {effectiveMode === 'stack' && (() => {
          const height = Math.max(130, items.length * 34 + 36);
          return (
            <svg width={220} height={height} className="block mx-auto">
              <rect x={42} y={10} width={132} height={height - 20} rx={8} fill="none" stroke="#475569" strokeDasharray="4 4" />
              {items.length === 0 && (
                <text x={108} y={height / 2} textAnchor="middle" className="fill-[var(--text-muted)] text-xs">비어 있음</text>
              )}
              {items.map((item, idx) => {
                const y = height - 16 - (idx + 1) * 32;
                const isTop = idx === items.length - 1;
                const isChanged = changedIndices.has(idx);
                return (
                  <g key={idx}>
                    <rect
                      x={52}
                      y={y}
                      width={112}
                      height={28}
                      rx={6}
                      fill={isChanged ? 'rgba(244,63,94,0.3)' : isTop ? 'rgba(56,189,248,0.28)' : 'rgba(148,163,184,0.16)'}
                      stroke={isChanged ? '#f43f5e' : isTop ? '#38bdf8' : '#64748b'}
                      strokeWidth={isTop || isChanged ? 2 : 1}
                    />
                    <text x={108} y={y + 18} textAnchor="middle" className="fill-[var(--text-primary)] text-xs font-mono font-bold">
                      {item.display.slice(0, 10)}
                    </text>
                    {isTop && <text x={180} y={y + 18} className="fill-amber-400 text-[10px] font-mono font-bold">← TOP</text>}
                  </g>
                );
              })}
            </svg>
          );
        })()}

        {/* 4) 수평 큐 */}
        {effectiveMode === 'queue' && (() => {
          const boxW = 54;
          const width = Math.max(240, items.length * (boxW + 8) + 48);
          return (
            <svg width={width} height={92} className="block mx-auto">
              {items.length === 0 ? (
                <text x={width / 2} y={48} textAnchor="middle" className="fill-[var(--text-muted)] text-xs">비어 있음</text>
              ) : (
                items.map((item, idx) => {
                  const x = 24 + idx * (boxW + 8);
                  const isChanged = changedIndices.has(idx);
                  return (
                    <g key={idx}>
                      {idx === 0 && <text x={x + boxW / 2} y={16} textAnchor="middle" className="fill-emerald-400 text-[10px] font-mono font-bold">FRONT</text>}
                      {idx === items.length - 1 && <text x={x + boxW / 2} y={84} textAnchor="middle" className="fill-sky-400 text-[10px] font-mono font-bold">REAR</text>}
                      <rect
                        x={x}
                        y={24}
                        width={boxW}
                        height={40}
                        rx={7}
                        fill={isChanged ? 'rgba(244,63,94,0.28)' : 'rgba(56,189,248,0.16)'}
                        stroke={isChanged ? '#f43f5e' : '#38bdf8'}
                        strokeWidth={1.6}
                      />
                      <text x={x + boxW / 2} y={48} textAnchor="middle" className="fill-[var(--text-primary)] text-xs font-mono font-bold">
                        {item.display.slice(0, 7)}
                      </text>
                    </g>
                  );
                })
              )}
            </svg>
          );
        })()}
      </div>
    </div>
  );
}

/**
 * 2차원 배열 / DP 테이블 시각화
 */
function RealMatrix2DView({
  name,
  rows,
  prevRows,
}: {
  name: string;
  rows: TraceValue[];
  prevRows?: TraceValue[];
}) {
  const maxCols = Math.max(0, ...rows.map((r) => r.items?.length || 0));
  return (
    <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/40 text-[11px] font-mono font-bold text-indigo-400">
        2D 테이블 / DP 배열 <span className="text-[var(--text-primary)]">{name}</span> ({rows.length}×{maxCols})
      </div>
      <div className="p-2.5 overflow-x-auto">
        <table className="mx-auto border-collapse font-mono text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1 border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)]">r\c</th>
              {Array.from({ length: maxCols }, (_, c) => (
                <th key={c} className="px-2 py-1 border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[10px]">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="px-2 py-1 border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[10px] font-bold">{rIdx}</td>
                {(row.items || []).map((cell, cIdx) => {
                  const prevVal = prevRows?.[rIdx]?.items?.[cIdx]?.display;
                  const changed = prevVal !== undefined && prevVal !== cell.display;
                  return (
                    <td
                      key={cIdx}
                      className={`px-2.5 py-1 text-center border border-[var(--border-subtle)] transition-colors ${
                        changed
                          ? 'bg-rose-500/35 text-rose-200 font-bold'
                          : cell.display !== '0'
                            ? 'bg-sky-500/10 text-[var(--text-primary)]'
                            : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {cell.display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 인접 리스트 dict 그래프 시각화
 */
function RealGraphDictSvg({
  name,
  fields,
  visitedSet,
  currentNode,
  distMap,
}: {
  name: string;
  fields: Record<string, TraceValue>;
  visitedSet: Set<string>;
  currentNode: string | null;
  distMap: Record<string, string>;
}) {
  const nodes = Object.keys(fields).slice(0, 12);
  const edges: Array<{ u: string; v: string; w?: string }> = [];
  for (const u of nodes) {
    const val = fields[u];
    if (val.kind === 'array' && val.items) {
      for (const item of val.items) {
        if (item.kind === 'array' && item.items && item.items.length >= 2) {
          edges.push({ u, v: item.items[0].display, w: item.items[1].display });
        } else {
          edges.push({ u, v: item.display });
        }
      }
    }
  }
  if (nodes.length < 2 || edges.length === 0) return null;

  const cx = 175, cy = 105, r = 74;
  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, idx) => {
    const ang = (idx / nodes.length) * Math.PI * 2 - Math.PI / 2;
    pos.set(n, { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
  });

  return (
    <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/40 text-[11px] font-mono font-bold text-emerald-400">
        그래프 실시간 시각화 <span className="text-[var(--text-primary)]">{name}</span>
      </div>
      <div className="p-2 overflow-x-auto bg-[var(--bg-root)]/25">
        <svg width={350} height={212} className="block mx-auto">
          {edges.map((e, i) => {
            const a = pos.get(e.u);
            const b = pos.get(e.v);
            if (!a || !b) return null;
            return (
              <g key={i}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#475569" strokeWidth="1.8" />
                {e.w && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle" className="fill-amber-300 text-[10px] font-mono font-bold">
                    {e.w}
                  </text>
                )}
              </g>
            );
          })}
          {nodes.map((n) => {
            const p = pos.get(n)!;
            const isCur = currentNode === n;
            const isVis = visitedSet.has(n);
            return (
              <g key={n}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={18}
                  fill={isCur ? '#f59e0b' : isVis ? '#10b981' : '#1e293b'}
                  stroke={isCur ? '#fde68a' : isVis ? '#34d399' : '#38bdf8'}
                  strokeWidth={2}
                />
                <text x={p.x} y={p.y + 4} textAnchor="middle" className={`${isCur || isVis ? 'fill-slate-950' : 'fill-slate-100'} text-xs font-mono font-bold`}>
                  {n}
                </text>
                {distMap[n] !== undefined && (
                  <text x={p.x} y={p.y + 30} textAnchor="middle" className="fill-sky-300 text-[10px] font-mono">
                    d={distMap[n]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * 2D SVG 이진 트리 / 연결 리스트 / 힙 포인터 시각화
 */
function PointerAndHeapSvg({
  pointers,
  heap,
}: {
  pointers: TraceVariable[];
  heap: HeapBlock[];
}) {
  const activeStructs = heap.filter((h) => h.kind === 'struct' && !h.freed);
  const treeNodes = activeStructs.filter((h) => h.leftAddress || h.rightAddress);
  const isTree = treeNodes.length > 0;
  const otherHeap = heap.filter((h) => !(h.kind === 'struct' && !h.freed));

  const treeLayout = useMemo(() => {
    if (!isTree) return null;
    const byAddr = new Map(activeStructs.map((n) => [n.address, n]));
    const childSet = new Set<string>();
    for (const n of activeStructs) {
      if (n.leftAddress) childSet.add(n.leftAddress);
      if (n.rightAddress) childSet.add(n.rightAddress);
    }
    const root = activeStructs.find((n) => !childSet.has(n.address)) || activeStructs[0];
    if (!root) return null;

    const placed = new Map<string, { x: number; y: number; block: HeapBlock }>();
    const width = 380;
    const queue: Array<{ addr: string; level: number; idx: number }> = [
      { addr: root.address, level: 0, idx: 0 },
    ];
    let maxLevel = 0;

    while (queue.length > 0 && placed.size < 15) {
      const cur = queue.shift()!;
      if (placed.has(cur.addr)) continue;
      const block = byAddr.get(cur.addr);
      if (!block) continue;
      maxLevel = Math.max(maxLevel, cur.level);
      const cols = Math.pow(2, cur.level);
      const x = ((cur.idx + 0.5) / cols) * (width - 36) + 18;
      const y = 34 + cur.level * 56;
      placed.set(cur.addr, { x, y, block });
      if (block.leftAddress && cur.level < 3) {
        queue.push({ addr: block.leftAddress, level: cur.level + 1, idx: cur.idx * 2 });
      }
      if (block.rightAddress && cur.level < 3) {
        queue.push({ addr: block.rightAddress, level: cur.level + 1, idx: cur.idx * 2 + 1 });
      }
    }
    return { placed, width, height: Math.max(120, (maxLevel + 1) * 56 + 38) };
  }, [isTree, activeStructs]);

  const nodePositions = new Map<string, { x: number; y: number; block: HeapBlock }>();
  const nodeW = 114;
  const nodeH = 52;
  const gapX = 42;
  activeStructs.forEach((b, idx) => {
    nodePositions.set(b.address, { x: 20 + idx * (nodeW + gapX), y: 44, block: b });
  });
  const chainWidth = Math.max(300, 40 + activeStructs.length * (nodeW + gapX));

  return (
    <div className="space-y-2">
      {isTree && treeLayout && (
        <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/40 text-[11px] font-semibold text-emerald-400">
            이진 트리 실시간 구조 ({treeLayout.placed.size}개 노드)
          </div>
          <div className="p-2 overflow-x-auto bg-[var(--bg-root)]/25">
            <svg width={treeLayout.width} height={treeLayout.height} className="block mx-auto">
              {Array.from(treeLayout.placed.values()).map(({ x, y, block }) => (
                <g key={`te_${block.address}`}>
                  {block.leftAddress && treeLayout.placed.has(block.leftAddress) && (
                    <line x1={x} y1={y} x2={treeLayout.placed.get(block.leftAddress)!.x} y2={treeLayout.placed.get(block.leftAddress)!.y} stroke="#475569" strokeWidth="2" />
                  )}
                  {block.rightAddress && treeLayout.placed.has(block.rightAddress) && (
                    <line x1={x} y1={y} x2={treeLayout.placed.get(block.rightAddress)!.x} y2={treeLayout.placed.get(block.rightAddress)!.y} stroke="#475569" strokeWidth="2" />
                  )}
                </g>
              ))}
              {Array.from(treeLayout.placed.values()).map(({ x, y, block }) => {
                const ptrsHere = pointers.filter((p) => p.value.targetAddress === block.address);
                const hl = ptrsHere.length > 0;
                return (
                  <g key={`tn_${block.address}`}>
                    {hl && (
                      <text x={x} y={y - 22} textAnchor="middle" className="fill-amber-400 text-[10px] font-mono font-bold">
                        {ptrsHere.map((p) => p.name).join(',')}
                      </text>
                    )}
                    <circle cx={x} cy={y} r={17} fill={hl ? '#f59e0b' : '#1e293b'} stroke={hl ? '#fde68a' : '#34d399'} strokeWidth={2} />
                    <text x={x} y={y + 4} textAnchor="middle" className={`${hl ? 'fill-slate-950' : 'fill-slate-100'} text-xs font-mono font-bold`}>
                      {block.valueDisplay ?? block.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {!isTree && activeStructs.length > 0 && (
        <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/40 text-[11px] font-semibold text-emerald-400">
            연결 리스트 · 힙 노드 시각화 ({activeStructs.length}개 노드)
          </div>
          <div className="p-2 overflow-x-auto bg-[var(--bg-root)]/25">
            <svg width={chainWidth} height={124} className="block mx-auto">
              <defs>
                <marker id="cs-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#38bdf8" />
                </marker>
                <marker id="cs-arrow-prev" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto">
                  <path d="M7,0 L0,3.5 L7,7 Z" fill="#a78bfa" />
                </marker>
                <marker id="cs-arrow-ptr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="#fbbf24" />
                </marker>
              </defs>
              {activeStructs.map((b) => {
                const from = nodePositions.get(b.address);
                const toNext = b.nextAddress ? nodePositions.get(b.nextAddress) : undefined;
                const toPrev = b.prevAddress ? nodePositions.get(b.prevAddress) : undefined;
                if (!from) return null;
                return (
                  <g key={`edges_${b.address}`}>
                    {toNext && (
                      <line
                        x1={from.x + nodeW}
                        y1={from.y + (toPrev ? 20 : nodeH / 2)}
                        x2={toNext.x - 4}
                        y2={toNext.y + (toPrev ? 20 : nodeH / 2)}
                        stroke="#38bdf8"
                        strokeWidth="2"
                        markerEnd="url(#cs-arrow)"
                      />
                    )}
                    {toPrev && (
                      <line
                        x1={toPrev.x + nodeW + 4}
                        y1={from.y + 34}
                        x2={from.x}
                        y2={from.y + 34}
                        stroke="#a78bfa"
                        strokeWidth="1.6"
                        markerStart="url(#cs-arrow-prev)"
                      />
                    )}
                  </g>
                );
              })}
              {activeStructs.map((b) => {
                const pos = nodePositions.get(b.address)!;
                const pointingVars = pointers.filter((p) => p.value.targetAddress === b.address);
                return (
                  <g key={b.address}>
                    {pointingVars.length > 0 && (
                      <>
                        <text x={pos.x + nodeW / 2} y={16} textAnchor="middle" className="fill-amber-400 text-[11px] font-mono font-bold">
                          {pointingVars.map((p) => p.name).join(', ')}
                        </text>
                        <line x1={pos.x + nodeW / 2} y1={20} x2={pos.x + nodeW / 2} y2={pos.y - 4} stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#cs-arrow-ptr)" />
                      </>
                    )}
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={nodeW}
                      height={nodeH}
                      rx={8}
                      fill={pointingVars.length > 0 ? 'rgba(251, 191, 36, 0.16)' : 'rgba(16, 185, 129, 0.14)'}
                      stroke={pointingVars.length > 0 ? '#fbbf24' : '#34d399'}
                      strokeWidth="1.6"
                    />
                    <line x1={pos.x + nodeW * 0.62} y1={pos.y} x2={pos.x + nodeW * 0.62} y2={pos.y + nodeH} stroke="#34d399" strokeOpacity="0.45" />
                    <text x={pos.x + nodeW * 0.31} y={pos.y + 30} textAnchor="middle" className="fill-[var(--text-primary)] text-sm font-mono font-bold">
                      {b.valueDisplay ?? b.label}
                    </text>
                    <text x={pos.x + nodeW * 0.81} y={pos.y + 30} textAnchor="middle" className="fill-[var(--text-muted)] text-[10px] font-mono">
                      {b.nextAddress ? 'next→' : 'NULL'}
                    </text>
                    <text x={pos.x + nodeW / 2} y={pos.y + nodeH + 14} textAnchor="middle" className="fill-[var(--text-muted)] text-[9px] font-mono">
                      {b.address}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {otherHeap.length > 0 && (
        <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-2.5 space-y-1.5">
          <div className="text-[11px] font-semibold text-purple-400">
            동적 메모리 힙 블록 ({otherHeap.length}개)
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {otherHeap.map((b) => {
              const refs = pointers.filter((p) => p.value.targetAddress === b.address);
              return (
                <div
                  key={b.address}
                  className={`flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-xs font-mono ${
                    b.freed ? 'bg-rose-500/5 border-rose-500/30 opacity-60 line-through' : 'bg-purple-500/10 border-purple-400/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-purple-300">{b.address}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{b.label}</span>
                    {b.sizeBytes ? <span className="text-[10px] text-[var(--text-muted)]">{b.sizeBytes}B</span> : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {refs.map((r) => (
                      <span key={r.name} className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                        ← {r.name}
                      </span>
                    ))}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${b.freed ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {b.freed ? '해제됨(free)' : '할당 중'}
                    </span>
                  </div>
                  {b.items && b.items.length > 0 && !b.freed && (
                    <div className="w-full flex flex-wrap gap-1 pt-1">
                      {b.items.map((it, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-[var(--bg-root)] text-[11px] border border-[var(--border-subtle)]">
                          [{idx}] {it.display}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 재귀 호출 스택 타워 (학습 모드의 재귀 시각화 스타일)
 */
function RecursionTowerView({ step }: { step: TraceStep }) {
  const realFrames = step.frames.filter((f) => f.functionName !== '<전역>');
  if (realFrames.length < 2) return null;

  return (
    <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/40 text-[11px] font-bold text-indigo-400">
        재귀 / 함수 호출 스택 타워 (깊이 {realFrames.length})
      </div>
      <div className="p-3 flex flex-col-reverse items-center gap-1.5 bg-[var(--bg-root)]/25">
        {realFrames.map((f, idx) => {
          const argsText = f.locals
            .slice(0, 3)
            .map((v) => `${v.name}=${v.value.display}`)
            .join(', ');
          return (
            <div
              key={`${f.id}_${idx}`}
              className={`w-full max-w-xs px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center justify-between gap-2 transition-all ${
                f.isReturning
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : idx === realFrames.length - 1
                    ? 'bg-sky-500/20 border-sky-400 text-[var(--text-primary)] font-bold'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              <span className="truncate">
                {f.functionName}({argsText})
              </span>
              <span className="text-[11px] shrink-0">
                {f.isReturning && f.returnValue ? `→ ${f.returnValue.display}` : `줄 ${f.line}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TraceVisualizer({
  language,
  sourceCode,
  isTracing,
  traceResult,
  currentStepIndex,
  isFullscreen,
  onChangeStep,
  onRunTrace,
  onToggleFullscreen,
}: TraceVisualizerProps) {
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(600);
  const [showLimits, setShowLimits] = useState(false);
  const [simFilterMode, setSimFilterMode] = useState(true);
  const [showDebugDetails, setShowDebugDetails] = useState(false);

  const rawSteps = traceResult?.steps || [];

  const enrichedAll = useMemo(
    () => buildEnrichedSteps(rawSteps, sourceCode),
    [rawSteps, sourceCode]
  );

  // 시뮬레이션 모드에서는 빈 선언/함수정의 등 불필요한 준비 단계를 건너뛰고 실제 변화·비교·교환 중심으로 표시
  const visibleSteps = useMemo(() => {
    if (!simFilterMode) return enrichedAll;
    const filtered = enrichedAll.filter((s) => s.isMeaningful && s.hasVisualData);
    return filtered.length >= 2 ? filtered : enrichedAll;
  }, [enrichedAll, simFilterMode]);

  // 현재 raw currentStepIndex가 visibleSteps에서 몇 번째인지 매핑
  const visibleIdx = useMemo(() => {
    if (visibleSteps.length === 0) return 0;
    const exact = visibleSteps.findIndex((s) => s.rawIndex === currentStepIndex);
    if (exact !== -1) return exact;
    const nextIdx = visibleSteps.findIndex((s) => s.rawIndex >= currentStepIndex);
    return nextIdx === -1 ? visibleSteps.length - 1 : nextIdx;
  }, [visibleSteps, currentStepIndex]);

  const current = visibleSteps[visibleIdx] || null;
  const prevRawStep =
    current && current.rawIndex > 0 ? rawSteps[current.rawIndex - 1] : null;

  // 추적 결과가 새로 도착하면: 첫 시각 데이터가 있는 의미 있는 단계로 자동 이동!
  useEffect(() => {
    setPlaying(false);
    if (visibleSteps.length > 0) {
      onChangeStep(visibleSteps[0].rawIndex);
    }
  }, [traceResult]);

  // 자동 재생
  useEffect(() => {
    if (!playing || visibleSteps.length === 0) return;
    if (visibleIdx >= visibleSteps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      onChangeStep(visibleSteps[visibleIdx + 1].rawIndex);
    }, speedMs);
    return () => window.clearTimeout(timer);
  }, [playing, visibleIdx, visibleSteps, speedMs, onChangeStep]);

  // 외장 키보드 시뮬레이션 단축키 (에디터/입력창 외부 포커스 시 Space 재생·일시정지, ←/→ 이전·다음 단계)
  useEffect(() => {
    if (visibleSteps.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('.cm-editor'))
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (visibleIdx >= visibleSteps.length - 1) {
          onChangeStep(visibleSteps[0].rawIndex);
        }
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlaying(false);
        const prev = Math.max(0, visibleIdx - 1);
        onChangeStep(visibleSteps[prev].rawIndex);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlaying(false);
        const next = Math.min(visibleSteps.length - 1, visibleIdx + 1);
        onChangeStep(visibleSteps[next].rawIndex);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visibleSteps, visibleIdx, onChangeStep]);

  const stepVars = useMemo(
    () => (current ? extractStepVars(current.step) : null),
    [current]
  );

  const prevArraysByName = useMemo(() => {
    const map = new Map<string, TraceValue[]>();
    if (!prevRawStep) return map;
    const prevTop = prevRawStep.frames[prevRawStep.frames.length - 1]?.locals || [];
    for (const v of [...(prevRawStep.globals || []), ...prevTop]) {
      if (v.value.kind === 'array' && v.value.items) map.set(v.name, v.value.items);
    }
    return map;
  }, [prevRawStep]);

  const indexPointers = useMemo(() => {
    if (!stepVars) return [];
    const ptrs: Array<{ label: string; idx: number }> = [];
    for (const [name, num] of stepVars.intVarMap.entries()) {
      if (
        num >= 0 &&
        num < 40 &&
        /^(i|j|k|l|r|m|lo|hi|low|high|left|right|mid|min_idx|max_idx|pivot|pos|idx|front|rear|top|p)$/i.test(
          name
        )
      ) {
        ptrs.push({ label: name, idx: num });
      }
    }
    return ptrs;
  }, [stepVars]);

  const hasRichStructure =
    stepVars &&
    (stepVars.arrays1D.length > 0 ||
      stepVars.arrays2D.length > 0 ||
      stepVars.graphDicts.length > 0 ||
      (current?.step.heap.length || 0) > 0);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--bg-panel)]">
      {/* 헤더 */}
      <div className="ide-chrome flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-root)] shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold truncate">내 코드 시뮬레이션</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            실제 실행
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {rawSteps.length > 0 && (
            <button
              type="button"
              onClick={() => setSimFilterMode((v) => !v)}
              title="핵심 변화 중심 시뮬레이션 vs 모든 줄 디버깅 전환"
              className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
                simFilterMode
                  ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300'
                  : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              {simFilterMode ? '핵심 변화만' : '전체 줄'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLimits((v) => !v)}
            title="안내 및 제한 사항"
            className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRunTrace}
            disabled={isTracing}
            className="px-2.5 py-1 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-[11px] disabled:opacity-50"
          >
            {isTracing ? '분석 중...' : '다시 실행'}
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? '전체 화면 종료' : '시각화 전체 화면'}
            className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {showLimits && (
        <div className="px-3 py-2 text-[11px] bg-sky-500/10 border-b border-sky-500/20 text-[var(--text-secondary)] space-y-1 shrink-0">
          <div className="font-semibold text-sky-300">
            직접 짠 코드의 실제 실행 결과를 학습 모드처럼 시각화합니다
          </div>
          <p className="m-0">
            배열/리스트(막대·배열·스택·큐), 2D DP 테이블, 그래프 딕셔너리, 이진 트리, 연결 리스트, 재귀 호출 스택, 변수 변화를 실제 실행 데이터로 자동 렌더링합니다.
          </p>
          <p className="m-0 text-amber-300/90">
            ※ &apos;이전 단계&apos;는 역방향 실행이 아니라 기록된 실행 스냅샷을 되돌아보는 기능입니다.
          </p>
        </div>
      )}

      {/* 재생 컨트롤 바 */}
      {visibleSteps.length > 0 && (
        <div className="ide-chrome px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  onChangeStep(visibleSteps[0].rawIndex);
                }}
                title="처음으로"
                className="p-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  const prev = Math.max(0, visibleIdx - 1);
                  onChangeStep(visibleSteps[prev].rawIndex);
                }}
                disabled={visibleIdx === 0}
                title="이전 단계 (기록된 상태)"
                className="p-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (visibleIdx >= visibleSteps.length - 1) {
                    onChangeStep(visibleSteps[0].rawIndex);
                  }
                  setPlaying((p) => !p);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{playing ? '일시정지' : '시뮬레이션 재생'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  const next = Math.min(visibleSteps.length - 1, visibleIdx + 1);
                  onChangeStep(visibleSteps[next].rawIndex);
                }}
                disabled={visibleIdx >= visibleSteps.length - 1}
                title="다음 단계"
                className="p-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  onChangeStep(visibleSteps[visibleSteps.length - 1].rawIndex);
                }}
                title="마지막 단계로"
                className="p-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <select
                aria-label="재생 속도"
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="px-1.5 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-[11px]"
              >
                <option value={1200}>0.5x</option>
                <option value={600}>1.0x</option>
                <option value={280}>2.0x</option>
                <option value={120}>4.0x</option>
              </select>
              <span className="font-mono text-[var(--text-secondary)] tabular-nums">
                {visibleIdx + 1} / {visibleSteps.length}
              </span>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, visibleSteps.length - 1)}
            value={visibleIdx}
            onChange={(e) => {
              setPlaying(false);
              onChangeStep(visibleSteps[Number(e.target.value)].rawIndex);
            }}
            aria-label="시뮬레이션 타임라인"
            className="w-full accent-emerald-400 h-1.5 cursor-pointer"
          />
        </div>
      )}

      {/* 메인 시뮬레이션 무대 */}
      <div className="scroll-pane flex-1 p-3 space-y-3">
        {isTracing && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-sky-400">
            <RotateCcw className="w-6 h-6 animate-spin" />
            <p className="text-xs font-medium">
              {language === 'python'
                ? 'Python 코드를 실제 실행하며 시뮬레이션 장면을 기록하는 중...'
                : 'C17 코드를 Clang으로 컴파일하고 시뮬레이션 장면을 기록하는 중...'}
            </p>
          </div>
        )}

        {!isTracing && !traceResult && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                직접 짠 코드를 학습 모드처럼 애니메이션으로 확인하세요
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                배열 정렬, 탐색, 스택/큐, 2D DP, 연결 리스트, 이진 트리, 재귀 함수를 직접 작성하고 실행하면
                비교·교환 화살표와 함께 살아 움직이는 시뮬레이션으로 보여줍니다.
              </p>
            </div>
            <button
              type="button"
              onClick={onRunTrace}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm"
            >
              내 코드 시뮬레이션 시작
            </button>
          </div>
        )}

        {!isTracing && traceResult && !traceResult.ok && rawSteps.length === 0 && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>실행 추적 기록을 생성하지 못했습니다</span>
            </div>
            {traceResult.warnings.map((w, i) => (
              <p key={i} className="text-[var(--text-secondary)] m-0">{w}</p>
            ))}
            {traceResult.errorMessage && (
              <pre className="selectable-text font-mono text-[11px] whitespace-pre-wrap text-rose-300 bg-[var(--bg-root)] p-2 rounded m-0">
                {traceResult.errorMessage}
              </pre>
            )}
          </div>
        )}

        {!isTracing && current && stepVars && (
          <>
            {/* 상단 시뮬레이션 설명 + 라이브 카운터 (학습 모드와 동일한 감각) */}
            <div className="rounded-xl bg-gradient-to-r from-sky-500/12 to-emerald-500/10 border border-sky-400/35 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {current.narrative}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  {current.comparisonsSoFar > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                      비교 {current.comparisonsSoFar}
                    </span>
                  )}
                  {current.mutationsSoFar > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                      변경/교환 {current.mutationsSoFar}
                    </span>
                  )}
                  {current.callsSoFar > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                      호출 {current.callsSoFar}
                    </span>
                  )}
                </div>
              </div>

              {current.codeLine && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--bg-root)]/75 border border-[var(--border-subtle)] font-mono text-[11px] overflow-x-auto">
                  <span className="text-sky-400 shrink-0 font-bold">L{current.step.line}</span>
                  <code className="text-[var(--text-primary)] whitespace-pre">{current.codeLine}</code>
                </div>
              )}
            </div>

            {/* 색상 범례 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" /> 기본
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> 비교 / 포인터
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> 교환 / 값 변경
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> 노드 / 방문 완료
              </span>
            </div>

            {/* 1D 배열 시뮬레이션 (막대 + 교환아크 + 비교브래킷 / 배열 / 스택 / 큐) */}
            {stepVars.arrays1D.map(({ names, variable }, idx) => (
              <RealArraySimulationView
                key={names.join('_')}
                label={names.join(' / ')}
                items={variable.value.items || []}
                changedIndices={idx === 0 ? new Set(current.changedIndices) : new Set()}
                comparedIndices={idx === 0 ? new Set(current.comparedIndices) : new Set()}
                compareExpr={idx === 0 ? current.compareExpr : undefined}
                swappedPair={idx === 0 ? current.swappedPair : null}
                indexPointers={indexPointers}
              />
            ))}

            {/* 2D DP 테이블 */}
            {stepVars.arrays2D.map((mat) => (
              <RealMatrix2DView
                key={mat.name}
                name={mat.name}
                rows={mat.value.items || []}
                prevRows={prevArraysByName.get(mat.name)}
              />
            ))}

            {/* 그래프 dict */}
            {stepVars.graphDicts.map((g) => (
              <RealGraphDictSvg
                key={g.name}
                name={g.name}
                fields={g.value.fields || {}}
                visitedSet={stepVars.visitedSet}
                currentNode={stepVars.currentNode}
                distMap={stepVars.distMap}
              />
            ))}

            {/* 이진 트리 / 연결 리스트 / 힙 메모리 */}
            {(current.step.heap.length > 0 || stepVars.pointers.length > 0) && (
              <PointerAndHeapSvg pointers={stepVars.pointers} heap={current.step.heap} />
            )}

            {/* 재귀 호출 타워 */}
            <RecursionTowerView step={current.step} />

            {/* 배열/트리/그래프가 없는 일반 변수 코드일 때: 시각적 변수 카드 보드 */}
            {stepVars.scalars.length > 0 && (
              <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-2.5 space-y-2">
                <div className="text-[11px] font-bold text-sky-400">
                  {hasRichStructure ? '핵심 변수 상태' : '변수 메모리 보드 (실시간 변화)'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stepVars.scalars.map((v) => (
                    <div
                      key={v.name}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        v.changed
                          ? 'bg-rose-500/20 border-rose-400 scale-[1.02]'
                          : 'bg-[var(--bg-root)]/60 border-[var(--border-subtle)]'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">{v.name}</div>
                      <div className="text-base font-mono font-bold text-[var(--text-primary)] mt-0.5 truncate">
                        {v.value.display}
                      </div>
                      {v.changed && v.previousDisplay !== undefined && (
                        <div className="text-[10px] font-mono text-amber-300 mt-0.5">
                          {v.previousDisplay} → {v.value.display}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 현재 시점 표준 출력 */}
            {current.step.stdout && (
              <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                  현재 시점 출력 (stdout)
                </div>
                <pre className="selectable-text font-mono text-xs whitespace-pre-wrap m-0 text-[var(--text-primary)]">
                  {current.step.stdout}
                </pre>
              </div>
            )}

            {/* 디버그 상세(전체 호출 스택 프레임)는 접기/펼치기로 깔끔하게 분리 */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDebugDetails((v) => !v)}
                className="ide-chrome w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>호출 스택 상세 (깊이 {current.step.frames.length})</span>
                </span>
                {showDebugDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showDebugDetails && (
                <div className="p-2.5 pt-0 space-y-2 border-t border-[var(--border-subtle)]">
                  {current.step.frames.map((frame, fIdx) => (
                    <div
                      key={`${frame.id}_${fIdx}`}
                      className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-root)]/50 p-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono font-bold mb-1">
                        <span>{frame.functionName}() · 줄 {frame.line}</span>
                        {frame.isReturning && frame.returnValue && (
                          <span className="text-emerald-400">return {frame.returnValue.display}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                        {frame.locals.length === 0 ? (
                          <span className="text-[var(--text-muted)]">지역 변수 없음</span>
                        ) : (
                          frame.locals.map((lv) => (
                            <span
                              key={lv.name}
                              className={`px-1.5 py-0.5 rounded border ${
                                lv.changed
                                  ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
                              }`}
                            >
                              {lv.name}={lv.value.display}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
