# Code Studio

아이패드(iPad)에서 PC나 인터넷 연결 없이 **Python 3**와 **C17** 문법, 자료구조, 알고리즘을 실제로 코딩·컴파일·실행·추적·시각화할 수 있는 **오프라인 PWA 통합 개발 환경(IDE)**입니다.

- **100% 클라이언트 실행**: 별도의 코드 실행 서버, 회원가입, 로그인, 유료 API 없음
- **프라이버시 보장**: 사용자가 작성한 모든 코드는 외부 서버로 전송되지 않고 기기 내 IndexedDB에만 저장
- **iPadOS 네이티브 앱과 유사한 독립 실행 환경**: `display: standalone`, Safe Area 대응, 가상 키보드 보조 입력 바, `visualViewport` 높이 자동 조절

---

## 1. 주요 기능

### 실제 실행 엔진 (가짜 컴파일/하드코딩 없음)
- **Python 3 (Pyodide WebAssembly)**
  - Web Worker에서 실제 Python 3.14 인터프리터 실행
  - `print()`, `input()`, 표준 라이브러리 및 프로젝트 내 멀티 파일(`import`, `.txt` 파일 읽기) 지원
  - 실행 시간 측정, 실행 중단(무한 루프 강제 종료), 출력 크기 제한(512 KB), Traceback 줄 번호 파싱
  - 실제 `sys.settrace` 기반 단계별 실행 추적 (지역/전역 변수, 리스트, 딕셔너리, 재귀 호출 스택, 사용자 클래스 노드 참조)
- **C언어 (C17 — YoWASP Clang/LLVM 22 + WASI WebAssembly)**
  - 브라우저 Web Worker 내부에서 실제 LLVM/Clang 22로 `-std=c17 -Wall -Wextra -lm` 컴파일 후 `@bjorn3/browser_wasi_shim`으로 실행
  - `printf()`, `scanf()`, 배열, 구조체, 함수, 재귀, 포인터, `malloc()`/`calloc()`/`realloc()`/`free()` 지원
  - Clang 컴파일 오류/경고 파싱 및 에디터 오류 줄 강조·클릭 이동
  - 실제 C 소스 계측 + Clang 컴파일 기반 실행 추적 (변수, 1차원 배열, 반복/조건문, 함수/재귀 스택, 포인터 주소, `malloc`/`free` 힙 블록, 연결 리스트 노드 그래프)

### 코드 에디터 (CodeMirror 6 — iPad Safari 최적화)
- 문법 강조(Python, C/C17), 키워드/표준함수/식별자 자동완성, 자동 들여쓰기, 줄 번호, 괄호 자동 닫기 및 쌍 강조, 코드 접기, 검색 및 바꾸기(`Cmd/Ctrl+F`), 실행 취소/다시 실행, 멀티 파일 탭, 오류 밑줄, 글꼴 크기 조절, 자동 저장, 기본 코드 포맷터(`Cmd/Ctrl+Shift+F`)
- **iPad 가상 키보드 보조 바**: `Tab`, `{ }`, `( )`, `[ ]`, `;`, `:`, `*`, `&`, `->`, 커서 좌우 이동, 실행 취소/다시 실행

### 파일 및 프로젝트 관리
- 프로젝트 생성, 이름 변경, 삭제 (`내 코드`와 `예제` 프로젝트 구분)
- 파일 및 폴더 생성, 이름 변경, 폴더 이동, 삭제 (`.py`, `.c`, `.h`, `.txt` 지원)
- iPadOS **파일 앱** 연동 단일 파일 가져오기/내보내기
- 프로젝트 단위 및 전체 워크스페이스 **ZIP 백업 / 복원**
- 최근 작업 파일 목록, IndexedDB 자동 저장 및 재실행 시 마지막 상태 복원

### 코드 실행 과정 시각화 (`실제 실행 추적`)
- 현재 실행 중인 줄 에디터 강조, 한 단계씩 진행, 이전 단계(기록된 스냅샷 탐색), 자동 재생/일시정지, 재생 속도(0.5x~4x), 타임라인 슬라이더
- 변경된 변수 값 강조(`이전값 → 현재값`), 재귀 호출 스택 깊이 표시
- 2D SVG 배열 + 루프 인덱스 포인터(`i`, `j`, `left`, `right`, `mid`), C 포인터/힙(`malloc`/`free`) 및 연결 리스트 노드 시각화

### 자료구조 및 알고리즘 학습 모드 (`학습용 시뮬레이션` — 총 28개 주제)
- **자료구조 (13개)**: 배열, 문자열, 연결 리스트, 이중 연결 리스트, 스택, 큐, 원형 큐, 덱, 해시 테이블, 힙, 이진 트리, 이진 탐색 트리, 그래프
- **알고리즘 (15개)**: 선형 탐색, 이진 탐색, 버블 정렬, 선택 정렬, 삽입 정렬, 병합 정렬, 퀵 정렬, 힙 정렬, 재귀, DFS, BFS, 다익스트라 알고리즘, 동적 계획법(0/1 배낭), 그리디 알고리즘, 백트래킹(N-Queens)
- 각 주제별 개념 설명, 시간/공간 복잡도, **사용자 입력값 직접 수정**, 2D SVG 단계별 애니메이션, 비교/교환 횟수 표시, Python/C17 예제 코드, **편집기로 복사하여 직접 실행**, 연습 문제 및 힌트 제공
- 예제 코드를 편집기로 복사해 수정한 뒤 실행하면 고정 애니메이션이 아니라 수정된 코드의 실제 실행/추적 결과를 표시합니다.

---

## 2. Mac에서 개발 및 실행 방법

### 사전 요구사항
- Node.js 20 이상 (테스트 환경: Node v26.13.1)
- npm

### 설치 및 실행
```bash
# 1. 의존성 설치
npm install

# 2. 실행 엔진(Pyodide, YoWASP Clang)을 public/engines/로 복사
npm run setup:engines

# 3. 개발 서버 실행 (Mac 및 같은 Wi-Fi의 iPad에서 접속 가능)
npm run dev
```

### 프로덕션 빌드 및 로컬 미리보기
```bash
# 타입 검사 + 엔진 복사 + 프로덕션 빌드
npm run build

# 빌드 결과물 로컬 서빙 (네트워크 공유 포함)
npm run preview
```

### 자동화 테스트 실행
```bash
npm test
```

---

## 3. 무료 정적 호스팅 배포 방법 (HTTPS 필수)

PWA 설치(홈 화면에 추가) 및 Service Worker 오프라인 캐싱은 **HTTPS** 환경에서 동작합니다. Code Studio는 백엔드가 전혀 없는 순수 정적 사이트(`dist/`)이므로 무료 정적 호스팅에 바로 배포할 수 있습니다.

> **참고**: `dist/engines/clang/llvm.core.wasm` 파일 크기가 약 71 MB입니다. Cloudflare Pages의 단일 파일 25 MB 제한을 초과하므로 **Netlify**, **Vercel**, **GitHub Pages**(Git LFS 또는 Actions 배포) 사용을 권장합니다.

### 방법 A: GitHub Pages (GitHub Actions 자동 빌드 배포 — 권장)
1. GitHub에 개인(또는 공개) 저장소를 만들고 이 프로젝트를 푸시합니다. (`public/engines/`와 `dist/`는 `.gitignore`에 제외되어 있어 Git 용량 제한에 걸리지 않습니다.)
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. `.github/workflows/deploy.yml`에서 `npm ci && npm run build` 후 `dist/` 폴더를 `actions/deploy-pages`로 배포합니다.

### 방법 B: Netlify Drop / CLI
```bash
npm run build
# 생성된 dist/ 폴더를 Netlify 대시보드에 드래그 앤 드롭하거나 netlify-cli로 배포
```

---

## 4. iPad 홈 화면 설치 및 오프라인 사용 방법

### 홈 화면에 독립 앱으로 설치 (iPadOS Safari)
1. iPad **Safari**에서 배포된 HTTPS 주소로 접속합니다.
2. 상단(또는 하단) **공유 버튼(□↑)**을 탭합니다.
3. **홈 화면에 추가**를 선택하고 **추가**를 누릅니다.
4. 홈 화면의 **Code Studio** 아이콘으로 실행하면 Safari 주소창과 탭이 없는 독립 실행 앱 모드로 열립니다.

### 오프라인 실행 준비
1. 인터넷이 연결된 상태에서 앱 우측 상단 **설정(톱니바퀴)**을 엽니다.
2. **Python 3 (Pyodide WASM)**(~13 MB)과 **C17 컴파일러 (YoWASP Clang/LLVM)**(~100 MB)의 **다운로드** 버튼을 눌러 캐싱을 완료합니다.
3. 상태 표시줄에 **오프라인 실행 완전 준비**가 표시되면, 비행기 모드나 Wi-Fi가 없는 환경에서도 코드 작성, 컴파일, 실행, 추적, 학습 모드를 모두 사용할 수 있습니다.
4. 캐시가 손상되었거나 재설치가 필요하면 설정 화면의 **재설치** 버튼을 사용하세요(작성한 프로젝트 파일은 삭제되지 않습니다).

---

## 5. 사용 설명서 (단축키 및 팁)

| 기능 | 단축키 (외장 키보드) | 설명 |
|---|---|---|
| 코드 실행 | `Cmd + Enter` / `Ctrl + Enter` | 현재 활성 파일 실행 |
| 실행 추적 시뮬레이션 | `Cmd + Shift + Enter` / `Ctrl + Shift + Enter` | 현재 코드 실제 실행 시뮬레이션 |
| 코드 저장 | `Cmd + S` / `Ctrl + S` | 즉시 IndexedDB 저장 (기본 자동 저장 활성) |
| 코드 정리 | `Cmd + Shift + F` / `Ctrl + Shift + F` | 들여쓰기 및 공백 정리 |
| 검색 및 바꾸기 | `Cmd + F` / `Ctrl + F` | 에디터 내 검색/치환 패널 열기 |
| 좌측 탐색기 토글 | `Cmd + B` / `Ctrl + B` | 파일 탐색기 열기/닫기 |
| 하단 출력창 토글 | `Cmd + J` / `Ctrl + J` | 하단 입출력·테스트 패널 접기/펴기 |
| 시각화 패널 토글 | `Cmd + Shift + V` / `Ctrl + Shift + V` | 우측/하단 시각화 패널 열기/닫기 |
| 시뮬레이션 제어 | `Space` / `←` / `→` | (에디터 외부 포커스 시) 재생·일시정지 및 이전/다음 단계 |
| 실행 중단 / 닫기 | `Escape` | 무한 반복문 즉시 종료 또는 모달 닫기 |

- **표준 입력(`input()`, `scanf()`) 사용법**: 하단 패널의 **표준 입력(stdin)** 탭에 입력값을 미리 적어둔 뒤 **[실행]** 또는 **[실행 추적]**을 누릅니다.
- **데이터 보호**: iPadOS가 저장 공간 부족 시 장기간 미사용 브라우저 저장소를 정리할 수 있으므로, 좌측 **프로젝트 탭 → ZIP 다운로드** 또는 **설정 → 전체 백업(ZIP)**으로 주기적 백업을 권장합니다.

---

## 6. 테스트 결과 및 수동 테스트 체크리스트

### 자동화 테스트 검증 완료 (`npm test` — 18/18 통과)
- [x] Python Hello World 실제 Pyodide 실행
- [x] Python `input()` 및 `print()` 표준 입출력
- [x] Python 배열, 반복문 및 재귀 함수 실행
- [x] Python 런타임 오류(`ZeroDivisionError`) 및 오류 줄 번호 파싱
- [x] Python `sys.settrace` 실제 실행 추적 (호출 스택, 재귀 깊이, 변수, 배열, 연결 리스트 `Node` 객체)
- [x] C17 Hello World 실제 Clang/LLVM 컴파일 및 WASI 실행
- [x] C17 `scanf()` 및 `printf()` 표준 입출력
- [x] C17 배열 정렬 컴파일 및 실행
- [x] C17 포인터, `malloc`/`calloc`/`realloc`/`free` 동적 메모리 실행
- [x] 잘못된 C 문법 컴파일 오류 및 정확한 줄 번호 진단
- [x] C17 계측 실행 추적 (배열, 재귀 스택, `malloc`/`free` 힙 블록 상태, 연결 리스트 `next` 주소 연결)
- [x] 자료구조 13개 + 알고리즘 15개(총 28개) 학습 콘텐츠 및 동적 스텝 생성 검증
- [x] 6개 정렬(버블/선택/삽입/병합/퀵/힙), 선형/이진 탐색, 0/1 배낭 DP, N-Queens 백트래킹 시뮬레이션 정확성 검증
- [x] Python/C 포맷터 및 ZIP 백업/복원 무결성 검증
- [x] TypeScript 전체 타입 검사 및 Vite 프로덕션 번들 빌드 성공 (`tsc -b && vite build`)

### 실제 iPad / 브라우저 수동 테스트 체크리스트 (실기기 확인 필요)
실제 iPad 실기기 및 Safari/WebKit 환경에서 아래 항목을 최종 확인해 주세요:
- [ ] iPad Safari에서 HTTPS URL 접속 후 **홈 화면에 추가** → 주소창 없는 `standalone` 실행 확인
- [ ] iPad 가로(Landscape) 및 세로(Portrait) 회전 시 레이아웃 및 패널 리사이즈 정상 동작 확인
- [ ] iPad 화면 키보드(가상 키보드) 표시 시 에디터가 가려지지 않고 하단 보조 키 바(`Tab`, `{`, `}`, `;`, `->`)가 정상 입력되는지 확인
- [ ] 설정에서 Python / C17 엔진 다운로드 완료 후 **비행기 모드**에서 두 언어 모두 실행 및 실행 추적 동작 확인
- [ ] 무한 반복문(`while True: pass` / `while (1) {}`) 실행 후 **[중단]** 버튼 클릭 시 UI 멈춤 없이 즉시 종료되는지 확인
- [ ] 파일 수정 후 앱 완전 종료 및 재실행 시 IndexedDB에서 마지막 프로젝트/파일 상태가 복원되는지 확인
- [ ] iPadOS **파일 앱**에서 `.py`/`.c` 파일 가져오기 및 프로젝트 ZIP 백업/복원 확인

---

## 7. 구현 범위, 미구현 기능 및 알려진 제한 사항

### 구현 완료
- Python 3(Pyodide) 및 C17(YoWASP Clang/LLVM + WASI) 실제 클라이언트 실행 및 중단/시간제한
- Python(`sys.settrace`) 및 C17(소스 계측 + 실제 Clang 컴파일 실행) 단계별 실행 추적 및 2D SVG 시각화
- 자료구조 13종 + 알고리즘 15종(총 28종) 동적 학습 시뮬레이션, 예제 코드, 연습 문제
- CodeMirror 6 에디터, iPad 가상 키보드 보조 바, IndexedDB 로컬 프로젝트 관리, ZIP 백업/복원, PWA 오프라인 캐싱

### 미구현 기능 (추후 확장 대상)
- **실시간 대화형(Interactive) stdin 스트리밍**: iPad Safari에서 `SharedArrayBuffer` / COOP·COEP 제약 없이 안정적으로 동작하도록 현재는 사전 입력 방식(`stdin` 패널)을 채택했습니다.
- **멀티 파일 C 프로젝트 자동 링크**: 헤더(`.h`) 포함(`#include "helper.h"`)은 프로젝트 가상 파일시스템으로 지원하지만, 여러 `.c` 파일을 동시에 링크하는 빌드 설정 UI는 추후 확장 항목입니다.
- **Python 외부 서드파티 패키지(`numpy`, `matplotlib` 등) 추가 설치**: 현재는 Python 표준 라이브러리 오프라인 사용에 최적화되어 있습니다.

### 알려진 제한 사항
1. **C17 실행 추적 지원 범위**: 기본 변수(`int`, `long`, `double`, `char` 등), 1차원 고정 배열, 조건/반복문, 함수/재귀 호출 스택, 포인터, `malloc`/`calloc`/`realloc`/`free`, 연결 리스트 구조체 노드를 지원합니다. 복잡한 함수형 매크로, 함수 포인터, `union`, 인라인 어셈블리, 다차원 VLA는 자동 시각화에서 제외될 수 있습니다(일반 **[실행]**은 전체 C17 표준 지원).
2. **Clang 초기 용량 및 iPad 메모리**: `@yowasp/clang` WASM 바이너리는 비압축 약 100 MB(전송 시 약 25~30 MB)입니다. 구형 저용량 RAM iPad에서는 Python과 C 엔진을 동시에 무겁게 실행할 때 탭 메모리가 높아질 수 있으며, 이 경우 디버그 탭 또는 설정의 **워커 초기화**를 사용하면 메모리를 즉시 회수할 수 있습니다.
3. **WASM 32비트 환경**: C 코드는 `wasm32-wasi` 타깃으로 컴파일되므로 `sizeof(void *) == 4` 입니다.

---

## 8. 오픈소스 라이브러리 및 라이선스

| 라이브러리 | 버전 | 라이선스 | 용도 |
|---|---|---|---|
| React / React DOM | `^19.1.0` | MIT | UI 프레임워크 |
| CodeMirror 6 (`codemirror`, `@codemirror/*`) | `^6.x` | MIT | 코드 에디터 |
| Pyodide | `314.0.8` | MPL-2.0 | 클라이언트 Python 3 WebAssembly 런타임 |
| `@yowasp/clang` (LLVM/Clang 22) | `22.0.0-git20695-13` | ISC / Apache-2.0 (LLVM) | 클라이언트 C17 WebAssembly 컴파일러 |
| `@bjorn3/browser_wasi_shim` | `^0.4.2` | MIT OR Apache-2.0 | 브라우저 WASI 실행 환경 |
| `idb` | `^8.0.2` | ISC | IndexedDB 로컬 저장소 |
| `jszip` | `^3.10.1` | MIT / GPL-3.0 | 프로젝트 ZIP 백업/복원 |
| `lucide-react` | `^0.487.0` | ISC | 벡터 아이콘 |
| Vite / Tailwind CSS | `^6.2.6` / `^4.1.3` | MIT | 빌드 및 스타일링 |

자세한 내부 아키텍처와 확장 방법은 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)를 참고하세요.
