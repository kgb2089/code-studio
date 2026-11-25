import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  FileCode2,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  MoveRight,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ALGORITHM_TOPICS, DATA_STRUCTURE_TOPICS } from '../learning';
import type { FileNode, Language, Project, SidebarTab } from '../types/ide';
import type { DialogRequest } from './DialogModal';

interface SidebarProps {
  tab: SidebarTab;
  language: Language;
  projects: Project[];
  activeProjectId: string;
  files: FileNode[];
  activeFileId: string | null;
  recentFileIds: string[];
  selectedTopicId: string;
  onChangeTab: (tab: SidebarTab) => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteProject: (projectId: string) => void;
  onSelectFile: (fileId: string) => void;
  onCreateNode: (type: 'file' | 'folder', name: string, parentId: string | null) => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onMoveNode: (nodeId: string, targetParentId: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
  onImportFiles: (fileList: FileList, parentId: string | null) => void;
  onExportFile: (file: FileNode) => void;
  onExportProjectZip: (projectId: string) => void;
  onImportProjectZip: (file: File) => void;
  onSelectLearningTopic: (topicId: string) => void;
  onOpenDialog: (dialog: DialogRequest) => void;
}

export function Sidebar({
  tab,
  language,
  projects,
  activeProjectId,
  files,
  activeFileId,
  recentFileIds,
  selectedTopicId,
  onChangeTab,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onSelectFile,
  onCreateNode,
  onRenameNode,
  onMoveNode,
  onDeleteNode,
  onImportFiles,
  onExportFile,
  onExportProjectZip,
  onImportProjectZip,
  onSelectLearningTopic,
  onOpenDialog,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder-ex-py', 'folder-ex-c']));
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [learningQuery, setLearningQuery] = useState('');
  const [learningFilter, setLearningFilter] = useState<'all' | 'ds' | 'algo'>('all');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  const projectFiles = useMemo(
    () => files.filter((f) => f.projectId === activeProjectId),
    [files, activeProjectId]
  );

  const foldersInProject = useMemo(
    () => projectFiles.filter((f) => f.type === 'folder'),
    [projectFiles]
  );

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const recentFiles = useMemo(() => {
    const byId = new Map(files.map((f) => [f.id, f]));
    return recentFileIds
      .map((id) => byId.get(id))
      .filter((f): f is FileNode => Boolean(f && f.type === 'file'))
      .slice(0, 5);
  }, [files, recentFileIds]);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePromptCreate = (type: 'file' | 'folder') => {
    const ext = language === 'c' ? 'c' : 'py';
    onOpenDialog({
      kind: 'prompt',
      title: type === 'file' ? '새 파일 만들기' : '새 폴더 만들기',
      message:
        type === 'file'
          ? `파일 이름을 입력하세요. 확장자를 생략하면 .${ext}가 자동으로 붙습니다. (.py, .c, .h, .txt)`
          : '새 폴더 이름을 입력하세요.',
      placeholder: type === 'file' ? `예: solution.${ext}` : '예: week1',
      initialValue: '',
      confirmLabel: '만들기',
      validate: (raw) => {
        if (!raw) return '이름을 입력해 주세요.';
        if (type === 'file' && raw.includes('.') && !/\.(py|c|h|txt)$/i.test(raw)) {
          return '지원되는 확장자는 .py, .c, .h, .txt 입니다.';
        }
        return null;
      },
      onConfirm: (raw) => {
        const name = type === 'file' && !raw.includes('.') ? `${raw}.${ext}` : raw;
        onCreateNode(type, name, selectedFolderId);
        if (selectedFolderId) {
          setExpandedFolders((prev) => new Set(prev).add(selectedFolderId));
        }
      },
    });
  };

  const handlePromptRename = (node: FileNode) => {
    onOpenDialog({
      kind: 'prompt',
      title: '이름 변경',
      message: `"${node.name}"의 새 이름을 입력하세요.`,
      initialValue: node.name,
      confirmLabel: '변경',
      validate: (raw) => {
        if (!raw) return '이름을 입력해 주세요.';
        if (node.type === 'file' && !/\.(py|c|h|txt)$/i.test(raw)) {
          return '지원되는 확장자는 .py, .c, .h, .txt 입니다.';
        }
        return null;
      },
      onConfirm: (next) => {
        if (next !== node.name) onRenameNode(node.id, next);
      },
    });
  };

  const handlePromptMove = (node: FileNode) => {
    const options: Array<{ id: string | null; label: string }> = [
      { id: null, label: '프로젝트 루트 (최상위)' },
      ...foldersInProject
        .filter((f) => f.id !== node.id)
        .map((f) => ({ id: f.id, label: f.name })),
    ];
    onOpenDialog({
      kind: 'select',
      title: '위치 이동',
      message: `"${node.name}"을(를) 이동할 폴더를 선택하세요.`,
      options,
      onSelect: (targetId) => {
        onMoveNode(node.id, targetId);
        if (targetId) setExpandedFolders((prev) => new Set(prev).add(targetId));
      },
    });
  };

  const renderTree = (parentId: string | null, depth = 0) => {
    const children = projectFiles
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return children.map((node) => {
      const isFolder = node.type === 'folder';
      const isExpanded = expandedFolders.has(node.id);
      const isActive = node.id === activeFileId;
      const isSelectedFolder = isFolder && selectedFolderId === node.id;

      return (
        <div key={node.id}>
          <div
            style={{ paddingLeft: `${8 + depth * 14}px` }}
            onClick={() => {
              if (isFolder) {
                toggleFolder(node.id);
                setSelectedFolderId((prev) => (prev === node.id ? null : node.id));
              } else {
                onSelectFile(node.id);
              }
            }}
            className={`group flex items-center justify-between pr-1.5 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${
              isActive
                ? 'bg-sky-500/20 text-sky-300 font-semibold'
                : isSelectedFolder
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {isFolder ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  )}
                </>
              ) : node.name.endsWith('.py') ? (
                <FileCode2 className="w-3.5 h-3.5 shrink-0 text-sky-400 ml-3" />
              ) : node.name.endsWith('.c') || node.name.endsWith('.h') ? (
                <FileCode2 className="w-3.5 h-3.5 shrink-0 text-emerald-400 ml-3" />
              ) : (
                <FileText className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)] ml-3" />
              )}
              <span className="truncate">{node.name}</span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {!isFolder && (
                <button
                  type="button"
                  title="파일 내보내기"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExportFile(node);
                  }}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <Download className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                title="폴더 이동"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePromptMove(node);
                }}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <MoveRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                title="이름 변경"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePromptRename(node);
                }}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                type="button"
                title="삭제"
                aria-label={`${node.name} 삭제`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDialog({
                    kind: 'confirm',
                    title: '파일/폴더 삭제',
                    message: `"${node.name}"을(를) 삭제하시겠습니까?`,
                    confirmLabel: '삭제',
                    danger: true,
                    onConfirm: () => onDeleteNode(node.id),
                  });
                }}
                className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {isFolder && isExpanded && renderTree(node.id, depth + 1)}
        </div>
      );
    });
  };

  const filteredDS = DATA_STRUCTURE_TOPICS.filter(
    (t) =>
      !learningQuery.trim() ||
      t.title.includes(learningQuery) ||
      t.englishTitle.toLowerCase().includes(learningQuery.toLowerCase())
  );
  const filteredAlgo = ALGORITHM_TOPICS.filter(
    (t) =>
      !learningQuery.trim() ||
      t.title.includes(learningQuery) ||
      t.englishTitle.toLowerCase().includes(learningQuery.toLowerCase())
  );

  return (
    <aside className="ide-chrome flex flex-col h-full min-h-0 bg-[var(--bg-panel)] border-r border-[var(--border-subtle)] select-none">
      {/* 숨겨진 파일/ZIP 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".py,.c,.h,.txt"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onImportFiles(e.target.files, selectedFolderId);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onImportProjectZip(f);
            e.target.value = '';
          }
        }}
      />

      {/* 사이드바 3탭 헤더 */}
      <div className="grid grid-cols-3 border-b border-[var(--border-subtle)] bg-[var(--bg-root)] p-1 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onChangeTab('explorer')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
            tab === 'explorer'
              ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>탐색기</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('projects')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
            tab === 'projects'
              ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>프로젝트</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('learning')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
            tab === 'learning'
              ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>학습</span>
        </button>
      </div>

      {/* 1. 파일 탐색기 탭 */}
      {tab === 'explorer' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-[var(--border-subtle)] gap-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold truncate text-[var(--text-primary)]">
                  {activeProject?.name || '프로젝트'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    activeProject?.isExample
                      ? 'bg-sky-500/15 text-sky-400'
                      : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {activeProject?.isExample ? '예제' : '내 코드'}
                </span>
              </div>
              {selectedFolderId && (
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  선택 폴더 해제 (루트에 생성)
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => handlePromptCreate('file')}
                title="새 파일"
                className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handlePromptCreate('folder')}
                title="새 폴더"
                className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="파일 앱에서 가져오기"
                className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              {activeFileId && projectFiles.some((f) => f.id === activeFileId) && (
                <button
                  type="button"
                  onClick={() => {
                    const target = projectFiles.find((f) => f.id === activeFileId);
                    if (target) {
                      onOpenDialog({
                        kind: 'confirm',
                        title: '현재 파일 삭제',
                        message: `"${target.name}" 파일을 삭제하시겠습니까?`,
                        confirmLabel: '삭제',
                        danger: true,
                        onConfirm: () => onDeleteNode(target.id),
                      });
                    }
                  }}
                  title="현재 파일 삭제"
                  aria-label="현재 파일 삭제"
                  className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="scroll-pane flex-1 p-1.5 space-y-0.5">
            {renderTree(null, 0)}
            {projectFiles.length === 0 && (
              <div className="text-xs text-[var(--text-muted)] text-center py-6 space-y-2.5 px-2">
                <p className="m-0">파일이 없습니다. 새 파일을 만들거나 파일 앱에서 불러오세요.</p>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePromptCreate('file')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium text-[11px]"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-sky-400" />
                    <span>새 파일</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-medium text-[11px]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>파일 불러오기</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 하단 빠른 파일 추가 / 불러오기 바 */}
          <div className="grid grid-cols-2 gap-1.5 p-2 border-t border-[var(--border-subtle)] bg-[var(--bg-root)]/60 shrink-0">
            <button
              type="button"
              onClick={() => handlePromptCreate('file')}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)]"
            >
              <FilePlus className="w-3.5 h-3.5 text-sky-400" />
              <span>새 파일</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)]"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>파일 불러오기</span>
            </button>
          </div>

          {/* 최근 작업 파일 */}
          {recentFiles.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] p-2 shrink-0 bg-[var(--bg-root)]/40">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                <Clock className="w-3 h-3" />
                <span>최근 작업 파일</span>
              </div>
              <div className="space-y-0.5">
                {recentFiles.map((rf) => (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => onSelectFile(rf.id)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left truncate transition-colors ${
                      rf.id === activeFileId
                        ? 'bg-[var(--bg-elevated)] text-[var(--accent)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <FileCode2 className="w-3 h-3 shrink-0 opacity-70" />
                    <span className="truncate">{rf.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. 프로젝트 관리 탭 */}
      {tab === 'projects' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-2 border-b border-[var(--border-subtle)] flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onOpenDialog({
                  kind: 'prompt',
                  title: '새 프로젝트 만들기',
                  message: '새 프로젝트 이름을 입력하세요.',
                  placeholder: '예: 알고리즘 연습',
                  initialValue: '',
                  confirmLabel: '만들기',
                  onConfirm: (name) => onCreateProject(name),
                });
              }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>새 프로젝트</span>
            </button>
            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              title="ZIP 백업 복원"
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-primary)]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>ZIP 복원</span>
            </button>
          </div>

          <div className="scroll-pane flex-1 p-2 space-y-2">
            {projects.map((p) => {
              const isSelected = p.id === activeProjectId;
              const count = files.filter((f) => f.projectId === p.id && f.type === 'file').length;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-400/50'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {p.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            p.isExample
                              ? 'bg-sky-500/15 text-sky-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          {p.isExample ? '예제' : '학습'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        파일 {count}개
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        title="ZIP 백업 다운로드"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportProjectZip(p.id);
                        }}
                        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="이름 변경"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDialog({
                            kind: 'prompt',
                            title: '프로젝트 이름 변경',
                            initialValue: p.name,
                            confirmLabel: '변경',
                            onConfirm: (next) => {
                              if (next !== p.name) onRenameProject(p.id, next);
                            },
                          });
                        }}
                        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          title="프로젝트 삭제"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDialog({
                              kind: 'confirm',
                              title: '프로젝트 삭제',
                              message: `"${p.name}" 프로젝트와 포함된 모든 파일을 삭제하시겠습니까?`,
                              confirmLabel: '삭제',
                              danger: true,
                              onConfirm: () => onDeleteProject(p.id),
                            });
                          }}
                          className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. 자료구조·알고리즘 학습 라이브러리 탭 */}
      {tab === 'learning' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-2 border-b border-[var(--border-subtle)] space-y-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={learningQuery}
                onChange={(e) => setLearningQuery(e.target.value)}
                placeholder="자료구조 · 알고리즘 검색..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ['all', '전체 (28)'],
                  ['ds', '자료구조 (13)'],
                  ['algo', '알고리즘 (15)'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLearningFilter(k)}
                  className={`py-1 rounded text-[11px] font-medium ${
                    learningFilter === k
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="scroll-pane flex-1 p-2 space-y-3">
            {(learningFilter === 'all' || learningFilter === 'ds') && filteredDS.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 px-1.5 mb-1">
                  자료구조 ({filteredDS.length})
                </div>
                <div className="space-y-0.5">
                  {filteredDS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectLearningTopic(t.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between gap-1 ${
                        selectedTopicId === t.id
                          ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-400/40'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0 truncate max-w-[90px]">
                        {t.englishTitle.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(learningFilter === 'all' || learningFilter === 'algo') && filteredAlgo.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-1.5 mb-1">
                  알고리즘 ({filteredAlgo.length})
                </div>
                <div className="space-y-0.5">
                  {filteredAlgo.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectLearningTopic(t.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between gap-1 ${
                        selectedTopicId === t.id
                          ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-400/40'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0 truncate max-w-[90px]">
                        {t.complexity.average.split(',')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
