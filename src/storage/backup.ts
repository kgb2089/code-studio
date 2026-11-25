import JSZip from 'jszip';
import type { FileNode, Project } from '../types/ide';
import { getRelativePath } from './db';

const ALLOWED_EXTENSIONS = ['.py', '.c', '.h', '.txt'];

export function isSupportedFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * 단일 파일을 iPadOS 파일 앱 / 로컬 PC로 내보냅니다.
 */
export function exportSingleFile(file: FileNode): void {
  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, file.name);
}

/**
 * 프로젝트 전체를 ZIP 파일로 백업합니다. (메타데이터 포함)
 */
export async function exportProjectAsZip(project: Project, projectFiles: FileNode[]): Promise<void> {
  const zip = new JSZip();

  const manifest = {
    format: 'code-studio-backup-v1',
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      description: project.description || '',
    },
  };
  zip.file('.code-studio.json', JSON.stringify(manifest, null, 2));

  for (const node of projectFiles) {
    const relPath = getRelativePath(node.id, projectFiles);
    if (node.type === 'folder') {
      zip.folder(relPath);
    } else {
      zip.file(relPath, node.content);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const safeName = project.name.replace(/[^\w가-힣\-]+/g, '_') || 'project';
  triggerDownload(blob, `${safeName}_backup.zip`);
}

/**
 * 전체 프로젝트 목록을 하나의 ZIP 백업으로 내보냅니다.
 */
export async function exportAllProjectsAsZip(projects: Project[], allFiles: FileNode[]): Promise<void> {
  const zip = new JSZip();
  zip.file(
    'code-studio-workspace.json',
    JSON.stringify(
      {
        format: 'code-studio-all-v1',
        exportedAt: new Date().toISOString(),
        projects,
        files: allFiles,
      },
      null,
      2
    )
  );
  const blob = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `CodeStudio_FullBackup_${dateStr}.zip`);
}

/**
 * ZIP 파일에서 프로젝트를 복원합니다. (단일 프로젝트 ZIP 및 일반 소스 ZIP 모두 지원)
 */
export async function importProjectFromZip(
  file: File
): Promise<{ project: Project; files: FileNode[] }> {
  const zip = await JSZip.loadAsync(file);
  const now = Date.now();
  const projectId = `proj_${now}_${Math.random().toString(36).slice(2, 7)}`;

  let projectName = file.name.replace(/\.zip$/i, '').replace(/_backup$/i, '') || '가져온 프로젝트';
  let description = 'ZIP 백업에서 복원된 프로젝트';

  const metaEntry = zip.file('.code-studio.json');
  if (metaEntry) {
    try {
      const parsed = JSON.parse(await metaEntry.async('string'));
      if (parsed?.project?.name) projectName = String(parsed.project.name);
      if (parsed?.project?.description) description = String(parsed.project.description);
    } catch {
      // 메타데이터 파싱 실패 시 기본 이름 사용
    }
  }

  const project: Project = {
    id: projectId,
    name: projectName,
    description,
    isExample: false,
    createdAt: now,
    updatedAt: now,
  };

  const folderIdByPath = new Map<string, string>();
  const nodes: FileNode[] = [];

  const ensureFolder = (folderPath: string): string | null => {
    const clean = folderPath.replace(/^\/+|\/+$/g, '');
    if (!clean) return null;
    if (folderIdByPath.has(clean)) return folderIdByPath.get(clean)!;

    const parts = clean.split('/');
    let parentId: string | null = null;
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      if (!folderIdByPath.has(acc)) {
        const id = `node_${now}_${Math.random().toString(36).slice(2, 8)}`;
        folderIdByPath.set(acc, id);
        nodes.push({
          id,
          projectId,
          parentId,
          name: part,
          type: 'folder',
          content: '',
          createdAt: now,
          updatedAt: now,
        });
      }
      parentId = folderIdByPath.get(acc)!;
    }
    return parentId;
  };

  const entries = Object.values(zip.files);
  for (const entry of entries) {
    const rel = entry.name.replace(/^\/+/, '');
    if (!rel || rel === '.code-studio.json' || rel.startsWith('__MACOSX/')) continue;

    if (entry.dir) {
      ensureFolder(rel);
      continue;
    }

    const parts = rel.split('/');
    const filename = parts.pop()!;
    if (!isSupportedFilename(filename)) continue;

    const parentId = parts.length > 0 ? ensureFolder(parts.join('/')) : null;
    const content = await entry.async('string');
    nodes.push({
      id: `node_${now}_${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      parentId,
      name: filename,
      type: 'file',
      content,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { project, files: nodes };
}

/**
 * 전체 백업 ZIP (code-studio-all-v1) 또는 단일 프로젝트 ZIP을 자동 판별하여 복원합니다.
 */
export async function importBackupZip(
  file: File
): Promise<
  | { kind: 'all'; projects: Project[]; files: FileNode[] }
  | { kind: 'project'; project: Project; files: FileNode[] }
> {
  const zip = await JSZip.loadAsync(file);
  const fullEntry = zip.file('code-studio-workspace.json');
  if (fullEntry) {
    const parsed = JSON.parse(await fullEntry.async('string')) as {
      format?: string;
      projects?: Project[];
      files?: FileNode[];
    };
    if (Array.isArray(parsed?.projects) && parsed.projects.length > 0 && Array.isArray(parsed?.files)) {
      return {
        kind: 'all',
        projects: parsed.projects,
        files: parsed.files,
      };
    }
  }
  const single = await importProjectFromZip(file);
  return { kind: 'project', ...single };
}

/**
 * 선택한 로컬 텍스트/코드 파일들을 읽어 FileNode 배열로 변환합니다.
 */
export async function importLooseFiles(
  fileList: FileList,
  projectId: string,
  parentId: string | null
): Promise<FileNode[]> {
  const now = Date.now();
  const imported: FileNode[] = [];
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    if (!isSupportedFilename(f.name)) continue;
    const content = await f.text();
    imported.push({
      id: `node_${now}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      projectId,
      parentId,
      name: f.name,
      type: 'file',
      content,
      createdAt: now,
      updatedAt: now,
    });
  }
  return imported;
}
