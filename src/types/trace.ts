import type { Language } from './ide';

export type TraceValueKind =
  | 'primitive'
  | 'array'
  | 'object'
  | 'pointer'
  | 'struct'
  | 'null'
  | 'string';

export interface TraceValue {
  kind: TraceValueKind;
  type: string;
  display: string;
  /** 원시값 또는 숫자 배열 등 */
  raw?: unknown;
  /** 배열/리스트 요소들 */
  items?: TraceValue[];
  /** 구조체/딕셔너리/객체 필드 */
  fields?: Record<string, TraceValue>;
  /** 변수 자신의 메모리 주소 (C) 또는 객체 ID (Python) */
  address?: string;
  /** 포인터/참조가 가리키는 대상 주소 또는 ID */
  targetAddress?: string | null;
}

export interface TraceVariable {
  name: string;
  value: TraceValue;
  changed?: boolean;
  previousDisplay?: string;
}

export interface TraceFrame {
  id: string;
  functionName: string;
  line: number;
  locals: TraceVariable[];
  returnValue?: TraceValue;
  isNew?: boolean;
  isReturning?: boolean;
}

export interface HeapBlock {
  address: string;
  label: string;
  sizeBytes?: number;
  freed?: boolean;
  kind: 'array' | 'struct' | 'object' | 'buffer';
  typeName?: string;
  items?: TraceValue[];
  fields?: Record<string, TraceValue>;
  /** 연결 리스트/트리 노드 자동 감지용 */
  nextAddress?: string | null;
  prevAddress?: string | null;
  leftAddress?: string | null;
  rightAddress?: string | null;
  valueDisplay?: string;
}

export interface TraceStep {
  index: number;
  line: number;
  event: 'line' | 'call' | 'return' | 'exception' | 'alloc' | 'free';
  functionName: string;
  description: string;
  frames: TraceFrame[];
  globals: TraceVariable[];
  heap: HeapBlock[];
  stdout: string;
  stderr?: string;
}

export interface TraceResult {
  language: Language;
  ok: boolean;
  /** 실제 실행 추적 여부 (학습용 애니메이션과 명확히 구분) */
  isRealExecution: true;
  steps: TraceStep[];
  truncated?: boolean;
  maxSteps?: number;
  stdout: string;
  stderr: string;
  compileOutput?: string;
  executionTimeMs: number;
  warnings: string[];
  unsupportedNotes?: string[];
  errorMessage?: string;
}
