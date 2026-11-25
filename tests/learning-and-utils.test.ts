import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  ALGORITHM_TOPICS,
  ALL_LEARNING_TOPICS,
  DATA_STRUCTURE_TOPICS,
  generateLearningSteps,
} from '../src/learning';
import { formatCode } from '../src/utils/formatter';

describe('자료구조·알고리즘 학습 라이브러리 (28개 주제) 및 애니메이션 정확성', () => {
  it('요구된 자료구조 13개와 알고리즘 15개(총 28개)가 모두 존재한다', () => {
    expect(DATA_STRUCTURE_TOPICS.length).toBe(13);
    expect(ALGORITHM_TOPICS.length).toBe(15);
    expect(ALL_LEARNING_TOPICS.length).toBe(28);

    for (const topic of ALL_LEARNING_TOPICS) {
      expect(topic.title.length).toBeGreaterThan(0);
      expect(topic.concept.length).toBeGreaterThanOrEqual(3);
      expect(topic.pythonCode.trim().length).toBeGreaterThan(20);
      expect(topic.cCode.trim().length).toBeGreaterThan(20);
      expect(topic.practice.prompt.length).toBeGreaterThan(10);

      const steps = generateLearningSteps(topic.id, topic.defaultInput);
      expect(steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('6개 정렬 알고리즘 시뮬레이션이 임의 사용자 입력을 정확히 오름차순 정렬한다', () => {
    const input = '42, 7, 19, 3, 28, 11, 5';
    const expected = [3, 5, 7, 11, 19, 28, 42];
    const sortIds = [
      'algo-bubble-sort',
      'algo-selection-sort',
      'algo-insertion-sort',
      'algo-merge-sort',
      'algo-quick-sort',
      'algo-heap-sort',
    ];

    for (const id of sortIds) {
      const steps = generateLearningSteps(id, input);
      const last = steps[steps.length - 1];
      expect(last.state.values).toEqual(expected);
      expect(last.comparisons).toBeGreaterThan(0);
    }
  });

  it('선형 탐색과 이진 탐색이 정확한 인덱스를 찾는다', () => {
    const linSteps = generateLearningSteps('algo-linear-search', '9, 4, 21, 7, 15 | target 7');
    expect(linSteps[linSteps.length - 1].foundIndex).toBe(3);

    const binSteps = generateLearningSteps('algo-binary-search', '2, 5, 8, 12, 16, 23, 38 | target 23');
    expect(binSteps[binSteps.length - 1].foundIndex).toBe(5);
  });

  it('0/1 배낭 동적 계획법이 정확한 최대 가치를 계산한다', () => {
    const steps = generateLearningSteps('algo-dp', 'cap 7 | 2:3, 3:4, 4:5, 5:8');
    const dp = steps[steps.length - 1].state.dp as number[][];
    // 용량 7에서 (무게 2, 가치 3) + (무게 5, 가치 8) = 11
    expect(dp[4][7]).toBe(11);
  });

  it('N-Queens 백트래킹이 충돌 없는 유효한 해를 찾는다', () => {
    const steps = generateLearningSteps('algo-backtracking', '4');
    const last = steps[steps.length - 1];
    expect(last.state.status).toBe('solved');
    const board = last.state.board as number[];
    expect(board.length).toBe(4);
    for (let r1 = 0; r1 < 4; r1++) {
      expect(board[r1]).toBeGreaterThanOrEqual(0);
      for (let r2 = r1 + 1; r2 < 4; r2++) {
        expect(board[r1]).not.toBe(board[r2]);
        expect(Math.abs(board[r1] - board[r2])).not.toBe(r2 - r1);
      }
    }
  });

  it('코드 포맷터가 Python과 C 코드를 올바르게 정리한다', () => {
    const pyFormatted = formatCode('def f():\n\treturn 1   \n\n\n\nprint(f())', 'python', 4);
    expect(pyFormatted).toBe('def f():\n    return 1\n\n\nprint(f())\n');

    const cFormatted = formatCode('#include <stdio.h>\nint main(void) {\nprintf("hi");\nreturn 0;\n}', 'c', 4);
    expect(cFormatted).toContain('    printf("hi");\n');
    expect(cFormatted).toContain('    return 0;\n');
  });

  it('ZIP 백업 생성 및 복원 무결성을 확인한다', async () => {
    const zip = new JSZip();
    zip.file('.code-studio.json', JSON.stringify({ project: { name: '테스트 프로젝트' } }));
    zip.file('main.py', 'print("ok")');
    zip.file('sub/helper.c', 'int add(int a, int b) { return a + b; }');

    const buf = await zip.generateAsync({ type: 'uint8array' });
    const loaded = await JSZip.loadAsync(buf);
    expect(await loaded.file('main.py')?.async('string')).toBe('print("ok")');
    expect(await loaded.file('sub/helper.c')?.async('string')).toContain('return a + b');
  });
});
