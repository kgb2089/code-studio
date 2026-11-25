export type LearningCategory = 'data-structure' | 'algorithm';

export type VisualKind =
  | 'array'
  | 'bars'
  | 'string'
  | 'linked-list'
  | 'doubly-linked-list'
  | 'stack'
  | 'queue'
  | 'circular-queue'
  | 'deque'
  | 'hash-table'
  | 'heap'
  | 'tree'
  | 'graph'
  | 'recursion'
  | 'dp-table'
  | 'chessboard';

export interface AlgoStep {
  stepNumber: number;
  description: string;
  comparisons?: number;
  swaps?: number;
  highlights?: number[];
  secondaryHighlights?: number[];
  sortedIndices?: number[];
  foundIndex?: number;
  pointers?: Record<string, number>;
  /** 시각화 유형별 동적 상태 데이터 */
  state: Record<string, unknown>;
}

export interface PracticeProblem {
  title: string;
  difficulty: '입문' | '기초' | '중급';
  prompt: string;
  hint: string;
  sampleInput: string;
  expectedOutput: string;
  starterPython: string;
  starterC: string;
}

export interface ComplexityInfo {
  best?: string;
  average: string;
  worst: string;
  space: string;
  note?: string;
}

export interface LearningTopic {
  id: string;
  category: LearningCategory;
  title: string;
  englishTitle: string;
  summary: string;
  concept: string[];
  visualKind: VisualKind;
  complexity: ComplexityInfo;
  defaultInput: string;
  inputLabel: string;
  inputHint: string;
  pythonCode: string;
  cCode: string;
  practice: PracticeProblem;
}
