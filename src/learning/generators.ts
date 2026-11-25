import type { AlgoStep } from '../types/learning';

function parseNums(raw: string, fallback: number[], maxLen = 14): number[] {
  const nums = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return fallback;
  return nums.slice(0, maxLen);
}

function parseGraphEdges(
  raw: string,
  weighted = false
): { nodes: number[]; edges: Array<{ u: number; v: number; w: number }>; start: number } {
  const [edgePart, optPart] = raw.split('|');
  const startMatch = optPart?.match(/start\s+(\d+)/i);
  const start = startMatch ? Number(startMatch[1]) : 0;
  const nodeSet = new Set<number>();
  const edges: Array<{ u: number; v: number; w: number }> = [];

  for (const token of (edgePart || '').split(',')) {
    const t = token.trim();
    if (!t) continue;
    if (weighted) {
      const m = t.match(/^(\d+)\s*-\s*(\d+)\s*:\s*(\d+)$/);
      if (m) {
        const u = Number(m[1]), v = Number(m[2]), w = Number(m[3]);
        nodeSet.add(u); nodeSet.add(v);
        edges.push({ u, v, w });
      }
    } else {
      const m = t.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const u = Number(m[1]), v = Number(m[2]);
        nodeSet.add(u); nodeSet.add(v);
        edges.push({ u, v, w: 1 });
      }
    }
  }
  if (edges.length === 0) {
    return weighted
      ? {
          nodes: [0, 1, 2, 3, 4],
          edges: [
            { u: 0, v: 1, w: 4 },
            { u: 0, v: 2, w: 1 },
            { u: 2, v: 1, w: 2 },
            { u: 1, v: 3, w: 1 },
            { u: 2, v: 3, w: 5 },
            { u: 3, v: 4, w: 3 },
          ],
          start: 0,
        }
      : {
          nodes: [0, 1, 2, 3, 4, 5],
          edges: [
            { u: 0, v: 1, w: 1 },
            { u: 0, v: 2, w: 1 },
            { u: 1, v: 3, w: 1 },
            { u: 1, v: 4, w: 1 },
            { u: 2, v: 5, w: 1 },
            { u: 4, v: 5, w: 1 },
          ],
          start: 0,
        };
  }
  nodeSet.add(start);
  return { nodes: Array.from(nodeSet).sort((a, b) => a - b), edges, start };
}

/**
 * 28개 자료구조·알고리즘 학습 주제에 대해 사용자 입력값을 기반으로
 * 실제 단계별 애니메이션 스냅샷을 동적으로 생성합니다.
 */
export function generateLearningSteps(topicId: string, rawInput: string): AlgoStep[] {
  switch (topicId) {
    case 'ds-array':
      return genArraySteps(rawInput);
    case 'ds-string':
      return genStringSteps(rawInput);
    case 'ds-linked-list':
      return genLinkedListSteps(rawInput, false);
    case 'ds-doubly-linked-list':
      return genLinkedListSteps(rawInput, true);
    case 'ds-stack':
      return genStackSteps(rawInput);
    case 'ds-queue':
      return genQueueSteps(rawInput);
    case 'ds-circular-queue':
      return genCircularQueueSteps(rawInput);
    case 'ds-deque':
      return genDequeSteps(rawInput);
    case 'ds-hash-table':
      return genHashTableSteps(rawInput);
    case 'ds-heap':
      return genHeapSteps(rawInput);
    case 'ds-binary-tree':
      return genBinaryTreeSteps(rawInput);
    case 'ds-bst':
      return genBstSteps(rawInput);
    case 'ds-graph':
      return genGraphIntroSteps(rawInput);
    case 'algo-linear-search':
      return genLinearSearchSteps(rawInput);
    case 'algo-binary-search':
      return genBinarySearchSteps(rawInput);
    case 'algo-bubble-sort':
      return genBubbleSortSteps(rawInput);
    case 'algo-selection-sort':
      return genSelectionSortSteps(rawInput);
    case 'algo-insertion-sort':
      return genInsertionSortSteps(rawInput);
    case 'algo-merge-sort':
      return genMergeSortSteps(rawInput);
    case 'algo-quick-sort':
      return genQuickSortSteps(rawInput);
    case 'algo-heap-sort':
      return genHeapSortSteps(rawInput);
    case 'algo-recursion':
      return genRecursionSteps(rawInput);
    case 'algo-dfs':
      return genDfsSteps(rawInput);
    case 'algo-bfs':
      return genBfsSteps(rawInput);
    case 'algo-dijkstra':
      return genDijkstraSteps(rawInput);
    case 'algo-dp':
      return genDpKnapsackSteps(rawInput);
    case 'algo-greedy':
      return genGreedyCoinSteps(rawInput);
    case 'algo-backtracking':
      return genNQueensSteps(rawInput);
    default:
      return [{ stepNumber: 0, description: '지원되지 않는 학습 주제입니다.', state: {} }];
  }
}

/* ==================== 자료구조 생성기 (13개) ==================== */

function genArraySteps(raw: string): AlgoStep[] {
  const [arrPart, cmdPart] = raw.split('|');
  const arr = parseNums(arrPart || '', [10, 25, 30, 45, 60], 10);
  const m = cmdPart?.match(/insert\s+(\d+)\s+(-?\d+)/i);
  const pos = m ? Math.max(0, Math.min(arr.length, Number(m[1]))) : Math.min(2, arr.length);
  const val = m ? Number(m[2]) : 99;

  const steps: AlgoStep[] = [];
  const work: Array<number | string> = [...arr, '빈칸'];
  steps.push({
    stepNumber: 0,
    description: `초기 배열 [${arr.join(', ')}] — 인덱스 ${pos}에 값 ${val}을 삽입하기 위해 뒤 원소들을 한 칸씩 이동합니다.`,
    highlights: [pos],
    state: { items: [...work] },
  });

  for (let i = arr.length; i > pos; i--) {
    work[i] = work[i - 1];
    work[i - 1] = '이동';
    steps.push({
      stepNumber: steps.length,
      description: `arr[${i}] = arr[${i - 1}] (${work[i]}) — 오른쪽으로 한 칸 이동 (O(n) 비용 발생)`,
      highlights: [i, i - 1],
      state: { items: [...work] },
    });
  }

  work[pos] = val;
  steps.push({
    stepNumber: steps.length,
    description: `arr[${pos}] = ${val} 삽입 완료! 총 ${arr.length - pos}번의 원소 이동이 발생했습니다.`,
    foundIndex: pos,
    state: { items: [...work] },
  });
  return steps;
}

function genStringSteps(raw: string): AlgoStep[] {
  const clean = (raw.trim() || 'ALGORITHM').slice(0, 14);
  const chars = [...clean];
  const steps: AlgoStep[] = [];
  let swaps = 0;

  steps.push({
    stepNumber: 0,
    description: `문자열 "${clean}" (길이 ${chars.length}) — 투 포인터 left=0, right=${chars.length - 1} 로 뒤집기를 시작합니다.`,
    pointers: { left: 0, right: chars.length - 1 },
    state: { chars: [...chars], original: clean },
  });

  let l = 0, r = chars.length - 1;
  while (l < r) {
    steps.push({
      stepNumber: steps.length,
      description: `chars[${l}]='${chars[l]}' 와 chars[${r}]='${chars[r]}' 교환 준비`,
      highlights: [l, r],
      pointers: { left: l, right: r },
      swaps,
      state: { chars: [...chars], original: clean },
    });
    const tmp = chars[l];
    chars[l] = chars[r];
    chars[r] = tmp;
    swaps++;
    steps.push({
      stepNumber: steps.length,
      description: `교환 완료! left → ${l + 1}, right → ${r - 1}`,
      secondaryHighlights: [l, r],
      pointers: { left: l, right: r },
      swaps,
      state: { chars: [...chars], original: clean },
    });
    l++;
    r--;
  }

  const rev = chars.join('');
  steps.push({
    stepNumber: steps.length,
    description: `완료: "${rev}" (${rev === clean ? '회문(Palindrome)입니다!' : '회문이 아닙니다.'})`,
    swaps,
    state: { chars: [...chars], original: clean, done: true },
  });
  return steps;
}

function genLinkedListSteps(raw: string, doubly: boolean): AlgoStep[] {
  const [listPart, cmdPart] = raw.split('|');
  const vals = parseNums(listPart || '', [10, 20, 30, 40], 8);
  const insertMatch = cmdPart?.match(/insert\s+(-?\d+)/i);
  const steps: AlgoStep[] = [];
  const nodes: number[] = [];

  for (let i = 0; i < vals.length; i++) {
    nodes.push(vals[i]);
    steps.push({
      stepNumber: steps.length,
      description: `${doubly ? '이중 ' : ''}연결 리스트 노드 ${vals[i]} 생성 및 포인터 연결 (길이: ${nodes.length})`,
      highlights: [nodes.length - 1],
      state: { nodes: [...nodes], doubly },
    });
  }

  if (insertMatch) {
    const newVal = Number(insertMatch[1]);
    const insertIdx = Math.min(2, nodes.length);
    for (let i = 0; i < insertIdx; i++) {
      steps.push({
        stepNumber: steps.length,
        description: `삽입 위치(${insertIdx})를 찾기 위해 노드 ${i}(값 ${nodes[i]})를 따라 이동`,
        highlights: [i],
        state: { nodes: [...nodes], doubly, curIdx: i },
      });
    }
    nodes.splice(insertIdx, 0, newVal);
    steps.push({
      stepNumber: steps.length,
      description: `위치 ${insertIdx}에 새 노드(${newVal}) 삽입 및 next 포인터 재연결 완료!`,
      foundIndex: insertIdx,
      state: { nodes: [...nodes], doubly },
    });
  } else if (doubly && nodes.length > 1) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      steps.push({
        stepNumber: steps.length,
        description: `prev 포인터를 따라 역방향 순회 중: 현재 노드 ${nodes[i]}`,
        highlights: [i],
        state: { nodes: [...nodes], doubly, curIdx: i },
      });
    }
  }
  return steps;
}

function genStackSteps(raw: string): AlgoStep[] {
  const ops = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const stack: number[] = [];
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '빈 스택으로 시작합니다. (LIFO: 마지막 원소가 맨 위 top)', state: { items: [] } },
  ];

  for (const op of ops.slice(0, 14)) {
    const pm = op.match(/^push\s+(-?\d+)$/i);
    if (pm) {
      const v = Number(pm[1]);
      stack.push(v);
      steps.push({
        stepNumber: steps.length,
        description: `push(${v}) — 스택 맨 위(top=${stack.length - 1})에 추가 (O(1))`,
        highlights: [stack.length - 1],
        state: { items: [...stack], lastOp: `push(${v})` },
      });
    } else if (/^pop$/i.test(op)) {
      const popped = stack.pop();
      steps.push({
        stepNumber: steps.length,
        description: popped !== undefined ? `pop() → ${popped} 꺼냄 (O(1))` : '스택이 비어 있어 pop할 수 없습니다.',
        state: { items: [...stack], lastOp: popped !== undefined ? `pop() => ${popped}` : 'empty' },
      });
    }
  }
  return steps;
}

function genQueueSteps(raw: string): AlgoStep[] {
  const ops = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const queue: number[] = [];
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '빈 큐로 시작합니다. (FIFO: 뒤 rear로 넣고 앞 front에서 꺼냄)', state: { items: [] } },
  ];
  for (const op of ops.slice(0, 14)) {
    const em = op.match(/^(?:enq|enqueue|push)\s+(-?\d+)$/i);
    if (em) {
      const v = Number(em[1]);
      queue.push(v);
      steps.push({
        stepNumber: steps.length,
        description: `enqueue(${v}) — 뒤쪽(rear)에 추가 (O(1))`,
        highlights: [queue.length - 1],
        state: { items: [...queue] },
      });
    } else if (/^(?:deq|dequeue|pop)$/i.test(op)) {
      const v = queue.shift();
      steps.push({
        stepNumber: steps.length,
        description: v !== undefined ? `dequeue() → ${v} 제거 (앞쪽 front, O(1))` : '큐가 비어 있습니다.',
        state: { items: [...queue] },
      });
    }
  }
  return steps;
}

function genCircularQueueSteps(raw: string): AlgoStep[] {
  const [capPart, opPart] = raw.includes('|') ? raw.split('|') : ['cap 6', raw];
  const cm = capPart.match(/cap\s+(\d+)/i);
  const cap = Math.max(4, Math.min(8, cm ? Number(cm[1]) : 6));
  const ops = (opPart || 'enq 10, enq 20, deq, enq 30').split(',').map((s) => s.trim()).filter(Boolean);

  const buf: Array<number | null> = Array(cap).fill(null);
  let front = 0, rear = 0, count = 0;
  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `크기 ${cap}의 원형 큐 초기화 (front=0, rear=0, count=0)`,
      state: { buf: [...buf], front, rear, count, cap },
    },
  ];

  for (const op of ops.slice(0, 16)) {
    const em = op.match(/^(?:enq|enqueue)\s+(-?\d+)$/i);
    if (em) {
      const v = Number(em[1]);
      if (count === cap) {
        steps.push({
          stepNumber: steps.length,
          description: `enqueue(${v}) 실패 — 원형 큐가 가득 찼습니다 (count=${cap})`,
          state: { buf: [...buf], front, rear, count, cap },
        });
      } else {
        buf[rear] = v;
        const insertedIdx = rear;
        rear = (rear + 1) % cap;
        count++;
        steps.push({
          stepNumber: steps.length,
          description: `enqueue(${v}) → 슬롯 ${insertedIdx}에 저장, rear = (${insertedIdx}+1)%${cap} = ${rear}`,
          highlights: [insertedIdx],
          state: { buf: [...buf], front, rear, count, cap },
        });
      }
    } else if (/^(?:deq|dequeue)$/i.test(op)) {
      if (count === 0) {
        steps.push({
          stepNumber: steps.length,
          description: 'dequeue() 실패 — 원형 큐가 비어 있습니다.',
          state: { buf: [...buf], front, rear, count, cap },
        });
      } else {
        const removedIdx = front;
        const v = buf[front];
        buf[front] = null;
        front = (front + 1) % cap;
        count--;
        steps.push({
          stepNumber: steps.length,
          description: `dequeue() → 슬롯 ${removedIdx}의 값 ${v} 반환, front = (${removedIdx}+1)%${cap} = ${front}`,
          highlights: [removedIdx],
          state: { buf: [...buf], front, rear, count, cap },
        });
      }
    }
  }
  return steps;
}

function genDequeSteps(raw: string): AlgoStep[] {
  const ops = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const dq: number[] = [];
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '빈 덱(Deque) 시작 — 앞(front)과 뒤(back) 양쪽에서 O(1) 삽입/삭제 가능', state: { items: [] } },
  ];

  for (const op of ops.slice(0, 14)) {
    const pf = op.match(/^push_front\s+(-?\d+)$/i);
    const pb = op.match(/^push_back\s+(-?\d+)$/i);
    if (pf) {
      const v = Number(pf[1]);
      dq.unshift(v);
      steps.push({
        stepNumber: steps.length,
        description: `push_front(${v}) — 앞쪽에 삽입`,
        highlights: [0],
        state: { items: [...dq] },
      });
    } else if (pb) {
      const v = Number(pb[1]);
      dq.push(v);
      steps.push({
        stepNumber: steps.length,
        description: `push_back(${v}) — 뒤쪽에 삽입`,
        highlights: [dq.length - 1],
        state: { items: [...dq] },
      });
    } else if (/^pop_front$/i.test(op)) {
      const v = dq.shift();
      steps.push({
        stepNumber: steps.length,
        description: v !== undefined ? `pop_front() → ${v} 제거` : '덱이 비어 있습니다.',
        state: { items: [...dq] },
      });
    } else if (/^pop_back$/i.test(op)) {
      const v = dq.pop();
      steps.push({
        stepNumber: steps.length,
        description: v !== undefined ? `pop_back() → ${v} 제거` : '덱이 비어 있습니다.',
        state: { items: [...dq] },
      });
    }
  }
  return steps;
}

function genHashTableSteps(raw: string): AlgoStep[] {
  const [sizePart, keysPart] = raw.includes('|') ? raw.split('|') : ['size 7', raw];
  const sm = sizePart.match(/size\s+(\d+)/i);
  const size = Math.max(4, Math.min(10, sm ? Number(sm[1]) : 7));
  const keys = parseNums(keysPart || '', [15, 22, 8, 35, 29, 10, 17], 12);
  const buckets: number[][] = Array.from({ length: size }, () => []);

  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `버킷 ${size}개 해시 테이블 초기화 (해시 함수: h(k) = k % ${size})`,
      state: { buckets: buckets.map((b) => [...b]), size },
    },
  ];

  for (const k of keys) {
    const idx = ((k % size) + size) % size;
    const collision = buckets[idx].length > 0;
    buckets[idx].push(k);
    steps.push({
      stepNumber: steps.length,
      description: `키 ${k} 삽입: h(${k}) = ${k} % ${size} = ${idx}` + (collision ? ' (충돌 발생 → 체이닝으로 연결!)' : ' (빈 버킷에 저장)'),
      highlights: [idx],
      state: { buckets: buckets.map((b) => [...b]), size, activeBucket: idx, collision },
    });
  }
  return steps;
}

function genHeapSteps(raw: string): AlgoStep[] {
  const vals = parseNums(raw, [30, 15, 40, 10, 25, 5, 20], 11);
  const heap: number[] = [];
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '최소 힙(Min Heap) 초기화 — 부모 ≤ 자식 불변식을 유지합니다.', state: { heap: [] } },
  ];

  for (const v of vals) {
    heap.push(v);
    let idx = heap.length - 1;
    steps.push({
      stepNumber: steps.length,
      description: `값 ${v}을 힙 끝(인덱스 ${idx})에 추가`,
      highlights: [idx],
      state: { heap: [...heap] },
    });
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (heap[parent] > heap[idx]) {
        const tmp = heap[parent];
        heap[parent] = heap[idx];
        heap[idx] = tmp;
        steps.push({
          stepNumber: steps.length,
          description: `Sift-Up: 자식 ${heap[parent]} < 부모 ${heap[idx]} 이므로 교환 (인덱스 ${idx} ↔ ${parent})`,
          highlights: [parent, idx],
          state: { heap: [...heap] },
        });
        idx = parent;
      } else {
        break;
      }
    }
  }
  return steps;
}

function genBinaryTreeSteps(raw: string): AlgoStep[] {
  const [nodesPart, modePart] = raw.split('|');
  const vals = parseNums(nodesPart || '', [1, 2, 3, 4, 5, 6, 7], 15);
  const mode = (modePart || 'inorder').trim().toLowerCase();
  const visited: number[] = [];
  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `이진 트리 (${mode} 순회) 시작`,
      state: { treeArray: [...vals], visited: [] },
    },
  ];

  function traverse(idx: number) {
    if (idx >= vals.length) return;
    const visit = () => {
      visited.push(vals[idx]);
      steps.push({
        stepNumber: steps.length,
        description: `노드 ${vals[idx]} 방문 (${mode}) — 누적 순서: [${visited.join(', ')}]`,
        highlights: [idx],
        state: { treeArray: [...vals], visited: [...visited], activeIndex: idx },
      });
    };
    if (mode === 'preorder') {
      visit();
      traverse(2 * idx + 1);
      traverse(2 * idx + 2);
    } else if (mode === 'postorder') {
      traverse(2 * idx + 1);
      traverse(2 * idx + 2);
      visit();
    } else {
      traverse(2 * idx + 1);
      visit();
      traverse(2 * idx + 2);
    }
  }

  traverse(0);
  return steps;
}

function genBstSteps(raw: string): AlgoStep[] {
  const [valsPart, cmdPart] = raw.split('|');
  const vals = parseNums(valsPart || '', [50, 30, 70, 20, 40, 60, 80], 11);
  const sm = cmdPart?.match(/search\s+(-?\d+)/i);
  const searchTarget = sm ? Number(sm[1]) : vals[Math.min(4, vals.length - 1)];

  // 힙 인덱스 방식 배열(크기 31, 깊이 최대 4)로 BST 레이아웃 표현
  const tree: Array<number | null> = Array(31).fill(null);
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '빈 이진 탐색 트리(BST)에서 삽입을 시작합니다.', state: { treeArray: [...tree] } },
  ];

  for (const v of vals) {
    let idx = 0;
    while (idx < 31 && tree[idx] !== null) {
      if (v === tree[idx]) break;
      idx = v < tree[idx]! ? 2 * idx + 1 : 2 * idx + 2;
    }
    if (idx < 31 && tree[idx] === null) {
      tree[idx] = v;
      steps.push({
        stepNumber: steps.length,
        description: `값 ${v} 삽입 완료 (인덱스 ${idx})`,
        highlights: [idx],
        state: { treeArray: [...tree], activeIndex: idx },
      });
    }
  }

  // 탐색 단계 기록
  let cur = 0;
  let comparisons = 0;
  while (cur < 31 && tree[cur] !== null) {
    comparisons++;
    const nodeVal = tree[cur]!;
    if (searchTarget === nodeVal) {
      steps.push({
        stepNumber: steps.length,
        description: `탐색 성공! 노드 ${nodeVal} == 목표 ${searchTarget} (${comparisons}번 비교)`,
        foundIndex: cur,
        comparisons,
        state: { treeArray: [...tree], activeIndex: cur, foundIndex: cur },
      });
      return steps;
    }
    const dir = searchTarget < nodeVal ? '왼쪽' : '오른쪽';
    steps.push({
      stepNumber: steps.length,
      description: `${searchTarget} ${searchTarget < nodeVal ? '<' : '>'} ${nodeVal} → ${dir} 자식으로 이동`,
      highlights: [cur],
      comparisons,
      state: { treeArray: [...tree], activeIndex: cur },
    });
    cur = searchTarget < nodeVal ? 2 * cur + 1 : 2 * cur + 2;
  }

  steps.push({
    stepNumber: steps.length,
    description: `목표 값 ${searchTarget}을(를) 찾지 못했습니다. (${comparisons}번 비교)`,
    comparisons,
    state: { treeArray: [...tree] },
  });
  return steps;
}

function genGraphIntroSteps(raw: string): AlgoStep[] {
  const { nodes, edges } = parseGraphEdges(raw, false);
  const adj: Record<number, number[]> = {};
  nodes.forEach((n) => (adj[n] = []));
  const addedEdges: typeof edges = [];
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: `정점 ${nodes.length}개로 빈 그래프 초기화`, state: { nodes, edges: [], adj: { ...adj } } },
  ];
  for (const e of edges) {
    addedEdges.push(e);
    adj[e.u] = [...adj[e.u], e.v];
    adj[e.v] = [...adj[e.v], e.u];
    steps.push({
      stepNumber: steps.length,
      description: `무방향 간선 (${e.u} — ${e.v}) 추가 → 인접 리스트 갱신`,
      highlights: [e.u, e.v],
      state: {
        nodes,
        edges: [...addedEdges],
        activeEdge: e,
        adj: Object.fromEntries(Object.entries(adj).map(([k, v]) => [k, [...v]])),
      },
    });
  }
  return steps;
}

/* ==================== 알고리즘 생성기 (15개) ==================== */

function genLinearSearchSteps(raw: string): AlgoStep[] {
  const [arrPart, targetPart] = raw.split('|');
  const arr = parseNums(arrPart || '', [14, 7, 29, 3, 18, 42, 11], 12);
  const tm = targetPart?.match(/(-?\d+)/);
  const target = tm ? Number(tm[1]) : arr[Math.min(4, arr.length - 1)];

  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `선형 탐색 시작: 배열에서 값 ${target}을(를) 인덱스 0부터 순서대로 찾습니다.`,
      comparisons: 0,
      state: { items: [...arr], target },
    },
  ];

  for (let i = 0; i < arr.length; i++) {
    const comps = i + 1;
    if (arr[i] === target) {
      steps.push({
        stepNumber: steps.length,
        description: `arr[${i}] == ${target} 일치! 인덱스 ${i}에서 발견 (${comps}번 비교)`,
        foundIndex: i,
        comparisons: comps,
        pointers: { i },
        state: { items: [...arr], target },
      });
      return steps;
    }
    steps.push({
      stepNumber: steps.length,
      description: `arr[${i}] = ${arr[i]} ≠ ${target} → 다음 인덱스 확인`,
      highlights: [i],
      comparisons: comps,
      pointers: { i },
      state: { items: [...arr], target },
    });
  }

  steps.push({
    stepNumber: steps.length,
    description: `배열 끝까지 탐색했으나 ${target}을(를) 찾지 못해 -1을 반환합니다.`,
    comparisons: arr.length,
    state: { items: [...arr], target },
  });
  return steps;
}

function genBinarySearchSteps(raw: string): AlgoStep[] {
  const [arrPart, targetPart] = raw.split('|');
  const arr = parseNums(arrPart || '', [3, 9, 14, 21, 28, 35, 42, 56, 68], 13).sort((a, b) => a - b);
  const tm = targetPart?.match(/(-?\d+)/);
  const target = tm ? Number(tm[1]) : arr[Math.floor(arr.length * 0.6)];

  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `이진 탐색 시작 (자동 오름차순 정렬됨): 목표 값 = ${target}`,
      comparisons: 0,
      pointers: { L: 0, R: arr.length - 1 },
      state: { items: [...arr], target, range: [0, arr.length - 1] },
    },
  ];

  let left = 0, right = arr.length - 1, comps = 0;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    comps++;
    if (arr[mid] === target) {
      steps.push({
        stepNumber: steps.length,
        description: `arr[${mid}] == ${target} 일치! 단 ${comps}번 비교 만에 탐색 성공`,
        foundIndex: mid,
        comparisons: comps,
        pointers: { L: left, M: mid, R: right },
        state: { items: [...arr], target, range: [left, right] },
      });
      return steps;
    }
    if (arr[mid] < target) {
      steps.push({
        stepNumber: steps.length,
        description: `arr[${mid}]=${arr[mid]} < ${target} → 왼쪽 절반 버리고 L = ${mid + 1}`,
        highlights: [mid],
        comparisons: comps,
        pointers: { L: left, M: mid, R: right },
        state: { items: [...arr], target, range: [left, right] },
      });
      left = mid + 1;
    } else {
      steps.push({
        stepNumber: steps.length,
        description: `arr[${mid}]=${arr[mid]} > ${target} → 오른쪽 절반 버리고 R = ${mid - 1}`,
        highlights: [mid],
        comparisons: comps,
        pointers: { L: left, M: mid, R: right },
        state: { items: [...arr], target, range: [left, right] },
      });
      right = mid - 1;
    }
  }

  steps.push({
    stepNumber: steps.length,
    description: `탐색 구간이 비어 ${target}이(가) 존재하지 않습니다. (-1 반환, ${comps}번 비교)`,
    comparisons: comps,
    state: { items: [...arr], target, range: [-1, -1] },
  });
  return steps;
}

function genBubbleSortSteps(raw: string): AlgoStep[] {
  const arr = parseNums(raw, [38, 19, 45, 12, 27, 8, 33], 12);
  const a = [...arr];
  const n = a.length;
  const sorted: number[] = [];
  let comparisons = 0, swaps = 0;
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '버블 정렬 시작', comparisons: 0, swaps: 0, sortedIndices: [], state: { values: [...a] } },
  ];

  for (let i = 0; i < n - 1; i++) {
    let didSwap = false;
    for (let j = 0; j < n - 1 - i; j++) {
      comparisons++;
      steps.push({
        stepNumber: steps.length,
        description: `비교: a[${j}]=${a[j]} vs a[${j + 1}]=${a[j + 1]}`,
        highlights: [j, j + 1],
        sortedIndices: [...sorted],
        comparisons,
        swaps,
        state: { values: [...a] },
      });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
        didSwap = true;
        steps.push({
          stepNumber: steps.length,
          description: `교환(Swap): a[${j}] ↔ a[${j + 1}]`,
          secondaryHighlights: [j, j + 1],
          sortedIndices: [...sorted],
          comparisons,
          swaps,
          state: { values: [...a] },
        });
      }
    }
    sorted.push(n - 1 - i);
    if (!didSwap) {
      for (let k = 0; k < n - 1 - i; k++) sorted.push(k);
      steps.push({
        stepNumber: steps.length,
        description: '교환이 발생하지 않아 조기 종료합니다!',
        sortedIndices: [...sorted],
        comparisons,
        swaps,
        state: { values: [...a] },
      });
      break;
    }
  }
  steps.push({
    stepNumber: steps.length,
    description: `버블 정렬 완료! (비교 ${comparisons}회, 교환 ${swaps}회)`,
    sortedIndices: a.map((_, i) => i),
    comparisons,
    swaps,
    state: { values: [...a] },
  });
  return steps;
}

function genSelectionSortSteps(raw: string): AlgoStep[] {
  const a = parseNums(raw, [29, 10, 14, 37, 13, 22, 6], 12);
  const n = a.length;
  const sorted: number[] = [];
  let comparisons = 0, swaps = 0;
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '선택 정렬 시작', comparisons: 0, swaps: 0, sortedIndices: [], state: { values: [...a] } },
  ];

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      if (a[j] < a[minIdx]) minIdx = j;
      steps.push({
        stepNumber: steps.length,
        description: `구간 [${i}..${n - 1}] 최솟값 탐색: 현재 최소 a[${minIdx}]=${a[minIdx]}, 비교 a[${j}]=${a[j]}`,
        highlights: [j],
        secondaryHighlights: [minIdx],
        sortedIndices: [...sorted],
        comparisons,
        swaps,
        state: { values: [...a] },
      });
    }
    if (minIdx !== i) {
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      swaps++;
    }
    sorted.push(i);
    steps.push({
      stepNumber: steps.length,
      description: `최솟값 ${a[i]}을(를) 위치 ${i}에 확정`,
      secondaryHighlights: [i, minIdx],
      sortedIndices: [...sorted],
      comparisons,
      swaps,
      state: { values: [...a] },
    });
  }

  steps.push({
    stepNumber: steps.length,
    description: `선택 정렬 완료! (비교 ${comparisons}회, 교환 ${swaps}회)`,
    sortedIndices: a.map((_, i) => i),
    comparisons,
    swaps,
    state: { values: [...a] },
  });
  return steps;
}

function genInsertionSortSteps(raw: string): AlgoStep[] {
  const a = parseNums(raw, [24, 15, 31, 9, 18, 42, 12], 12);
  const n = a.length;
  let comparisons = 0, swaps = 0;
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '삽입 정렬 시작 (a[0]은 정렬된 구간으로 간주)', comparisons: 0, swaps: 0, sortedIndices: [0], state: { values: [...a] } },
  ];

  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    steps.push({
      stepNumber: steps.length,
      description: `key = a[${i}] (${key})를 앞쪽 정렬된 구간에 삽입할 위치 탐색`,
      secondaryHighlights: [i],
      sortedIndices: Array.from({ length: i }, (_, k) => k),
      comparisons,
      swaps,
      state: { values: [...a] },
    });
    while (j >= 0) {
      comparisons++;
      if (a[j] > key) {
        a[j + 1] = a[j];
        swaps++;
        steps.push({
          stepNumber: steps.length,
          description: `a[${j}]=${a[j]} > key(${key}) → 오른쪽으로 이동`,
          highlights: [j, j + 1],
          comparisons,
          swaps,
          state: { values: [...a] },
        });
        j--;
      } else {
        break;
      }
    }
    a[j + 1] = key;
    steps.push({
      stepNumber: steps.length,
      description: `위치 ${j + 1}에 key=${key} 삽입 완료`,
      secondaryHighlights: [j + 1],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      comparisons,
      swaps,
      state: { values: [...a] },
    });
  }

  steps.push({
    stepNumber: steps.length,
    description: `삽입 정렬 완료! (비교 ${comparisons}회, 이동 ${swaps}회)`,
    sortedIndices: a.map((_, i) => i),
    comparisons,
    swaps,
    state: { values: [...a] },
  });
  return steps;
}

function genMergeSortSteps(raw: string): AlgoStep[] {
  const a = parseNums(raw, [38, 27, 43, 3, 9, 82, 10], 12);
  let comparisons = 0, swaps = 0;
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '병합 정렬 시작 (분할 정복)', comparisons: 0, swaps: 0, state: { values: [...a] } },
  ];

  function sort(l: number, r: number) {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    sort(l, m);
    sort(m + 1, r);

    const left = a.slice(l, m + 1);
    const right = a.slice(m + 1, r + 1);
    let i = 0, j = 0, k = l;
    while (i < left.length && j < right.length) {
      comparisons++;
      if (left[i] <= right[j]) {
        a[k] = left[i++];
      } else {
        a[k] = right[j++];
      }
      swaps++;
      steps.push({
        stepNumber: steps.length,
        description: `구간 [${l}..${r}] 병합 중: 위치 ${k}에 ${a[k]} 배치`,
        highlights: [k],
        comparisons,
        swaps,
        state: { values: [...a] },
      });
      k++;
    }
    while (i < left.length) {
      a[k] = left[i++];
      swaps++;
      steps.push({
        stepNumber: steps.length,
        description: `왼쪽 남은 원소 ${a[k]} 배치 (위치 ${k})`,
        highlights: [k],
        comparisons,
        swaps,
        state: { values: [...a] },
      });
      k++;
    }
    while (j < right.length) {
      a[k] = right[j++];
      swaps++;
      steps.push({
        stepNumber: steps.length,
        description: `오른쪽 남은 원소 ${a[k]} 배치 (위치 ${k})`,
        highlights: [k],
        comparisons,
        swaps,
        state: { values: [...a] },
      });
      k++;
    }
  }

  sort(0, a.length - 1);
  steps.push({
    stepNumber: steps.length,
    description: `병합 정렬 완료! (비교 ${comparisons}회, 쓰기 ${swaps}회)`,
    sortedIndices: a.map((_, i) => i),
    comparisons,
    swaps,
    state: { values: [...a] },
  });
  return steps;
}

function genQuickSortSteps(raw: string): AlgoStep[] {
  const a = parseNums(raw, [35, 12, 48, 7, 25, 19, 41, 22], 12);
  const fixed = new Set<number>();
  let comparisons = 0, swaps = 0;
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '퀵 정렬 시작 (Lomuto 피벗 분할)', comparisons: 0, swaps: 0, sortedIndices: [], state: { values: [...a] } },
  ];

  function qsort(lo: number, hi: number) {
    if (lo > hi) return;
    if (lo === hi) {
      fixed.add(lo);
      return;
    }
    const pivot = a[hi];
    let i = lo - 1;
    steps.push({
      stepNumber: steps.length,
      description: `구간 [${lo}..${hi}] 피벗 선택: a[${hi}] = ${pivot}`,
      secondaryHighlights: [hi],
      sortedIndices: Array.from(fixed),
      comparisons,
      swaps,
      state: { values: [...a] },
    });
    for (let j = lo; j < hi; j++) {
      comparisons++;
      if (a[j] <= pivot) {
        i++;
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          swaps++;
        }
        steps.push({
          stepNumber: steps.length,
          description: `a[${j}] <= 피벗(${pivot}) → 작은 값 구역(인덱스 ${i})으로 이동`,
          highlights: [i, j],
          secondaryHighlights: [hi],
          sortedIndices: Array.from(fixed),
          comparisons,
          swaps,
          state: { values: [...a] },
        });
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    swaps++;
    const p = i + 1;
    fixed.add(p);
    steps.push({
      stepNumber: steps.length,
      description: `피벗 ${pivot}을(를) 최종 확정 위치 ${p}에 배치`,
      secondaryHighlights: [p],
      sortedIndices: Array.from(fixed),
      comparisons,
      swaps,
      state: { values: [...a] },
    });
    qsort(lo, p - 1);
    qsort(p + 1, hi);
  }

  qsort(0, a.length - 1);
  steps.push({
    stepNumber: steps.length,
    description: `퀵 정렬 완료! (비교 ${comparisons}회, 교환 ${swaps}회)`,
    sortedIndices: a.map((_, i) => i),
    comparisons,
    swaps,
    state: { values: [...a] },
  });
  return steps;
}

function genHeapSortSteps(raw: string): AlgoStep[] {
  const a = parseNums(raw, [19, 36, 12, 45, 8, 27, 31], 12);
  const n = a.length;
  const sorted: number[] = [];
  let comparisons = 0, swaps = 0;
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: '힙 정렬 시작: 먼저 최대 힙(Max Heap)을 구성합니다.', comparisons: 0, swaps: 0, sortedIndices: [], state: { values: [...a] } },
  ];

  function heapify(size: number, i: number) {
    let lg = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < size) {
      comparisons++;
      if (a[l] > a[lg]) lg = l;
    }
    if (r < size) {
      comparisons++;
      if (a[r] > a[lg]) lg = r;
    }
    if (lg !== i) {
      [a[i], a[lg]] = [a[lg], a[i]];
      swaps++;
      steps.push({
        stepNumber: steps.length,
        description: `Heapify: 부모(${i}) ↔ 자식(${lg}) 교환`,
        highlights: [i, lg],
        sortedIndices: [...sorted],
        comparisons,
        swaps,
        state: { values: [...a] },
      });
      heapify(size, lg);
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i);
  steps.push({
    stepNumber: steps.length,
    description: `최대 힙 구성 완료! 루트 a[0]=${a[0]}가 최댓값입니다.`,
    secondaryHighlights: [0],
    comparisons,
    swaps,
    state: { values: [...a] },
  });

  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    swaps++;
    sorted.push(i);
    steps.push({
      stepNumber: steps.length,
      description: `루트 최댓값 ${a[i]}을(를) 끝 위치 ${i}로 이동 확정`,
      secondaryHighlights: [0, i],
      sortedIndices: [...sorted],
      comparisons,
      swaps,
      state: { values: [...a] },
    });
    heapify(i, 0);
  }

  steps.push({
    stepNumber: steps.length,
    description: `힙 정렬 완료! (비교 ${comparisons}회, 교환 ${swaps}회)`,
    sortedIndices: a.map((_, i) => i),
    comparisons,
    swaps,
    state: { values: [...a] },
  });
  return steps;
}

function genRecursionSteps(raw: string): AlgoStep[] {
  const n = Math.max(1, Math.min(7, Number(raw.trim()) || 5));
  const stack: Array<{ label: string; status: 'calling' | 'base' | 'returning'; result?: number }> = [];
  const steps: AlgoStep[] = [];

  function fact(k: number): number {
    stack.push({ label: `factorial(${k})`, status: k <= 1 ? 'base' : 'calling' });
    steps.push({
      stepNumber: steps.length,
      description:
        k <= 1
          ? `종료 조건(Base Case) 도달: factorial(${k}) = 1`
          : `factorial(${k}) 호출 → factorial(${k - 1})의 결과를 기다리며 스택에 쌓입니다.`,
      state: { frames: stack.map((f) => ({ ...f })) },
    });

    if (k <= 1) {
      stack[stack.length - 1].result = 1;
      stack[stack.length - 1].status = 'returning';
      steps.push({
        stepNumber: steps.length,
        description: `factorial(${k}) → 1 반환`,
        state: { frames: stack.map((f) => ({ ...f })) },
      });
      stack.pop();
      return 1;
    }

    const sub = fact(k - 1);
    const res = k * sub;
    stack[stack.length - 1].result = res;
    stack[stack.length - 1].status = 'returning';
    steps.push({
      stepNumber: steps.length,
      description: `스택 복귀: factorial(${k}) = ${k} × ${sub} = ${res} 반환`,
      state: { frames: stack.map((f) => ({ ...f })) },
    });
    stack.pop();
    return res;
  }

  const finalVal = fact(n);
  steps.push({
    stepNumber: steps.length,
    description: `재귀 완료! ${n}! = ${finalVal}`,
    state: { frames: [], finalResult: finalVal },
  });
  return steps;
}

function genDfsSteps(raw: string): AlgoStep[] {
  const { nodes, edges, start } = parseGraphEdges(raw, false);
  const adj: Record<number, number[]> = {};
  nodes.forEach((n) => (adj[n] = []));
  for (const e of edges) {
    adj[e.u].push(e.v);
    adj[e.v].push(e.u);
  }
  nodes.forEach((n) => adj[n].sort((a, b) => a - b));

  const visited: number[] = [];
  const stack: number[] = [];
  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `DFS 시작: 시작 정점 ${start}`,
      state: { nodes, edges, visited: [], current: start, frontierLabel: '호출 스택', frontier: [start] },
    },
  ];

  function dfs(u: number) {
    visited.push(u);
    stack.push(u);
    steps.push({
      stepNumber: steps.length,
      description: `정점 ${u} 방문 (방문 순서: ${visited.join(' → ')})`,
      highlights: [u],
      state: { nodes, edges, visited: [...visited], current: u, frontierLabel: '호출 스택', frontier: [...stack] },
    });
    for (const v of adj[u] || []) {
      if (!visited.includes(v)) {
        dfs(v);
      }
    }
    stack.pop();
    steps.push({
      stepNumber: steps.length,
      description: `정점 ${u}의 모든 이웃 탐색 완료 → 이전 정점으로 백트래킹`,
      state: { nodes, edges, visited: [...visited], current: stack[stack.length - 1] ?? null, frontierLabel: '호출 스택', frontier: [...stack] },
    });
  }

  dfs(start);
  return steps;
}

function genBfsSteps(raw: string): AlgoStep[] {
  const { nodes, edges, start } = parseGraphEdges(raw, false);
  const adj: Record<number, number[]> = {};
  nodes.forEach((n) => (adj[n] = []));
  for (const e of edges) {
    adj[e.u].push(e.v);
    adj[e.v].push(e.u);
  }
  nodes.forEach((n) => adj[n].sort((a, b) => a - b));

  const visited: number[] = [start];
  const dist: Record<number, number> = { [start]: 0 };
  const q: number[] = [start];
  const order: number[] = [];
  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `BFS 시작: 시작 정점 ${start}을(를) 큐에 삽입 (거리 0)`,
      highlights: [start],
      state: { nodes, edges, visited: [...visited], current: start, dist: { ...dist }, frontierLabel: '큐(Queue)', frontier: [...q] },
    },
  ];

  while (q.length > 0) {
    const u = q.shift()!;
    order.push(u);
    steps.push({
      stepNumber: steps.length,
      description: `큐에서 정점 ${u} 꺼냄 (거리 ${dist[u]}) — 인접 정점 확인`,
      highlights: [u],
      state: { nodes, edges, visited: [...order], current: u, dist: { ...dist }, frontierLabel: '큐(Queue)', frontier: [...q] },
    });
    for (const v of adj[u] || []) {
      if (dist[v] === undefined) {
        dist[v] = dist[u] + 1;
        visited.push(v);
        q.push(v);
        steps.push({
          stepNumber: steps.length,
          description: `이웃 정점 ${v} 발견 (거리 ${dist[v]}) → 큐에 추가`,
          highlights: [v],
          state: { nodes, edges, visited: [...order], current: u, dist: { ...dist }, frontierLabel: '큐(Queue)', frontier: [...q] },
        });
      }
    }
  }
  return steps;
}

function genDijkstraSteps(raw: string): AlgoStep[] {
  const { nodes, edges, start } = parseGraphEdges(raw, true);
  const adj: Record<number, Array<{ to: number; w: number }>> = {};
  nodes.forEach((n) => (adj[n] = []));
  for (const e of edges) adj[e.u].push({ to: e.v, w: e.w });

  const dist: Record<number, number | string> = {};
  nodes.forEach((n) => (dist[n] = '∞'));
  dist[start] = 0;
  const finalized: number[] = [];

  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `다익스트라 시작: dist[${start}] = 0, 나머지 정점은 ∞ 로 초기화`,
      highlights: [start],
      state: { nodes, edges, weighted: true, visited: [], current: start, dist: { ...dist } },
    },
  ];

  while (finalized.length < nodes.length) {
    let u: number | null = null;
    let best = Infinity;
    for (const n of nodes) {
      if (!finalized.includes(n) && typeof dist[n] === 'number' && (dist[n] as number) < best) {
        best = dist[n] as number;
        u = n;
      }
    }
    if (u === null) break;
    finalized.push(u);
    steps.push({
      stepNumber: steps.length,
      description: `미확정 정점 중 최단 거리 정점 ${u} 선택 및 확정 (dist[${u}] = ${dist[u]})`,
      highlights: [u],
      state: { nodes, edges, weighted: true, visited: [...finalized], current: u, dist: { ...dist } },
    });

    for (const { to, w } of adj[u] || []) {
      const cand = (dist[u] as number) + w;
      const curD = typeof dist[to] === 'number' ? (dist[to] as number) : Infinity;
      if (cand < curD) {
        dist[to] = cand;
        steps.push({
          stepNumber: steps.length,
          description: `간선 완화(Relax): ${u}→${to} (가중치 ${w}), dist[${to}]를 ${curD === Infinity ? '∞' : curD} → ${cand}로 갱신`,
          highlights: [to],
          state: { nodes, edges, weighted: true, visited: [...finalized], current: u, dist: { ...dist }, activeEdge: { u, v: to, w } },
        });
      }
    }
  }
  return steps;
}

function genDpKnapsackSteps(raw: string): AlgoStep[] {
  const [capPart, itemsPart] = raw.includes('|') ? raw.split('|') : ['cap 7', raw];
  const cm = capPart.match(/(\d+)/);
  const cap = Math.max(3, Math.min(10, cm ? Number(cm[1]) : 7));
  const items: Array<{ w: number; v: number }> = [];
  for (const tok of (itemsPart || '').split(',')) {
    const m = tok.trim().match(/^(\d+)\s*:\s*(\d+)$/);
    if (m) items.push({ w: Number(m[1]), v: Number(m[2]) });
  }
  if (items.length === 0) {
    items.push({ w: 2, v: 3 }, { w: 3, v: 4 }, { w: 4, v: 5 }, { w: 5, v: 8 });
  }
  const limited = items.slice(0, 6);
  const n = limited.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(0));

  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `0/1 배낭 DP 테이블 초기화 (물건 ${n}개, 최대 용량 ${cap})`,
      state: { dp: dp.map((r) => [...r]), items: limited, cap, activeCell: null },
    },
  ];

  for (let i = 1; i <= n; i++) {
    const { w, v } = limited[i - 1];
    for (let c = 0; c <= cap; c++) {
      const skip = dp[i - 1][c];
      const take = c >= w ? dp[i - 1][c - w] + v : -1;
      dp[i][c] = Math.max(skip, take);
      steps.push({
        stepNumber: steps.length,
        description:
          c >= w
            ? `물건 #${i}(무게 ${w}, 가치 ${v}), 용량 ${c}: max(안담음 ${skip}, 담음 ${take}) = ${dp[i][c]}`
            : `물건 #${i}(무게 ${w}) > 용량 ${c} → 담을 수 없어 위 행 값(${skip}) 유지`,
        state: { dp: dp.map((r) => [...r]), items: limited, cap, activeCell: [i, c] },
      });
    }
  }
  return steps;
}

function genGreedyCoinSteps(raw: string): AlgoStep[] {
  const [coinsPart, amtPart] = raw.split('|');
  const coins = parseNums(coinsPart || '', [500, 100, 50, 10], 8)
    .filter((c) => c > 0)
    .sort((a, b) => b - a);
  const am = amtPart?.match(/(\d+)/);
  const amount = am ? Number(am[1]) : 1260;

  let remain = amount;
  const counts = coins.map(() => 0);
  const steps: AlgoStep[] = [
    {
      stepNumber: 0,
      description: `그리디 거스름돈 시작: 목표 금액 ${amount}원, 큰 동전부터 최대한 선택합니다.`,
      state: { items: coins.map((c) => `${c}원: 0개`), remain },
    },
  ];

  for (let i = 0; i < coins.length; i++) {
    const cnt = Math.floor(remain / coins[i]);
    counts[i] = cnt;
    remain -= cnt * coins[i];
    steps.push({
      stepNumber: steps.length,
      description: `${coins[i]}원 동전 ${cnt}개 선택 → 남은 금액: ${remain}원`,
      highlights: [i],
      state: { items: coins.map((c, idx) => `${c}원: ${counts[idx]}개`), remain },
    });
  }

  const total = counts.reduce((s, x) => s + x, 0);
  steps.push({
    stepNumber: steps.length,
    description: `완료! 총 ${total}개의 동전 사용 (남은 금액 ${remain}원)`,
    state: { items: coins.map((c, idx) => `${c}원: ${counts[idx]}개`), remain },
  });
  return steps;
}

function genNQueensSteps(raw: string): AlgoStep[] {
  const n = Math.max(4, Math.min(6, Number(raw.trim()) || 4));
  const board = Array(n).fill(-1);
  const steps: AlgoStep[] = [
    { stepNumber: 0, description: `${n}-Queens 백트래킹 시작 — 서로 공격하지 않게 퀸 ${n}개를 배치합니다.`, state: { n, board: [...board], status: 'search' } },
  ];
  let found = false;

  function isSafe(r: number, c: number): boolean {
    for (let i = 0; i < r; i++) {
      if (board[i] === c || Math.abs(board[i] - c) === r - i) return false;
    }
    return true;
  }

  function backtrack(r: number) {
    if (found || steps.length > 180) return;
    if (r === n) {
      found = true;
      steps.push({
        stepNumber: steps.length,
        description: `${n}-Queens 첫 번째 해를 찾았습니다!`,
        state: { n, board: [...board], status: 'solved' },
      });
      return;
    }
    for (let c = 0; c < n; c++) {
      if (found || steps.length > 180) return;
      if (isSafe(r, c)) {
        board[r] = c;
        steps.push({
          stepNumber: steps.length,
          description: `행 ${r}, 열 ${c}에 퀸 배치 (안전) → 다음 행 ${r + 1} 탐색`,
          state: { n, board: [...board], tryCell: [r, c], status: 'place' },
        });
        backtrack(r + 1);
        if (!found) {
          board[r] = -1;
          steps.push({
            stepNumber: steps.length,
            description: `백트래킹: 행 ${r}, 열 ${c}의 퀸을 회수하고 다음 열 시도`,
            state: { n, board: [...board], tryCell: [r, c], status: 'backtrack' },
          });
        }
      } else {
        steps.push({
          stepNumber: steps.length,
          description: `가지치기(Pruning): 행 ${r}, 열 ${c}는 기존 퀸과 충돌`,
          state: { n, board: [...board], tryCell: [r, c], status: 'conflict' },
        });
      }
    }
  }

  backtrack(0);
  return steps;
}
