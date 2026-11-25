import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessoryBar } from './components/AccessoryBar';
import { BottomPanel } from './components/BottomPanel';
import { DialogModal, type DialogRequest } from './components/DialogModal';
import { EditorPane, type EditorPaneHandle } from './components/EditorPane';
import { InstallBanner } from './components/InstallBanner';
import { LearningPanel } from './components/LearningPanel';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TopBar } from './components/TopBar';
import { TraceVisualizer } from './components/TraceVisualizer';
import {
  checkEngineCacheStatus,
  clearEngineCache,
  downloadAndCacheEngine,
} from './engines/engineManager';
import { RuntimeController } from './engines/runtimeController';
import {
  exportAllProjectsAsZip,
  exportProjectAsZip,
  exportSingleFile,
  importBackupZip,
  importLooseFiles,
} from './storage/backup';
import {
  deleteFileNodes,
  deleteProjectFromDB,
  getRelativePath,
  loadWorkspaceSnapshotSync,
  loadWorkspaceState,
  replaceWorkspaceInDB,
  saveFileNode,
  saveFileNodes,
  saveLayout,
  saveProject,
  saveSession,
  saveSettings,
  saveWorkspaceSnapshotSync,
} from './storage/db';
import { createInitialData, DEFAULT_SETTINGS } from './storage/defaults';
import type {
  AppSettings,
  BottomTab,
  Diagnostic,
  EngineStatus,
  ExecutionResult,
  FileNode,
  FullscreenMode,
  Language,
  Project,
  RightPanelMode,
  SidebarTab,
  TestCase,
  TestCaseRunResult,
} from './types/ide';
import type { TraceResult } from './types/trace';
import { formatCode } from './utils/formatter';
import {
  isIPadOrTouchDevice,
  isStandaloneMode,
  syncThemeColor,
  useVisualViewport,
} from './utils/pwa';

const INITIAL_ENGINE_STATUS: EngineStatus = {
  state: 'checking',
  cached: false,
  version: '확인 중...',
  totalBytes: 0,
  downloadedBytes: 0,
  progress: 0,
  message: '상태 확인 중...',
};

export function App() {
  const bootSnapshot = useMemo(() => loadWorkspaceSnapshotSync(), []);
  const initialData = useMemo(() => bootSnapshot ?? createInitialData(), [bootSnapshot]);
  const [hydrated, setHydrated] = useState(false);
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [files, setFiles] = useState<FileNode[]>(initialData.files);
  const [activeProjectId, setActiveProjectId] = useState<string>(initialData.session.activeProjectId);
  const [activeFileId, setActiveFileId] = useState<string | null>(initialData.session.activeFileId);
  const [openFileIds, setOpenFileIds] = useState<string[]>(initialData.session.openFileIds);
  const [recentFileIds, setRecentFileIds] = useState<string[]>(initialData.session.recentFileIds);
  const [language, setLanguage] = useState<Language>(initialData.session.language);
  const [stdin, setStdin] = useState(initialData.session.stdin);
  const [settings, setSettings] = useState<AppSettings>(bootSnapshot?.settings ?? DEFAULT_SETTINGS);

  // 레이아웃 상태
  const viewport = useVisualViewport();
  const isCompact = viewport.width < 768;
  const isNarrowSidebar = viewport.width < 960;
  const [sidebarOpen, setSidebarOpen] = useState(() => bootSnapshot?.layout?.sidebarOpen ?? window.innerWidth >= 960);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('explorer');
  const [sidebarWidth, setSidebarWidth] = useState(() => bootSnapshot?.layout?.sidebarWidth ?? 245);
  const [rightPanelOpen, setRightPanelOpen] = useState(() => bootSnapshot?.layout?.rightPanelOpen ?? window.innerWidth >= 900);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('trace');
  const [rightPanelWidth, setRightPanelWidth] = useState(
    () => bootSnapshot?.layout?.rightPanelWidth ?? Math.min(460, Math.max(320, Math.round(window.innerWidth * 0.4)))
  );
  const [portraitVizHeight, setPortraitVizHeight] = useState(
    () => bootSnapshot?.layout?.portraitVizHeight ?? Math.max(240, Math.round(window.innerHeight * 0.44))
  );
  const [bottomTab, setBottomTab] = useState<BottomTab>('output');
  const [bottomCollapsed, setBottomCollapsed] = useState(() => bootSnapshot?.layout?.bottomCollapsed ?? false);
  const [bottomHeight, setBottomHeight] = useState(() => bootSnapshot?.layout?.bottomHeight ?? 195);
  const [resizingAxis, setResizingAxis] = useState<'sidebar' | 'right' | 'bottom' | 'portraitViz' | null>(null);
  const [fullscreen, setFullscreen] = useState<FullscreenMode>('none');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState('algo-bubble-sort');

  // 실행 및 추적 상태
  const [isRunning, setIsRunning] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [traceStepIdx, setTraceStepIdx] = useState(0);
  const [testCases, setTestCases] = useState<TestCase[]>(
    () =>
      bootSnapshot?.session?.testCases && bootSnapshot.session.testCases.length > 0
        ? bootSnapshot.session.testCases
        : [{ id: 'tc-default-1', name: '테스트 #1', input: '', expectedOutput: '' }]
  );
  const [testResults, setTestResults] = useState<TestCaseRunResult[]>([]);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [toast, setToast] = useState<string | null>(null);

  // 엔진 & PWA 상태
  const [pythonEngine, setPythonEngine] = useState<EngineStatus>(INITIAL_ENGINE_STATUS);
  const [cEngine, setCEngine] = useState<EngineStatus>(INITIAL_ENGINE_STATUS);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [standalone] = useState(() => isStandaloneMode());
  const [touchDevice] = useState(() => isIPadOrTouchDevice());
  const [dismissInstallBanner, setDismissInstallBanner] = useState(() => {
    try {
      return localStorage.getItem('cs_dismiss_install') === '1';
    } catch {
      return false;
    }
  });

  const editorRef = useRef<EditorPaneHandle | null>(null);
  const runtimeRef = useRef<RuntimeController | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const pendingSaveNodeRef = useRef<FileNode | null>(null);
  const filesRef = useRef<FileNode[]>(files);
  const projectsRef = useRef<Project[]>(projects);
  filesRef.current = files;
  projectsRef.current = projects;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  // 1. IndexedDB 초기 로드 및 스플래시 숨김 (실패 시에도 반드시 화면 표시)
  useEffect(() => {
    let mounted = true;
    const hideSplash = () => {
      const splash = document.getElementById('app-splash');
      if (splash) {
        splash.classList.add('hidden');
        window.setTimeout(() => splash.remove(), 350);
      }
    };

    loadWorkspaceState()
      .then((data) => {
        if (!mounted) return;
        setProjects(data.projects);
        setFiles(data.files);
        setSettings(data.settings);
        setActiveProjectId(data.session.activeProjectId);
        setActiveFileId(data.session.activeFileId);
        setOpenFileIds(data.session.openFileIds);
        setRecentFileIds(data.session.recentFileIds);
        setLanguage(data.session.language);
        setStdin(data.session.stdin);
        if (Array.isArray(data.session.testCases) && data.session.testCases.length > 0) {
          setTestCases(data.session.testCases);
        }
        if (data.layout) {
          setSidebarWidth(data.layout.sidebarWidth);
          setRightPanelWidth(data.layout.rightPanelWidth);
          setBottomHeight(data.layout.bottomHeight);
          setPortraitVizHeight(data.layout.portraitVizHeight);
          setSidebarOpen(data.layout.sidebarOpen);
          setRightPanelOpen(data.layout.rightPanelOpen);
          setBottomCollapsed(data.layout.bottomCollapsed);
        }
        syncThemeColor(data.settings.theme);
        setHydrated(true);
        if (data.storageFallback) {
          showToast('임시 메모리 모드로 열렸습니다 (개인정보 보호 모드 등에서는 저장이 제한됩니다).');
        }
      })
      .catch((err) => {
        console.error('[App] 초기화 오류:', err);
        if (mounted) setHydrated(true);
      })
      .finally(() => {
        hideSplash();
      });

    return () => {
      mounted = false;
    };
  }, [showToast]);

  // 2. Web Worker 런타임 컨트롤러 및 엔진 캐시 상태 확인
  useEffect(() => {
    runtimeRef.current = new RuntimeController((lang, phase, message, progress) => {
      const setter = lang === 'python' ? setPythonEngine : setCEngine;
      setter((prev) => ({
        ...prev,
        state:
          phase === 'ready'
            ? 'ready'
            : phase === 'initializing'
              ? 'initializing'
              : 'idle',
        message,
        progress: typeof progress === 'number' ? progress : prev.progress,
      }));
    });

    Promise.all([checkEngineCacheStatus('python'), checkEngineCacheStatus('c')]).then(
      ([pySt, cSt]) => {
        setPythonEngine(pySt);
        setCEngine(cSt);
      }
    );

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      runtimeRef.current?.dispose();
    };
  }, []);

  // 3. 테마 동기화
  useEffect(() => {
    syncThemeColor(settings.theme);
  }, [settings.theme]);

  // 4. 세션 자동 저장
  useEffect(() => {
    if (!hydrated) return;
    saveSession({
      activeProjectId,
      activeFileId,
      openFileIds,
      recentFileIds,
      language,
      stdin,
      testCases,
    }).catch(() => {});
  }, [hydrated, activeProjectId, activeFileId, openFileIds, recentFileIds, language, stdin, testCases]);

  // 5. 패널 크기 및 열림 상태 자동 저장
  useEffect(() => {
    if (!hydrated || resizingAxis !== null) return;
    const timer = window.setTimeout(() => {
      saveLayout({
        sidebarWidth,
        rightPanelWidth,
        bottomHeight,
        portraitVizHeight,
        sidebarOpen,
        rightPanelOpen,
        bottomCollapsed,
      }).catch(() => {});
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    resizingAxis,
    sidebarWidth,
    rightPanelWidth,
    bottomHeight,
    portraitVizHeight,
    sidebarOpen,
    rightPanelOpen,
    bottomCollapsed,
  ]);

  // 5-1. 모든 워크스페이스 변경을 localStorage 스냅샷에 즉시 동기 백업 (iPadOS 앱 강제 종료 / IDB 지연 대비)
  useEffect(() => {
    if (!hydrated || resizingAxis !== null) return;
    saveWorkspaceSnapshotSync({
      projects,
      files,
      settings,
      session: {
        activeProjectId,
        activeFileId,
        openFileIds,
        recentFileIds,
        language,
        stdin,
        testCases,
      },
      layout: {
        sidebarWidth,
        rightPanelWidth,
        bottomHeight,
        portraitVizHeight,
        sidebarOpen,
        rightPanelOpen,
        bottomCollapsed,
      },
    });
  }, [
    hydrated,
    resizingAxis,
    projects,
    files,
    settings,
    activeProjectId,
    activeFileId,
    openFileIds,
    recentFileIds,
    language,
    stdin,
    testCases,
    sidebarWidth,
    rightPanelWidth,
    bottomHeight,
    portraitVizHeight,
    sidebarOpen,
    rightPanelOpen,
    bottomCollapsed,
  ]);

  // 5-2. 앱 전환·종료 직전 대기 중인 파일 저장 즉시 플러시
  useEffect(() => {
    const flushPendingSave = () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (pendingSaveNodeRef.current) {
        const node = pendingSaveNodeRef.current;
        pendingSaveNodeRef.current = null;
        saveFileNode(node).catch(() => {});
      }
    };
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') flushPendingSave();
    };
    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, []);

  // 파생 데이터
  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || null,
    [files, activeFileId]
  );

  const openFiles = useMemo(() => {
    const map = new Map(files.map((f) => [f.id, f]));
    return openFileIds.map((id) => map.get(id)).filter((f): f is FileNode => Boolean(f));
  }, [files, openFileIds]);

  const activeTraceLine = useMemo(() => {
    if (!rightPanelOpen || rightPanelMode !== 'trace' || !traceResult?.steps.length) {
      return null;
    }
    const step = traceResult.steps[traceStepIdx];
    return step ? step.line : null;
  }, [rightPanelOpen, rightPanelMode, traceResult, traceStepIdx]);

  // 프로젝트 내 전체 파일 맵 (가상 파일시스템 마운트용)
  const buildProjectVirtualFiles = useCallback(
    (projectId: string): Record<string, string> => {
      const pFiles = files.filter((f) => f.projectId === projectId);
      const map: Record<string, string> = {};
      for (const node of pFiles) {
        if (node.type === 'file') {
          map[getRelativePath(node.id, pFiles)] = node.content;
        }
      }
      return map;
    },
    [files]
  );

  // 파일 선택 시 탭 열기 및 언어 자동 맞춤
  const handleSelectFile = useCallback(
    (fileId: string) => {
      const target = files.find((f) => f.id === fileId);
      if (!target || target.type !== 'file') return;
      setActiveProjectId(target.projectId);
      setActiveFileId(target.id);
      setOpenFileIds((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
      setRecentFileIds((prev) => [target.id, ...prev.filter((id) => id !== target.id)].slice(0, 10));
      if (target.name.endsWith('.py')) setLanguage('python');
      else if (target.name.endsWith('.c') || target.name.endsWith('.h')) setLanguage('c');
      setTraceResult(null);
      setTraceStepIdx(0);
      if (isCompact) setSidebarOpen(false);
    },
    [files, isCompact]
  );

  const handleCloseTab = useCallback(
    (fileId: string) => {
      setOpenFileIds((prev) => {
        const next = prev.filter((id) => id !== fileId);
        if (activeFileId === fileId) {
          setActiveFileId(next.length > 0 ? next[next.length - 1] : null);
        }
        return next;
      });
    },
    [activeFileId]
  );

  // 코드 편집 및 IndexedDB + localStorage 자동 저장
  const handleChangeContent = useCallback(
    (fileId: string, newContent: string) => {
      const now = Date.now();
      const current = filesRef.current.find((f) => f.id === fileId);
      const updatedNode: FileNode | null = current
        ? { ...current, content: newContent, updatedAt: now }
        : null;

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, content: newContent, updatedAt: now } : f))
      );
      // 코드가 수정되면 기존 추적 결과는 오래된 스냅샷이므로 해제
      setTraceResult(null);

      if (settings.autoSave && updatedNode) {
        pendingSaveNodeRef.current = updatedNode;
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
          const toSave = pendingSaveNodeRef.current;
          pendingSaveNodeRef.current = null;
          if (toSave) saveFileNode(toSave).catch(() => {});
        }, 150);
      }
    },
    [settings.autoSave]
  );

  // 언어 전환 시 해당 언어의 프로젝트 파일 자동 선택 (또는 새 파일 안내)
  const handleSelectLanguage = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      const ext = lang === 'python' ? '.py' : '.c';
      if (activeFile && activeFile.name.endsWith(ext)) return;
      const candidate = files.find(
        (f) => f.projectId === activeProjectId && f.type === 'file' && f.name.endsWith(ext)
      );
      if (candidate) {
        setActiveFileId(candidate.id);
        setOpenFileIds((prev) => (prev.includes(candidate.id) ? prev : [...prev, candidate.id]));
      }
    },
    [activeFile, files, activeProjectId]
  );

  // 실제 코드 실행
  const handleRun = useCallback(async () => {
    if (!activeFile || !runtimeRef.current) {
      showToast('실행할 파일을 먼저 선택해 주세요.');
      return;
    }
    const runLang: Language = activeFile.name.endsWith('.py')
      ? 'python'
      : activeFile.name.endsWith('.c')
        ? 'c'
        : language;
    setLanguage(runLang);
    setIsRunning(true);
    setBottomCollapsed(false);
    setBottomTab('output');

    const pFiles = files.filter((f) => f.projectId === activeFile.projectId);
    const relPath = getRelativePath(activeFile.id, pFiles);
    const virtualFiles = buildProjectVirtualFiles(activeFile.projectId);

    const res = await runtimeRef.current.runCode({
      language: runLang,
      code: activeFile.content,
      filename: relPath,
      files: virtualFiles,
      stdin,
      timeoutSec: settings.timeoutSec,
    });

    setExecResult(res);
    setIsRunning(false);

    // 실행 완료 후 오프라인 캐시 상태 갱신 (Service Worker가 자동 캐시했을 수 있음)
    checkEngineCacheStatus(runLang).then((st) => {
      if (runLang === 'python') setPythonEngine(st);
      else setCEngine(st);
    });

    if (!res.ok && res.diagnostics.length > 0 && res.terminatedReason === 'compile_error') {
      setBottomTab('problems');
    }
  }, [activeFile, language, files, buildProjectVirtualFiles, stdin, settings.timeoutSec, showToast]);

  // 실제 코드 실행 과정 추적
  const handleTrace = useCallback(async () => {
    if (!activeFile || !runtimeRef.current) {
      showToast('추적할 파일을 먼저 선택해 주세요.');
      return;
    }
    const runLang: Language = activeFile.name.endsWith('.py')
      ? 'python'
      : activeFile.name.endsWith('.c')
        ? 'c'
        : language;
    setLanguage(runLang);
    setRightPanelOpen(true);
    setRightPanelMode('trace');
    setIsTracing(true);

    const pFiles = files.filter((f) => f.projectId === activeFile.projectId);
    const relPath = getRelativePath(activeFile.id, pFiles);
    const virtualFiles = buildProjectVirtualFiles(activeFile.projectId);

    const res = await runtimeRef.current.traceCode({
      language: runLang,
      code: activeFile.content,
      filename: relPath,
      files: virtualFiles,
      stdin,
      timeoutSec: settings.timeoutSec,
      maxSteps: settings.maxTraceSteps,
    });

    setTraceResult(res);
    setTraceStepIdx(0);
    setIsTracing(false);

    // 하단 출력도 함께 갱신
    setExecResult({
      language: runLang,
      ok: res.ok,
      compiled: res.ok || Boolean(res.stdout),
      stdout: res.stdout,
      stderr: res.stderr,
      compileOutput: res.compileOutput,
      diagnostics: [],
      exitCode: res.ok ? 0 : 1,
      executionTimeMs: res.executionTimeMs,
    });

    checkEngineCacheStatus(runLang).then((st) => {
      if (runLang === 'python') setPythonEngine(st);
      else setCEngine(st);
    });
  }, [
    activeFile,
    language,
    files,
    buildProjectVirtualFiles,
    stdin,
    settings.timeoutSec,
    settings.maxTraceSteps,
    showToast,
  ]);

  const handleStop = useCallback(() => {
    runtimeRef.current?.stop(language);
    setIsRunning(false);
    setIsTracing(false);
    showToast('실행을 중단하고 엔진 워커를 정리했습니다.');
  }, [language, showToast]);

  const handleResetWorker = useCallback(
    (lang: Language) => {
      runtimeRef.current?.reset(lang);
      showToast(`${lang === 'python' ? 'Python' : 'C17'} 워커를 초기화했습니다.`);
    },
    [showToast]
  );

  // 오프라인 엔진 다운로드 & 재설치
  const handleDownloadEngine = useCallback(
    async (lang: Language) => {
      const setter = lang === 'python' ? setPythonEngine : setCEngine;
      try {
        await downloadAndCacheEngine(lang, (st) => setter(st));
        showToast(`${lang === 'python' ? 'Python 3' : 'C17 Clang'} 오프라인 캐시 설치 완료!`);
      } catch (err) {
        setter((prev) => ({
          ...prev,
          state: 'error',
          error: err instanceof Error ? err.message : String(err),
          message: '다운로드 실패 (네트워크 연결 확인)',
        }));
      }
    },
    [showToast]
  );

  const handleClearReinstallEngine = useCallback(
    async (lang: Language) => {
      runtimeRef.current?.reset(lang);
      await clearEngineCache(lang);
      await handleDownloadEngine(lang);
    },
    [handleDownloadEngine]
  );

  // 코드 자동 정렬
  const handleFormat = useCallback(() => {
    if (!activeFile) return;
    const lang: Language = activeFile.name.endsWith('.py') ? 'python' : 'c';
    const formatted = formatCode(activeFile.content, lang, settings.tabSize);
    handleChangeContent(activeFile.id, formatted);
    showToast('코드를 정리했습니다.');
  }, [activeFile, settings.tabSize, handleChangeContent, showToast]);

  // 파일 / 폴더 CRUD
  const handleCreateNode = useCallback(
    async (type: 'file' | 'folder', name: string, parentId: string | null) => {
      const now = Date.now();
      const node: FileNode = {
        id: `node_${now}_${Math.random().toString(36).slice(2, 7)}`,
        projectId: activeProjectId,
        parentId,
        name,
        type,
        content: '',
        createdAt: now,
        updatedAt: now,
      };
      setFiles((prev) => [...prev, node]);
      await saveFileNode(node);
      if (type === 'file') {
        setActiveFileId(node.id);
        setOpenFileIds((prev) => [...prev, node.id]);
        if (name.endsWith('.py')) setLanguage('python');
        else if (name.endsWith('.c')) setLanguage('c');
      }
    },
    [activeProjectId]
  );

  const handleRenameNode = useCallback(async (nodeId: string, newName: string) => {
    const current = filesRef.current.find((f) => f.id === nodeId);
    if (!current) return;
    const target: FileNode = { ...current, name: newName, updatedAt: Date.now() };
    setFiles((prev) => prev.map((f) => (f.id === nodeId ? target : f)));
    await saveFileNode(target);
  }, []);

  const handleMoveNode = useCallback(async (nodeId: string, targetParentId: string | null) => {
    const current = filesRef.current.find((f) => f.id === nodeId);
    if (!current) return;
    const target: FileNode = { ...current, parentId: targetParentId, updatedAt: Date.now() };
    setFiles((prev) => prev.map((f) => (f.id === nodeId ? target : f)));
    await saveFileNode(target);
  }, []);

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      // 하위 노드까지 모두 수집
      const toDelete = new Set<string>([nodeId]);
      let added = true;
      while (added) {
        added = false;
        for (const f of files) {
          if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
            toDelete.add(f.id);
            added = true;
          }
        }
      }
      const ids = Array.from(toDelete);
      setFiles((prev) => prev.filter((f) => !toDelete.has(f.id)));
      setOpenFileIds((prev) => prev.filter((id) => !toDelete.has(id)));
      if (activeFileId && toDelete.has(activeFileId)) {
        setActiveFileId(null);
      }
      await deleteFileNodes(ids);
    },
    [files, activeFileId]
  );

  // 프로젝트 CRUD
  const handleCreateProject = useCallback(async (name: string) => {
    const now = Date.now();
    const proj: Project = {
      id: `proj_${now}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      isExample: false,
      createdAt: now,
      updatedAt: now,
    };
    const starter: FileNode = {
      id: `file_${now}_py`,
      projectId: proj.id,
      parentId: null,
      name: 'main.py',
      type: 'file',
      content: '',
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [...prev, proj]);
    setFiles((prev) => [...prev, starter]);
    setActiveProjectId(proj.id);
    setActiveFileId(starter.id);
    setOpenFileIds([starter.id]);
    setSidebarTab('explorer');
    await saveProject(proj);
    await saveFileNode(starter);
  }, []);

  const handleRenameProject = useCallback(async (projectId: string, newName: string) => {
    const current = projectsRef.current.find((p) => p.id === projectId);
    if (!current) return;
    const updated: Project = { ...current, name: newName, updatedAt: Date.now() };
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
    await saveProject(updated);
  }, []);

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      const remaining = projects.filter((p) => p.id !== projectId);
      if (remaining.length === 0) return;
      setProjects(remaining);
      setFiles((prev) => prev.filter((f) => f.projectId !== projectId));
      if (activeProjectId === projectId) {
        const nextProj = remaining[0];
        setActiveProjectId(nextProj.id);
        const nextFile = files.find((f) => f.projectId === nextProj.id && f.type === 'file');
        setActiveFileId(nextFile?.id || null);
        setOpenFileIds(nextFile ? [nextFile.id] : []);
      }
      await deleteProjectFromDB(projectId);
    },
    [projects, activeProjectId, files]
  );

  // 파일/ZIP 가져오기 & 내보내기
  const handleImportFiles = useCallback(
    async (fileList: FileList, parentId: string | null) => {
      const nodes = await importLooseFiles(fileList, activeProjectId, parentId);
      if (nodes.length === 0) {
        showToast('지원 형식(.py, .c, .h, .txt) 파일이 없습니다.');
        return;
      }
      setFiles((prev) => [...prev, ...nodes]);
      await saveFileNodes(nodes);
      setActiveFileId(nodes[0].id);
      setOpenFileIds((prev) => [...prev, nodes[0].id]);
      showToast(`${nodes.length}개 파일을 가져왔습니다.`);
    },
    [activeProjectId, showToast]
  );

  const handleExportProjectZip = useCallback(
    async (projectId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;
      const pFiles = files.filter((f) => f.projectId === projectId);
      await exportProjectAsZip(proj, pFiles);
      showToast(`"${proj.name}" ZIP 백업을 저장했습니다.`);
    },
    [projects, files, showToast]
  );

  const handleImportProjectZip = useCallback(
    async (file: File) => {
      try {
        const imported = await importBackupZip(file);
        if (imported.kind === 'all') {
          const fileCount = imported.files.filter((f) => f.type === 'file').length;
          setDialog({
            kind: 'confirm',
            title: '전체 백업 복원',
            message: `프로젝트 ${imported.projects.length}개, 파일 ${fileCount}개가 포함된 전체 백업입니다.\n현재 워크스페이스를 이 백업으로 복원하시겠습니까?`,
            confirmLabel: '복원하기',
            onConfirm: async () => {
              const firstProj = imported.projects.find((p) => !p.isExample) || imported.projects[0];
              const firstFile =
                imported.files.find((f) => f.projectId === firstProj.id && f.type === 'file') ||
                imported.files.find((f) => f.type === 'file') ||
                null;
              const nextLang: Language = firstFile?.name.endsWith('.c') ? 'c' : 'python';
              const nextSession = {
                activeProjectId: firstProj.id,
                activeFileId: firstFile?.id || null,
                openFileIds: firstFile ? [firstFile.id] : [],
                recentFileIds: firstFile ? [firstFile.id] : [],
                language: nextLang,
                stdin: '',
                testCases,
              };
              setProjects(imported.projects);
              setFiles(imported.files);
              setActiveProjectId(nextSession.activeProjectId);
              setActiveFileId(nextSession.activeFileId);
              setOpenFileIds(nextSession.openFileIds);
              setRecentFileIds(nextSession.recentFileIds);
              setLanguage(nextLang);
              setSidebarTab('explorer');
              setSettingsOpen(false);
              await replaceWorkspaceInDB(imported.projects, imported.files, settings, nextSession);
              showToast(`전체 백업 복원 완료! (프로젝트 ${imported.projects.length}개, 파일 ${fileCount}개)`);
            },
          });
          return;
        }

        const { project, files: importedFiles } = imported;
        setProjects((prev) => [...prev, project]);
        setFiles((prev) => [...prev, ...importedFiles]);
        setActiveProjectId(project.id);
        const first = importedFiles.find((f) => f.type === 'file') || null;
        setActiveFileId(first?.id || null);
        setOpenFileIds(first ? [first.id] : []);
        setSidebarTab('explorer');
        setSettingsOpen(false);
        await saveProject(project);
        await saveFileNodes(importedFiles);
        showToast(`"${project.name}" (${importedFiles.length}개 항목) 복원 완료!`);
      } catch (err) {
        showToast(`ZIP 복원 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
      }
    },
    [settings, testCases, showToast]
  );

  // 학습 모드 예제/연습 코드를 사용자 프로젝트로 복사
  const handleCopyLearningToEditor = useCallback(
    async (
      code: string,
      lang: Language,
      filename: string,
      sampleInput?: string,
      expectedOutput?: string
    ) => {
      const userProj = projects.find((p) => !p.isExample) || projects[0];
      if (!userProj) return;
      const now = Date.now();
      const existing = files.find(
        (f) => f.projectId === userProj.id && f.parentId === null && f.name === filename
      );

      let targetFile: FileNode;
      if (existing) {
        targetFile = { ...existing, content: code, updatedAt: now };
        setFiles((prev) => prev.map((f) => (f.id === existing.id ? targetFile : f)));
      } else {
        targetFile = {
          id: `file_${now}_${Math.random().toString(36).slice(2, 7)}`,
          projectId: userProj.id,
          parentId: null,
          name: filename,
          type: 'file',
          content: code,
          isExample: false,
          createdAt: now,
          updatedAt: now,
        };
        setFiles((prev) => [...prev, targetFile]);
      }

      await saveFileNode(targetFile);
      setActiveProjectId(userProj.id);
      setActiveFileId(targetFile.id);
      setOpenFileIds((prev) => (prev.includes(targetFile.id) ? prev : [...prev, targetFile.id]));
      setLanguage(lang);
      setTraceResult(null);
      if (sampleInput !== undefined) setStdin(sampleInput);
      if (sampleInput !== undefined && expectedOutput !== undefined) {
        setTestCases([
          {
            id: `tc_practice_${now}`,
            name: '연습 예제 #1',
            input: sampleInput,
            expectedOutput,
          },
        ]);
        setTestResults([]);
        setBottomCollapsed(false);
        setBottomTab('tests');
      }
      if (fullscreen === 'visualizer') setFullscreen('none');
      showToast(`"${filename}"을(를) 편집기로 복사했습니다. 자유롭게 수정 후 실행해 보세요!`);
    },
    [projects, files, fullscreen, showToast]
  );

  // 멀티 테스트 케이스 일괄 실행 및 자동 채점
  const handleRunAllTestCases = useCallback(async () => {
    if (!activeFile || !runtimeRef.current) {
      showToast('채점할 파일을 먼저 선택해 주세요.');
      return;
    }
    if (testCases.length === 0) return;

    const runLang: Language = activeFile.name.endsWith('.py')
      ? 'python'
      : activeFile.name.endsWith('.c')
        ? 'c'
        : language;
    setLanguage(runLang);
    setIsRunningTests(true);
    setTestResults([]);
    setBottomCollapsed(false);
    setBottomTab('tests');

    const pFiles = files.filter((f) => f.projectId === activeFile.projectId);
    const relPath = getRelativePath(activeFile.id, pFiles);
    const virtualFiles = buildProjectVirtualFiles(activeFile.projectId);
    const normalizeOut = (s: string) =>
      s
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((l) => l.trimEnd())
        .join('\n')
        .trim();

    const collected: TestCaseRunResult[] = [];
    for (const tc of testCases) {
      const res = await runtimeRef.current.runCode({
        language: runLang,
        code: activeFile.content,
        filename: relPath,
        files: virtualFiles,
        stdin: tc.input,
        timeoutSec: settings.timeoutSec,
      });

      let status: TestCaseRunResult['status'] = 'error';
      if (res.ok) {
        const expectedNorm = normalizeOut(tc.expectedOutput);
        const actualNorm = normalizeOut(res.stdout);
        status = !expectedNorm || expectedNorm === actualNorm ? 'pass' : 'fail';
      }
      const item: TestCaseRunResult = {
        testCaseId: tc.id,
        status,
        actualOutput: res.stdout,
        stderr: res.stderr || res.compileOutput || '',
        executionTimeMs: res.executionTimeMs,
      };
      collected.push(item);
      setTestResults([...collected]);

      // 컴파일 오류면 나머지 케이스 실행 중단
      if (res.terminatedReason === 'compile_error') break;
    }

    setIsRunningTests(false);
    const passCnt = collected.filter((r) => r.status === 'pass').length;
    showToast(`테스트 채점 완료: ${passCnt} / ${testCases.length} 통과`);
  }, [activeFile, testCases, language, files, buildProjectVirtualFiles, settings.timeoutSec, showToast]);

  const handleUpdateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next).catch(() => {});
      return next;
    });
  }, []);

  const handleJumpToDiagnostic = useCallback(
    (d: Diagnostic) => {
      const target = files.find(
        (f) => f.projectId === activeProjectId && (f.name === d.file || d.file.endsWith(f.name))
      );
      if (target && target.id !== activeFileId) {
        handleSelectFile(target.id);
      }
      window.setTimeout(() => editorRef.current?.jumpToLine(d.line), 30);
    },
    [files, activeProjectId, activeFileId, handleSelectFile]
  );

  // 전역 외장 키보드 단축키 (VS Code 호환)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (dialog) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning && !isTracing) handleTrace();
      } else if (mod && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning && !isTracing) handleRun();
      } else if (mod && key === 's') {
        e.preventDefault();
        if (activeFile) {
          saveFileNode(activeFile).catch(() => {});
          showToast(`${activeFile.name} 저장 완료`);
        }
      } else if (mod && !e.shiftKey && key === 'b') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      } else if (mod && !e.shiftKey && key === 'j') {
        e.preventDefault();
        setBottomCollapsed((v) => !v);
      } else if (mod && e.shiftKey && key === 'v') {
        e.preventDefault();
        setRightPanelOpen((v) => !v);
      } else if (e.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (isRunning || isTracing) {
          handleStop();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeFile, dialog, settingsOpen, isRunning, isTracing, handleRun, handleTrace, handleStop, showToast]);

  // 터치(iPad) + 트랙패드/마우스 모두 부드럽게 작동하는 패널 리사이즈 핸들러
  const startResize = (
    axis: 'sidebar' | 'right' | 'bottom' | 'portraitViz',
    startEvent: React.PointerEvent<HTMLDivElement>
  ) => {
    startEvent.preventDefault();
    const targetEl = startEvent.currentTarget;
    try {
      targetEl.setPointerCapture(startEvent.pointerId);
    } catch {
      // 일부 브라우저 무시
    }
    setResizingAxis(axis);

    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const initSidebar = sidebarWidth;
    const initRight = rightPanelWidth;
    const initBottom = bottomHeight;
    const initPortraitViz = portraitVizHeight;

    const onMove = (ev: PointerEvent) => {
      if (axis === 'sidebar') {
        const maxSide = Math.min(420, Math.round(viewport.width * 0.42));
        setSidebarWidth(Math.max(170, Math.min(maxSide, initSidebar + (ev.clientX - startX))));
      } else if (axis === 'right') {
        const maxRight = Math.max(300, viewport.width - (sidebarOpen && !isNarrowSidebar ? sidebarWidth : 0) - 220);
        setRightPanelWidth(Math.max(240, Math.min(maxRight, initRight - (ev.clientX - startX))));
      } else if (axis === 'portraitViz') {
        const maxH = Math.max(220, Math.round(viewport.height * 0.72));
        setPortraitVizHeight(Math.max(160, Math.min(maxH, initPortraitViz - (ev.clientY - startY))));
      } else {
        const maxBottom = Math.max(180, Math.round(viewport.height * 0.6));
        setBottomHeight(Math.max(96, Math.min(maxBottom, initBottom - (ev.clientY - startY))));
      }
    };
    const onUp = () => {
      setResizingAxis(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const activeEngineStatus = language === 'python' ? pythonEngine : cEngine;
  const showAccessory = settings.showAccessoryBar === 'always';

  return (
    <div
      className="flex flex-col w-full overflow-hidden bg-[var(--bg-root)] text-[var(--text-primary)]"
      style={{ height: `${viewport.height}px` }}
    >
      {/* 일반 브라우저 접속 시 홈 화면 설치 안내 배너 */}
      {!standalone && !dismissInstallBanner && (
        <InstallBanner
          onDismiss={() => {
            setDismissInstallBanner(true);
            try {
              localStorage.setItem('cs_dismiss_install', '1');
            } catch {
              // 무시
            }
          }}
        />
      )}

      {/* 상단 툴바 */}
      <TopBar
        language={language}
        isRunning={isRunning}
        isTracing={isTracing}
        theme={settings.theme}
        sidebarOpen={sidebarOpen}
        rightPanelOpen={rightPanelOpen}
        rightPanelMode={rightPanelMode}
        activeEngineStatus={activeEngineStatus}
        onSelectLanguage={handleSelectLanguage}
        onRun={handleRun}
        onStop={handleStop}
        onTrace={handleTrace}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
        onOpenLearningMode={() => {
          setRightPanelMode('learning');
          setRightPanelOpen(true);
          setSidebarTab('learning');
          if (!isCompact) setSidebarOpen(true);
        }}
        onToggleTheme={() =>
          handleUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
        }
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* 메인 IDE 워크스페이스 (가로 화면은 좌우 분할, 좁은 세로 화면은 상하 분할 + 드래그 크기 조절) */}
      <div
        className={`relative flex flex-1 min-h-0 overflow-hidden ${
          isCompact ? 'flex-col' : 'flex-row'
        }`}
      >
        {/* 좌측 사이드바 */}
        {sidebarOpen && fullscreen === 'none' && (
          <>
            {isNarrowSidebar && (
              <div
                className="fixed inset-0 z-30 bg-black/50"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <div
              style={{ width: isNarrowSidebar ? Math.min(300, viewport.width * 0.82) : sidebarWidth }}
              className={
                isNarrowSidebar
                  ? 'fixed inset-y-0 left-0 z-40 shadow-2xl pt-[env(safe-area-inset-top)]'
                  : 'shrink-0 h-full min-h-0'
              }
            >
              <Sidebar
                tab={sidebarTab}
                language={language}
                projects={projects}
                activeProjectId={activeProjectId}
                files={files}
                activeFileId={activeFileId}
                recentFileIds={recentFileIds}
                selectedTopicId={selectedTopicId}
                onChangeTab={setSidebarTab}
                onSelectProject={(pid) => {
                  setActiveProjectId(pid);
                  setSidebarTab('explorer');
                  const first = files.find((f) => f.projectId === pid && f.type === 'file');
                  if (first) handleSelectFile(first.id);
                }}
                onCreateProject={handleCreateProject}
                onRenameProject={handleRenameProject}
                onDeleteProject={handleDeleteProject}
                onSelectFile={handleSelectFile}
                onCreateNode={handleCreateNode}
                onRenameNode={handleRenameNode}
                onMoveNode={handleMoveNode}
                onDeleteNode={handleDeleteNode}
                onImportFiles={handleImportFiles}
                onExportFile={exportSingleFile}
                onExportProjectZip={handleExportProjectZip}
                onImportProjectZip={handleImportProjectZip}
                onSelectLearningTopic={(tid) => {
                  setSelectedTopicId(tid);
                  setRightPanelMode('learning');
                  setRightPanelOpen(true);
                  if (isNarrowSidebar) setSidebarOpen(false);
                }}
                onOpenDialog={setDialog}
              />
            </div>

            {!isNarrowSidebar && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="사이드바 너비 조절"
                onPointerDown={(e) => startResize('sidebar', e)}
                className={`touch-none select-none w-3 cursor-col-resize flex items-center justify-center shrink-0 transition-colors ${
                  resizingAxis === 'sidebar'
                    ? 'bg-sky-500/30'
                    : 'bg-[var(--bg-root)] hover:bg-sky-500/15'
                }`}
              >
                <div className="w-1 h-10 rounded-full bg-[var(--border-strong)]" />
              </div>
            )}
          </>
        )}

        {/* 중앙: 코드 에디터 + 보조 키 바 + 하단 패널 */}
        {fullscreen !== 'visualizer' && (
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <EditorPane
                ref={editorRef}
                openFiles={openFiles}
                activeFile={activeFile}
                language={language}
                theme={settings.theme}
                fontSize={settings.fontSize}
                tabSize={settings.tabSize}
                wordWrap={settings.wordWrap}
                diagnostics={execResult?.diagnostics || []}
                activeTraceLine={activeTraceLine}
                isFullscreen={fullscreen === 'editor'}
                onSelectTab={handleSelectFile}
                onCloseTab={handleCloseTab}
                onChangeContent={handleChangeContent}
                onCursorChange={(line, col) => setCursor({ line, col })}
                onFormat={handleFormat}
                onRunShortcut={handleRun}
                onTraceShortcut={handleTrace}
                onChangeFontSize={(delta) =>
                  handleUpdateSettings({
                    fontSize: Math.max(12, Math.min(24, settings.fontSize + delta)),
                  })
                }
                onToggleFullscreen={() =>
                  setFullscreen((f) => (f === 'editor' ? 'none' : 'editor'))
                }
              />
            </div>

            {/* iPad 가상 키보드 보조 입력 바 */}
            {showAccessory && (
              <AccessoryBar
                language={language}
                tabSize={settings.tabSize}
                onInsert={(txt) => editorRef.current?.insertText(txt)}
                onMoveCursor={(d) => editorRef.current?.moveCursor(d)}
                onUndo={() => editorRef.current?.undo()}
                onRedo={() => editorRef.current?.redo()}
                onSearch={() => editorRef.current?.openSearch()}
              />
            )}

            {/* 하단 입출력 패널 (터치 드래그로 높이 조절 가능) */}
            {fullscreen === 'none' && !viewport.keyboardOpen && (
              <>
                {!bottomCollapsed && (
                  <div
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label="하단 출력 패널 높이 조절"
                    onPointerDown={(e) => startResize('bottom', e)}
                    className={`touch-none select-none h-3 cursor-row-resize flex items-center justify-center shrink-0 transition-colors ${
                      resizingAxis === 'bottom'
                        ? 'bg-sky-500/30'
                        : 'bg-[var(--bg-root)] hover:bg-sky-500/15'
                    }`}
                  >
                    <div className="h-1 w-12 rounded-full bg-[var(--border-strong)]" />
                  </div>
                )}
                <div
                  style={{ height: bottomCollapsed ? 36 : bottomHeight }}
                  className="shrink-0 min-h-0 overflow-hidden"
                >
                  <BottomPanel
                    tab={bottomTab}
                    collapsed={bottomCollapsed}
                    stdin={stdin}
                    language={language}
                    isRunning={isRunning}
                    isRunningTests={isRunningTests}
                    result={execResult}
                    traceResult={traceResult}
                    engineStatus={activeEngineStatus}
                    testCases={testCases}
                    testResults={testResults}
                    onChangeTab={setBottomTab}
                    onToggleCollapse={() => setBottomCollapsed((c) => !c)}
                    onChangeStdin={setStdin}
                    onClearOutput={() => {
                      setExecResult(null);
                      setTestResults([]);
                    }}
                    onJumpToDiagnostic={handleJumpToDiagnostic}
                    onResetEngine={() => handleResetWorker(language)}
                    onAddTestCase={() => {
                      const nextIdx = testCases.length + 1;
                      setTestCases((prev) => [
                        ...prev,
                        {
                          id: `tc_${Date.now()}_${nextIdx}`,
                          name: `테스트 #${nextIdx}`,
                          input: '',
                          expectedOutput: '',
                        },
                      ]);
                    }}
                    onUpdateTestCase={(id, patch) => {
                      setTestCases((prev) =>
                        prev.map((tc) => (tc.id === id ? { ...tc, ...patch } : tc))
                      );
                    }}
                    onDeleteTestCase={(id) => {
                      setTestCases((prev) => prev.filter((tc) => tc.id !== id));
                      setTestResults((prev) => prev.filter((r) => r.testCaseId !== id));
                    }}
                    onRunAllTestCases={handleRunAllTestCases}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* 우측(가로) 또는 하단(세로): 실행 시뮬레이션 / 학습 패널 (드래그 크기 조절 지원) */}
        {rightPanelOpen && fullscreen !== 'editor' && (
          <>
            {fullscreen === 'none' && !isCompact && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="에디터와 시각화 패널 비율 조절"
                onPointerDown={(e) => startResize('right', e)}
                className={`touch-none select-none w-3 cursor-col-resize flex items-center justify-center shrink-0 transition-colors ${
                  resizingAxis === 'right'
                    ? 'bg-sky-500/30'
                    : 'bg-[var(--bg-root)] hover:bg-sky-500/15'
                }`}
              >
                <div className="w-1 h-12 rounded-full bg-[var(--border-strong)]" />
              </div>
            )}
            {fullscreen === 'none' && isCompact && (
              <div
                role="separator"
                aria-orientation="horizontal"
                aria-label="에디터와 시각화 패널 높이 조절"
                onPointerDown={(e) => startResize('portraitViz', e)}
                className={`touch-none select-none h-3.5 cursor-row-resize flex items-center justify-center shrink-0 border-t border-[var(--border-subtle)] transition-colors ${
                  resizingAxis === 'portraitViz'
                    ? 'bg-sky-500/30'
                    : 'bg-[var(--bg-root)] hover:bg-sky-500/15'
                }`}
              >
                <div className="h-1 w-14 rounded-full bg-[var(--border-strong)]" />
              </div>
            )}
            <div
              style={
                fullscreen === 'visualizer'
                  ? { width: '100%', height: '100%' }
                  : isCompact
                    ? { width: '100%', height: portraitVizHeight }
                    : { width: rightPanelWidth }
              }
              className={
                fullscreen === 'visualizer'
                  ? 'flex-1 h-full min-h-0'
                  : isCompact
                    ? 'shrink-0 min-h-0 overflow-hidden'
                    : 'shrink-0 h-full min-h-0 overflow-hidden'
              }
            >
              {rightPanelMode === 'trace' ? (
                <TraceVisualizer
                  language={language}
                  sourceCode={activeFile?.content || ''}
                  isTracing={isTracing}
                  traceResult={traceResult}
                  currentStepIndex={traceStepIdx}
                  isFullscreen={fullscreen === 'visualizer'}
                  onChangeStep={setTraceStepIdx}
                  onRunTrace={handleTrace}
                  onToggleFullscreen={() =>
                    setFullscreen((f) => (f === 'visualizer' ? 'none' : 'visualizer'))
                  }
                />
              ) : (
                <LearningPanel
                  topicId={selectedTopicId}
                  isFullscreen={fullscreen === 'visualizer'}
                  onSelectTopic={setSelectedTopicId}
                  onCopyToEditor={handleCopyLearningToEditor}
                  onToggleFullscreen={() =>
                    setFullscreen((f) => (f === 'visualizer' ? 'none' : 'visualizer'))
                  }
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* 최하단 상태 표시줄 */}
      {!viewport.keyboardOpen && (
        <StatusBar
          language={language}
          isRunning={isRunning}
          isTracing={isTracing}
          isOnline={isOnline}
          isStandalone={standalone}
          cursor={cursor}
          pythonEngine={pythonEngine}
          cEngine={cEngine}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* 설정 및 오프라인 엔진 관리 모달 */}
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        pythonEngine={pythonEngine}
        cEngine={cEngine}
        isStandalone={standalone}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onDownloadEngine={handleDownloadEngine}
        onClearReinstallEngine={handleClearReinstallEngine}
        onResetWorker={handleResetWorker}
        onExportAllBackup={async () => {
          await exportAllProjectsAsZip(projects, files);
          showToast('전체 워크스페이스 ZIP 백업을 다운로드했습니다.');
        }}
        onImportBackupZip={handleImportProjectZip}
        onOpenDialog={setDialog}
      />

      {/* 커스텀 앱 내 다이얼로그 모달 (prompt/confirm/폴더 선택 대체) */}
      <DialogModal dialog={dialog} onClose={() => setDialog(null)} />

      {/* 알림 토스트 */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 text-slate-100 border border-sky-400/40 shadow-xl text-xs font-medium pointer-events-none"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
