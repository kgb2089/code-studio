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

export interface WorkspaceSnapshot {
  version: 1;
  savedAt: number;
  projects: Project[];
  files: FileNode[];
  settings: AppSettings;
  session: WorkspaceSession;
  layout?: LayoutState;
}

const DB_NAME = 'code-studio-db';
const DB_VERSION = 1;
const LS_SNAPSHOT_KEY = 'code-studio-workspace-v1';

let dbPromise: Promise<IDBPDatabase<CodeStudioDB>> | null = null;

/**
 * localStorage 동기 스냅샷 읽기 (iPadOS PWA 냉기동 및 IndexedDB 지연/실패 대비 이중 안전장치)
 */
export function loadWorkspaceSnapshotSync(): WorkspaceSnapshot | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LS_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    if (
      !parsed ||
      !Array.isArray(parsed.projects) ||
      parsed.projects.length === 0 ||
      !Array.isArray(parsed.files) ||
      !parsed.session
    ) {
      return null;
    }
    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      projects: parsed.projects.sort((a, b) => a.createdAt - b.createdAt),
      files: parsed.files,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      session: parsed.session,
      layout: parsed.layout,
    };
  } catch {
    return null;
  }
}

/**
 * localStorage 동기 스냅샷 쓰기 (앱을 즉시 강제 종료해도 파일·수정 내역이 절대 유실되지 않음)
 */
export function saveWorkspaceSnapshotSync(snapshot: Omit<WorkspaceSnapshot, 'version' | 'savedAt'> & { savedAt?: number }): number {
  const savedAt = snapshot.savedAt ?? Date.now();
  try {
    if (typeof window === 'undefined' || !window.localStorage) return savedAt;
    const payload: WorkspaceSnapshot = {
      version: 1,
      savedAt,
      projects: snapshot.projects,
      files: snapshot.files,
      settings: snapshot.settings,
      session: snapshot.session,
      layout: snapshot.layout,
    };
    window.localStorage.setItem(LS_SNAPSHOT_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[DB] localStorage 스냅샷 저장 실패 (용량 초과 등):', err);
  }
  return savedAt;
}

export function getDB(): Promise<IDBPDatabase<CodeStudioDB>> {
  if (typeof indexedDB === 'undefined') {
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

async function writeFullStateToIDB(
  db: IDBPDatabase<CodeStudioDB>,
  state: {
    projects: Project[];
    files: FileNode[];
    settings: AppSettings;
    session: WorkspaceSession;
    layout?: LayoutState;
    savedAt: number;
  }
): Promise<void> {
  const tx = db.transaction(['projects', 'files', 'meta'], 'readwrite');
  const ops: Promise<unknown>[] = [
    tx.objectStore('projects').clear(),
    tx.objectStore('files').clear(),
    ...state.projects.map((p) => tx.objectStore('projects').put(p)),
    ...state.files.map((f) => tx.objectStore('files').put(f)),
    tx.objectStore('meta').put(state.settings, 'settings'),
    tx.objectStore('meta').put(state.session, 'session'),
    tx.objectStore('meta').put(state.savedAt, 'savedAt'),
  ];
  if (state.layout) {
    ops.push(tx.objectStore('meta').put(state.layout, 'layout'));
  }
  ops.push(tx.done);
  await withTimeout(Promise.all(ops), 5000, 'IndexedDB 전체 동기화');
}

export async function loadWorkspaceState(): Promise<{
  projects: Project[];
  files: FileNode[];
  settings: AppSettings;
  session: WorkspaceSession;
  layout?: LayoutState;
  storageFallback?: boolean;
}> {
  const localSnap = loadWorkspaceSnapshotSync();

  try {
    const db = await withTimeout(getDB(), 5000, 'IndexedDB 열기');
    let [projects, files, settings, session, layout, idbSavedAt] = await withTimeout(
      Promise.all([
        db.getAll('projects'),
        db.getAll('files'),
        db.get('meta', 'settings') as Promise<AppSettings | undefined>,
        db.get('meta', 'session') as Promise<WorkspaceSession | undefined>,
        db.get('meta', 'layout') as Promise<LayoutState | undefined>,
        db.get('meta', 'savedAt') as Promise<number | undefined>,
      ]),
      5000,
      'IndexedDB 읽기'
    );

    const idbTs = typeof idbSavedAt === 'number' ? idbSavedAt : 0;

    // localStorage 스냅샷이 더 최신이거나 IndexedDB가 비어 있으면 localStorage 기준으로 복원 & IDB 동기화
    if (localSnap && (projects.length === 0 || localSnap.savedAt > idbTs)) {
      writeFullStateToIDB(db, localSnap).catch(() => {});
      return {
        projects: localSnap.projects,
        files: localSnap.files,
        settings: localSnap.settings,
        session: localSnap.session,
        layout: localSnap.layout,
      };
    }

    if (projects.length === 0) {
      const init = createInitialData();
      const now = Date.now();
      await writeFullStateToIDB(db, {
        projects: init.projects,
        files: init.files,
        settings: DEFAULT_SETTINGS,
        session: init.session,
        savedAt: now,
      });
      saveWorkspaceSnapshotSync({
        projects: init.projects,
        files: init.files,
        settings: DEFAULT_SETTINGS,
        session: init.session,
        savedAt: now,
      });
      return {
        projects: init.projects,
        files: init.files,
        settings: DEFAULT_SETTINGS,
        session: init.session,
      };
    }

    const resolvedProjects = projects.sort((a, b) => a.createdAt - b.createdAt);
    const resolvedSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    const resolvedSession: WorkspaceSession = session || {
      activeProjectId: resolvedProjects[0].id,
      activeFileId: files.find((f) => f.projectId === resolvedProjects[0].id && f.type === 'file')?.id || null,
      openFileIds: [],
      recentFileIds: [],
      language: 'python',
      stdin: '',
    };

    // IndexedDB가 더 최신이므로 localStorage 스냅샷도 최신화
    saveWorkspaceSnapshotSync({
      projects: resolvedProjects,
      files,
      settings: resolvedSettings,
      session: resolvedSession,
      layout,
      savedAt: idbTs || Date.now(),
    });

    return {
      projects: resolvedProjects,
      files,
      settings: resolvedSettings,
      session: resolvedSession,
      layout,
    };
  } catch (err) {
    console.warn('[DB] IndexedDB 로드 실패:', err);
    // localStorage 스냅샷이 있으면 완전 복원 (유실 없음!)
    if (localSnap) {
      return {
        projects: localSnap.projects,
        files: localSnap.files,
        settings: localSnap.settings,
        session: localSnap.session,
        layout: localSnap.layout,
      };
    }
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

async function touchIdbSavedAt(db: IDBPDatabase<CodeStudioDB>, ts = Date.now()): Promise<void> {
  try {
    await db.put('meta', ts, 'savedAt');
  } catch {
    // 무시
  }
}

export async function saveProject(project: Project): Promise<void> {
  try {
    const db = await getDB();
    await db.put('projects', project);
    await touchIdbSavedAt(db);
  } catch {
    // localStorage 스냅샷에 이미 저장됨
  }
}

export async function deleteProjectFromDB(projectId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['projects', 'files', 'meta'], 'readwrite');
    const projectFiles = await tx.objectStore('files').index('by-project').getAll(projectId);
    await Promise.all([
      tx.objectStore('projects').delete(projectId),
      ...projectFiles.map((f) => tx.objectStore('files').delete(f.id)),
      tx.objectStore('meta').put(Date.now(), 'savedAt'),
      tx.done,
    ]);
  } catch {
    // localStorage 스냅샷에 이미 반영됨
  }
}

export async function saveFileNode(file: FileNode): Promise<void> {
  try {
    const db = await getDB();
    await db.put('files', file);
    await touchIdbSavedAt(db);
  } catch {
    // localStorage 스냅샷에 이미 저장됨
  }
}

export async function saveFileNodes(nodes: FileNode[]): Promise<void> {
  if (nodes.length === 0) return;
  try {
    const db = await getDB();
    const tx = db.transaction(['files', 'meta'], 'readwrite');
    await Promise.all([
      ...nodes.map((node) => tx.objectStore('files').put(node)),
      tx.objectStore('meta').put(Date.now(), 'savedAt'),
      tx.done,
    ]);
  } catch {
    // localStorage 스냅샷에 이미 저장됨
  }
}

export async function deleteFileNodes(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const db = await getDB();
    const tx = db.transaction(['files', 'meta'], 'readwrite');
    await Promise.all([
      ...ids.map((id) => tx.objectStore('files').delete(id)),
      tx.objectStore('meta').put(Date.now(), 'savedAt'),
      tx.done,
    ]);
  } catch {
    // localStorage 스냅샷에 이미 반영됨
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const db = await getDB();
    await db.put('meta', settings, 'settings');
    await touchIdbSavedAt(db);
  } catch {
    // 무시
  }
}

export async function saveSession(session: WorkspaceSession): Promise<void> {
  try {
    const db = await getDB();
    await db.put('meta', session, 'session');
    await touchIdbSavedAt(db);
  } catch {
    // 무시
  }
}

export async function replaceWorkspaceInDB(
  projects: Project[],
  files: FileNode[],
  settings: AppSettings,
  session: WorkspaceSession,
  layout?: LayoutState
): Promise<void> {
  const now = Date.now();
  saveWorkspaceSnapshotSync({
    projects,
    files,
    settings,
    session,
    layout,
    savedAt: now,
  });
  try {
    const db = await getDB();
    await writeFullStateToIDB(db, {
      projects,
      files,
      settings,
      session,
      layout,
      savedAt: now,
    });
  } catch {
    // localStorage 스냅샷에 이미 저장됨
  }
}

export async function saveLayout(layout: LayoutState): Promise<void> {
  try {
    const db = await getDB();
    await db.put('meta', layout, 'layout');
    await touchIdbSavedAt(db);
  } catch {
    // 무시
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
