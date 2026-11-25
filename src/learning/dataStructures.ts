import type { LearningTopic } from '../types/learning';

export const DATA_STRUCTURE_TOPICS: LearningTopic[] = [
  {
    id: 'ds-array',
    category: 'data-structure',
    title: '배열',
    englishTitle: 'Array',
    summary: '연속된 메모리 공간에 같은 타입의 데이터를 인덱스로 저장하는 가장 기본적인 자료구조',
    concept: [
      '배열은 인덱스(0부터 시작)를 통해 O(1) 시간에 임의 접근(Random Access)이 가능합니다.',
      '메모리가 연속적으로 배치되어 캐시 지역성(Cache Locality)이 뛰어나 순회 속도가 매우 빠릅니다.',
      '중간 위치에 원소를 삽입하거나 삭제할 때는 뒤의 원소들을 밀거나 당겨야 하므로 O(n) 시간이 소요됩니다.',
    ],
    visualKind: 'array',
    complexity: {
      best: '접근 O(1)',
      average: '탐색 O(n), 삽입/삭제 O(n)',
      worst: '삽입/삭제 O(n)',
      space: 'O(n)',
      note: '끝에 추가(동적 배열 append)는 분할 상환 O(1)',
    },
    defaultInput: '10, 25, 30, 45, 60 | insert 2 99',
    inputLabel: '초기 배열 | 명령 (insert 인덱스 값)',
    inputHint: '예: 10, 25, 30, 45 | insert 2 99',
    pythonCode: `# 배열(리스트) 기본 연산: 접근, 삽입, 삭제, 순회
arr = [10, 25, 30, 45, 60]
print("초기 배열:", arr)
print("인덱스 2 접근:", arr[2])

# 인덱스 2 위치에 99 삽입 (뒤 원소 이동)
arr.insert(2, 99)
print("삽입 후:", arr)

# 인덱스 4 원소 삭제
removed = arr.pop(4)
print(f"삭제된 값: {removed}, 결과: {arr}")
`,
    cCode: `#include <stdio.h>

int main(void) {
    int arr[10] = {10, 25, 30, 45, 60};
    int n = 5;
    int pos = 2, val = 99;

    // 뒤에서부터 한 칸씩 밀고 삽입
    for (int i = n; i > pos; i--) {
        arr[i] = arr[i - 1];
    }
    arr[pos] = val;
    n++;

    printf("삽입 후 배열: ");
    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '배열에서 최댓값과 인덱스 찾기',
      difficulty: '입문',
      prompt: '정수 배열에서 가장 큰 값과 그 값의 인덱스를 출력하는 프로그램을 작성하세요.',
      hint: 'max_val = arr[0], max_idx = 0 으로 초기화한 뒤 반복문으로 비교합니다.',
      sampleInput: '5\n12 45 7 89 23',
      expectedOutput: '최댓값: 89, 인덱스: 3',
      starterPython: `n = int(input())\narr = list(map(int, input().split()))\n# 여기에 최댓값과 인덱스를 찾는 코드를 작성하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int n, arr[100];\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);\n    // 여기에 최댓값과 인덱스를 찾는 코드를 작성하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-string',
    category: 'data-structure',
    title: '문자열',
    englishTitle: 'String',
    summary: '문자들의 연속된 시퀀스(C에서는 널 문자 \\0로 끝나는 char 배열)',
    concept: [
      '문자열은 문자의 배열로 저장되며, 패턴 탐색, 뒤집기, 팰린드롬 판별 등 다양한 알고리즘의 기반입니다.',
      'Python의 str은 불변(Immutable) 객체이고, C의 문자열은 마지막에 널 문자(\\0)가 붙는 char 배열입니다.',
      '투 포인터(left, right)를 활용하면 O(n) 시간에 문자열을 뒤집거나 회문 여부를 판별할 수 있습니다.',
    ],
    visualKind: 'string',
    complexity: {
      best: '인덱스 접근 O(1)',
      average: '길이 확인 O(1) (C strlen은 O(n))',
      worst: '부분 문자열 탐색 O(n·m)',
      space: 'O(n)',
      note: 'C에서는 항상 마지막 널 문자 \\0 공간을 1바이트 더 확보해야 합니다.',
    },
    defaultInput: 'ALGORITHM',
    inputLabel: '입력 문자열 (투 포인터 뒤집기)',
    inputHint: '영문/숫자 문자열 입력 (예: ALGORITHM 또는 LEVEL)',
    pythonCode: `# 문자열 투 포인터 뒤집기 및 회문(Palindrome) 확인
s = "ALGORITHM"
chars = list(s)
left, right = 0, len(chars) - 1
while left < right:
    chars[left], chars[right] = chars[right], chars[left]
    left += 1
    right -= 1

reversed_s = "".join(chars)
print("원본:", s)
print("뒤집기:", reversed_s)
print("회문 여부:", s == reversed_s)
`,
    cCode: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[64] = "ALGORITHM";
    int left = 0;
    int right = (int)strlen(s) - 1;

    printf("원본: %s\\n", s);
    while (left < right) {
        char tmp = s[left];
        s[left] = s[right];
        s[right] = tmp;
        left++;
        right--;
    }
    printf("뒤집기: %s\\n", s);
    return 0;
}
`,
    practice: {
      title: '회문(Palindrome) 판별기',
      difficulty: '입문',
      prompt: '주어진 단어가 앞에서 읽으나 뒤에서 읽으나 같으면 YES, 아니면 NO를 출력하세요.',
      hint: '양 끝 인덱스 i와 len-1-i 문자를 비교합니다.',
      sampleInput: 'level',
      expectedOutput: 'YES',
      starterPython: `word = input().strip()\n# 회문 여부를 판별해 YES 또는 NO를 출력하세요\n`,
      starterC: `#include <stdio.h>\n#include <string.h>\nint main(void) {\n    char s[101];\n    scanf("%100s", s);\n    // 회문 여부를 판별하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-linked-list',
    category: 'data-structure',
    title: '연결 리스트',
    englishTitle: 'Singly Linked List',
    summary: '각 노드가 데이터와 다음 노드의 주소(next 포인터)를 저장하여 동적으로 연결하는 자료구조',
    concept: [
      '노드들이 메모리상 연속되지 않아도 포인터로 연결되므로 크기를 유연하게 늘릴 수 있습니다.',
      '앞쪽(head) 삽입/삭제는 포인터만 변경하면 되므로 O(1)입니다.',
      '특정 인덱스 접근은 head부터 차례대로 따라가야 하므로 O(n) 시간이 걸립니다.',
    ],
    visualKind: 'linked-list',
    complexity: {
      best: 'Head 삽입/삭제 O(1)',
      average: '탐색 O(n)',
      worst: '접근/탐색 O(n)',
      space: 'O(n)',
      note: '포인터 저장을 위한 추가 메모리가 노드마다 필요합니다.',
    },
    defaultInput: '10, 20, 30, 40 | insert 25',
    inputLabel: '초기 노드 값 | 추가 값 (insert 값)',
    inputHint: '예: 10, 20, 30, 40 | insert 25',
    pythonCode: `# 단일 연결 리스트 구현
class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def print_list(head):
    cur = head
    out = []
    while cur:
        out.append(str(cur.val))
        cur = cur.next
    print(" -> ".join(out) + " -> None")

head = None
for v in [40, 30, 20, 10]:
    head = Node(v, head)

print_list(head)
`,
    cCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int val;
    struct Node *next;
} Node;

Node *push_front(Node *head, int val) {
    Node *node = (Node *)malloc(sizeof(Node));
    node->val = val;
    node->next = head;
    return node;
}

int main(void) {
    Node *head = NULL;
    head = push_front(head, 40);
    head = push_front(head, 30);
    head = push_front(head, 20);
    head = push_front(head, 10);

    for (Node *cur = head; cur != NULL; cur = cur->next) {
        printf("%d -> ", cur->val);
    }
    printf("NULL\\n");

    while (head) {
        Node *tmp = head->next;
        free(head);
        head = tmp;
    }
    return 0;
}
`,
    practice: {
      title: '연결 리스트 뒤집기',
      difficulty: '기초',
      prompt: '단일 연결 리스트 1->2->3->4 를 역순 4->3->2->1 로 뒤집어 출력하세요.',
      hint: 'prev, curr, next_node 세 개의 포인터를 사용해 방향을 반대로 바꿉니다.',
      sampleInput: '1 2 3 4',
      expectedOutput: '4 -> 3 -> 2 -> 1 -> None',
      starterPython: `class Node:\n    def __init__(self, val, next=None):\n        self.val = val\n        self.next = next\n\n# 연결 리스트를 만들고 reverse 함수를 작성해 보세요\n`,
      starterC: `#include <stdio.h>\n#include <stdlib.h>\ntypedef struct Node { int val; struct Node *next; } Node;\nint main(void) {\n    // 단일 연결 리스트를 뒤집어 보세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-doubly-linked-list',
    category: 'data-structure',
    title: '이중 연결 리스트',
    englishTitle: 'Doubly Linked List',
    summary: '각 노드가 이전(prev)과 다음(next) 포인터를 모두 가져 양방향 탐색과 O(1) 삭제가 가능한 리스트',
    concept: [
      'prev와 next 두 개의 포인터를 유지하여 앞뒤 어느 방향으로든 순회할 수 있습니다.',
      '삭제할 노드의 참조를 알고 있다면 이전 노드를 탐색할 필요 없이 O(1)에 제거할 수 있습니다.',
      'LRU 캐시, 텍스트 에디터 버퍼, 브라우저 방문 기록 등에 널리 사용됩니다.',
    ],
    visualKind: 'doubly-linked-list',
    complexity: {
      best: '양끝 삽입/삭제 O(1)',
      average: '탐색 O(n)',
      worst: '접근 O(n)',
      space: 'O(n)',
      note: '단일 연결 리스트보다 노드당 포인터 1개만큼 메모리를 더 사용합니다.',
    },
    defaultInput: '10, 20, 30, 40',
    inputLabel: '노드 값 목록 (양방향 생성 및 순회)',
    inputHint: '쉼표로 구분된 정수 입력 (예: 10, 20, 30, 40)',
    pythonCode: `# 이중 연결 리스트 양방향 순회
class DNode:
    def __init__(self, val):
        self.val = val
        self.prev = None
        self.next = None

vals = [10, 20, 30, 40]
head = tail = None
for v in vals:
    node = DNode(v)
    if not head:
        head = tail = node
    else:
        tail.next = node
        node.prev = tail
        tail = node

cur = head
print("정방향:", end=" ")
while cur:
    print(cur.val, end=" <-> ")
    cur = cur.next
print("None")

cur = tail
print("역방향:", end=" ")
while cur:
    print(cur.val, end=" <-> ")
    cur = cur.prev
print("None")
`,
    cCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct DNode {
    int val;
    struct DNode *prev;
    struct DNode *next;
} DNode;

int main(void) {
    int vals[] = {10, 20, 30, 40};
    DNode *head = NULL, *tail = NULL;

    for (int i = 0; i < 4; i++) {
        DNode *n = (DNode *)malloc(sizeof(DNode));
        n->val = vals[i];
        n->prev = tail;
        n->next = NULL;
        if (tail) tail->next = n;
        else head = n;
        tail = n;
    }

    printf("정방향: ");
    for (DNode *c = head; c; c = c->next) printf("%d ", c->val);
    printf("\\n역방향: ");
    for (DNode *c = tail; c; c = c->prev) printf("%d ", c->val);
    printf("\\n");

    while (head) { DNode *t = head->next; free(head); head = t; }
    return 0;
}
`,
    practice: {
      title: '특정 값 노드 삭제하기',
      difficulty: '기초',
      prompt: '이중 연결 리스트에서 지정된 값을 가진 노드를 찾아 prev와 next를 연결해 삭제하세요.',
      hint: 'node.prev.next = node.next 와 node.next.prev = node.prev 를 처리합니다(head/tail 예외 주의).',
      sampleInput: '20',
      expectedOutput: '10 <-> 30 <-> 40',
      starterPython: `# 이중 연결 리스트에서 값 20을 삭제하는 코드를 작성해 보세요\n`,
      starterC: `#include <stdio.h>\n#include <stdlib.h>\nint main(void) {\n    // 이중 연결 리스트 노드 삭제를 구현해 보세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-stack',
    category: 'data-structure',
    title: '스택',
    englishTitle: 'Stack (LIFO)',
    summary: '마지막에 들어온 데이터가 가장 먼저 나가는 후입선출(LIFO) 자료구조',
    concept: [
      '모든 삽입(push)과 삭제(pop)가 한쪽 끝(top)에서만 일어납니다.',
      '함수 호출 스택, 괄호 짝 검사, 실행 취소(Undo), DFS 구현에 필수적입니다.',
      '배열이나 연결 리스트로 간단히 구현할 수 있으며 모든 기본 연산이 O(1)입니다.',
    ],
    visualKind: 'stack',
    complexity: {
      best: 'Push / Pop / Peek O(1)',
      average: 'Push / Pop / Peek O(1)',
      worst: '탐색 O(n)',
      space: 'O(n)',
    },
    defaultInput: 'push 10, push 20, push 30, pop, push 40, pop',
    inputLabel: '스택 연산 시퀀스',
    inputHint: '예: push 10, push 20, pop, push 30',
    pythonCode: `# 스택을 이용한 괄호 유효성 검사
def is_valid_brackets(expr):
    stack = []
    pair = {')': '(', ']': '[', '}': '{'}
    for ch in expr:
        if ch in '([{':
            stack.append(ch)
        elif ch in pair:
            if not stack or stack.pop() != pair[ch]:
                return False
    return len(stack) == 0

for test in ["([]{})", "([)]", "((1+2)*3)"]:
    print(f"{test} -> {is_valid_brackets(test)}")
`,
    cCode: `#include <stdio.h>

#define MAX 64
int stack[MAX];
int top = -1;

void push(int x) { if (top < MAX - 1) stack[++top] = x; }
int pop(void) { return top >= 0 ? stack[top--] : -1; }

int main(void) {
    push(10);
    push(20);
    push(30);
    printf("pop: %d\\n", pop());
    push(40);
    while (top >= 0) {
        printf("pop: %d\\n", pop());
    }
    return 0;
}
`,
    practice: {
      title: '올바른 괄호 문자열 검사',
      difficulty: '기초',
      prompt: '주어진 괄호 문자열((), {}, [])이 올바르게 짝지어졌으면 VALID, 아니면 INVALID를 출력하세요.',
      hint: '여는 괄호는 push, 닫는 괄호는 스택 top과 짝이 맞는지 확인 후 pop 합니다.',
      sampleInput: '({[]})',
      expectedOutput: 'VALID',
      starterPython: `s = input().strip()\n# 스택을 사용해 괄호 짝을 검사하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    char s[200];\n    scanf("%199s", s);\n    // 스택을 이용해 괄호를 검사하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-queue',
    category: 'data-structure',
    title: '큐',
    englishTitle: 'Queue (FIFO)',
    summary: '먼저 들어온 데이터가 먼저 나가는 선입선출(FIFO) 자료구조',
    concept: [
      '뒤쪽(rear)에서 데이터를 삽입(enqueue)하고 앞쪽(front)에서 꺼냅니다(dequeue).',
      '너비 우선 탐색(BFS), 작업 대기열, 프린터 스풀러, 버퍼링에 사용됩니다.',
      'Python에서는 list.pop(0)이 O(n)이므로 collections.deque의 popleft() O(1)를 사용합니다.',
    ],
    visualKind: 'queue',
    complexity: {
      best: 'Enqueue / Dequeue O(1)',
      average: 'Enqueue / Dequeue O(1)',
      worst: '탐색 O(n)',
      space: 'O(n)',
    },
    defaultInput: 'enq 10, enq 20, enq 30, deq, enq 40, deq',
    inputLabel: '큐 연산 시퀀스',
    inputHint: '예: enq 10, enq 20, deq, enq 30',
    pythonCode: `from collections import deque

q = deque()
for x in [10, 20, 30]:
    q.append(x)
    print("enqueue:", x, "->", list(q))

print("dequeue:", q.popleft(), "->", list(q))
q.append(40)
print("enqueue: 40 ->", list(q))
`,
    cCode: `#include <stdio.h>

#define MAX 64
int q[MAX];
int front = 0, rear = 0;

void enqueue(int x) { q[rear++] = x; }
int dequeue(void) { return q[front++]; }

int main(void) {
    enqueue(10);
    enqueue(20);
    enqueue(30);
    printf("dequeue: %d\\n", dequeue());
    enqueue(40);
    while (front < rear) {
        printf("dequeue: %d\\n", dequeue());
    }
    return 0;
}
`,
    practice: {
      title: '카드 마지막 남기기',
      difficulty: '기초',
      prompt: '1부터 N까지 카드가 순서대로 있을 때, 맨 앞 카드를 버리고 그 다음 카드를 맨 뒤로 보내는 과정을 반복해 마지막 남은 카드를 출력하세요.',
      hint: '큐(deque)를 사용해 popleft() 후 다시 popleft()한 값을 append() 합니다.',
      sampleInput: '6',
      expectedOutput: '4',
      starterPython: `from collections import deque\nn = int(input())\n# 마지막 남은 카드를 구해보세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    // 큐를 이용해 마지막 카드를 구해보세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-circular-queue',
    category: 'data-structure',
    title: '원형 큐',
    englishTitle: 'Circular Queue',
    summary: '배열의 끝과 시작을 모듈러(%) 연산으로 연결하여 공간을 재사용하는 고정 크기 큐',
    concept: [
      '일반 배열 큐는 dequeue 후 앞쪽 빈 공간을 재사용하지 못하지만, 원형 큐는 (index + 1) % capacity로 순환합니다.',
      '메모리 재할당 없이 고정 버퍼로 O(1) 삽입/삭제가 가능해 임베디드·네트워크 링 버퍼에 자주 쓰입니다.',
      '비어 있음(count == 0)과 가득 참(count == capacity)을 count 변수 또는 1칸 비워두기로 구분합니다.',
    ],
    visualKind: 'circular-queue',
    complexity: {
      best: 'Enqueue / Dequeue O(1)',
      average: 'Enqueue / Dequeue O(1)',
      worst: 'Enqueue / Dequeue O(1)',
      space: 'O(k) (고정 크기 k)',
    },
    defaultInput: 'cap 6 | enq 10, enq 20, enq 30, deq, enq 40, enq 50, enq 60, deq, enq 70',
    inputLabel: '버퍼 크기 | 원형 큐 연산',
    inputHint: '예: cap 6 | enq 10, enq 20, deq, enq 30',
    pythonCode: `# 원형 큐 (Ring Buffer)
class CircularQueue:
    def __init__(self, cap):
        self.buf = [None] * cap
        self.cap = cap
        self.front = 0
        self.rear = 0
        self.count = 0

    def enqueue(self, val):
        if self.count == self.cap:
            return False
        self.buf[self.rear] = val
        self.rear = (self.rear + 1) % self.cap
        self.count += 1
        return True

    def dequeue(self):
        if self.count == 0:
            return None
        val = self.buf[self.front]
        self.buf[self.front] = None
        self.front = (self.front + 1) % self.cap
        self.count -= 1
        return val

cq = CircularQueue(5)
for v in [10, 20, 30, 40]:
    cq.enqueue(v)
print("dequeue:", cq.dequeue())
cq.enqueue(50)
cq.enqueue(60)
print("버퍼 상태:", cq.buf, "front=", cq.front, "rear=", cq.rear)
`,
    cCode: `#include <stdio.h>

#define CAP 5
int buf[CAP];
int front = 0, rear = 0, count = 0;

int enqueue(int val) {
    if (count == CAP) return 0;
    buf[rear] = val;
    rear = (rear + 1) % CAP;
    count++;
    return 1;
}

int dequeue(void) {
    if (count == 0) return -1;
    int val = buf[front];
    front = (front + 1) % CAP;
    count--;
    return val;
}

int main(void) {
    enqueue(10); enqueue(20); enqueue(30); enqueue(40);
    printf("dequeue: %d\\n", dequeue());
    enqueue(50); enqueue(60);
    while (count > 0) printf("%d ", dequeue());
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '원형 큐 가득 참/비어 있음 처리',
      difficulty: '기초',
      prompt: '크기가 4인 원형 큐에 데이터를 넣고 뺄 때 overflow/underflow를 안전하게 처리하는 함수를 완성하세요.',
      hint: 'rear = (rear + 1) % CAP, front = (front + 1) % CAP 공식을 사용합니다.',
      sampleInput: '1 2 3 4 5',
      expectedOutput: '5는 FULL로 거부됨',
      starterPython: `# 크기 4 원형 큐를 구현해 보세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // 크기 4 원형 큐 구현\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-deque',
    category: 'data-structure',
    title: '덱',
    englishTitle: 'Deque (Double-Ended Queue)',
    summary: '앞(front)과 뒤(rear) 양쪽 끝에서 모두 O(1) 삽입과 삭제가 가능한 자료구조',
    concept: [
      '스택과 큐의 기능을 모두 포함하는 일반화된 선형 자료구조입니다.',
      '슬라이딩 윈도우 최댓값/최솟값, 0-1 BFS, 팰린드롬 검사 등에 매우 효율적입니다.',
      '이중 연결 리스트 또는 원형 버퍼 기반으로 구현합니다.',
    ],
    visualKind: 'deque',
    complexity: {
      best: '양끝 삽입/삭제 O(1)',
      average: '양끝 삽입/삭제 O(1)',
      worst: '임의 탐색 O(n)',
      space: 'O(n)',
    },
    defaultInput: 'push_back 20, push_front 10, push_back 30, push_front 5, pop_back, pop_front',
    inputLabel: '덱 연산 시퀀스',
    inputHint: 'push_front/push_back/pop_front/pop_back 조합',
    pythonCode: `from collections import deque

dq = deque()
dq.append(20)       # 뒤 삽입
dq.appendleft(10)   # 앞 삽입
dq.append(30)
dq.appendleft(5)
print("현재 덱:", list(dq))
print("pop_back:", dq.pop())
print("pop_front:", dq.popleft())
print("남은 덱:", list(dq))
`,
    cCode: `#include <stdio.h>

#define CAP 16
int dq[CAP];
int front = 0, rear = 0, cnt = 0;

void push_back(int x) { dq[rear] = x; rear = (rear + 1) % CAP; cnt++; }
void push_front(int x) { front = (front - 1 + CAP) % CAP; dq[front] = x; cnt++; }
int pop_front(void) { int v = dq[front]; front = (front + 1) % CAP; cnt--; return v; }
int pop_back(void) { rear = (rear - 1 + CAP) % CAP; cnt--; return dq[rear]; }

int main(void) {
    push_back(20);
    push_front(10);
    push_back(30);
    push_front(5);
    printf("pop_back=%d, pop_front=%d\\n", pop_back(), pop_front());
    while (cnt > 0) printf("%d ", pop_front());
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '슬라이딩 윈도우 최댓값',
      difficulty: '중급',
      prompt: '배열 [1, 3, -1, -3, 5, 3, 6, 7]에서 크기 k=3 윈도우의 각 최댓값을 구하세요.',
      hint: '단조 감소 덱(인덱스 저장)을 사용하면 O(n) 시간에 해결할 수 있습니다.',
      sampleInput: '1 3 -1 -3 5 3 6 7',
      expectedOutput: '3 3 5 5 6 7',
      starterPython: `from collections import deque\nnums = [1, 3, -1, -3, 5, 3, 6, 7]\nk = 3\n# 덱을 사용해 각 윈도우의 최댓값을 구하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int nums[] = {1, 3, -1, -3, 5, 3, 6, 7};\n    // 슬라이딩 윈도우 최댓값을 구하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-hash-table',
    category: 'data-structure',
    title: '해시 테이블',
    englishTitle: 'Hash Table',
    summary: '해시 함수로 키를 버킷 인덱스로 변환하여 평균 O(1) 탐색·삽입·삭제를 제공하는 자료구조',
    concept: [
      '키(key)를 해시 함수 h(key) = key % table_size 로 변환해 배열 버킷에 저장합니다.',
      '서로 다른 키가 같은 버킷에 배정되는 충돌(Collision)을 체이닝(Chaining) 또는 개방 주소법으로 해결합니다.',
      'Python의 dict와 set은 내부적으로 고성능 해시 테이블로 구현되어 있습니다.',
    ],
    visualKind: 'hash-table',
    complexity: {
      best: '탐색/삽입/삭제 O(1)',
      average: '탐색/삽입/삭제 O(1)',
      worst: '모든 키 충돌 시 O(n)',
      space: 'O(n)',
      note: '적재율(Load Factor)을 낮게 유지하는 것이 핵심입니다.',
    },
    defaultInput: 'size 7 | 15, 22, 8, 35, 29, 10, 17',
    inputLabel: '버킷 크기 | 삽입할 키 목록 (체이닝)',
    inputHint: '예: size 7 | 15, 22, 8, 35, 29',
    pythonCode: `# 체이닝(Chaining) 기반 해시 테이블 직접 구현
class HashTable:
    def __init__(self, size=7):
        self.size = size
        self.buckets = [[] for _ in range(size)]

    def _hash(self, key):
        return key % self.size

    def insert(self, key):
        idx = self._hash(key)
        if key not in self.buckets[idx]:
            self.buckets[idx].append(key)

    def search(self, key):
        idx = self._hash(key)
        return key in self.buckets[idx]

ht = HashTable(7)
for k in [15, 22, 8, 35, 29, 10, 17]:
    ht.insert(k)

for i, b in enumerate(ht.buckets):
    print(f"버킷 {i}: {b}")
print("29 탐색:", ht.search(29))
`,
    cCode: `#include <stdio.h>
#include <stdlib.h>

#define SIZE 7

typedef struct Node {
    int key;
    struct Node *next;
} Node;

Node *table[SIZE];

void insert_key(int key) {
    int idx = key % SIZE;
    Node *n = (Node *)malloc(sizeof(Node));
    n->key = key;
    n->next = table[idx];
    table[idx] = n;
}

int main(void) {
    int keys[] = {15, 22, 8, 35, 29, 10, 17};
    for (int i = 0; i < 7; i++) insert_key(keys[i]);

    for (int i = 0; i < SIZE; i++) {
        printf("버킷 %d: ", i);
        for (Node *c = table[i]; c; c = c->next) printf("%d -> ", c->key);
        printf("NULL\\n");
    }
    return 0;
}
`,
    practice: {
      title: '두 수의 합 (Two Sum)',
      difficulty: '기초',
      prompt: '배열 [2, 7, 11, 15]에서 합이 9가 되는 두 원소의 인덱스를 해시 테이블로 O(n)에 찾으세요.',
      hint: '이미 본 값을 {값: 인덱스} 딕셔너리에 저장하며 target - num이 있는지 조회합니다.',
      sampleInput: '2 7 11 15\n9',
      expectedOutput: '0 1',
      starterPython: `nums = [2, 7, 11, 15]\ntarget = 9\n# 해시 테이블(dict)을 사용해 O(n)에 해결해 보세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int nums[] = {2, 7, 11, 15}, target = 9;\n    // 두 수의 합 인덱스를 찾아보세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-heap',
    category: 'data-structure',
    title: '힙',
    englishTitle: 'Binary Heap (Min Heap)',
    summary: '완전 이진 트리 형태로 최솟값(또는 최댓값)을 항상 루트에 유지하는 우선순위 큐 자료구조',
    concept: [
      '최소 힙에서는 부모 노드가 항상 자식 노드보다 작거나 같습니다.',
      '배열 인덱스로 부모((i-1)//2), 왼쪽 자식(2*i+1), 오른쪽 자식(2*i+2)을 O(1)에 계산합니다.',
      '삽입 시 sift-up(상향 이동), 루트 삭제 시 sift-down(하향 이동)으로 O(log n)에 힙 속성을 유지합니다.',
    ],
    visualKind: 'heap',
    complexity: {
      best: '최솟값 조회 O(1)',
      average: '삽입/삭제 O(log n)',
      worst: '삽입/삭제 O(log n)',
      space: 'O(n)',
      note: '다익스트라 알고리즘, 힙 정렬, 작업 스케줄러의 핵심입니다.',
    },
    defaultInput: '30, 15, 40, 10, 25, 5, 20',
    inputLabel: '최소 힙에 삽입할 정수 목록',
    inputHint: '쉼표로 구분된 정수 입력 (예: 30, 15, 40, 10, 5)',
    pythonCode: `import heapq

nums = [30, 15, 40, 10, 25, 5, 20]
heap = []
for x in nums:
    heapq.heappush(heap, x)
    print(f"push {x:2d} -> {heap}")

print("최솟값 순서대로 pop:")
while heap:
    print(heapq.heappop(heap), end=" ")
print()
`,
    cCode: `#include <stdio.h>

int heap[64];
int sz = 0;

void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }

void push(int x) {
    int i = sz++;
    heap[i] = x;
    while (i > 0 && heap[(i - 1) / 2] > heap[i]) {
        swap(&heap[(i - 1) / 2], &heap[i]);
        i = (i - 1) / 2;
    }
}

int pop(void) {
    int root = heap[0];
    heap[0] = heap[--sz];
    int i = 0;
    while (1) {
        int l = 2 * i + 1, r = 2 * i + 2, s = i;
        if (l < sz && heap[l] < heap[s]) s = l;
        if (r < sz && heap[r] < heap[s]) s = r;
        if (s == i) break;
        swap(&heap[i], &heap[s]);
        i = s;
    }
    return root;
}

int main(void) {
    int vals[] = {30, 15, 40, 10, 25, 5, 20};
    for (int i = 0; i < 7; i++) push(vals[i]);
    while (sz > 0) printf("%d ", pop());
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: 'K번째로 작은 수 찾기',
      difficulty: '기초',
      prompt: '최소 힙을 사용해 배열에서 K번째로 작은 원소를 출력하세요.',
      hint: '모든 원소를 최소 힙에 넣은 뒤 K번 heappop()을 호출합니다.',
      sampleInput: '7 3\n30 15 40 10 25 5 20',
      expectedOutput: '15',
      starterPython: `import heapq\n# 최소 힙으로 K번째 작은 수를 구하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // 최소 힙으로 K번째 작은 수를 구하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-binary-tree',
    category: 'data-structure',
    title: '이진 트리',
    englishTitle: 'Binary Tree',
    summary: '각 노드가 최대 두 개의 자식(왼쪽, 오른쪽)을 가지는 계층적 트리 자료구조',
    concept: [
      '루트(Root)에서 시작하여 왼쪽 서브트리와 오른쪽 서브트리로 재귀적으로 구성됩니다.',
      '전위(Preorder: 루트-왼-오), 중위(Inorder: 왼-루트-오), 후위(Postorder: 왼-오-루트), 레벨 순회(BFS)가 대표적입니다.',
      '수식 트리, 허프만 코딩, 의사결정 트리 등 계층 구조 표현에 활용됩니다.',
    ],
    visualKind: 'tree',
    complexity: {
      best: '순회 O(n)',
      average: '순회 O(n)',
      worst: '탐색 O(n)',
      space: 'O(h) (트리 높이 h)',
    },
    defaultInput: '1, 2, 3, 4, 5, 6, 7 | inorder',
    inputLabel: '레벨 순서 노드 | 순회 방식 (preorder / inorder / postorder)',
    inputHint: '예: 1, 2, 3, 4, 5, 6, 7 | inorder',
    pythonCode: `# 이진 트리 구성 및 3가지 깊이 우선 순회
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3, TreeNode(6), TreeNode(7)))

def preorder(n):
    return [n.val] + preorder(n.left) + preorder(n.right) if n else []

def inorder(n):
    return inorder(n.left) + [n.val] + inorder(n.right) if n else []

def postorder(n):
    return postorder(n.left) + postorder(n.right) + [n.val] if n else []

print("전위(Preorder):", preorder(root))
print("중위(Inorder):", inorder(root))
print("후위(Postorder):", postorder(root))
`,
    cCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct TreeNode {
    int val;
    struct TreeNode *left, *right;
} TreeNode;

TreeNode *make_node(int v, TreeNode *l, TreeNode *r) {
    TreeNode *n = (TreeNode *)malloc(sizeof(TreeNode));
    n->val = v; n->left = l; n->right = r;
    return n;
}

void inorder(TreeNode *n) {
    if (!n) return;
    inorder(n->left);
    printf("%d ", n->val);
    inorder(n->right);
}

int main(void) {
    TreeNode *root = make_node(1,
        make_node(2, make_node(4, NULL, NULL), make_node(5, NULL, NULL)),
        make_node(3, make_node(6, NULL, NULL), make_node(7, NULL, NULL)));
    printf("중위 순회: ");
    inorder(root);
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '이진 트리의 최대 높이 구하기',
      difficulty: '기초',
      prompt: '주어진 이진 트리의 최대 깊이(높이)를 재귀 함수로 계산하세요.',
      hint: 'height(node) = 0 if node is None else 1 + max(height(left), height(right))',
      sampleInput: '1 2 3 4 5 6 7',
      expectedOutput: '3',
      starterPython: `# 이진 트리의 높이를 계산하는 재귀 함수를 작성하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // 이진 트리의 최대 높이를 재귀로 구하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-bst',
    category: 'data-structure',
    title: '이진 탐색 트리',
    englishTitle: 'Binary Search Tree (BST)',
    summary: '왼쪽 서브트리는 작은 값, 오른쪽 서브트리는 큰 값을 유지해 빠른 탐색을 지원하는 트리',
    concept: [
      '모든 노드에 대해 (왼쪽 자식들 < 현재 노드 < 오른쪽 자식들) 불변식을 유지합니다.',
      'BST를 중위 순회(Inorder)하면 항상 오름차순으로 정렬된 결과를 얻습니다.',
      '균형이 잡히면 탐색·삽입·삭제가 O(log n)이지만, 편향 트리가 되면 O(n)으로 저하됩니다.',
    ],
    visualKind: 'tree',
    complexity: {
      best: 'O(log n)',
      average: 'O(log n)',
      worst: '편향 트리 시 O(n)',
      space: 'O(n)',
    },
    defaultInput: '50, 30, 70, 20, 40, 60, 80 | search 40',
    inputLabel: '삽입 순서 | 탐색 값 (search 값)',
    inputHint: '예: 50, 30, 70, 20, 40, 60 | search 40',
    pythonCode: `# 이진 탐색 트리(BST) 삽입 및 탐색
class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None

def insert(root, key):
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
    elif key > root.key:
        root.right = insert(root.right, key)
    return root

def search(root, key):
    cur = root
    while cur:
        if key == cur.key:
            return True
        cur = cur.left if key < cur.key else cur.right
    return False

root = None
for k in [50, 30, 70, 20, 40, 60, 80]:
    root = insert(root, k)

print("40 탐색:", search(root, 40))
print("55 탐색:", search(root, 55))
`,
    cCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key;
    struct Node *left, *right;
} Node;

Node *insert(Node *root, int key) {
    if (!root) {
        Node *n = (Node *)malloc(sizeof(Node));
        n->key = key; n->left = n->right = NULL;
        return n;
    }
    if (key < root->key) root->left = insert(root->left, key);
    else if (key > root->key) root->right = insert(root->right, key);
    return root;
}

int search(Node *root, int key) {
    while (root) {
        if (key == root->key) return 1;
        root = (key < root->key) ? root->left : root->right;
    }
    return 0;
}

int main(void) {
    Node *root = NULL;
    int vals[] = {50, 30, 70, 20, 40, 60, 80};
    for (int i = 0; i < 7; i++) root = insert(root, vals[i]);
    printf("40 탐색: %d, 55 탐색: %d\\n", search(root, 40), search(root, 55));
    return 0;
}
`,
    practice: {
      title: 'BST에서 최솟값과 최댓값 찾기',
      difficulty: '입문',
      prompt: '이진 탐색 트리에서 가장 작은 값과 가장 큰 값을 O(h) 시간에 찾으세요.',
      hint: '최솟값은 왼쪽 자식이 없을 때까지, 최댓값은 오른쪽 자식이 없을 때까지 이동합니다.',
      sampleInput: '50 30 70 20 40 60 80',
      expectedOutput: 'min=20, max=80',
      starterPython: `# BST에서 min_key, max_key 함수를 작성해 보세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // BST 최솟값/최댓값 탐색\n    return 0;\n}\n`,
    },
  },
  {
    id: 'ds-graph',
    category: 'data-structure',
    title: '그래프',
    englishTitle: 'Graph (Adjacency List)',
    summary: '정점(Vertex)과 간선(Edge)의 집합으로 도로망, SNS, 의존성 등 복잡한 관계를 표현하는 자료구조',
    concept: [
      '인접 리스트(Adjacency List)는 공간 O(V + E)로 희소 그래프에 효율적입니다.',
      '인접 행렬(Adjacency Matrix)은 두 정점 연결 확인이 O(1)이지만 공간 O(V²)가 필요합니다.',
      '방향/무방향, 가중치/비가중치 여부에 따라 다양한 그래프 알고리즘(DFS, BFS, 다익스트라)을 적용합니다.',
    ],
    visualKind: 'graph',
    complexity: {
      best: '인접 행렬 간선 확인 O(1)',
      average: '인접 리스트 전체 순회 O(V + E)',
      worst: '인접 행렬 전체 순회 O(V²)',
      space: '인접 리스트 O(V + E)',
    },
    defaultInput: '0-1, 0-2, 1-3, 1-4, 2-4, 3-5, 4-5',
    inputLabel: '무방향 간선 목록 (u-v)',
    inputHint: '예: 0-1, 0-2, 1-3, 2-4, 3-5',
    pythonCode: `# 인접 리스트로 무방향 그래프 표현
edges = [(0, 1), (0, 2), (1, 3), (1, 4), (2, 4), (3, 5), (4, 5)]
graph = {i: [] for i in range(6)}

for u, v in edges:
    graph[u].append(v)
    graph[v].append(u)

for node, neighbors in graph.items():
    print(f"정점 {node}의 이웃: {neighbors}")
`,
    cCode: `#include <stdio.h>

#define V 6
int adj[V][V];

int main(void) {
    int edges[][2] = {{0,1},{0,2},{1,3},{1,4},{2,4},{3,5},{4,5}};
    for (int i = 0; i < 7; i++) {
        int u = edges[i][0], v = edges[i][1];
        adj[u][v] = adj[v][u] = 1;
    }

    for (int i = 0; i < V; i++) {
        printf("정점 %d 이웃: ", i);
        for (int j = 0; j < V; j++) {
            if (adj[i][j]) printf("%d ", j);
        }
        printf("\\n");
    }
    return 0;
}
`,
    practice: {
      title: '각 정점의 차수(Degree) 계산',
      difficulty: '입문',
      prompt: '무방향 그래프의 간선 목록이 주어질 때 각 정점에 연결된 간선 개수(차수)를 출력하세요.',
      hint: '간선 (u, v)마다 degree[u] += 1, degree[v] += 1 을 수행합니다.',
      sampleInput: '4 4\n0 1\n0 2\n1 2\n2 3',
      expectedOutput: '0:2 1:2 2:3 3:1',
      starterPython: `# 각 정점의 차수를 계산해 출력해 보세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // 정점별 차수를 계산하세요\n    return 0;\n}\n`,
    },
  },
];
