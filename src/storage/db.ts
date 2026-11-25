import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppSettings, FileNode, LayoutState, Project, WorkspaceSession } from '../types/ide';
import { createInitialData, DEFAULT_SETTINGS } from './defaults';

interface CodeStudioDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  files: {
    key: string;
    value: FileNode;
    indexes: { 'by-project': string };
  };
  meta: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'code-studio-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CodeStudioDB>> | null = null;
let idbDisabled = false;

export function getDB(): Promise<IDBPDatabase<CodeStudioDB>> {
  if (idbDisabled || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB를 사용할 수 없는 환경입니다.'));
  }
  if (!dbPromise) {
    dbPromise = openDB<CodeStudioDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
      blocked() {
        console.warn('[DB] IndexedDB 업그레이드가 다른 탭에 의해 대기 중입니다.');
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 시간 초과 (${ms}ms)`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function loadWorkspaceState(): Promise<{
  projects: Project[];
  files: FileNode[];
  settings: AppSettings;
  session: WorkspaceSession;
  layout?: LayoutState;
  storageFallback?: boolean;
}> {
  try {
    const db = await withTimeout(getDB(), 2500, 'IndexedDB 열기');
    let [projects, files, settings, session, layout] = await withTimeout(
      Promise.all([
        db.getAll('projects'),
        db.getAll('files'),
        db.get('meta', 'settings') as Promise<AppSettings | undefined>,
        db.get('meta', 'session') as Promise<WorkspaceSession | undefined>,
        db.get('meta', 'layout') as Promise<LayoutState | undefined>,
      ]),
      2500,
      'IndexedDB 읽기'
    );

    if (projects.length === 0) {
      const init = createInitialData();
      // Safari WebKit TransactionInactiveError 방지: 루프 내 순차 await 대신 Promise.all 사용
      const tx = db.transaction(['projects', 'files', 'meta'], 'readwrite');
      const ops: Promise<unknown>[] = [
        ...init.projects.map((p) => tx.objectStore('projects').put(p)),
        ...init.files.map((f) => tx.objectStore('files').put(f)),
        tx.objectStore('meta').put(DEFAULT_SETTINGS, 'settings'),
        tx.objectStore('meta').put(init.session, 'session'),
        tx.done,
      ];
      await withTimeout(Promise.all(ops), 3000, 'IndexedDB 초기 데이터 쓰기');
      projects = init.projects;
      files = init.files;
      settings = DEFAULT_SETTINGS;
      session = init.session;
    }

    return {
      projects: projects.sort((a, b) => a.createdAt - b.createdAt),
      files,
      settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
      session: session || {
        activeProjectId: projects[0].id,
        activeFileId: files.find((f) => f.projectId === projects[0].id && f.type === 'file')?.id || null,
        openFileIds: [],
        recentFileIds: [],
        language: 'python',
        stdin: '',
      },
      layout,
    };
  } catch (err) {
    // Safari 개인정보 보호 모드 등 IndexedDB 접근 실패 시에도 앱이 즉시 열리도록 메모리 모드로 폴백
    console.warn('[DB] IndexedDB 로드 실패, 기본 메모리 모드로 전환합니다:', err);
    idbDisabled = true;
    const init = createInitialData();
    return {
      projects: init.projects,
      files: init.files,
      settings: DEFAULT_SETTINGS,
      session: init.session,
      storageFallback: true,
    };
  }
}

export async function saveProject(project: Project): Promise<void> {
  if (idbDisabled) return;
  try {
    const db = await getDB();
    await db.put('projects', project);
  } catch {
    // 폴백 모드 무시
  }
}

export async function deleteProjectFromDB(projectId: string): Promise<void> {
  if (idbDisabled) return;
  try {
    const db = await getDB();
    const tx = db.transaction(['projects', 'files'], 'readwrite');
    const projectFiles = await tx.objectStore('files').index('by-project').getAll(projectId);
    await Promise.all([
      tx.objectStore('projects').delete(projectId),
      ...projectFiles.map((f) => tx.objectStore('files').delete(f.id)),
      tx.done,
    ]);
  } catch {
    // 폴백 모드 무시
  }
}

export async function saveFileNode(file: FileNode): Promise<void> {
  if (idbDisabled) return;
  try {
    const db = await getDB();
    await db.put('files', file);
  } catch {
    // 폴백 모드 무시
  }
}

export async function saveFileNodes(nodes: FileNode[]): Promise<void> {
  if (idbDisabled || nodes.length === 0) return;
  try {
    const db = await getDB();
    const tx = db.transaction('files', 'readwrite');
    await Promise.all([...nodes.map((node) => tx.store.put(node)), tx.done]);
  } catch {
    // 폴백 모드 무시
  }
}

export async function deleteFileNodes(ids: string[]): Promise<void> {
  if (idbDisabled || ids.length === 0) return;
  try {
    const db = await getDB();
    const tx = db.transaction('files', 'readwrite');
    await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
  } catch {
    // 폴백 모드 무시
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (idbDisabled) return;
  try {
    const db = await getDB();
    await db.put('meta', settings, 'settings');
  } catch {
    // 폴백 모드 무시
  }
}

export async function saveSession(session: WorkspaceSession): Promise<void> {
  if (idbDisabled) return;
  try {
    const db = await getDB();
    await db.put('meta', session, 'session');
  } catch {
    // 폴백 모드 무시
  }
}

export async function saveLayout(layout: LayoutState): Promise<void> {
  if (idbDisabled) return;
  try {
    const db = await getDB();
    await db.put('meta', layout, 'layout');
  } catch {
    // 폴백 모드 무시
  }
}

/**
 * 파일 노드의 프로젝트 내 상대 경로를 계산합니다. (예: folder/main.c)
 */
export function getRelativePath(fileId: string, allFiles: FileNode[]): string {
  const map = new Map(allFiles.map((f) => [f.id, f]));
  const parts: string[] = [];
  let cur = map.get(fileId);
  let guard = 0;
  while (cur && guard < 30) {
    parts.unshift(cur.name);
    cur = cur.parentId ? map.get(cur.parentId) : undefined;
    guard++;
  }
  return parts.join('/');
}
