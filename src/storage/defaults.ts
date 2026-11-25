import type { AppSettings, FileNode, Project, WorkspaceSession } from '../types/ide';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 15,
  tabSize: 4,
  timeoutSec: 10,
  maxTraceSteps: 400,
  showAccessoryBar: 'never',
  wordWrap: false,
  autoSave: true,
};

export function createInitialData(): {
  projects: Project[];
  files: FileNode[];
  session: WorkspaceSession;
} {
  const now = Date.now();

  const userProjectId = 'proj-user-main';
  const exampleProjectId = 'proj-examples';

  const projects: Project[] = [
    {
      id: userProjectId,
      name: '내 학습 프로젝트',
      description: '직접 코드를 작성하고 실험하는 개인 작업 공간',
      isExample: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: exampleProjectId,
      name: '예제 모음 (Python & C17)',
      description: '문법, 자료구조, 포인터, 동적 메모리 학습용 예제',
      isExample: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const files: FileNode[] = [
    // 사용자 학습 프로젝트 파일들
    {
      id: 'file-user-main-py',
      projectId: userProjectId,
      parentId: null,
      name: 'main.py',
      type: 'file',
      isExample: false,
      createdAt: now,
      updatedAt: now,
      content: `# Code Studio — Python 3 실습
# [실행] 또는 [실행 추적] 버튼을 눌러 동작을 확인해 보세요!

def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

nums = [5, 2, 8, 1, 4]
print("정렬 전:", nums)
result = bubble_sort(nums)
print("정렬 후:", result)
`,
    },
    {
      id: 'file-user-main-c',
      projectId: userProjectId,
      parentId: null,
      name: 'main.c',
      type: 'file',
      isExample: false,
      createdAt: now,
      updatedAt: now,
      content: `// Code Studio — C17 실습 (실제 Clang/LLVM WebAssembly 컴파일러)
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int arr[5] = {5, 2, 8, 1, 4};
    int n = 5;

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;
            }
        }
    }

    printf("정렬 결과: ");
    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\\n");
    return 0;
}
`,
    },
    {
      id: 'file-user-input-txt',
      projectId: userProjectId,
      parentId: null,
      name: 'input.txt',
      type: 'file',
      isExample: false,
      createdAt: now,
      updatedAt: now,
      content: `5\n10 20 30 40 50\n`,
    },

    // 예제 모음 프로젝트 폴더 및 파일들
    {
      id: 'folder-ex-py',
      projectId: exampleProjectId,
      parentId: null,
      name: 'python',
      type: 'folder',
      content: '',
      isExample: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'folder-ex-c',
      projectId: exampleProjectId,
      parentId: null,
      name: 'c17',
      type: 'folder',
      content: '',
      isExample: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'file-ex-py-io',
      projectId: exampleProjectId,
      parentId: 'folder-ex-py',
      name: 'io_and_sum.py',
      type: 'file',
      isExample: true,
      createdAt: now,
      updatedAt: now,
      content: `# 하단 [표준 입력(stdin)] 탭에 숫자를 입력하고 실행해 보세요.
# 예: 5 (줄바꿈) 10 20 30 40 50

import sys

data = sys.stdin.read().split()
if not data:
    print("표준 입력이 비어 있어 기본값을 사용합니다.")
    nums = [10, 20, 30, 40, 50]
else:
    n = int(data[0])
    nums = [int(x) for x in data[1:1 + n]]

total = 0
for val in nums:
    total += val

print("입력 숫자:", nums)
print("합계:", total)
print("평균:", total / len(nums) if nums else 0)
`,
    },
    {
      id: 'file-ex-py-rec',
      projectId: exampleProjectId,
      parentId: 'folder-ex-py',
      name: 'recursion_factorial.py',
      type: 'file',
      isExample: true,
      createdAt: now,
      updatedAt: now,
      content: `# 재귀 호출 스택 시각화 예제 ([실행 추적] 권장)

def factorial(n):
    if n <= 1:
        return 1
    sub = factorial(n - 1)
    return n * sub

ans = factorial(4)
print("4! =", ans)
`,
    },
    {
      id: 'file-ex-py-ll',
      projectId: exampleProjectId,
      parentId: 'folder-ex-py',
      name: 'linked_list.py',
      type: 'file',
      isExample: true,
      createdAt: now,
      updatedAt: now,
      content: `# 연결 리스트 노드 시각화 예제 ([실행 추적] 권장)

class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

head = Node(10)
head.next = Node(20)
head.next.next = Node(30)

cur = head
while cur is not None:
    print(cur.val, end=" -> ")
    cur = cur.next
print("None")
`,
    },
    {
      id: 'file-ex-c-scanf',
      projectId: exampleProjectId,
      parentId: 'folder-ex-c',
      name: 'scanf_printf.c',
      type: 'file',
      isExample: true,
      createdAt: now,
      updatedAt: now,
      content: `// 하단 [표준 입력(stdin)] 탭에 두 정수를 입력하고 실행해 보세요. (예: 12 30)
#include <stdio.h>

int main(void) {
    int a = 12, b = 30;
    printf("두 정수를 입력받습니다...\\n");
    if (scanf("%d %d", &a, &b) == 2) {
        printf("입력값: a = %d, b = %d\\n", a, b);
    } else {
        printf("표준 입력이 없어 기본값 사용: a = %d, b = %d\\n", a, b);
    }
    printf("합계: %d, 곱: %d\\n", a + b, a * b);
    return 0;
}
`,
    },
    {
      id: 'file-ex-c-ptr',
      projectId: exampleProjectId,
      parentId: 'folder-ex-c',
      name: 'pointer_malloc_list.c',
      type: 'file',
      isExample: true,
      createdAt: now,
      updatedAt: now,
      content: `// C 포인터, 동적 메모리(malloc/free) 및 연결 리스트 추적 예제
// [실행 추적]을 누르면 스택 포인터와 힙 노드 화살표를 확인할 수 있습니다!
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int val;
    struct Node *next;
} Node;

int main(void) {
    Node *head = NULL;
    Node *n1 = (Node *)malloc(sizeof(Node));
    n1->val = 10;
    n1->next = NULL;
    head = n1;

    Node *n2 = (Node *)malloc(sizeof(Node));
    n2->val = 20;
    n2->next = NULL;
    n1->next = n2;

    Node *n3 = (Node *)malloc(sizeof(Node));
    n3->val = 30;
    n3->next = NULL;
    n2->next = n3;

    Node *cur = head;
    while (cur != NULL) {
        printf("%d -> ", cur->val);
        cur = cur->next;
    }
    printf("NULL\\n");

    free(n3);
    free(n2);
    free(n1);
    return 0;
}
`,
    },
    {
      id: 'file-ex-c-rec',
      projectId: exampleProjectId,
      parentId: 'folder-ex-c',
      name: 'recursion_fib.c',
      type: 'file',
      isExample: true,
      createdAt: now,
      updatedAt: now,
      content: `// C 재귀 함수 호출 스택 추적 예제
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    int prev = factorial(n - 1);
    return n * prev;
}

int main(void) {
    int n = 4;
    int result = factorial(n);
    printf("%d! = %d\\n", n, result);
    return 0;
}
`,
    },
  ];

  const session: WorkspaceSession = {
    activeProjectId: userProjectId,
    activeFileId: 'file-user-main-py',
    openFileIds: ['file-user-main-py', 'file-user-main-c'],
    recentFileIds: ['file-user-main-py', 'file-user-main-c'],
    language: 'python',
    stdin: '5\n10 20 30 40 50\n',
  };

  return { projects, files, session };
}
