# Code Studio 아키텍처 및 확장 가이드

## 1. 기술적 의사결정 및 근거

### C17 실행 엔진: `@yowasp/clang` + `@bjorn3/browser_wasi_shim`
- **검토 대안**: Wasmer SDK(WASIX, `SharedArrayBuffer` 및 COOP/COEP 의존), Emscripten(AOT 중심), 자체 인터프리터(C17 호환성 부족)
- **채택 이유**:
  - `@yowasp/clang`은 실제 LLVM/Clang 22 및 LLD를 WebAssembly로 컴파일한 패키지로 `-std=c17`, 표준 라이브러리(`stdio.h`, `stdlib.h`, `string.h`, `math.h`), 포인터, 구조체, 동적 메모리 할당을 완전하게 지원합니다.
  - `@bjorn3/browser_wasi_shim`과 결합 시 `SharedArrayBuffer` 없이 표준 ES Module Web Worker에서 동작하므로 **iPad Safari 및 정적 HTTPS 호스팅**과 호환성이 매우 높습니다.
  - 정적 에셋(`public/engines/clang/`)을 Vite 번들에서 분리하고 동적 `import()`로 로드하여 빌드 속도를 1초대로 유지하고 Service Worker Cache API로 완벽히 오프라인 캐싱할 수 있습니다.

### Python 3 실행 엔진: `pyodide`
- **채택 이유**: CPython 3.14 표준 런타임과 `sys.settrace`를 그대로 지원하며, Emscripten 가상 파일시스템(`/home/pyodide/workspace`)을 통해 프로젝트 내 멀티 `.py` 모듈 import와 `.txt` 파일 입출력이 가능합니다.
- 로컬 `public/engines/pyodide/`에 필수 5개 파일(~12.9 MB)만 배치하여 외부 CDN 없이 완전 오프라인 실행을 달성했습니다.

### 에디터: CodeMirror 6
- **채택 이유**: Monaco Editor 대비 iPadOS Safari의 터치 텍스트 선택, 한글 IME 조합 입력, `visualViewport` 리사이즈 및 메모리 사용량 측면에서 압도적으로 안정적입니다.

### C 실행 추적 전략: 실제 소스 계측(Instrumentation) + WASI 사이드 채널
- 임의의 C 코드를 가짜 인터프리터로 흉내 내지 않고, `src/engines/cInstrumenter.ts`가 사용자 코드에 스냅샷 호출과 `malloc`/`calloc`/`realloc`/`free` 래퍼(`__cs_trace.h`)를 삽입한 뒤 **실제 Clang으로 컴파일 및 WASI 실행**합니다.
- 추적 로그는 `stdout`/`stderr`를 오염시키지 않도록 WASI `PreopenDirectory` 내 가상 파일 `__cs_trace.jsonl`에 기록한 뒤 실행 종료 직후 회수하여 파싱합니다.

---

## 2. 프로젝트 폴더 구조

```text
CodeStudio/
├── index.html                    # iPadOS standalone PWA 메타 태그 및 초기 스플래시
├── public/
│   ├── manifest.webmanifest      # display: standalone PWA 매니페스트
│   ├── sw.js                     # Safari 호환 오프라인 Service Worker
│   ├── icons/                    # SVG/PNG 홈 화면 아이콘 (32, 180, 192, 512)
│   └── engines/                  # (자동 생성) Pyodide & YoWASP Clang 로컬 WASM 자산
├── scripts/
│   ├── copy-engines.mjs          # node_modules -> public/engines/ 복사 + manifest.json 생성
│   └── generate-icons.mjs        # 순수 Node PNG/SVG 앱 아이콘 생성기
├── src/
│   ├── types/                    # ide.ts, trace.ts, learning.ts
│   ├── storage/                  # db.ts(IndexedDB), defaults.ts, backup.ts(ZIP/File)
│   ├── engines/                  # diagnostics.ts, pythonTracer.ts, cInstrumenter.ts, engineManager.ts, runtimeController.ts
│   ├── workers/                  # python.worker.ts, c.worker.ts
│   ├── learning/                 # dataStructures.ts(13), algorithms.ts(15), generators.ts, index.ts
│   ├── utils/                    # formatter.ts, pwa.ts
│   ├── components/               # TopBar, Sidebar, EditorPane, AccessoryBar, BottomPanel, TraceVisualizer, LearningPanel, StatusBar, SettingsModal, InstallBanner
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── tests/                        # Vitest 실제 엔진/추적/학습 통합 테스트
└── docs/
    └── ARCHITECTURE.md
```

---

## 3. 추후 기능 확장 가이드

### A. 새로운 학습 주제 추가
1. `src/learning/dataStructures.ts` 또는 `src/learning/algorithms.ts`에 `LearningTopic` 객체를 추가합니다.
2. `src/learning/generators.ts`의 `generateLearningSteps()` switch문에 해당 `topic.id`용 스텝 생성 함수를 연결합니다.
3. 새로운 시각화 유형이 필요하면 `src/types/learning.ts`의 `VisualKind`와 `src/components/LearningPanel.tsx`의 `LearningSvgCanvas`에 SVG 렌더러를 추가합니다.

### B. 실시간 대화형(Interactive) stdin 추가 시 고려사항
- 현재는 Safari 호환성을 위해 실행 전 `stdin` 버퍼를 전달합니다.
- 추후 실시간 `input()`/`scanf()`가 필요할 경우, 호스팅 서버에 `Cross-Origin-Opener-Policy: same-origin`과 `Cross-Origin-Embedder-Policy: require-corp` 헤더를 설정하고 `SharedArrayBuffer` + `Atomics.wait()` 기반 동기 입력 브리지를 `python.worker.ts`와 `c.worker.ts`의 WASI `fd_read`에 연결할 수 있습니다.

### C. 멀티 파일 C 프로젝트 컴파일 확장
- `src/workers/c.worker.ts`의 `compileC()`에 현재 프로젝트의 여러 `.c` 파일 경로를 `args` 배열로 전달하면 Clang/LLD가 자동으로 오브젝트 링크까지 수행합니다.
