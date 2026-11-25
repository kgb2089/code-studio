export type Language = 'python' | 'c';

export type SupportedExtension = '.py' | '.c' | '.h' | '.txt';

export type FileNodeType = 'file' | 'folder';

export interface FileNode {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  type: FileNodeType;
  content: string;
  isExample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  isExample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  raw?: string;
}

export interface ExecutionResult {
  language: Language;
  ok: boolean;
  compiled?: boolean;
  stdout: string;
  stderr: string;
  compileOutput?: string;
  diagnostics: Diagnostic[];
  exitCode: number | null;
  compileTimeMs?: number;
  executionTimeMs: number;
  terminatedReason?: 'user' | 'timeout' | 'output_limit' | 'runtime_error' | 'compile_error';
  truncatedOutput?: boolean;
}

export type EngineState = 'idle' | 'checking' | 'downloading' | 'initializing' | 'ready' | 'error';

export interface EngineStatus {
  state: EngineState;
  cached: boolean;
  version: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0 ~ 100
  message: string;
  error?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  fontSize: number;
  tabSize: number;
  timeoutSec: number;
  maxTraceSteps: number;
  showAccessoryBar: 'auto' | 'always' | 'never';
  wordWrap: boolean;
  autoSave: boolean;
}

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
}

export interface TestCaseRunResult {
  testCaseId: string;
  status: 'pass' | 'fail' | 'error';
  actualOutput: string;
  stderr: string;
  executionTimeMs: number;
}

export interface LayoutState {
  sidebarWidth: number;
  rightPanelWidth: number;
  bottomHeight: number;
  portraitVizHeight: number;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  bottomCollapsed: boolean;
}

export interface WorkspaceSession {
  activeProjectId: string;
  activeFileId: string | null;
  openFileIds: string[];
  recentFileIds: string[];
  language: Language;
  stdin: string;
  testCases?: TestCase[];
}

export type BottomTab = 'output' | 'stdin' | 'tests' | 'problems' | 'debug';
export type SidebarTab = 'explorer' | 'projects' | 'learning';
export type RightPanelMode = 'trace' | 'learning';
export type FullscreenMode = 'none' | 'editor' | 'visualizer';
