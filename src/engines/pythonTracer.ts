/**
 * Pyodide 내부에서 실제 sys.settrace를 사용하여 Python 3 실행 과정을 단계별로 기록하는 드라이버 스크립트.
 * - 지역 변수, 전역 변수, 호출 스택, 재귀 깊이, 반환값, 리스트/배열, 딕셔너리, 커스텀 객체(예: Node) 및 힙 참조를 기록합니다.
 * - stdout 스냅샷을 단계별로 포함합니다.
 */
export function buildPythonTraceScript(): string {
  return `
import sys
import io
import json
import types
import traceback

def __cs_run_with_trace(code_str, filename, stdin_str, max_steps=400):
    steps = []
    truncated = False
    error_message = None

    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()
    old_stdin, old_stdout, old_stderr = sys.stdin, sys.stdout, sys.stderr
    sys.stdin = io.StringIO(stdin_str)
    sys.stdout = stdout_buf
    sys.stderr = stderr_buf

    heap_map = {}

    def safe_repr(val, max_len=60):
        try:
            r = repr(val)
        except Exception:
            r = f"<{type(val).__name__}>"
        if len(r) > max_len:
            return r[:max_len - 3] + "..."
        return r

    def is_user_var(name, val):
        if name.startswith("__") and name.endswith("__"):
            return False
        if name.startswith("__cs_"):
            return False
        if isinstance(val, (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type)):
            return False
        return True

    def serialize_val(val, depth=0, seen=None):
        if seen is None:
            seen = set()
        if val is None:
            return {"kind": "null", "type": "NoneType", "display": "None", "raw": None}
        if isinstance(val, bool):
            return {"kind": "primitive", "type": "bool", "display": str(val), "raw": val}
        if isinstance(val, (int, float)):
            return {"kind": "primitive", "type": type(val).__name__, "display": str(val), "raw": val}
        if isinstance(val, str):
            disp = safe_repr(val, 48)
            return {"kind": "string", "type": "str", "display": disp, "raw": val[:120]}

        obj_id = f"py_{hex(id(val))}"

        if depth > 2 or id(val) in seen:
            return {
                "kind": "pointer",
                "type": type(val).__name__,
                "display": f"ref({type(val).__name__})",
                "targetAddress": obj_id,
            }

        seen = seen | {id(val)}

        if isinstance(val, (list, tuple)):
            items = [serialize_val(x, depth + 1, seen) for x in val[:40]]
            if len(val) > 40:
                items.append({"kind": "primitive", "type": "ellipsis", "display": f"...(+{len(val)-40})"})
            heap_map[obj_id] = {
                "address": obj_id,
                "label": f"{type(val).__name__}[{len(val)}]",
                "kind": "array",
                "typeName": type(val).__name__,
                "items": items,
            }
            return {
                "kind": "array",
                "type": type(val).__name__,
                "display": safe_repr(val, 56),
                "items": items,
                "address": obj_id,
                "targetAddress": obj_id,
            }

        if isinstance(val, set):
            arr = list(val)[:30]
            items = [serialize_val(x, depth + 1, seen) for x in arr]
            heap_map[obj_id] = {
                "address": obj_id,
                "label": f"set({len(val)})",
                "kind": "array",
                "typeName": "set",
                "items": items,
            }
            return {
                "kind": "array",
                "type": "set",
                "display": safe_repr(val, 56),
                "items": items,
                "address": obj_id,
                "targetAddress": obj_id,
            }

        if isinstance(val, dict):
            fields = {}
            for idx, (k, v) in enumerate(val.items()):
                if idx >= 25:
                    break
                fields[str(k)] = serialize_val(v, depth + 1, seen)
            heap_map[obj_id] = {
                "address": obj_id,
                "label": f"dict({len(val)})",
                "kind": "object",
                "typeName": "dict",
                "fields": fields,
            }
            return {
                "kind": "object",
                "type": "dict",
                "display": safe_repr(val, 56),
                "fields": fields,
                "address": obj_id,
                "targetAddress": obj_id,
            }

        # 사용자 정의 클래스 인스턴스 (Node 등 연결 리스트 / 트리 자동 감지)
        if hasattr(val, "__dict__"):
            cls_name = type(val).__name__
            fields = {}
            next_addr = None
            prev_addr = None
            left_addr = None
            right_addr = None
            val_disp = None
            for k, v in list(vars(val).items())[:16]:
                if k.startswith("__"):
                    continue
                sv = serialize_val(v, depth + 1, seen)
                fields[k] = sv
                if k in ("val", "value", "data", "key"):
                    val_disp = sv["display"]
                if k == "next" and v is not None:
                    next_addr = f"py_{hex(id(v))}"
                elif k == "prev" and v is not None:
                    prev_addr = f"py_{hex(id(v))}"
                elif k == "left" and v is not None:
                    left_addr = f"py_{hex(id(v))}"
                elif k == "right" and v is not None:
                    right_addr = f"py_{hex(id(v))}"

            heap_map[obj_id] = {
                "address": obj_id,
                "label": f"{cls_name}",
                "kind": "struct",
                "typeName": cls_name,
                "fields": fields,
                "nextAddress": next_addr,
                "prevAddress": prev_addr,
                "leftAddress": left_addr,
                "rightAddress": right_addr,
                "valueDisplay": val_disp or cls_name,
            }
            return {
                "kind": "pointer",
                "type": cls_name,
                "display": f"{cls_name}({val_disp})" if val_disp is not None else f"{cls_name}@heap",
                "targetAddress": obj_id,
                "address": obj_id,
            }

        return {
            "kind": "primitive",
            "type": type(val).__name__,
            "display": safe_repr(val, 50),
        }

    def collect_stack(frame, event, arg):
        frames_list = []
        cur = frame
        while cur is not None:
            if cur.f_code.co_filename == filename:
                fn_name = cur.f_code.co_name
                if fn_name == "<module>":
                    fn_name = "<전역>"
                locals_list = []
                for k, v in cur.f_locals.items():
                    if is_user_var(k, v):
                        locals_list.append({
                            "name": k,
                            "value": serialize_val(v, 0)
                        })
                f_obj = {
                    "id": f"f_{id(cur)}_{fn_name}",
                    "functionName": fn_name,
                    "line": cur.f_lineno,
                    "locals": locals_list,
                }
                if cur is frame and event == "return":
                    f_obj["returnValue"] = serialize_val(arg, 0)
                    f_obj["isReturning"] = True
                if cur is frame and event == "call":
                    f_obj["isNew"] = True
                frames_list.append(f_obj)
            cur = cur.f_back
        frames_list.reverse()
        return frames_list

    def collect_globals(frame):
        g_list = []
        for k, v in frame.f_globals.items():
            if is_user_var(k, v):
                g_list.append({
                    "name": k,
                    "value": serialize_val(v, 0)
                })
        return g_list

    def trace_fn(frame, event, arg):
        nonlocal truncated
        if frame.f_code.co_filename != filename:
            return trace_fn
        if frame.f_lineno <= 0:
            return trace_fn
        if event not in ("call", "line", "return", "exception"):
            return trace_fn
        if len(steps) >= max_steps:
            truncated = True
            return None

        heap_map.clear()
        frames_snap = collect_stack(frame, event, arg)
        globals_snap = collect_globals(frame)

        fn_name = frame.f_code.co_name
        if fn_name == "<module>":
            fn_name = "<전역>"

        if event == "call":
            desc = f"{fn_name}() 함수 호출 (줄 {frame.f_lineno})"
        elif event == "return":
            ret_disp = safe_repr(arg, 36)
            desc = f"{fn_name}() 반환 → {ret_disp} (줄 {frame.f_lineno})"
        elif event == "exception":
            exc_type = arg[0].__name__ if arg and arg[0] else "Exception"
            desc = f"예외 발생: {exc_type} (줄 {frame.f_lineno})"
        else:
            desc = f"줄 {frame.f_lineno} 실행 ({fn_name})"

        steps.append({
            "index": len(steps),
            "line": frame.f_lineno,
            "event": event,
            "functionName": fn_name,
            "description": desc,
            "frames": frames_snap,
            "globals": globals_snap,
            "heap": list(heap_map.values()),
            "stdout": stdout_buf.getvalue(),
        })
        return trace_fn

    exec_globals = {"__name__": "__main__", "__file__": filename}
    try:
        compiled = compile(code_str, filename, "exec")
        sys.settrace(trace_fn)
        exec(compiled, exec_globals, exec_globals)
    except Exception:
        error_message = traceback.format_exc()
        stderr_buf.write(error_message)
    finally:
        sys.settrace(None)
        sys.stdin, sys.stdout, sys.stderr = old_stdin, old_stdout, old_stderr

    return json.dumps({
        "ok": error_message is None,
        "steps": steps,
        "truncated": truncated,
        "maxSteps": max_steps,
        "stdout": stdout_buf.getvalue(),
        "stderr": stderr_buf.getvalue(),
        "errorMessage": error_message,
    }, ensure_ascii=False)
`;
}
