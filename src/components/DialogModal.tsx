import { AlertTriangle, Folder, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type DialogRequest =
  | {
      kind: 'prompt';
      title: string;
      message?: string;
      placeholder?: string;
      initialValue?: string;
      confirmLabel?: string;
      validate?: (value: string) => string | null;
      onConfirm: (value: string) => void;
    }
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel?: string;
      danger?: boolean;
      onConfirm: () => void;
    }
  | {
      kind: 'select';
      title: string;
      message?: string;
      options: Array<{ id: string | null; label: string }>;
      onSelect: (id: string | null) => void;
    };

interface DialogModalProps {
  dialog: DialogRequest | null;
  onClose: () => void;
}

/**
 * Safari 기본 prompt/confirm 대신 사용하는 앱 내 다크/라이트 대응 커스텀 모달.
 * 외장 키보드 Enter(확인) / Escape(취소)를 완벽하게 지원합니다.
 */
export function DialogModal({ dialog, onClose }: DialogModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!dialog) return;
    setError(null);
    if (dialog.kind === 'prompt') {
      setValue(dialog.initialValue ?? '');
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    } else if (dialog.kind === 'confirm') {
      window.setTimeout(() => confirmBtnRef.current?.focus(), 20);
    }
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [dialog, onClose]);

  if (!dialog) return null;

  const submitPrompt = () => {
    if (dialog.kind !== 'prompt') return;
    const trimmed = value.trim();
    if (dialog.validate) {
      const err = dialog.validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }
    if (!trimmed) {
      setError('값을 입력해 주세요.');
      return;
    }
    dialog.onConfirm(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-strong)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]">
          <div className="flex items-center gap-2">
            {dialog.kind === 'confirm' && dialog.danger && (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <h3 className="text-sm font-bold m-0 text-[var(--text-primary)]">{dialog.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {dialog.message && (
            <p className="text-xs text-[var(--text-secondary)] m-0 leading-relaxed whitespace-pre-line">
              {dialog.message}
            </p>
          )}

          {dialog.kind === 'prompt' && (
            <div className="space-y-1.5">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitPrompt();
                  }
                }}
                placeholder={dialog.placeholder || ''}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
              {error && <p className="text-xs text-rose-400 m-0">{error}</p>}
            </div>
          )}

          {dialog.kind === 'select' && (
            <div className="max-h-56 overflow-y-auto space-y-1">
              {dialog.options.map((opt) => (
                <button
                  key={opt.id ?? '__root__'}
                  type="button"
                  onClick={() => {
                    dialog.onSelect(opt.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left bg-[var(--bg-surface)] hover:bg-sky-500/20 hover:text-sky-300 border border-[var(--border-subtle)] transition-colors"
                >
                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {dialog.kind !== 'select' && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-root)]/50">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
            >
              취소
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={() => {
                if (dialog.kind === 'prompt') {
                  submitPrompt();
                } else {
                  dialog.onConfirm();
                  onClose();
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                dialog.kind === 'confirm' && dialog.danger
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
              }`}
            >
              {dialog.confirmLabel || '확인'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
