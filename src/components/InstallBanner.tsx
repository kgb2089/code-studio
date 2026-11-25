import { Share, Smartphone, X } from 'lucide-react';

interface InstallBannerProps {
  onDismiss: () => void;
}

/**
 * 일반 Safari 브라우저 탭으로 접속한 경우, 홈 화면에 추가하여
 * 주소창 없는 독립 실행 앱 모드로 사용하는 방법을 안내합니다.
 */
export function InstallBanner({ onDismiss }: InstallBannerProps) {
  return (
    <div className="ide-chrome flex items-center justify-between gap-2 px-3 py-1.5 bg-sky-500/15 border-b border-sky-500/30 text-xs text-sky-200 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
        <span className="truncate">
          iPad에서 앱처럼 전체 화면으로 쓰려면 Safari 상단/하단{' '}
          <strong className="inline-flex items-center gap-0.5 text-white">
            <Share className="w-3 h-3 inline" /> 공유
          </strong>{' '}
          → <strong className="text-white">홈 화면에 추가</strong>를 눌러 설치하세요.
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="설치 안내 닫기"
        className="p-1 rounded hover:bg-sky-500/20 text-sky-300 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
