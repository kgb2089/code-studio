import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  HelpCircle,
  Lightbulb,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ALL_LEARNING_TOPICS, generateLearningSteps, getLearningTopicById } from '../learning';
import type { Language } from '../types/ide';
import type { AlgoStep, LearningTopic } from '../types/learning';

interface LearningPanelProps {
  topicId: string;
  isFullscreen: boolean;
  onSelectTopic: (topicId: string) => void;
  onCopyToEditor: (
    code: string,
    language: Language,
    filename: string,
    sampleInput?: string,
    expectedOutput?: string
  ) => void;
  onToggleFullscreen: () => void;
}

/**
 * 16종 시각화 유형을 모두 지원하는 2D SVG 인터랙티브 캔버스
 */
function LearningSvgCanvas({ topic, step }: { topic: LearningTopic; step: AlgoStep }) {
  const st = step.state || {};
  const highlights = new Set(step.highlights || []);
  const secondary = new Set(step.secondaryHighlights || []);
  const sorted = new Set(step.sortedIndices || []);
  const foundIdx = step.foundIndex;

  // 1. 막대 정렬 시각화 (Bubble, Selection, Insertion, Merge, Quick, Heap Sort)
  if (topic.visualKind === 'bars') {
    const values = (st.values as number[]) || [];
    const maxVal = Math.max(1, ...values.map((v) => Math.abs(v)));
    const barW = Math.max(24, Math.min(44, Math.floor(420 / Math.max(1, values.length)) - 6));
    const gap = 6;
    const width = Math.max(280, values.length * (barW + gap) + 28);
    const height = 190;

    return (
      <svg width={width} height={height} className="block mx-auto">
        {values.map((val, idx) => {
          const barH = Math.max(18, Math.round((Math.abs(val) / maxVal) * 128));
          const x = 14 + idx * (barW + gap);
          const y = 154 - barH;
          let fill = '#38bdf8';
          if (sorted.has(idx)) fill = '#34d399';
          if (highlights.has(idx)) fill = '#fbbf24';
          if (secondary.has(idx)) fill = '#f43f5e';
          return (
            <g key={idx}>
              <rect x={x} y={y} width={barW} height={barH} rx={5} fill={fill} opacity={0.9} />
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                className="fill-[var(--text-primary)] text-[11px] font-mono font-bold"
              >
                {val}
              </text>
              <text
                x={x + barW / 2}
                y={172}
                textAnchor="middle"
                className="fill-[var(--text-muted)] text-[10px] font-mono"
              >
                {idx}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // 2. 배열 / 탐색 / 문자열 / 그리디
  if (topic.visualKind === 'array' || topic.visualKind === 'string') {
    const items = (topic.visualKind === 'string' ? (st.chars as string[]) : (st.items as Array<number | string>)) || [];
    const pointers = step.pointers || {};
    const range = st.range as [number, number] | undefined;
    const cellW = Math.max(46, Math.min(72, Math.floor(440 / Math.max(1, items.length))));
    const width = Math.max(260, items.length * cellW + 24);

    return (
      <svg width={width} height={116} className="block mx-auto">
        {items.map((item, idx) => {
          const x = 12 + idx * cellW;
          const outOfRange = range && (idx < range[0] || idx > range[1]);
          const ptrLabels = Object.entries(pointers)
            .filter(([, pIdx]) => pIdx === idx)
            .map(([k]) => k);
          let fill = 'rgba(148,163,184,0.12)';
          let stroke = '#475569';
          if (foundIdx === idx) {
            fill = 'rgba(52,211,153,0.28)';
            stroke = '#34d399';
          } else if (highlights.has(idx)) {
            fill = 'rgba(251,191,36,0.25)';
            stroke = '#fbbf24';
          } else if (secondary.has(idx)) {
            fill = 'rgba(244,63,94,0.25)';
            stroke = '#f43f5e';
          }
          return (
            <g key={idx} opacity={outOfRange ? 0.3 : 1}>
              {ptrLabels.length > 0 && (
                <text
                  x={x + cellW / 2}
                  y={18}
                  textAnchor="middle"
                  className="fill-amber-400 text-[11px] font-mono font-bold"
                >
                  {ptrLabels.join(',')}
                </text>
              )}
              <rect
                x={x + 3}
                y={28}
                width={cellW - 6}
                height={44}
                rx={7}
                fill={fill}
                stroke={stroke}
                strokeWidth={highlights.has(idx) || foundIdx === idx ? 2 : 1}
              />
              <text
                x={x + cellW / 2}
                y={55}
                textAnchor="middle"
                className="fill-[var(--text-primary)] text-xs font-mono font-bold"
              >
                {String(item).slice(0, 8)}
              </text>
              <text
                x={x + cellW / 2}
                y={88}
                textAnchor="middle"
                className="fill-[var(--text-muted)] text-[10px] font-mono"
              >
                [{idx}]
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // 3. 연결 리스트 / 이중 연결 리스트
  if (topic.visualKind === 'linked-list' || topic.visualKind === 'doubly-linked-list') {
    const nodes = (st.nodes as number[]) || [];
    const doubly = topic.visualKind === 'doubly-linked-list';
    const boxW = 68;
    const gap = 34;
    const width = Math.max(280, nodes.length * (boxW + gap) + 70);

    return (
      <svg width={width} height={106} className="block mx-auto">
        <defs>
          <marker id="ll-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#38bdf8" />
          </marker>
          <marker id="ll-back" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto">
            <path d="M7,0 L0,3.5 L7,7 Z" fill="#a78bfa" />
          </marker>
        </defs>
        {nodes.map((val, idx) => {
          const x = 16 + idx * (boxW + gap);
          const isHl = highlights.has(idx) || foundIdx === idx;
          return (
            <g key={idx}>
              {idx === 0 && (
                <text x={x + boxW / 2} y={18} textAnchor="middle" className="fill-sky-400 text-[10px] font-mono font-bold">
                  HEAD
                </text>
              )}
              <rect
                x={x}
                y={28}
                width={boxW}
                height={42}
                rx={8}
                fill={foundIdx === idx ? 'rgba(52,211,153,0.24)' : isHl ? 'rgba(251,191,36,0.22)' : 'rgba(56,189,248,0.14)'}
                stroke={foundIdx === idx ? '#34d399' : isHl ? '#fbbf24' : '#38bdf8'}
                strokeWidth={isHl ? 2 : 1.5}
              />
              <text
                x={x + boxW / 2}
                y={54}
                textAnchor="middle"
                className="fill-[var(--text-primary)] text-sm font-mono font-bold"
              >
                {val}
              </text>
              {idx < nodes.length - 1 ? (
                <>
                  <line
                    x1={x + boxW}
                    y1={doubly ? 43 : 49}
                    x2={x + boxW + gap - 4}
                    y2={doubly ? 43 : 49}
                    stroke="#38bdf8"
                    strokeWidth="2"
                    markerEnd="url(#ll-arrow)"
                  />
                  {doubly && (
                    <line
                      x1={x + boxW + 4}
                      y1={57}
                      x2={x + boxW + gap}
                      y2={57}
                      stroke="#a78bfa"
                      strokeWidth="1.8"
                      markerStart="url(#ll-back)"
                    />
                  )}
                </>
              ) : (
                <text x={x + boxW + 24} y={53} textAnchor="middle" className="fill-[var(--text-muted)] text-[11px] font-mono">
                  NULL
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  // 4. 스택 (수직 LIFO)
  if (topic.visualKind === 'stack') {
    const items = (st.items as number[]) || [];
    const height = Math.max(150, items.length * 36 + 44);
    return (
      <svg width={220} height={height} className="block mx-auto">
        <rect x={44} y={14} width={132} height={height - 26} rx={8} fill="none" stroke="#475569" strokeDasharray="4 4" />
        {items.length === 0 && (
          <text x={110} y={height / 2} textAnchor="middle" className="fill-[var(--text-muted)] text-xs">
            비어 있음 (Empty)
          </text>
        )}
        {items.map((val, idx) => {
          const y = height - 20 - (idx + 1) * 34;
          const isTop = idx === items.length - 1;
          return (
            <g key={idx}>
              <rect
                x={54}
                y={y}
                width={112}
                height={30}
                rx={6}
                fill={isTop ? 'rgba(56,189,248,0.28)' : 'rgba(148,163,184,0.16)'}
                stroke={isTop ? '#38bdf8' : '#64748b'}
                strokeWidth={isTop ? 2 : 1}
              />
              <text x={110} y={y + 20} textAnchor="middle" className="fill-[var(--text-primary)] text-xs font-mono font-bold">
                {val}
              </text>
              {isTop && (
                <text x={182} y={y + 19} className="fill-amber-400 text-[10px] font-mono font-bold">
                  ← TOP
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  // 5. 큐 / 덱
  if (topic.visualKind === 'queue' || topic.visualKind === 'deque') {
    const items = (st.items as number[]) || [];
    const boxW = 54;
    const width = Math.max(260, items.length * (boxW + 8) + 60);
    return (
      <svg width={width} height={96} className="block mx-auto">
        {items.length === 0 ? (
          <text x={width / 2} y={52} textAnchor="middle" className="fill-[var(--text-muted)] text-xs">
            비어 있음 (Empty)
          </text>
        ) : (
          items.map((val, idx) => {
            const x = 30 + idx * (boxW + 8);
            const isFront = idx === 0;
            const isRear = idx === items.length - 1;
            return (
              <g key={idx}>
                {isFront && (
                  <text x={x + boxW / 2} y={18} textAnchor="middle" className="fill-emerald-400 text-[10px] font-mono font-bold">
                    FRONT
                  </text>
                )}
                {isRear && (
                  <text x={x + boxW / 2} y={88} textAnchor="middle" className="fill-sky-400 text-[10px] font-mono font-bold">
                    {topic.visualKind === 'deque' ? 'BACK' : 'REAR'}
                  </text>
                )}
                <rect
                  x={x}
                  y={26}
                  width={boxW}
                  height={42}
                  rx={7}
                  fill={highlights.has(idx) ? 'rgba(251,191,36,0.25)' : 'rgba(56,189,248,0.16)'}
                  stroke={highlights.has(idx) ? '#fbbf24' : '#38bdf8'}
                  strokeWidth={1.5}
                />
                <text x={x + boxW / 2} y={52} textAnchor="middle" className="fill-[var(--text-primary)] text-xs font-mono font-bold">
                  {val}
                </text>
              </g>
            );
          })
        )}
      </svg>
    );
  }

  // 6. 원형 큐 (링 버퍼)
  if (topic.visualKind === 'circular-queue') {
    const buf = (st.buf as Array<number | null>) || [];
    const front = Number(st.front ?? 0);
    const rear = Number(st.rear ?? 0);
    const cap = buf.length || 6;
    const cx = 135, cy = 100, r = 68;

    return (
      <svg width={270} height={200} className="block mx-auto">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="5 4" />
        {buf.map((val, idx) => {
          const angle = (idx / cap) * Math.PI * 2 - Math.PI / 2;
          const nx = cx + Math.cos(angle) * r;
          const ny = cy + Math.sin(angle) * r;
          const isF = idx === front;
          const isR = idx === rear;
          return (
            <g key={idx}>
              <circle
                cx={nx}
                cy={ny}
                r={21}
                fill={highlights.has(idx) ? 'rgba(251,191,36,0.28)' : val !== null ? 'rgba(56,189,248,0.22)' : 'rgba(30,41,59,0.9)'}
                stroke={isF && isR ? '#34d399' : isF ? '#34d399' : isR ? '#f43f5e' : '#475569'}
                strokeWidth={isF || isR ? 2.5 : 1.5}
              />
              <text x={nx} y={ny + 4} textAnchor="middle" className="fill-[var(--text-primary)] text-xs font-mono font-bold">
                {val !== null ? val : '-'}
              </text>
              <text x={nx} y={ny - 25} textAnchor="middle" className="fill-[var(--text-muted)] text-[9px] font-mono">
                [{idx}]{isF ? ' F' : ''}{isR ? ' R' : ''}
              </text>
            </g>
          );
        })}
        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-[var(--text-secondary)] text-[11px] font-mono">
          count={String(st.count ?? 0)}/{cap}
        </text>
      </svg>
    );
  }

  // 7. 해시 테이블 (체이닝)
  if (topic.visualKind === 'hash-table') {
    const buckets = (st.buckets as number[][]) || [];
    const activeBucket = st.activeBucket as number | undefined;
    const height = Math.max(120, buckets.length * 30 + 16);
    return (
      <svg width={360} height={height} className="block mx-auto">
        {buckets.map((chain, idx) => {
          const y = 8 + idx * 30;
          const isAct = activeBucket === idx;
          return (
            <g key={idx}>
              <rect
                x={10}
                y={y}
                width={52}
                height={24}
                rx={5}
                fill={isAct ? 'rgba(251,191,36,0.28)' : 'rgba(56,189,248,0.16)'}
                stroke={isAct ? '#fbbf24' : '#38bdf8'}
              />
              <text x={36} y={y + 16} textAnchor="middle" className="fill-[var(--text-primary)] text-[11px] font-mono font-bold">
                [{idx}]
              </text>
              {chain.map((k, ci) => {
                const bx = 82 + ci * 64;
                return (
                  <g key={`${idx}_${ci}`}>
                    <line x1={bx - 18} y1={y + 12} x2={bx} y2={y + 12} stroke="#64748b" strokeWidth="1.5" />
                    <rect
                      x={bx}
                      y={y}
                      width={46}
                      height={24}
                      rx={5}
                      fill="rgba(52,211,153,0.18)"
                      stroke="#34d399"
                    />
                    <text x={bx + 23} y={y + 16} textAnchor="middle" className="fill-[var(--text-primary)] text-xs font-mono font-semibold">
                      {k}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    );
  }

  // 8. 힙 / 이진 트리 / BST
  if (topic.visualKind === 'heap' || topic.visualKind === 'tree') {
    const arr = ((topic.visualKind === 'heap' ? st.heap : st.treeArray) as Array<number | null>) || [];
    const width = 420;
    const height = 210;
    const getPos = (idx: number) => {
      const level = Math.floor(Math.log2(idx + 1));
      const posInLevel = idx - (Math.pow(2, level) - 1);
      const countInLevel = Math.pow(2, level);
      const x = ((posInLevel + 0.5) / countInLevel) * (width - 24) + 12;
      const y = 28 + level * 52;
      return { x, y };
    };

    return (
      <svg width={width} height={height} className="block mx-auto">
        {arr.map((val, idx) => {
          if (val === null || val === undefined || idx >= 15) return null;
          const p = getPos(idx);
          const left = 2 * idx + 1;
          const right = 2 * idx + 2;
          return (
            <g key={`edge_${idx}`}>
              {left < arr.length && arr[left] !== null && arr[left] !== undefined && left < 15 && (
                <line x1={p.x} y1={p.y} x2={getPos(left).x} y2={getPos(left).y} stroke="#475569" strokeWidth="1.8" />
              )}
              {right < arr.length && arr[right] !== null && arr[right] !== undefined && right < 15 && (
                <line x1={p.x} y1={p.y} x2={getPos(right).x} y2={getPos(right).y} stroke="#475569" strokeWidth="1.8" />
              )}
            </g>
          );
        })}
        {arr.map((val, idx) => {
          if (val === null || val === undefined || idx >= 15) return null;
          const p = getPos(idx);
          const isFound = foundIdx === idx;
          const isHl = highlights.has(idx);
          return (
            <g key={`node_${idx}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={17}
                fill={isFound ? '#10b981' : isHl ? '#f59e0b' : '#1e293b'}
                stroke={isFound ? '#34d399' : isHl ? '#fbbf24' : '#38bdf8'}
                strokeWidth={2}
              />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                className={`${isFound || isHl ? 'fill-slate-950' : 'fill-slate-100'} text-xs font-mono font-bold`}
              >
                {val}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // 9. 그래프 (Graph / DFS / BFS / Dijkstra)
  if (topic.visualKind === 'graph') {
    const nodes = (st.nodes as number[]) || [];
    const edges = (st.edges as Array<{ u: number; v: number; w: number }>) || [];
    const visited = new Set((st.visited as number[]) || []);
    const current = st.current as number | null | undefined;
    const dist = st.dist as Record<number, number | string> | undefined;
    const weighted = Boolean(st.weighted);
    const activeEdge = st.activeEdge as { u: number; v: number } | undefined;

    const cx = 180, cy = 105, r = 74;
    const coords = new Map<number, { x: number; y: number }>();
    nodes.forEach((n, idx) => {
      const ang = (idx / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
      coords.set(n, { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
    });

    return (
      <div className="space-y-1.5">
        <svg width={360} height={212} className="block mx-auto">
          {edges.map((e, i) => {
            const a = coords.get(e.u);
            const b = coords.get(e.v);
            if (!a || !b) return null;
            const isAct = activeEdge && ((activeEdge.u === e.u && activeEdge.v === e.v) || (!weighted && activeEdge.u === e.v && activeEdge.v === e.u));
            return (
              <g key={i}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isAct ? '#fbbf24' : '#475569'}
                  strokeWidth={isAct ? 3 : 1.8}
                />
                {weighted && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 4}
                    textAnchor="middle"
                    className="fill-amber-300 text-[11px] font-mono font-bold"
                  >
                    {e.w}
                  </text>
                )}
              </g>
            );
          })}

          {nodes.map((n) => {
            const p = coords.get(n)!;
            const isCur = current === n;
            const isVis = visited.has(n);
            return (
              <g key={n}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={18}
                  fill={isCur ? '#f59e0b' : isVis ? '#10b981' : '#1e293b'}
                  stroke={isCur ? '#fde68a' : isVis ? '#34d399' : '#38bdf8'}
                  strokeWidth={2.2}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  className={`${isCur || isVis ? 'fill-slate-950' : 'fill-slate-100'} text-xs font-mono font-bold`}
                >
                  {n}
                </text>
                {dist && dist[n] !== undefined && (
                  <text
                    x={p.x}
                    y={p.y + 30}
                    textAnchor="middle"
                    className="fill-sky-300 text-[10px] font-mono font-semibold"
                  >
                    d={dist[n]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {Array.isArray(st.frontier) && (
          <div className="text-center text-[11px] font-mono text-[var(--text-secondary)]">
            {String(st.frontierLabel || '대기열')}: [{(st.frontier as number[]).join(', ')}]
          </div>
        )}
      </div>
    );
  }

  // 10. 재귀 호출 스택 시각화
  if (topic.visualKind === 'recursion') {
    const frames = (st.frames as Array<{ label: string; status: string; result?: number }>) || [];
    return (
      <div className="flex flex-col-reverse items-center gap-1.5 py-2 min-h-[140px] justify-center">
        {frames.length === 0 ? (
          <div className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono text-sm font-bold">
            최종 반환 결과: {String(st.finalResult ?? '')}
          </div>
        ) : (
          frames.map((f, idx) => (
            <div
              key={idx}
              className={`w-60 px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center justify-between ${
                f.status === 'returning'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : f.status === 'base'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-sky-500/15 border-sky-400/50 text-[var(--text-primary)]'
              }`}
            >
              <span>{f.label}</span>
              <span className="text-[11px]">
                {f.result !== undefined ? `→ ${f.result}` : '대기 중'}
              </span>
            </div>
          ))
        )}
      </div>
    );
  }

  // 11. 동적 계획법 2D DP 테이블
  if (topic.visualKind === 'dp-table') {
    const dp = (st.dp as number[][]) || [];
    const activeCell = st.activeCell as [number, number] | null;
    const cap = Number(st.cap ?? 7);
    return (
      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse font-mono text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1 border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[10px]">
                물건\용량
              </th>
              {Array.from({ length: cap + 1 }, (_, c) => (
                <th
                  key={c}
                  className="px-2 py-1 border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[10px]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dp.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="px-2 py-1 border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[10px] font-bold">
                  {rIdx === 0 ? '0개' : `#${rIdx}`}
                </td>
                {row.map((val, cIdx) => {
                  const isAct = activeCell && activeCell[0] === rIdx && activeCell[1] === cIdx;
                  return (
                    <td
                      key={cIdx}
                      className={`px-2.5 py-1 text-center border border-[var(--border-subtle)] ${
                        isAct
                          ? 'bg-amber-500/30 text-amber-200 font-bold'
                          : val > 0
                            ? 'bg-sky-500/10 text-[var(--text-primary)]'
                            : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 12. N-Queens 체스보드 (백트래킹)
  if (topic.visualKind === 'chessboard') {
    const n = Number(st.n ?? 4);
    const board = (st.board as number[]) || Array(n).fill(-1);
    const tryCell = st.tryCell as [number, number] | undefined;
    const status = String(st.status || '');
    const cell = Math.min(42, Math.floor(220 / n));
    const size = cell * n;

    return (
      <svg width={size + 4} height={size + 4} className="block mx-auto">
        {Array.from({ length: n }, (_, r) =>
          Array.from({ length: n }, (_, c) => {
            const dark = (r + c) % 2 === 1;
            const isTry = tryCell && tryCell[0] === r && tryCell[1] === c;
            let fill = dark ? '#1e293b' : '#334155';
            if (isTry && status === 'conflict') fill = 'rgba(244,63,94,0.6)';
            else if (isTry && status === 'backtrack') fill = 'rgba(251,191,36,0.45)';
            else if (status === 'solved' && board[r] === c) fill = 'rgba(16,185,129,0.5)';
            return (
              <g key={`${r}_${c}`}>
                <rect x={2 + c * cell} y={2 + r * cell} width={cell} height={cell} fill={fill} stroke="#0f172a" />
                {board[r] === c && (
                  <text
                    x={2 + c * cell + cell / 2}
                    y={2 + r * cell + cell / 2 + 6}
                    textAnchor="middle"
                    className="fill-amber-300 text-lg font-bold"
                  >
                    ♛
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>
    );
  }

  return null;
}

export function LearningPanel({
  topicId,
  isFullscreen,
  onSelectTopic,
  onCopyToEditor,
  onToggleFullscreen,
}: LearningPanelProps) {
  const topic = getLearningTopicById(topicId) || ALL_LEARNING_TOPICS[0];

  const [inputText, setInputText] = useState(topic.defaultInput);
  const [appliedInput, setAppliedInput] = useState(topic.defaultInput);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(750);
  const [codeLang, setCodeLang] = useState<Language>('python');
  const [showHint, setShowHint] = useState(false);

  // 주제가 바뀌면 입력값과 재생 상태 초기화
  useEffect(() => {
    setInputText(topic.defaultInput);
    setAppliedInput(topic.defaultInput);
    setStepIdx(0);
    setPlaying(false);
    setShowHint(false);
  }, [topic.id, topic.defaultInput]);

  const steps = useMemo(
    () => generateLearningSteps(topic.id, appliedInput),
    [topic.id, appliedInput]
  );

  const safeIdx = Math.max(0, Math.min(steps.length - 1, stepIdx));
  const currentStep = steps[safeIdx] || steps[0];

  useEffect(() => {
    if (!playing) return;
    if (safeIdx >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStepIdx((i) => i + 1), speedMs);
    return () => window.clearTimeout(timer);
  }, [playing, safeIdx, steps.length, speedMs]);

  const applyCustomInput = () => {
    setPlaying(false);
    setAppliedInput(inputText);
    setStepIdx(0);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--bg-panel)]">
      {/* 상단 헤더 */}
      <div className="ide-chrome flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-root)] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
          <select
            aria-label="학습 주제 선택"
            value={topic.id}
            onChange={(e) => onSelectTopic(e.target.value)}
            className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-xs font-bold max-w-[190px] truncate"
          >
            <optgroup label="자료구조 (13)">
              {ALL_LEARNING_TOPICS.filter((t) => t.category === 'data-structure').map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.englishTitle.split(' ')[0]})
                </option>
              ))}
            </optgroup>
            <optgroup label="알고리즘 (15)">
              {ALL_LEARNING_TOPICS.filter((t) => t.category === 'algorithm').map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.englishTitle.split(' ')[0]})
                </option>
              ))}
            </optgroup>
          </select>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 shrink-0">
            학습용 시뮬레이션
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? '전체 화면 종료' : '학습 패널 전체 화면'}
          className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 본문 스크롤 영역 */}
      <div className="scroll-pane flex-1 p-3 space-y-3.5">
        {/* 1. 요약 및 개념 */}
        <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] m-0">
              {topic.title}{' '}
              <span className="text-xs font-normal text-[var(--text-muted)]">
                {topic.englishTitle}
              </span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-0">{topic.summary}</p>
          </div>
          <ul className="m-0 pl-4 space-y-1 text-xs text-[var(--text-secondary)]">
            {topic.concept.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>

          {/* 시간/공간 복잡도 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[11px]">
            {topic.complexity.best && (
              <div className="p-1.5 rounded-md bg-[var(--bg-root)]/70 border border-[var(--border-subtle)]">
                <div className="text-[10px] text-[var(--text-muted)]">최선 시간</div>
                <div className="font-mono font-semibold text-emerald-400">{topic.complexity.best}</div>
              </div>
            )}
            <div className="p-1.5 rounded-md bg-[var(--bg-root)]/70 border border-[var(--border-subtle)]">
              <div className="text-[10px] text-[var(--text-muted)]">평균 시간</div>
              <div className="font-mono font-semibold text-sky-400">{topic.complexity.average}</div>
            </div>
            <div className="p-1.5 rounded-md bg-[var(--bg-root)]/70 border border-[var(--border-subtle)]">
              <div className="text-[10px] text-[var(--text-muted)]">최악 시간</div>
              <div className="font-mono font-semibold text-amber-400">{topic.complexity.worst}</div>
            </div>
            <div className="p-1.5 rounded-md bg-[var(--bg-root)]/70 border border-[var(--border-subtle)]">
              <div className="text-[10px] text-[var(--text-muted)]">공간 복잡도</div>
              <div className="font-mono font-semibold text-purple-400">{topic.complexity.space}</div>
            </div>
          </div>
        </div>

        {/* 2. 사용자 입력 + 단계별 2D 애니메이션 */}
        <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
          <div className="p-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/40 space-y-1.5">
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
              {topic.inputLabel}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCustomInput()}
                placeholder={topic.inputHint}
                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={applyCustomInput}
                className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs shrink-0"
              >
                적용
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputText(topic.defaultInput);
                  setAppliedInput(topic.defaultInput);
                  setStepIdx(0);
                  setPlaying(false);
                }}
                title="기본 입력으로 복원"
                className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2D SVG 캔버스 */}
          <div className="p-3 overflow-x-auto bg-[var(--bg-root)]/30">
            <LearningSvgCanvas topic={topic} step={currentStep} />
          </div>

          {/* 현재 단계 설명 & 비교/교환 횟수 */}
          <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-indigo-500/10 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-indigo-300">
                단계 {safeIdx + 1} / {steps.length}
              </span>
              <div className="flex items-center gap-2 font-mono">
                {typeof currentStep.comparisons === 'number' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                    비교: {currentStep.comparisons}
                  </span>
                )}
                {typeof currentStep.swaps === 'number' && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">
                    교환/이동: {currentStep.swaps}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-[var(--text-primary)] m-0">{currentStep.description}</p>
          </div>

          {/* 재생 컨트롤 */}
          <div className="ide-chrome px-3 py-2 border-t border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setStepIdx(0);
                  }}
                  className="p-1.5 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setStepIdx((i) => Math.max(0, i - 1));
                  }}
                  disabled={safeIdx === 0}
                  className="p-1.5 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (safeIdx >= steps.length - 1) setStepIdx(0);
                    setPlaying((p) => !p);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs"
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{playing ? '일시정지' : '재생'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
                  }}
                  disabled={safeIdx >= steps.length - 1}
                  className="p-1.5 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setStepIdx(steps.length - 1);
                  }}
                  className="p-1.5 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              <select
                aria-label="애니메이션 속도"
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)]"
              >
                <option value={1400}>0.5x</option>
                <option value={750}>1.0x</option>
                <option value={350}>2.0x</option>
                <option value={150}>4.0x</option>
              </select>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, steps.length - 1)}
              value={safeIdx}
              onChange={(e) => {
                setPlaying(false);
                setStepIdx(Number(e.target.value));
              }}
              className="w-full accent-indigo-400 h-1.5 cursor-pointer"
            />
          </div>
        </div>

        {/* 3. Python & C17 예제 코드 + 편집기로 복사 */}
        <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
          <div className="ide-chrome flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/40 gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCodeLang('python')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  codeLang === 'python'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                Python 예제
              </button>
              <button
                type="button"
                onClick={() => setCodeLang('c')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  codeLang === 'c'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                C17 예제
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const code = codeLang === 'python' ? topic.pythonCode : topic.cCode;
                const ext = codeLang === 'python' ? '.py' : '.c';
                const safeName = `${topic.id.replace(/^(ds|algo)-/, '')}${ext}`;
                onCopyToEditor(code, codeLang, safeName);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-semibold text-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>편집기로 복사하여 실행</span>
            </button>
          </div>
          <pre className="selectable-text p-3 m-0 text-[11px] font-mono overflow-x-auto text-[var(--text-primary)] leading-relaxed">
            {codeLang === 'python' ? topic.pythonCode : topic.cCode}
          </pre>
          <div className="px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-root)]/30 text-[10px] text-[var(--text-muted)]">
            ℹ 편집기로 복사해 코드를 수정한 뒤 상단 [실행] 또는 [실행 추적]을 누르면, 고정 애니메이션이 아니라 수정된 코드의 실제 실행 결과가 표시됩니다.
          </div>
        </div>

        {/* 4. 연습 문제 */}
        <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                연습 문제: {topic.practice.title}
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-semibold">
              {topic.practice.difficulty}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] m-0">{topic.practice.prompt}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px]">
            <div className="p-2 rounded bg-[var(--bg-root)]/60 border border-[var(--border-subtle)]">
              <div className="text-[10px] text-[var(--text-muted)] font-sans mb-0.5">예시 입력</div>
              <pre className="m-0 whitespace-pre-wrap">{topic.practice.sampleInput}</pre>
            </div>
            <div className="p-2 rounded bg-[var(--bg-root)]/60 border border-[var(--border-subtle)]">
              <div className="text-[10px] text-[var(--text-muted)] font-sans mb-0.5">기대 출력</div>
              <pre className="m-0 whitespace-pre-wrap text-emerald-400">{topic.practice.expectedOutput}</pre>
            </div>
          </div>

          {showHint && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">
              💡 힌트: {topic.practice.hint}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-medium"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>{showHint ? '힌트 숨기기' : '힌트 보기'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const code = codeLang === 'python' ? topic.practice.starterPython : topic.practice.starterC;
                const ext = codeLang === 'python' ? '.py' : '.c';
                onCopyToEditor(
                  code,
                  codeLang,
                  `practice_${topic.id.replace(/^(ds|algo)-/, '')}${ext}`,
                  topic.practice.sampleInput,
                  topic.practice.expectedOutput
                );
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{codeLang === 'python' ? 'Python' : 'C17'} 연습 시작하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
