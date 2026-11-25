import type { HeapBlock, TraceFrame, TraceStep, TraceValue, TraceVariable } from '../types/trace';

/**
 * C17 실제 실행 추적용 소스 계측기(Instrumenter) 및 런타임 헤더(__cs_trace.h) 생성기.
 *
 * 지원 범위 (명확히 표시):
 * - 기본 변수: int, long, short, char, unsigned, float, double, bool, size_t
 * - 1차원 고정 배열: int arr[N], int arr[] = {...}, double a[N]
 * - 포인터 변수 및 주소 참조: int *p, Node *head (실제 스택/힙 주소와 화살표 연결)
 * - 동적 메모리 할당: malloc, calloc, realloc, free (실제 힙 블록 크기/해제 여부 추적)
 * - 구조체 노드 (예: struct Node { int val/data; struct Node *next/prev/left/right; }) 연결 리스트/트리 시각화
 * - 조건문(if/else), 반복문(for/while), 함수 호출 및 재귀 호출 스택
 *
 * 제한 사항:
 * - 복잡한 전처리기 매크로, 함수 포인터, 인라인 어셈블리, 공용체(union), 가변 길이 다차원 배열은
 *   자동 시각화에서 제외되거나 단순 값으로 표시될 수 있습니다 (일반 컴파일/실행은 전체 C17 표준 지원).
 */

export interface CInstrumentationResult {
  instrumentedCode: string;
  traceHeader: string;
  warnings: string[];
  unsupportedNotes: string[];
  trackedVarCount: number;
}

interface TrackedVar {
  name: string;
  baseType: string;
  isPointer: boolean;
  pointerDepth: number;
  isArray: boolean;
  arraySizeExpr?: string;
  isStruct: boolean;
  structName?: string;
  scopeDepth: number;
}

interface StructDef {
  name: string;
  fields: Array<{ name: string; baseType: string; isPointer: boolean }>;
}

const SCALAR_TYPES = new Set([
  'int',
  'long',
  'short',
  'char',
  'float',
  'double',
  'bool',
  '_Bool',
  'size_t',
  'int32_t',
  'int64_t',
  'uint32_t',
  'uint64_t',
]);

/**
 * 주석과 문자열 리터럴을 안전하게 보존하면서 분석용 정규화 문자열을 생성합니다.
 */
function stripCommentsPreserveLines(code: string): string {
  let out = '';
  let i = 0;
  const n = code.length;
  while (i < n) {
    const ch = code[i];
    const next = code[i + 1];
    // 문자열/문자 리터럴
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ch;
      i++;
      while (i < n) {
        if (code[i] === '\\' && i + 1 < n) {
          out += '  ';
          i += 2;
          continue;
        }
        if (code[i] === quote) {
          out += quote;
          i++;
          break;
        }
        out += code[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }
    // 한 줄 주석
    if (ch === '/' && next === '/') {
      while (i < n && code[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }
    // 블록 주석
    if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) {
        out += code[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i + 1 < n) {
        out += '  ';
        i += 2;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * 구조체 정의(struct Foo { ... } 또는 typedef struct Foo { ... } Bar;)를 추출합니다.
 */
function extractStructs(cleanCode: string): Map<string, StructDef> {
  const map = new Map<string, StructDef>();
  const regex = /(typedef\s+)?struct\s+(\w+)?\s*\{([^}]*)\}\s*(\w+)?\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(cleanCode)) !== null) {
    const structTag = m[2];
    const body = m[3];
    const typedefName = m[4];
    const fields: StructDef['fields'] = [];
    const stmts = body.split(';');
    for (const st of stmts) {
      const trimmed = st.trim();
      if (!trimmed) continue;
      const fm = trimmed.match(/^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:struct\s+)?(\w+)\s*(\*+)?\s*(\w+)$/);
      if (fm) {
        fields.push({
          baseType: fm[1],
          isPointer: Boolean(fm[2]),
          name: fm[3],
        });
      }
    }
    const defName = typedefName || structTag;
    if (defName) {
      const def: StructDef = { name: defName, fields };
      if (structTag) map.set(structTag, def);
      if (typedefName) map.set(typedefName, def);
    }
  }
  return map;
}

/**
 * 코드에서 자동 추적이 제한되는 고급 C 문법을 검사합니다.
 */
export function detectUnsupportedCFeatures(cleanCode: string): string[] {
  const notes: string[] = [];
  if (/\b__asm__\b|\basm\s*\(/.test(cleanCode)) {
    notes.push('인라인 어셈블리는 실행 추적에서 제외됩니다.');
  }
  if (/\bunion\s+\w*\s*\{/.test(cleanCode)) {
    notes.push('union(공용체) 필드는 추적 시각화에서 부분적으로만 표시됩니다.');
  }
  if (/\(\s*\*\s*\w+\s*\)\s*\(/.test(cleanCode)) {
    notes.push('함수 포인터는 주소 값으로만 표시되며 간접 호출 대상은 시각화되지 않습니다.');
  }
  if (/#\s*define\s+\w+\s*\([^)]*\)/.test(cleanCode)) {
    notes.push('함수형 매크로는 전처리 후 실행되므로 매크로 내부 단계는 별도 줄로 표시되지 않을 수 있습니다.');
  }
  return notes;
}

/**
 * C 추적 런타임 헤더(__cs_trace.h) 생성
 */
export function generateCTraceHeader(maxSteps = 400): string {
  return `
#ifndef __CS_TRACE_H__
#define __CS_TRACE_H__

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <stdbool.h>

#define __CS_MAX_STEPS ${maxSteps}
#define __CS_MAX_HEAP 128

typedef struct {
    uintptr_t addr;
    size_t size;
    int freed;
    int id;
    int has_node_meta;
    long node_val;
    uintptr_t next_addr;
    uintptr_t prev_addr;
    uintptr_t left_addr;
    uintptr_t right_addr;
    char type_name[32];
} __cs_heap_entry;

static FILE *__cs_fp = NULL;
static int __cs_step_count = 0;
static int __cs_truncated = 0;
static int __cs_heap_count = 0;
static int __cs_frame_depth = 0;
static __cs_heap_entry __cs_heap[__CS_MAX_HEAP];

static void __cs_open_trace(void) {
    if (!__cs_fp) {
        __cs_fp = fopen("__cs_trace.jsonl", "w");
    }
}

static void __cs_json_escape(FILE *fp, const char *s) {
    fputc('"', fp);
    if (s) {
        for (size_t i = 0; s[i] && i < 120; i++) {
            unsigned char c = (unsigned char)s[i];
            if (c == '"' || c == '\\\\') { fputc('\\\\', fp); fputc(c, fp); }
            else if (c == '\\n') { fputs("\\\\n", fp); }
            else if (c == '\\r') { fputs("\\\\r", fp); }
            else if (c == '\\t') { fputs("\\\\t", fp); }
            else if (c >= 32 && c < 127) { fputc(c, fp); }
        }
    }
    fputc('"', fp);
}

static void *__cs_malloc_impl(size_t sz, int line) {
    void *p = malloc(sz);
    if (p && __cs_heap_count < __CS_MAX_HEAP) {
        __cs_heap_entry *e = &__cs_heap[__cs_heap_count];
        memset(e, 0, sizeof(*e));
        e->addr = (uintptr_t)p;
        e->size = sz;
        e->freed = 0;
        e->id = __cs_heap_count + 1;
        snprintf(e->type_name, sizeof(e->type_name), "heap[%zuB]", sz);
        __cs_heap_count++;
    }
    (void)line;
    return p;
}

static void *__cs_calloc_impl(size_t n, size_t sz, int line) {
    void *p = calloc(n, sz);
    if (p && __cs_heap_count < __CS_MAX_HEAP) {
        __cs_heap_entry *e = &__cs_heap[__cs_heap_count];
        memset(e, 0, sizeof(*e));
        e->addr = (uintptr_t)p;
        e->size = n * sz;
        e->freed = 0;
        e->id = __cs_heap_count + 1;
        snprintf(e->type_name, sizeof(e->type_name), "calloc[%zuB]", n * sz);
        __cs_heap_count++;
    }
    (void)line;
    return p;
}

static void *__cs_realloc_impl(void *oldp, size_t sz, int line) {
    uintptr_t old_addr = (uintptr_t)oldp;
    void *p = realloc(oldp, sz);
    if (p) {
        int updated = 0;
        for (int i = 0; i < __cs_heap_count; i++) {
            if (__cs_heap[i].addr == old_addr && !__cs_heap[i].freed) {
                __cs_heap[i].addr = (uintptr_t)p;
                __cs_heap[i].size = sz;
                updated = 1;
                break;
            }
        }
        if (!updated && __cs_heap_count < __CS_MAX_HEAP) {
            __cs_heap_entry *e = &__cs_heap[__cs_heap_count];
            memset(e, 0, sizeof(*e));
            e->addr = (uintptr_t)p;
            e->size = sz;
            e->freed = 0;
            e->id = __cs_heap_count + 1;
            snprintf(e->type_name, sizeof(e->type_name), "realloc[%zuB]", sz);
            __cs_heap_count++;
        }
    }
    (void)line;
    return p;
}

static void __cs_free_impl(void *p, int line) {
    if (p) {
        uintptr_t addr = (uintptr_t)p;
        for (int i = 0; i < __cs_heap_count; i++) {
            if (__cs_heap[i].addr == addr && !__cs_heap[i].freed) {
                __cs_heap[i].freed = 1;
                break;
            }
        }
    }
    free(p);
    (void)line;
}

static void __cs_update_node_meta(uintptr_t addr, const char *type_name, long val, uintptr_t next_a, uintptr_t prev_a, uintptr_t left_a, uintptr_t right_a) {
    if (!addr) return;
    for (int i = 0; i < __cs_heap_count; i++) {
        if (__cs_heap[i].addr == addr && !__cs_heap[i].freed) {
            __cs_heap[i].has_node_meta = 1;
            __cs_heap[i].node_val = val;
            __cs_heap[i].next_addr = next_a;
            __cs_heap[i].prev_addr = prev_a;
            __cs_heap[i].left_addr = left_a;
            __cs_heap[i].right_addr = right_a;
            if (type_name) {
                snprintf(__cs_heap[i].type_name, sizeof(__cs_heap[i].type_name), "%s", type_name);
            }
            return;
        }
    }
}

static void __cs_emit_heap(void) {
    if (!__cs_fp) return;
    fputs(",\\"heap\\":[", __cs_fp);
    for (int i = 0; i < __cs_heap_count; i++) {
        if (i > 0) fputc(',', __cs_fp);
        __cs_heap_entry *e = &__cs_heap[i];
        fprintf(__cs_fp, "{\\"address\\":\\"0x%lx\\",\\"sizeBytes\\":%zu,\\"freed\\":%s,\\"typeName\\":",
            (unsigned long)e->addr, e->size, e->freed ? "true" : "false");
        __cs_json_escape(__cs_fp, e->type_name);
        if (e->has_node_meta) {
            fprintf(__cs_fp, ",\\"kind\\":\\"struct\\",\\"valueDisplay\\":\\"%ld\\"", e->node_val);
            if (e->next_addr) fprintf(__cs_fp, ",\\"nextAddress\\":\\"0x%lx\\"", (unsigned long)e->next_addr);
            if (e->prev_addr) fprintf(__cs_fp, ",\\"prevAddress\\":\\"0x%lx\\"", (unsigned long)e->prev_addr);
            if (e->left_addr) fprintf(__cs_fp, ",\\"leftAddress\\":\\"0x%lx\\"", (unsigned long)e->left_addr);
            if (e->right_addr) fprintf(__cs_fp, ",\\"rightAddress\\":\\"0x%lx\\"", (unsigned long)e->right_addr);
        } else if (!e->freed && e->size >= sizeof(int) && e->size <= sizeof(int) * 32 && (e->size % sizeof(int) == 0)) {
            size_t cnt = e->size / sizeof(int);
            int *arr = (int *)(e->addr);
            fputs(",\\"kind\\":\\"array\\",\\"intItems\\":[", __cs_fp);
            for (size_t k = 0; k < cnt; k++) {
                if (k > 0) fputc(',', __cs_fp);
                fprintf(__cs_fp, "%d", arr[k]);
            }
            fputc(']', __cs_fp);
        } else {
            fputs(",\\"kind\\":\\"buffer\\"", __cs_fp);
        }
        fputc('}', __cs_fp);
    }
    fputc(']', __cs_fp);
}

static int __cs_begin_step(const char *ev, const char *fn, int line) {
    __cs_open_trace();
    if (!__cs_fp) return 0;
    if (__cs_step_count >= __CS_MAX_STEPS) {
        __cs_truncated = 1;
        return 0;
    }
    __cs_step_count++;
    fprintf(__cs_fp, "{\\"event\\":\\"%s\\",\\"fn\\":", ev);
    __cs_json_escape(__cs_fp, fn);
    fprintf(__cs_fp, ",\\"line\\":%d,\\"depth\\":%d,\\"vars\\":[", line, __cs_frame_depth);
    return 1;
}

static void __cs_end_step(void) {
    if (!__cs_fp) return;
    fputc(']', __cs_fp);
    __cs_emit_heap();
    fputs("}\\n", __cs_fp);
    fflush(__cs_fp);
}

static void __cs_var_int(int *first, const char *name, const char *type, long long v, const void *addr) {
    if (!__cs_fp) return;
    if (!(*first)) fputc(',', __cs_fp);
    *first = 0;
    fprintf(__cs_fp, "{\\"name\\":\\"%s\\",\\"kind\\":\\"primitive\\",\\"type\\":\\"%s\\",\\"display\\":\\"%lld\\",\\"address\\":\\"0x%lx\\"}",
        name, type, v, (unsigned long)(uintptr_t)addr);
}

static void __cs_var_double(int *first, const char *name, const char *type, double v, const void *addr) {
    if (!__cs_fp) return;
    if (!(*first)) fputc(',', __cs_fp);
    *first = 0;
    fprintf(__cs_fp, "{\\"name\\":\\"%s\\",\\"kind\\":\\"primitive\\",\\"type\\":\\"%s\\",\\"display\\":\\"%.4g\\",\\"address\\":\\"0x%lx\\"}",
        name, type, v, (unsigned long)(uintptr_t)addr);
}

static void __cs_var_char(int *first, const char *name, char v, const void *addr) {
    if (!__cs_fp) return;
    if (!(*first)) fputc(',', __cs_fp);
    *first = 0;
    if (v >= 32 && v < 127 && v != '"' && v != '\\\\') {
        fprintf(__cs_fp, "{\\"name\\":\\"%s\\",\\"kind\\":\\"primitive\\",\\"type\\":\\"char\\",\\"display\\":\\"'%c' (%d)\\",\\"address\\":\\"0x%lx\\"}",
            name, v, (int)v, (unsigned long)(uintptr_t)addr);
    } else {
        fprintf(__cs_fp, "{\\"name\\":\\"%s\\",\\"kind\\":\\"primitive\\",\\"type\\":\\"char\\",\\"display\\":\\"%d\\",\\"address\\":\\"0x%lx\\"}",
            name, (int)v, (unsigned long)(uintptr_t)addr);
    }
}

static void __cs_var_ptr(int *first, const char *name, const char *type, const void *ptr, const void *addr) {
    if (!__cs_fp) return;
    if (!(*first)) fputc(',', __cs_fp);
    *first = 0;
    if (ptr == NULL) {
        fprintf(__cs_fp, "{\\"name\\":\\"%s\\",\\"kind\\":\\"pointer\\",\\"type\\":\\"%s\\",\\"display\\":\\"NULL\\",\\"targetAddress\\":null,\\"address\\":\\"0x%lx\\"}",
            name, type, (unsigned long)(uintptr_t)addr);
    } else {
        fprintf(__cs_fp, "{\\"name\\":\\"%s\\",\\"kind\\":\\"pointer\\",\\"type\\":\\"%s\\",\\"display\\":\\"0x%lx\\",\\"targetAddress\\":\\"0x%lx\\",\\"address\\":\\"0x%lx\\"}",
            name, type, (unsigned long)(uintptr_t)ptr, (unsigned long)(uintptr_t)ptr, (unsigned long)(uintptr_t)addr);
    }
}

static void __cs_var_int_array(int *first, const char *name, const int *arr, size_t len) {
    if (!__cs_fp) return;
    if (!(*first)) fputc(',', __cs_fp);
    *first = 0;
    size_t cap = len > 32 ? 32 : len;
    fprintf(__cs_fp, "{\\"name\\":\\"%s\\",\\"kind\\":\\"array\\",\\"type\\":\\"int[%zu]\\",\\"address\\":\\"0x%lx\\",\\"items\\":[",
        name, len, (unsigned long)(uintptr_t)arr);
    for (size_t i = 0; i < cap; i++) {
        if (i > 0) fputc(',', __cs_fp);
        fprintf(__cs_fp, "%d", arr[i]);
    }
    fputs("]}", __cs_fp);
}

static void __cs_var_double_array(int *first, const char *name, const double *arr, size_t len) {
    if (!__cs_fp) return;
    if (!(*first)) fputc(',', __cs_fp);
    *first = 0;
    size_t cap = len > 32 ? 32 : len;
    fprintf(__cs_fp, "{\\"name\\":\\"%s\\",\\"kind\\":\\"array\\",\\"type\\":\\"double[%zu]\\",\\"address\\":\\"0x%lx\\",\\"items\\":[",
        name, len, (unsigned long)(uintptr_t)arr);
    for (size_t i = 0; i < cap; i++) {
        if (i > 0) fputc(',', __cs_fp);
        fprintf(__cs_fp, "%.4g", arr[i]);
    }
    fputs("]}", __cs_fp);
}

static void __cs_var_str(int *first, const char *name, const char *s, const void *addr) {
    if (!__cs_fp) return;
    if (!(*first)) fputc(',', __cs_fp);
    *first = 0;
    fprintf(__cs_fp, "{\\"name\\":\\"%s\\",\\"kind\\":\\"string\\",\\"type\\":\\"char[]\\",\\"address\\":\\"0x%lx\\",\\"display\\":",
        name, (unsigned long)(uintptr_t)addr);
    __cs_json_escape(__cs_fp, s);
    fputc('}', __cs_fp);
}

static void __cs_enter(const char *fn, int line) {
    __cs_frame_depth++;
    if (__cs_begin_step("call", fn, line)) {
        __cs_end_step();
    }
}

static void __cs_leave(const char *fn, int line) {
    if (__cs_begin_step("return", fn, line)) {
        __cs_end_step();
    }
    if (__cs_frame_depth > 0) __cs_frame_depth--;
}

static void __cs_finalize_trace(void) __attribute__((destructor));
static void __cs_finalize_trace(void) {
    if (__cs_fp) {
        if (__cs_truncated) {
            fputs("{\\"event\\":\\"truncated\\"}\\n", __cs_fp);
        }
        fclose(__cs_fp);
        __cs_fp = NULL;
    }
}

#define malloc(sz) __cs_malloc_impl((sz), __LINE__)
#define calloc(n, sz) __cs_calloc_impl((n), (sz), __LINE__)
#define realloc(p, sz) __cs_realloc_impl((p), (sz), __LINE__)
#define free(p) __cs_free_impl((p), __LINE__)

#endif
`;
}

/**
 * 한 줄의 변수 선언에서 추적 가능한 변수들을 추출합니다.
 * 예: int a = 10, b = 20; / int arr[] = {1, 2, 3}; / Node *head = NULL;
 */
function parseDeclarationsFromLine(
  trimmed: string,
  scopeDepth: number,
  structs: Map<string, StructDef>
): TrackedVar[] {
  // 제어문이나 return, typedef, struct 정의 자체는 제외
  if (
    /^(return|if|else|for|while|do|switch|case|break|continue|typedef|#|goto)\b/.test(trimmed) ||
    trimmed.includes('{') && !trimmed.includes('=')
  ) {
    return [];
  }

  // 선언 앞부분 타입 추출: [const] [static] [unsigned|signed] [struct] <Type> <rest>;
  const m = trimmed.match(
    /^(?:const\s+|static\s+|register\s+)*(?:unsigned\s+|signed\s+)?(struct\s+)?(long\s+long|int|long|short|char|float|double|bool|_Bool|size_t|int32_t|int64_t|uint32_t|uint64_t|\w+)\s+(.+);$/
  );
  if (!m) return [];

  const isStructKw = Boolean(m[1]);
  const rawType = m[2].replace(/\s+/g, ' ');
  const rest = m[3];

  const isKnownScalar = rawType === 'long long' || SCALAR_TYPES.has(rawType);
  const isKnownStruct = isStructKw || structs.has(rawType);
  if (!isKnownScalar && !isKnownStruct) return [];

  // 괄호 안 쉼표(함수 호출 또는 초기화 중괄호) 무시하고 최상위 쉼표로 분리
  const parts: string[] = [];
  let cur = '';
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '{') brace++;
    else if (ch === '}') brace--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === ',' && paren === 0 && brace === 0 && bracket === 0) {
      parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());

  const found: TrackedVar[] = [];
  for (const part of parts) {
    // 함수 선언 제외 (예: int foo(int x);)
    if (/^\*?\s*\w+\s*\(/.test(part) && !part.includes('=')) continue;
    const lhs = part.split('=')[0].trim();
    const vm = lhs.match(/^(\*+)?\s*(\w+)\s*(\[\s*([^\]]*)\s*\])?$/);
    if (!vm) continue;
    const ptrs = vm[1] || '';
    const name = vm[2];
    const isArray = Boolean(vm[3]);
    const arraySizeExpr = vm[4]?.trim();
    // 2차원 이상 배열 제외
    if (lhs.indexOf('][') !== -1) continue;

    found.push({
      name,
      baseType: rawType,
      isPointer: ptrs.length > 0,
      pointerDepth: ptrs.length,
      isArray,
      arraySizeExpr,
      isStruct: isKnownStruct,
      structName: isKnownStruct ? rawType : undefined,
      scopeDepth,
    });
  }
  return found;
}

/**
 * 함수 파라미터 목록에서 추적 가능한 변수를 추출합니다.
 */
function parseFunctionParams(paramStr: string, structs: Map<string, StructDef>): TrackedVar[] {
  const trimmed = paramStr.trim();
  if (!trimmed || trimmed === 'void') return [];
  const params = trimmed.split(',');
  const result: TrackedVar[] = [];
  for (const p of params) {
    const pt = p.trim();
    const m = pt.match(
      /^(?:const\s+)?(?:unsigned\s+|signed\s+)?(struct\s+)?(long\s+long|int|long|short|char|float|double|bool|_Bool|size_t|\w+)\s*(\*+)?\s*(\w+)(\[\s*\])?$/
    );
    if (!m) continue;
    const rawType = m[2].replace(/\s+/g, ' ');
    const isStruct = Boolean(m[1]) || structs.has(rawType);
    const isScalar = rawType === 'long long' || SCALAR_TYPES.has(rawType);
    if (!isStruct && !isScalar) continue;
    const ptrCount = (m[3] ? m[3].length : 0) + (m[5] ? 1 : 0);
    result.push({
      name: m[4],
      baseType: rawType,
      isPointer: ptrCount > 0,
      pointerDepth: ptrCount,
      isArray: false,
      isStruct,
      structName: isStruct ? rawType : undefined,
      scopeDepth: 1,
    });
  }
  return result;
}

/**
 * 현재 스코프의 변수들을 JSON 스냅샷으로 출력하는 C 코드 조각을 생성합니다.
 */
function buildSnapshotStatement(
  fnName: string,
  lineNum: number,
  vars: TrackedVar[],
  structs: Map<string, StructDef>
): string {
  const unique = new Map<string, TrackedVar>();
  for (const v of vars) {
    unique.set(v.name, v);
  }
  const lines: string[] = [];

  // 구조체 포인터(연결 리스트/트리 노드)가 힙을 가리킬 때 노드 메타데이터(val, next, prev, left, right) 자동 업데이트
  for (const v of unique.values()) {
    if (v.isStruct && v.isPointer && !v.isArray && v.pointerDepth === 1 && v.structName) {
      const def = structs.get(v.structName);
      if (def) {
        const valField = def.fields.find((f) => !f.isPointer && /^(val|value|data|key)$/.test(f.name));
        const nextField = def.fields.find((f) => f.isPointer && f.name === 'next');
        const prevField = def.fields.find((f) => f.isPointer && f.name === 'prev');
        const leftField = def.fields.find((f) => f.isPointer && f.name === 'left');
        const rightField = def.fields.find((f) => f.isPointer && f.name === 'right');
        if (valField || nextField || leftField || rightField) {
          const valExpr = valField ? `(long)(${v.name}->${valField.name})` : '0L';
          const nextExpr = nextField ? `(uintptr_t)(${v.name}->${nextField.name})` : '0';
          const prevExpr = prevField ? `(uintptr_t)(${v.name}->${prevField.name})` : '0';
          const leftExpr = leftField ? `(uintptr_t)(${v.name}->${leftField.name})` : '0';
          const rightExpr = rightField ? `(uintptr_t)(${v.name}->${rightField.name})` : '0';
          lines.push(
            `if (${v.name} != NULL) { __cs_update_node_meta((uintptr_t)${v.name}, "${v.structName}", ${valExpr}, ${nextExpr}, ${prevExpr}, ${leftExpr}, ${rightExpr}); }`
          );
          // 연결 리스트 순회하여 헤드에서 연결된 모든 노드도 최신 메타데이터 반영
          if (nextField) {
            lines.push(
              `{ ${v.structName} *__cs_it = ${v.name}; int __cs_hop = 0; while (__cs_it != NULL && __cs_hop < 24) { __cs_update_node_meta((uintptr_t)__cs_it, "${v.structName}", ${valField ? `(long)(__cs_it->${valField.name})` : '0L'}, (uintptr_t)(__cs_it->${nextField.name}), ${prevField ? `(uintptr_t)(__cs_it->${prevField.name})` : '0'}, 0, 0); __cs_it = __cs_it->${nextField.name}; __cs_hop++; } }`
            );
          }
          // 이진 트리 BFS 순회하여 루트 이하 최대 15개 노드 메타데이터 반영
          if (leftField && rightField) {
            lines.push(
              `{ ${v.structName} *__cs_q[16]; int __cs_qh = 0, __cs_qt = 0; if (${v.name} != NULL) __cs_q[__cs_qt++] = ${v.name}; while (__cs_qh < __cs_qt && __cs_qt < 16) { ${v.structName} *__cs_nd = __cs_q[__cs_qh++]; __cs_update_node_meta((uintptr_t)__cs_nd, "${v.structName}", ${valField ? `(long)(__cs_nd->${valField.name})` : '0L'}, 0, 0, (uintptr_t)(__cs_nd->${leftField.name}), (uintptr_t)(__cs_nd->${rightField.name})); if (__cs_nd->${leftField.name} && __cs_qt < 16) __cs_q[__cs_qt++] = __cs_nd->${leftField.name}; if (__cs_nd->${rightField.name} && __cs_qt < 16) __cs_q[__cs_qt++] = __cs_nd->${rightField.name}; } }`
            );
          }
        }
      }
    }
  }

  lines.push(`if (__cs_begin_step("line", "${fnName}", ${lineNum})) { int __cs_f = 1;`);
  for (const v of unique.values()) {
    if (v.isArray) {
      if (v.baseType === 'int') {
        lines.push(`__cs_var_int_array(&__cs_f, "${v.name}", ${v.name}, sizeof(${v.name})/sizeof(${v.name}[0]));`);
      } else if (v.baseType === 'double') {
        lines.push(`__cs_var_double_array(&__cs_f, "${v.name}", ${v.name}, sizeof(${v.name})/sizeof(${v.name}[0]));`);
      } else if (v.baseType === 'char') {
        lines.push(`__cs_var_str(&__cs_f, "${v.name}", ${v.name}, ${v.name});`);
      }
    } else if (v.isPointer) {
      const tLabel = `${v.baseType}${'*'.repeat(v.pointerDepth)}`;
      lines.push(`__cs_var_ptr(&__cs_f, "${v.name}", "${tLabel}", (const void *)${v.name}, &${v.name});`);
    } else if (!v.isStruct) {
      if (v.baseType === 'float' || v.baseType === 'double') {
        lines.push(`__cs_var_double(&__cs_f, "${v.name}", "${v.baseType}", (double)${v.name}, &${v.name});`);
      } else if (v.baseType === 'char') {
        lines.push(`__cs_var_char(&__cs_f, "${v.name}", ${v.name}, &${v.name});`);
      } else {
        lines.push(`__cs_var_int(&__cs_f, "${v.name}", "${v.baseType}", (long long)${v.name}, &${v.name});`);
      }
    }
  }
  lines.push(`__cs_end_step(); }`);
  return `{ ${lines.join(' ')} }`;
}

/**
 * 사용자 C17 소스코드를 실제 실행 추적 가능하도록 계측합니다.
 */
export function instrumentCCode(sourceCode: string, maxSteps = 400): CInstrumentationResult {
  const cleanCode = stripCommentsPreserveLines(sourceCode);
  const structs = extractStructs(cleanCode);
  const unsupportedNotes = detectUnsupportedCFeatures(cleanCode);
  const warnings: string[] = [];

  const rawLines = sourceCode.split(/\r?\n/);
  const cleanLines = cleanCode.split(/\r?\n/);

  const outLines: string[] = ['#include "__cs_trace.h"'];

  let braceDepth = 0;
  let currentFn: string | null = null;
  let pendingFn: { name: string; params: TrackedVar[]; line: number } | null = null;
  const globalVars: TrackedVar[] = [];
  let activeVars: TrackedVar[] = [];
  let totalTracked = 0;
  const allScopeVars = () => [...globalVars, ...activeVars];

  // 함수 정의 정규식 (줄 단위)
  const fnHeaderRegex =
    /^(?:static\s+|inline\s+)?(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:struct\s+)?(?:long\s+long|\w+)\s*\*?\s*(\w+)\s*\(([^)]*)\)\s*(\{)?\s*$/;
  const controlKeywords = new Set(['if', 'for', 'while', 'switch', 'else', 'do']);

  for (let i = 0; i < rawLines.length; i++) {
    const lineNum = i + 1;
    const rawLine = rawLines[i];
    const cleanLine = cleanLines[i] || '';
    const trimmed = cleanLine.trim();

    // 스코프 밖(braceDepth === 0)에서 한 줄 함수 정의 감지: 예) int main(void) { printf("hi\n"); return 0; }
    if (braceDepth === 0 && !trimmed.startsWith('#') && trimmed.includes('{') && trimmed.endsWith('}')) {
      const oneLineFn = trimmed.match(
        /^(?:static\s+|inline\s+)?(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:struct\s+)?(?:long\s+long|\w+)\s*\*?\s*(\w+)\s*\(([^)]*)\)\s*\{(.+)\}\s*$/
      );
      if (oneLineFn && !controlKeywords.has(oneLineFn[1])) {
        const fnName = oneLineFn[1];
        const params = parseFunctionParams(oneLineFn[2], structs);
        const firstBraceIdx = rawLine.indexOf('{');
        const lastBraceIdx = rawLine.lastIndexOf('}');
        const headerPart = rawLine.slice(0, firstBraceIdx + 1);
        const bodyPart = rawLine.slice(firstBraceIdx + 1, lastBraceIdx);
        const snap = buildSnapshotStatement(fnName, lineNum, [...globalVars, ...params], structs);
        // return 직전에 스냅샷 및 leave 삽입
        const instrumentedBody = bodyPart.replace(
          /\breturn\b/,
          `${snap} __cs_leave("${fnName}", ${lineNum}); return`
        );
        const hasReturn = /\breturn\b/.test(bodyPart);
        outLines.push(
          `${headerPart} __cs_enter("${fnName}", ${lineNum}); ${instrumentedBody}${hasReturn ? '' : ` ${snap} __cs_leave("${fnName}", ${lineNum});`} }`
        );
        continue;
      }
    }

    // 스코프 밖(braceDepth === 0)에서 함수 정의 감지
    if (braceDepth === 0 && !trimmed.startsWith('#') && !trimmed.endsWith(';')) {
      const fm = trimmed.match(fnHeaderRegex);
      if (fm && !controlKeywords.has(fm[1])) {
        const fnName = fm[1];
        const params = parseFunctionParams(fm[2], structs);
        const opensHere = Boolean(fm[3]);
        if (opensHere) {
          currentFn = fnName;
          braceDepth = 1;
          activeVars = [...params];
          totalTracked += params.length;
          outLines.push(rawLine);
          outLines.push(`__cs_enter("${fnName}", ${lineNum});`);
          if (params.length > 0 || globalVars.length > 0) {
            outLines.push(buildSnapshotStatement(fnName, lineNum, allScopeVars(), structs));
          }
          continue;
        } else {
          pendingFn = { name: fnName, params, line: lineNum };
          outLines.push(rawLine);
          continue;
        }
      }
    }

    // 다음 줄에 `{`가 오는 함수 정의 처리
    if (pendingFn && trimmed === '{') {
      currentFn = pendingFn.name;
      braceDepth = 1;
      activeVars = [...pendingFn.params];
      totalTracked += pendingFn.params.length;
      outLines.push(rawLine);
      outLines.push(`__cs_enter("${currentFn}", ${pendingFn.line});`);
      if (pendingFn.params.length > 0 || globalVars.length > 0) {
        outLines.push(buildSnapshotStatement(currentFn, pendingFn.line, allScopeVars(), structs));
      }
      pendingFn = null;
      continue;
    } else if (pendingFn && trimmed.length > 0) {
      pendingFn = null;
    }

    // 현재 함수 내부가 아닐 때: 전역 변수 선언 감지 (예: int stack[MAX]; int top = -1;)
    if (!currentFn) {
      outLines.push(rawLine);
      if (braceDepth === 0 && trimmed.endsWith(';') && !trimmed.includes('{') && !trimmed.includes('}')) {
        const gDecls = parseDeclarationsFromLine(trimmed, 0, structs);
        if (gDecls.length > 0) {
          globalVars.push(...gDecls);
          totalTracked += gDecls.length;
        }
      }
      // 전역 struct/enum 중괄호 깊이 추적
      for (const ch of cleanLine) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      }
      continue;
    }

    // 이전 비어있지 않은 줄이 중괄호 없는 단일 제어문(if/else/for/while)인지 확인
    let prevNonEmpty = '';
    for (let k = i - 1; k >= 0; k--) {
      const t = (cleanLines[k] || '').trim();
      if (t) {
        prevNonEmpty = t;
        break;
      }
    }
    const afterBracelessControl =
      /^(if\s*\(|else\s+if\s*\(|else\b|for\s*\(|while\s*\()/.test(prevNonEmpty) &&
      !prevNonEmpty.endsWith('{') &&
      !prevNonEmpty.endsWith(';') &&
      !prevNonEmpty.endsWith('}');

    // return 문 직전에 스냅샷 및 __cs_leave 삽입
    if (/^return\b.*;$/.test(trimmed)) {
      const snap = buildSnapshotStatement(currentFn, lineNum, allScopeVars(), structs);
      if (afterBracelessControl) {
        outLines.push(`{ ${snap} __cs_leave("${currentFn}", ${lineNum}); ${rawLine} }`);
      } else {
        outLines.push(`${snap} __cs_leave("${currentFn}", ${lineNum}); ${rawLine}`);
      }
      continue;
    }

    // 닫는 중괄호 처리 (함수 종료 또는 블록 종료)
    const openCount = (cleanLine.match(/\{/g) || []).length;
    const closeCount = (cleanLine.match(/\}/g) || []).length;

    if (trimmed === '}' && braceDepth === 1) {
      // 함수 종료 직전 leave 기록
      outLines.push(`__cs_leave("${currentFn}", ${lineNum});`);
      outLines.push(rawLine);
      braceDepth = 0;
      currentFn = null;
      activeVars = [];
      continue;
    }

    // for 루프 헤더에 선언된 인덱스 변수 감지: for (int i = 0; ...) {
    const forDeclMatch = trimmed.match(/^for\s*\(\s*(int|long|size_t)\s+(\w+)\s*=/);
    if (forDeclMatch && openCount > 0) {
      outLines.push(rawLine);
      braceDepth += openCount - closeCount;
      const loopVar: TrackedVar = {
        name: forDeclMatch[2],
        baseType: forDeclMatch[1],
        isPointer: false,
        pointerDepth: 0,
        isArray: false,
        isStruct: false,
        scopeDepth: braceDepth,
      };
      activeVars.push(loopVar);
      totalTracked++;
      outLines.push(buildSnapshotStatement(currentFn, lineNum, allScopeVars(), structs));
      continue;
    }

    // 일반 문장 출력
    outLines.push(rawLine);

    // 블록 열림/닫힘 반영
    const prevDepth = braceDepth;
    braceDepth = Math.max(0, braceDepth + openCount - closeCount);
    if (braceDepth < prevDepth) {
      activeVars = activeVars.filter((v) => v.scopeDepth <= braceDepth);
    }
    if (braceDepth === 0) {
      currentFn = null;
      activeVars = [];
      continue;
    }

    // 새 변수 선언 감지 및 스냅샷 삽입 (중괄호 없는 if/else/for/while 본문은 블록으로 감싸 문법 안전 보장)
    if (trimmed.endsWith(';') && openCount === 0 && closeCount === 0) {
      const newlyDeclared = parseDeclarationsFromLine(trimmed, braceDepth, structs);
      if (newlyDeclared.length > 0) {
        activeVars.push(...newlyDeclared);
        totalTracked += newlyDeclared.length;
      }

      const isSimpleStatement =
        trimmed.length > 1 &&
        !/^(break|continue|case\b|default\b|goto\b|#|\})/.test(trimmed) &&
        !trimmed.startsWith('for') &&
        !trimmed.startsWith('if') &&
        !trimmed.startsWith('else') &&
        !trimmed.startsWith('while');

      if (isSimpleStatement) {
        const snap = buildSnapshotStatement(currentFn, lineNum, allScopeVars(), structs);
        if (afterBracelessControl && newlyDeclared.length === 0) {
          // 직전에 추가한 rawLine을 { rawLine; snap } 형태로 감싸 else/루프와 안전하게 결합
          outLines[outLines.length - 1] = `{ ${rawLine} ${snap} }`;
        } else if (!afterBracelessControl) {
          outLines.push(snap);
        }
      }
    } else if (/^(if|else\s+if|else|while)\b/.test(trimmed) && openCount > 0) {
      // 분기/반복문 진입 시 현재 상태 기록
      outLines.push(buildSnapshotStatement(currentFn, lineNum, allScopeVars(), structs));
    }
  }

  return {
    instrumentedCode: outLines.join('\n'),
    traceHeader: generateCTraceHeader(maxSteps),
    warnings,
    unsupportedNotes,
    trackedVarCount: totalTracked,
  };
}

/**
 * __cs_trace.jsonl 파일을 읽어 통합 TraceStep[] 형식으로 변환합니다.
 */
export function parseCTraceJsonl(jsonl: string, stdout: string): {
  steps: TraceStep[];
  truncated: boolean;
} {
  const lines = jsonl.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const steps: TraceStep[] = [];
  let truncated = false;

  // 현재 활성 호출 스택 유지
  const frameStack: TraceFrame[] = [];
  const prevVarMap = new Map<string, string>();

  for (const line of lines) {
    let rec: any;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }

    if (rec.event === 'truncated') {
      truncated = true;
      continue;
    }

    const fnName = String(rec.fn || 'main');
    const lineNum = Number(rec.line || 1);
    const event = rec.event as TraceStep['event'];

    // 변수 변환
    const vars: TraceVariable[] = (rec.vars || []).map((v: any) => {
      let val: TraceValue;
      if (v.kind === 'array') {
        const items: TraceValue[] = (v.items || []).map((x: any) => ({
          kind: 'primitive',
          type: 'num',
          display: String(x),
          raw: x,
        }));
        val = {
          kind: 'array',
          type: String(v.type || 'array'),
          display: `[${(v.items || []).join(', ')}]`,
          items,
          address: v.address,
        };
      } else if (v.kind === 'pointer') {
        val = {
          kind: 'pointer',
          type: String(v.type || 'void*'),
          display: String(v.display ?? 'NULL'),
          targetAddress: v.targetAddress || null,
          address: v.address,
        };
      } else if (v.kind === 'string') {
        val = {
          kind: 'string',
          type: 'char[]',
          display: `"${String(v.display ?? '')}"`,
          raw: v.display,
          address: v.address,
        };
      } else {
        val = {
          kind: 'primitive',
          type: String(v.type || 'int'),
          display: String(v.display ?? ''),
          address: v.address,
        };
      }

      const key = `${frameStack.length}:${fnName}:${v.name}`;
      const prev = prevVarMap.get(key);
      const changed = prev !== undefined && prev !== val.display;
      prevVarMap.set(key, val.display);

      return {
        name: String(v.name),
        value: val,
        changed,
        previousDisplay: changed ? prev : undefined,
      };
    });

    if (event === 'call') {
      frameStack.push({
        id: `c_frame_${frameStack.length}_${fnName}`,
        functionName: fnName,
        line: lineNum,
        locals: [],
        isNew: true,
      });
    } else if (event === 'return') {
      if (frameStack.length > 0) {
        const top = frameStack[frameStack.length - 1];
        top.line = lineNum;
        top.isReturning = true;
      }
    } else {
      if (frameStack.length === 0) {
        frameStack.push({
          id: `c_frame_0_${fnName}`,
          functionName: fnName,
          line: lineNum,
          locals: vars,
        });
      } else {
        const top = frameStack[frameStack.length - 1];
        top.line = lineNum;
        top.locals = vars;
        top.isNew = false;
        top.isReturning = false;
      }
    }

    const heap: HeapBlock[] = (rec.heap || []).map((h: any) => ({
      address: String(h.address),
      label: h.typeName || `heap`,
      sizeBytes: Number(h.sizeBytes || 0),
      freed: Boolean(h.freed),
      kind: h.kind || 'buffer',
      typeName: h.typeName,
      items: Array.isArray(h.intItems)
        ? h.intItems.map((x: number) => ({
            kind: 'primitive' as const,
            type: 'int',
            display: String(x),
            raw: x,
          }))
        : undefined,
      nextAddress: h.nextAddress || null,
      prevAddress: h.prevAddress || null,
      leftAddress: h.leftAddress || null,
      rightAddress: h.rightAddress || null,
      valueDisplay: h.valueDisplay,
    }));

    const changedNames = vars.filter((v) => v.changed).map((v) => `${v.name}=${v.value.display}`);
    let desc =
      event === 'call'
        ? `${fnName}() 함수 진입 (줄 ${lineNum})`
        : event === 'return'
          ? `${fnName}() 함수 반환 (줄 ${lineNum})`
          : changedNames.length > 0
            ? `줄 ${lineNum} 실행 — 변경: ${changedNames.join(', ')}`
            : `줄 ${lineNum} 실행 (${fnName})`;

    // 깊은 복사 스냅샷 저장
    const framesSnapshot: TraceFrame[] = frameStack.map((f) => ({
      ...f,
      locals: f.locals.map((lv) => ({ ...lv })),
    }));

    steps.push({
      index: steps.length,
      line: lineNum,
      event,
      functionName: fnName,
      description: desc,
      frames: framesSnapshot,
      globals: [],
      heap,
      stdout,
    });

    if (event === 'return' && frameStack.length > 0) {
      frameStack.pop();
    }
  }

  return { steps, truncated };
}
