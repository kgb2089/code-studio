import type { LearningTopic } from '../types/learning';

export const ALGORITHM_TOPICS: LearningTopic[] = [
  {
    id: 'algo-linear-search',
    category: 'algorithm',
    title: '선형 탐색',
    englishTitle: 'Linear Search',
    summary: '배열의 첫 번째 원소부터 마지막 원소까지 순서대로 목표 값을 확인하는 가장 기본적인 탐색',
    concept: [
      '데이터가 정렬되어 있지 않아도 바로 사용할 수 있습니다.',
      '목표 값을 찾으면 즉시 인덱스를 반환하고, 끝까지 없으면 -1을 반환합니다.',
      '데이터 크기가 작거나 한 번만 탐색할 때 단순하고 효과적입니다.',
    ],
    visualKind: 'array',
    complexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    defaultInput: '14, 7, 29, 3, 18, 42, 11 | target 18',
    inputLabel: '배열 | 찾을 값 (target 값)',
    inputHint: '예: 14, 7, 29, 3, 18, 42 | target 18',
    pythonCode: `def linear_search(arr, target):
    for i, val in enumerate(arr):
        if val == target:
            return i
    return -1

arr = [14, 7, 29, 3, 18, 42, 11]
target = 18
idx = linear_search(arr, target)
print(f"target={target} -> 인덱스: {idx}")
`,
    cCode: `#include <stdio.h>

int linear_search(const int *arr, int n, int target) {
    for (int i = 0; i < n; i++) {
        if (arr[i] == target) return i;
    }
    return -1;
}

int main(void) {
    int arr[] = {14, 7, 29, 3, 18, 42, 11};
    int idx = linear_search(arr, 7, 18);
    printf("target=18 -> 인덱스: %d\\n", idx);
    return 0;
}
`,
    practice: {
      title: '특정 값의 모든 위치 찾기',
      difficulty: '입문',
      prompt: '배열에서 target과 같은 원소가 등장하는 모든 인덱스를 출력하세요.',
      hint: '발견해도 즉시 return 하지 않고 결과 목록에 추가합니다.',
      sampleInput: '5 2 5 8 5\n5',
      expectedOutput: '0 2 4',
      starterPython: `arr = [5, 2, 5, 8, 5]\ntarget = 5\n# 모든 인덱스를 찾아 출력하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int arr[] = {5, 2, 5, 8, 5}, target = 5;\n    // 모든 인덱스를 출력하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-binary-search',
    category: 'algorithm',
    title: '이진 탐색',
    englishTitle: 'Binary Search',
    summary: '정렬된 배열의 가운데 원소와 비교해 탐색 범위를 매 단계 절반으로 줄이는 고속 탐색',
    concept: [
      '반드시 오름차순(또는 내림차순)으로 정렬된 배열에서만 사용할 수 있습니다.',
      '매 비교마다 남은 후보가 절반으로 줄어 100만 개 데이터도 최대 20번 비교 안에 찾을 수 있습니다.',
      'mid = left + (right - left) // 2 를 사용하면 C언어에서 정수 오버플로우를 방지할 수 있습니다.',
    ],
    visualKind: 'array',
    complexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
    defaultInput: '3, 9, 14, 21, 28, 35, 42, 56, 68 | target 35',
    inputLabel: '정렬된 배열 | 찾을 값 (target 값)',
    inputHint: '예: 3, 9, 14, 21, 28, 35, 42 | target 35',
    pythonCode: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

arr = [3, 9, 14, 21, 28, 35, 42, 56, 68]
print("35 위치:", binary_search(arr, 35))
`,
    cCode: `#include <stdio.h>

int binary_search(const int *arr, int n, int target) {
    int left = 0, right = n - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

int main(void) {
    int arr[] = {3, 9, 14, 21, 28, 35, 42, 56, 68};
    printf("35 위치: %d\\n", binary_search(arr, 9, 35));
    return 0;
}
`,
    practice: {
      title: 'Lower Bound 구현하기',
      difficulty: '기초',
      prompt: '정렬된 배열에서 target 이상인 값이 처음 등장하는 인덱스를 이진 탐색으로 찾으세요.',
      hint: 'arr[mid] >= target 이면 right = mid, 아니면 left = mid + 1 로 범위를 좁힙니다.',
      sampleInput: '1 3 3 3 5 7\n3',
      expectedOutput: '1',
      starterPython: `arr = [1, 3, 3, 3, 5, 7]\ntarget = 3\n# lower_bound를 구현해 보세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int arr[] = {1, 3, 3, 3, 5, 7}, target = 3;\n    // lower_bound를 구현해 보세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-bubble-sort',
    category: 'algorithm',
    title: '버블 정렬',
    englishTitle: 'Bubble Sort',
    summary: '인접한 두 원소를 비교해 크기가 뒤바뀌어 있으면 교환하며 큰 값을 끝으로 보내는 정렬',
    concept: [
      '한 번의 패스(Pass)가 끝날 때마다 가장 큰 원소가 배열 맨 뒤 확정 위치에 놓입니다.',
      '구현이 매우 단순하고 안정 정렬(Stable Sort)이며 제자리(In-place)에서 동작합니다.',
      '이미 정렬된 배열에서 교환이 발생하지 않으면 조기 종료하여 최선 O(n)까지 개선할 수 있습니다.',
    ],
    visualKind: 'bars',
    complexity: { best: 'O(n) (조기 종료 시)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    defaultInput: '38, 19, 45, 12, 27, 8, 33',
    inputLabel: '정렬할 정수 배열',
    inputHint: '쉼표로 구분된 숫자 (최대 15개 권장)',
    pythonCode: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

nums = [38, 19, 45, 12, 27, 8, 33]
print("정렬 결과:", bubble_sort(nums))
`,
    cCode: `#include <stdio.h>

int main(void) {
    int arr[] = {38, 19, 45, 12, 27, 8, 33};
    int n = 7;
    for (int i = 0; i < n - 1; i++) {
        int swapped = 0;
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;
                swapped = 1;
            }
        }
        if (!swapped) break;
    }
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '내림차순 버블 정렬과 교환 횟수 세기',
      difficulty: '입문',
      prompt: '배열을 내림차순으로 버블 정렬하고 총 교환(swap) 횟수를 함께 출력하세요.',
      hint: '비교 조건을 arr[j] < arr[j + 1]로 바꾸고 swap할 때마다 count를 1 증가시킵니다.',
      sampleInput: '4 1 3 2',
      expectedOutput: '4 3 2 1 (교환: 4회)',
      starterPython: `arr = [4, 1, 3, 2]\n# 내림차순 버블 정렬과 교환 횟수를 출력하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int arr[] = {4, 1, 3, 2};\n    // 내림차순 버블 정렬\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-selection-sort',
    category: 'algorithm',
    title: '선택 정렬',
    englishTitle: 'Selection Sort',
    summary: '정렬되지 않은 구간에서 최솟값을 찾아 현재 맨 앞 원소와 교환하는 정렬',
    concept: [
      '매 단계마다 최솟값의 인덱스(min_idx)를 찾고 단 한 번만 교환(swap)합니다.',
      '총 교환 횟수가 최대 n-1번으로 매우 적어 쓰기(write) 비용이 큰 환경에 유리합니다.',
      '비교 횟수는 항상 n(n-1)/2번이므로 최선/최악 모두 O(n²)이며 불안정 정렬입니다.',
    ],
    visualKind: 'bars',
    complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    defaultInput: '29, 10, 14, 37, 13, 22, 6',
    inputLabel: '정렬할 정수 배열',
    inputHint: '쉼표로 구분된 숫자',
    pythonCode: `def selection_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr

print("정렬 결과:", selection_sort([29, 10, 14, 37, 13, 22, 6]))
`,
    cCode: `#include <stdio.h>

int main(void) {
    int arr[] = {29, 10, 14, 37, 13, 22, 6};
    int n = 7;
    for (int i = 0; i < n - 1; i++) {
        int min_idx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[min_idx]) min_idx = j;
        }
        int tmp = arr[i];
        arr[i] = arr[min_idx];
        arr[min_idx] = tmp;
    }
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: 'K단계 후의 선택 정렬 상태 출력',
      difficulty: '입문',
      prompt: '선택 정렬을 딱 3단계만 수행했을 때 배열의 중간 상태를 출력하세요.',
      hint: '바깥 반복문 i가 2일 때(3번째 패스 완료 후) 배열을 출력합니다.',
      sampleInput: '29 10 14 37 13',
      expectedOutput: '10 13 14 37 29',
      starterPython: `arr = [29, 10, 14, 37, 13]\n# 3단계 후의 상태를 출력하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int arr[] = {29, 10, 14, 37, 13};\n    // 3단계 후 상태를 출력하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-insertion-sort',
    category: 'algorithm',
    title: '삽입 정렬',
    englishTitle: 'Insertion Sort',
    summary: '앞쪽 정렬된 구간에 새 원소(key)를 알맞은 위치에 끼워 넣으며 정렬하는 알고리즘',
    concept: [
      '손에 든 카드를 정렬하는 방식과 동일하며, 거의 정렬된 데이터에서 O(n)에 가깝게 매우 빠릅니다.',
      '안정 정렬(Stable Sort)이며 작은 배열(n <= 32)에서는 퀵/병합 정렬의 보조 정렬로도 쓰입니다.',
      'key보다 큰 원소들을 오른쪽으로 한 칸씩 밀어 자리를 만든 뒤 key를 삽입합니다.',
    ],
    visualKind: 'bars',
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    defaultInput: '24, 15, 31, 9, 18, 42, 12',
    inputLabel: '정렬할 정수 배열',
    inputHint: '쉼표로 구분된 숫자',
    pythonCode: `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

print("정렬 결과:", insertion_sort([24, 15, 31, 9, 18, 42, 12]))
`,
    cCode: `#include <stdio.h>

int main(void) {
    int arr[] = {24, 15, 31, 9, 18, 42, 12};
    int n = 7;
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '거의 정렬된 배열에서 이동 횟수 비교',
      difficulty: '기초',
      prompt: '삽입 정렬에서 원소 이동(shift)이 몇 번 일어나는지 카운트해 출력하세요.',
      hint: 'while 루프 내부에서 arr[j+1] = arr[j]가 실행될 때마다 shifts += 1 합니다.',
      sampleInput: '1 2 4 3 5',
      expectedOutput: '정렬: 1 2 3 4 5, 이동: 1회',
      starterPython: `arr = [1, 2, 4, 3, 5]\n# 이동 횟수를 세어 보세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int arr[] = {1, 2, 4, 3, 5};\n    // 이동 횟수를 세어 보세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-merge-sort',
    category: 'algorithm',
    title: '병합 정렬',
    englishTitle: 'Merge Sort',
    summary: '배열을 절반으로 분할한 뒤 각각 정렬하고 두 정렬된 배열을 하나로 병합하는 분할 정복 정렬',
    concept: [
      '분할(Divide) → 정복(Conquer) → 병합(Combine)의 전형적인 분할 정복 알고리즘입니다.',
      '최악의 경우에도 항상 O(n log n)을 보장하는 안정 정렬(Stable Sort)입니다.',
      '병합을 위한 O(n) 크기의 임시 배열 공간이 추가로 필요합니다.',
    ],
    visualKind: 'bars',
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
    defaultInput: '38, 27, 43, 3, 9, 82, 10',
    inputLabel: '정렬할 정수 배열',
    inputHint: '쉼표로 구분된 숫자',
    pythonCode: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
    return merged + left[i:] + right[j:]

print("정렬 결과:", merge_sort([38, 27, 43, 3, 9, 82, 10]))
`,
    cCode: `#include <stdio.h>

void merge(int *a, int l, int m, int r) {
    int tmp[64], i = l, j = m + 1, k = 0;
    while (i <= m && j <= r) tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i <= m) tmp[k++] = a[i++];
    while (j <= r) tmp[k++] = a[j++];
    for (int t = 0; t < k; t++) a[l + t] = tmp[t];
}

void merge_sort(int *a, int l, int r) {
    if (l >= r) return;
    int m = l + (r - l) / 2;
    merge_sort(a, l, m);
    merge_sort(a, m + 1, r);
    merge(a, l, m, r);
}

int main(void) {
    int a[] = {38, 27, 43, 3, 9, 82, 10};
    merge_sort(a, 0, 6);
    for (int i = 0; i < 7; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '두 정렬 배열 병합하기',
      difficulty: '기초',
      prompt: '이미 정렬된 두 배열 A, B를 O(n + m) 시간에 하나의 정렬된 배열로 합치세요.',
      hint: '두 인덱스 i, j를 비교해 더 작은 값을 결과 배열에 추가합니다.',
      sampleInput: '1 4 7\n2 3 8 9',
      expectedOutput: '1 2 3 4 7 8 9',
      starterPython: `a = [1, 4, 7]\nb = [2, 3, 8, 9]\n# 두 정렬 배열을 병합하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int a[] = {1, 4, 7}, b[] = {2, 3, 8, 9};\n    // 두 배열을 병합하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-quick-sort',
    category: 'algorithm',
    title: '퀵 정렬',
    englishTitle: 'Quick Sort',
    summary: '피벗(Pivot)을 기준으로 작은 값은 왼쪽, 큰 값은 오른쪽으로 분할(Partition)하며 정렬하는 고속 알고리즘',
    concept: [
      '평균 O(n log n)이며 캐시 효율이 뛰어나 실무에서 가장 빠른 범용 정렬 중 하나입니다.',
      '추가 배열 없이 제자리(In-place)에서 동작하지만, 피벗이 계속 최솟값/최댓값이면 최악 O(n²)이 됩니다.',
      'Lomuto 분할 또는 Hoare 분할 방식으로 구현합니다.',
    ],
    visualKind: 'bars',
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
    defaultInput: '35, 12, 48, 7, 25, 19, 41, 22',
    inputLabel: '정렬할 정수 배열',
    inputHint: '쉼표로 구분된 숫자',
    pythonCode: `def quick_sort(arr, low, high):
    if low < high:
        pivot = arr[high]
        i = low - 1
        for j in range(low, high):
            if arr[j] <= pivot:
                i += 1
                arr[i], arr[j] = arr[j], arr[i]
        arr[i + 1], arr[high] = arr[high], arr[i + 1]
        p = i + 1
        quick_sort(arr, low, p - 1)
        quick_sort(arr, p + 1, high)

nums = [35, 12, 48, 7, 25, 19, 41, 22]
quick_sort(nums, 0, len(nums) - 1)
print("정렬 결과:", nums)
`,
    cCode: `#include <stdio.h>

void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }

int partition(int *a, int lo, int hi) {
    int pivot = a[hi], i = lo - 1;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) {
            i++;
            swap(&a[i], &a[j]);
        }
    }
    swap(&a[i + 1], &a[hi]);
    return i + 1;
}

void quick_sort(int *a, int lo, int hi) {
    if (lo < hi) {
        int p = partition(a, lo, hi);
        quick_sort(a, lo, p - 1);
        quick_sort(a, p + 1, hi);
    }
}

int main(void) {
    int a[] = {35, 12, 48, 7, 25, 19, 41, 22};
    quick_sort(a, 0, 7);
    for (int i = 0; i < 8; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: 'Quickselect로 K번째 작은 원소 찾기',
      difficulty: '중급',
      prompt: 'Partition 함수를 활용해 전체를 정렬하지 않고 평균 O(n) 시간에 K번째 작은 수를 찾으세요.',
      hint: '분할 후 피벗 인덱스 p가 k-1보다 크면 왼쪽만, 작으면 오른쪽만 재귀 호출합니다.',
      sampleInput: '7 10 4 3 20 15\n3',
      expectedOutput: '7',
      starterPython: `arr = [7, 10, 4, 3, 20, 15]\nk = 3\n# Quickselect를 구현해 보세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int arr[] = {7, 10, 4, 3, 20, 15};\n    // Quickselect 구현\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-heap-sort',
    category: 'algorithm',
    title: '힙 정렬',
    englishTitle: 'Heap Sort',
    summary: '최대 힙(Max Heap)을 구성한 뒤 루트(최댓값)를 끝 원소와 교환하며 크기를 줄여가는 정렬',
    concept: [
      '1단계: 주어진 배열을 O(n) 시간에 최대 힙으로 구성합니다(Build-Max-Heap).',
      '2단계: 루트(최댓값)와 힙의 마지막 원소를 교환하고 힙 크기를 1 줄인 뒤 heapify를 반복합니다.',
      '최악의 경우에도 O(n log n)을 보장하면서 추가 메모리가 O(1)인 제자리 정렬입니다.',
    ],
    visualKind: 'bars',
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
    defaultInput: '19, 36, 12, 45, 8, 27, 31',
    inputLabel: '정렬할 정수 배열',
    inputHint: '쉼표로 구분된 숫자',
    pythonCode: `def heapify(arr, n, i):
    largest = i
    l, r = 2 * i + 1, 2 * i + 2
    if l < n and arr[l] > arr[largest]: largest = l
    if r < n and arr[r] > arr[largest]: largest = r
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)

def heap_sort(arr):
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]
        heapify(arr, i, 0)
    return arr

print("정렬 결과:", heap_sort([19, 36, 12, 45, 8, 27, 31]))
`,
    cCode: `#include <stdio.h>

void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }

void heapify(int *a, int n, int i) {
    int lg = i, l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && a[l] > a[lg]) lg = l;
    if (r < n && a[r] > a[lg]) lg = r;
    if (lg != i) {
        swap(&a[i], &a[lg]);
        heapify(a, n, lg);
    }
}

int main(void) {
    int a[] = {19, 36, 12, 45, 8, 27, 31}, n = 7;
    for (int i = n / 2 - 1; i >= 0; i--) heapify(a, n, i);
    for (int i = n - 1; i > 0; i--) {
        swap(&a[0], &a[i]);
        heapify(a, i, 0);
    }
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '최소 힙을 이용한 내림차순 힙 정렬',
      difficulty: '기초',
      prompt: '최소 힙(Min Heap)을 사용해 배열을 내림차순으로 정렬해 보세요.',
      hint: 'heapify에서 더 작은 자식을 선택하도록 부등호 방향을 바꿉니다.',
      sampleInput: '19 36 12 45 8',
      expectedOutput: '45 36 19 12 8',
      starterPython: `arr = [19, 36, 12, 45, 8]\n# 최소 힙으로 내림차순 힙 정렬을 구현하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int a[] = {19, 36, 12, 45, 8};\n    // 최소 힙 내림차순 정렬\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-recursion',
    category: 'algorithm',
    title: '재귀',
    englishTitle: 'Recursion',
    summary: '함수가 자기 자신을 더 작은 부분 문제로 호출하여 문제를 해결하는 프로그래밍 기법',
    concept: [
      '모든 재귀 함수는 반드시 종료 조건(Base Case)과 문제 크기를 줄이는 재귀 호출(Recursive Step)을 가져야 합니다.',
      '각 호출은 시스템 호출 스택(Call Stack)에 프레임을 쌓고, 종료 조건에 도달하면 역순으로 반환(Unwinding)됩니다.',
      '트리 순회, 분할 정복, DFS, 백트래킹의 핵심 기초입니다.',
    ],
    visualKind: 'recursion',
    complexity: { best: 'O(n) (팩토리얼)', average: 'O(n) / O(2^n) (단순 피보나치)', worst: 'O(2^n)', space: 'O(n) (호출 스택)' },
    defaultInput: '5',
    inputLabel: '팩토리얼 n 값 (1~7)',
    inputHint: '1에서 7 사이의 정수 입력',
    pythonCode: `def factorial(n):
    print(f"호출: factorial({n})")
    if n <= 1:
        print(f"종료 조건 도달: factorial({n}) = 1")
        return 1
    res = n * factorial(n - 1)
    print(f"반환: factorial({n}) = {res}")
    return res

print("최종 결과:", factorial(5))
`,
    cCode: `#include <stdio.h>

int factorial(int n) {
    printf("호출: factorial(%d)\\n", n);
    if (n <= 1) return 1;
    int res = n * factorial(n - 1);
    printf("반환: factorial(%d) = %d\\n", n, res);
    return res;
}

int main(void) {
    printf("최종 결과: %d\\n", factorial(5));
    return 0;
}
`,
    practice: {
      title: '재귀로 거듭제곱 a^b 계산하기',
      difficulty: '기초',
      prompt: '분할 정복 재귀를 이용해 a^b를 O(log b) 시간에 계산하세요.',
      hint: 'half = power(a, b // 2); 짝수면 half*half, 홀수면 half*half*a 반환',
      sampleInput: '2 10',
      expectedOutput: '1024',
      starterPython: `def power(a, b):\n    # O(log b) 재귀 거듭제곱을 작성하세요\n    pass\nprint(power(2, 10))\n`,
      starterC: `#include <stdio.h>\nlong long power(long long a, int b) {\n    // O(log b) 재귀 거듭제곱\n    return 1;\n}\nint main(void) { printf("%lld\\n", power(2, 10)); return 0; }\n`,
    },
  },
  {
    id: 'algo-dfs',
    category: 'algorithm',
    title: 'DFS (깊이 우선 탐색)',
    englishTitle: 'Depth-First Search',
    summary: '한 분기를 끝까지 깊게 탐색한 뒤 막히면 되돌아가(Backtrack) 다음 분기를 탐색하는 그래프 알고리즘',
    concept: [
      '재귀 함수(호출 스택) 또는 명시적 스택(Stack)을 사용해 구현합니다.',
      '방문 배열(visited)로 이미 방문한 정점을 재방문하지 않도록 무한 루프를 방지합니다.',
      '연결 요소 찾기, 사이클 검출, 위상 정렬, 미로 경로 탐색에 활용됩니다.',
    ],
    visualKind: 'graph',
    complexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
    defaultInput: '0-1, 0-2, 1-3, 1-4, 2-5, 4-5 | start 0',
    inputLabel: '간선 목록 | 시작 정점',
    inputHint: '예: 0-1, 0-2, 1-3, 1-4, 2-5 | start 0',
    pythonCode: `graph = {0: [1, 2], 1: [0, 3, 4], 2: [0, 5], 3: [1], 4: [1, 5], 5: [2, 4]}
visited = set()
order = []

def dfs(u):
    visited.add(u)
    order.append(u)
    for v in graph[u]:
        if v not in visited:
            dfs(v)

dfs(0)
print("DFS 방문 순서:", order)
`,
    cCode: `#include <stdio.h>

#define V 6
int adj[V][V];
int visited[V];

void dfs(int u) {
    visited[u] = 1;
    printf("%d ", u);
    for (int v = 0; v < V; v++) {
        if (adj[u][v] && !visited[v]) dfs(v);
    }
}

int main(void) {
    int edges[][2] = {{0,1},{0,2},{1,3},{1,4},{2,5},{4,5}};
    for (int i = 0; i < 6; i++) adj[edges[i][0]][edges[i][1]] = adj[edges[i][1]][edges[i][0]] = 1;
    printf("DFS 방문 순서: ");
    dfs(0);
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '연결 요소(Connected Component) 개수 세기',
      difficulty: '기초',
      prompt: '정점 0~5와 간선이 주어질 때 서로 분리된 그래프 덩어리가 몇 개인지 DFS로 구하세요.',
      hint: '모든 정점을 돌며 visited[i]가 False일 때마다 count += 1 하고 dfs(i)를 호출합니다.',
      sampleInput: '6 3\n0 1\n1 2\n3 4',
      expectedOutput: '3',
      starterPython: `# 연결 요소의 개수를 DFS로 구하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // 연결 요소 개수를 DFS로 구하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-bfs',
    category: 'algorithm',
    title: 'BFS (너비 우선 탐색)',
    englishTitle: 'Breadth-First Search',
    summary: '시작 정점에서 가까운 정점부터 층(레벨) 순서대로 큐를 이용해 탐색하는 알고리즘',
    concept: [
      '큐(Queue)를 사용하여 현재 정점의 모든 미방문 이웃을 순서대로 대기열에 넣습니다.',
      '간선 가중치가 모두 1인 비가중치 그래프에서 시작 정점으로부터 최단 거리(최소 간선 수)를 보장합니다.',
      '미로 최단 경로, 소셜 네트워크 촌수 계산, 레벨 순회에 핵심적으로 쓰입니다.',
    ],
    visualKind: 'graph',
    complexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
    defaultInput: '0-1, 0-2, 1-3, 1-4, 2-5, 4-5 | start 0',
    inputLabel: '간선 목록 | 시작 정점',
    inputHint: '예: 0-1, 0-2, 1-3, 1-4, 2-5 | start 0',
    pythonCode: `from collections import deque

graph = {0: [1, 2], 1: [0, 3, 4], 2: [0, 5], 3: [1], 4: [1, 5], 5: [2, 4]}
dist = {0: 0}
q = deque([0])
order = []

while q:
    u = q.popleft()
    order.append(u)
    for v in graph[u]:
        if v not in dist:
            dist[v] = dist[u] + 1
            q.append(v)

print("BFS 방문 순서:", order)
print("최단 거리:", dist)
`,
    cCode: `#include <stdio.h>

#define V 6
int adj[V][V];
int dist[V];

int main(void) {
    int edges[][2] = {{0,1},{0,2},{1,3},{1,4},{2,5},{4,5}};
    for (int i = 0; i < 6; i++) adj[edges[i][0]][edges[i][1]] = adj[edges[i][1]][edges[i][0]] = 1;
    for (int i = 0; i < V; i++) dist[i] = -1;

    int q[V], head = 0, tail = 0;
    dist[0] = 0;
    q[tail++] = 0;

    printf("BFS 방문 순서: ");
    while (head < tail) {
        int u = q[head++];
        printf("%d(거리 %d) ", u, dist[u]);
        for (int v = 0; v < V; v++) {
            if (adj[u][v] && dist[v] == -1) {
                dist[v] = dist[u] + 1;
                q[tail++] = v;
            }
        }
    }
    printf("\\n");
    return 0;
}
`,
    practice: {
      title: '두 정점 사이 최단 거리 구하기',
      difficulty: '기초',
      prompt: '비가중치 그래프에서 정점 0에서 정점 5까지의 최소 이동 간선 수를 BFS로 구하세요.',
      hint: 'dist[v] = dist[u] + 1 로 거리를 기록하다가 목표 정점에 도달하면 출력합니다.',
      sampleInput: '0 -> 5',
      expectedOutput: '2',
      starterPython: `# BFS로 정점 0에서 5까지의 최단 거리를 구하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // BFS 최단 거리 구하기\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-dijkstra',
    category: 'algorithm',
    title: '다익스트라 알고리즘',
    englishTitle: "Dijkstra's Shortest Path",
    summary: '음이 아닌 가중치 그래프에서 시작 정점으로부터 모든 정점까지의 최단 경로를 구하는 알고리즘',
    concept: [
      '아직 확정되지 않은 정점 중 현재까지의 최단 거리 dist[u]가 가장 작은 정점을 우선순위 큐(최소 힙)로 선택합니다.',
      '선택된 정점 u에서 나가는 간선 (u, v, w)에 대해 dist[u] + w < dist[v]이면 최단 거리를 완화(Relaxation)합니다.',
      '음수 가중치 간선이 없는 도로 내비게이션, 네트워크 라우팅의 표준 알고리즘입니다.',
    ],
    visualKind: 'graph',
    complexity: { best: 'O((V + E) log V)', average: 'O((V + E) log V)', worst: 'O((V + E) log V)', space: 'O(V + E)' },
    defaultInput: '0-1:4, 0-2:1, 2-1:2, 1-3:1, 2-3:5, 3-4:3 | start 0',
    inputLabel: '가중치 간선 (u-v:w) | 시작 정점',
    inputHint: '예: 0-1:4, 0-2:1, 2-1:2, 1-3:1, 3-4:3 | start 0',
    pythonCode: `import heapq

graph = {
    0: [(1, 4), (2, 1)],
    1: [(3, 1)],
    2: [(1, 2), (3, 5)],
    3: [(4, 3)],
    4: []
}

INF = 10**9
dist = {u: INF for u in graph}
dist[0] = 0
pq = [(0, 0)]

while pq:
    d, u = heapq.heappop(pq)
    if d > dist[u]:
        continue
    for v, w in graph[u]:
        if d + w < dist[v]:
            dist[v] = d + w
            heapq.heappush(pq, (dist[v], v))

print("0번 정점으로부터 최단 거리:", dist)
`,
    cCode: `#include <stdio.h>

#define V 5
#define INF 1000000

int main(void) {
    int w[V][V];
    for (int i = 0; i < V; i++)
        for (int j = 0; j < V; j++) w[i][j] = (i == j) ? 0 : INF;

    w[0][1] = 4; w[0][2] = 1; w[2][1] = 2;
    w[1][3] = 1; w[2][3] = 5; w[3][4] = 3;

    int dist[V], used[V] = {0};
    for (int i = 0; i < V; i++) dist[i] = INF;
    dist[0] = 0;

    for (int step = 0; step < V; step++) {
        int u = -1;
        for (int i = 0; i < V; i++)
            if (!used[i] && (u == -1 || dist[i] < dist[u])) u = i;
        if (u == -1 || dist[u] == INF) break;
        used[u] = 1;
        for (int v = 0; v < V; v++) {
            if (w[u][v] < INF && dist[u] + w[u][v] < dist[v]) {
                dist[v] = dist[u] + w[u][v];
            }
        }
    }

    for (int i = 0; i < V; i++) printf("0 -> %d 최단거리: %d\\n", i, dist[i]);
    return 0;
}
`,
    practice: {
      title: '최단 경로 실제 정점 순서 복원하기',
      difficulty: '중급',
      prompt: '다익스트라 실행 시 거리뿐 아니라 parent 배열을 기록하여 0에서 4까지의 실제 경로를 출력하세요.',
      hint: 'dist[v]를 갱신할 때마다 parent[v] = u 를 함께 저장하고 역추적합니다.',
      sampleInput: '0 -> 4',
      expectedOutput: '경로: 0 -> 2 -> 1 -> 3 -> 4 (비용 7)',
      starterPython: `# parent 배열을 추가해 최단 경로를 복원해 보세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // parent 배열로 최단 경로 복원\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-dp',
    category: 'algorithm',
    title: '동적 계획법',
    englishTitle: 'Dynamic Programming (0/1 Knapsack & Fib)',
    summary: '겹치는 부분 문제의 계산 결과를 테이블에 저장(메모이제이션/타뷸레이션)해 중복 계산을 제거하는 기법',
    concept: [
      '최적 부분 구조(Optimal Substructure)와 중복되는 부분 문제(Overlapping Subproblems)를 만족할 때 적용합니다.',
      'Top-Down(재귀 + 메모이제이션) 또는 Bottom-Up(반복문 + DP 테이블 채우기)으로 구현합니다.',
      '0/1 배낭 문제에서는 dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight] + value) 점화식을 사용합니다.',
    ],
    visualKind: 'dp-table',
    complexity: { best: 'O(n·W)', average: 'O(n·W)', worst: 'O(n·W)', space: 'O(n·W)' },
    defaultInput: 'cap 7 | 2:3, 3:4, 4:5, 5:8',
    inputLabel: '배낭 용량 | 물건 목록 (무게:가치)',
    inputHint: '예: cap 7 | 2:3, 3:4, 4:5, 5:8',
    pythonCode: `# 0/1 배낭 문제 (Bottom-Up DP)
cap = 7
items = [(2, 3), (3, 4), (4, 5), (5, 8)]  # (무게, 가치)
n = len(items)
dp = [[0] * (cap + 1) for _ in range(n + 1)]

for i in range(1, n + 1):
    w, v = items[i - 1]
    for c in range(cap + 1):
        dp[i][c] = dp[i - 1][c]
        if c >= w:
            dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + v)

print("최대 가치:", dp[n][cap])
for row in dp:
    print(row)
`,
    cCode: `#include <stdio.h>

int max2(int a, int b) { return a > b ? a : b; }

int main(void) {
    int cap = 7, n = 4;
    int wt[] = {2, 3, 4, 5};
    int val[] = {3, 4, 5, 8};
    int dp[5][8] = {0};

    for (int i = 1; i <= n; i++) {
        for (int c = 0; c <= cap; c++) {
            dp[i][c] = dp[i - 1][c];
            if (c >= wt[i - 1]) {
                dp[i][c] = max2(dp[i][c], dp[i - 1][c - wt[i - 1]] + val[i - 1]);
            }
        }
    }

    printf("최대 가치: %d\\n", dp[n][cap]);
    return 0;
}
`,
    practice: {
      title: '계단 오르기 경우의 수',
      difficulty: '기초',
      prompt: '한 번에 1칸 또는 2칸을 오를 수 있을 때 N번째 계단에 도달하는 방법의 수를 DP로 구하세요.',
      hint: 'dp[i] = dp[i-1] + dp[i-2] 점화식을 사용합니다.',
      sampleInput: '10',
      expectedOutput: '89',
      starterPython: `n = 10\n# dp 배열로 계단 오르기 경우의 수를 구하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    int n = 10;\n    // dp 배열로 계산하세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-greedy',
    category: 'algorithm',
    title: '그리디 알고리즘',
    englishTitle: 'Greedy Algorithm',
    summary: '매 순간 당장 가장 좋아 보이는 국소 최적 선택을 반복하여 전체 해답을 구하는 알고리즘',
    concept: [
      '탐욕적 선택 속성(Greedy Choice Property)과 최적 부분 구조가 성립할 때 최적해를 보장합니다.',
      '거스름돈 문제(배수 화폐 단위), 활동 선택 문제, 최소 신장 트리(Kruskal/Prim), 허프만 코딩이 대표적입니다.',
      '단위가 배수 관계가 아닌 경우(예: 1, 3, 4원으로 6원 만들기)에는 그리디가 최적해를 보장하지 않으므로 DP를 써야 합니다.',
    ],
    visualKind: 'array',
    complexity: { best: 'O(k)', average: 'O(k log k) (정렬 포함 시)', worst: 'O(n log n)', space: 'O(1)' },
    defaultInput: '500, 100, 50, 10 | amount 1260',
    inputLabel: '동전 단위 | 거스름돈 금액',
    inputHint: '예: 500, 100, 50, 10 | amount 1260',
    pythonCode: `# 그리디 거스름돈 알고리즘
coins = [500, 100, 50, 10]
amount = 1260
remain = amount
result = {}

for c in sorted(coins, reverse=True):
    cnt = remain // c
    if cnt > 0:
        result[c] = cnt
        remain -= c * cnt

print(f"{amount}원 최소 동전 구성:", result)
print("총 동전 개수:", sum(result.values()))
`,
    cCode: `#include <stdio.h>

int main(void) {
    int coins[] = {500, 100, 50, 10};
    int remain = 1260, total = 0;

    for (int i = 0; i < 4; i++) {
        int cnt = remain / coins[i];
        remain %= coins[i];
        total += cnt;
        printf("%d원: %d개\\n", coins[i], cnt);
    }
    printf("총 동전 개수: %d개\\n", total);
    return 0;
}
`,
    practice: {
      title: '회의실 배정 (활동 선택 문제)',
      difficulty: '중급',
      prompt: '시작/종료 시간이 주어진 회의 목록에서 겹치지 않게 배정할 수 있는 최대 회의 개수를 구하세요.',
      hint: '종료 시간이 가장 빠른 회의부터 오름차순 정렬하여 선택합니다.',
      sampleInput: '(1,4) (3,5) (0,6) (5,7) (8,9) (5,9)',
      expectedOutput: '3개: (1,4), (5,7), (8,9)',
      starterPython: `meetings = [(1,4), (3,5), (0,6), (5,7), (8,9), (5,9)]\n# 종료 시간 기준 정렬 후 그리디 선택\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // 회의실 배정 문제를 그리디로 풀어보세요\n    return 0;\n}\n`,
    },
  },
  {
    id: 'algo-backtracking',
    category: 'algorithm',
    title: '백트래킹',
    englishTitle: 'Backtracking (N-Queens)',
    summary: '해의 후보를 탐색하다가 제약 조건을 위반하면 즉시 이전 단계로 되돌아가(가지치기) 탐색 공간을 줄이는 기법',
    concept: [
      '모든 경우를 탐색하되, 유망하지 않은(Promising하지 않은) 분기를 조기에 잘라내는 가지치기(Pruning)가 핵심입니다.',
      'N-Queens, 스도쿠 풀이, 순열/조합 생성, 부분집합 합 문제 등에 널리 쓰입니다.',
      '선택(Choose) → 탐색(Explore) → 선택 취소(Unchoose)의 3단계 패턴으로 작성합니다.',
    ],
    visualKind: 'chessboard',
    complexity: { best: 'O(N!)', average: '가지치기 후 대폭 감소', worst: 'O(N!)', space: 'O(N)' },
    defaultInput: '4',
    inputLabel: '체스판 크기 N (4~6 권장)',
    inputHint: '4, 5, 6 중 선택 (N-Queens 첫 해 탐색)',
    pythonCode: `# N-Queens 백트래킹
def solve_n_queens(n):
    cols = set()
    diag1 = set()
    diag2 = set()
    board = [-1] * n
    solutions = []

    def backtrack(r):
        if r == n:
            solutions.append(board[:])
            return
        for c in range(n):
            if c in cols or (r - c) in diag1 or (r + c) in diag2:
                continue
            cols.add(c); diag1.add(r - c); diag2.add(r + c)
            board[r] = c
            backtrack(r + 1)
            cols.remove(c); diag1.remove(r - c); diag2.remove(r + c)
            board[r] = -1

    backtrack(0)
    return solutions

sols = solve_n_queens(4)
print(f"4-Queens 해의 개수: {len(sols)}")
for s in sols:
    print(s)
`,
    cCode: `#include <stdio.h>
#include <stdlib.h>

int N = 4, sol_count = 0;
int col[12];

int is_safe(int r, int c) {
    for (int i = 0; i < r; i++) {
        if (col[i] == c || abs(col[i] - c) == r - i) return 0;
    }
    return 1;
}

void solve(int r) {
    if (r == N) {
        sol_count++;
        printf("해 #%d: ", sol_count);
        for (int i = 0; i < N; i++) printf("(%d,%d) ", i, col[i]);
        printf("\\n");
        return;
    }
    for (int c = 0; c < N; c++) {
        if (is_safe(r, c)) {
            col[r] = c;
            solve(r + 1);
        }
    }
}

int main(void) {
    solve(0);
    printf("총 해의 개수: %d\\n", sol_count);
    return 0;
}
`,
    practice: {
      title: '길이 M 순열 생성하기',
      difficulty: '기초',
      prompt: '1부터 N까지 자연수 중 중복 없이 M개를 고른 모든 수열을 백트래킹으로 출력하세요.',
      hint: 'used[] 배열로 사용 여부를 표시하고 재귀 호출 후 다시 False로 되돌립니다.',
      sampleInput: '3 2',
      expectedOutput: '1 2 / 1 3 / 2 1 / 2 3 / 3 1 / 3 2',
      starterPython: `n, m = 3, 2\n# 백트래킹으로 순열을 생성하세요\n`,
      starterC: `#include <stdio.h>\nint main(void) {\n    // 백트래킹 순열 생성\n    return 0;\n}\n`,
    },
  },
];
