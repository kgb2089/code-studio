import { useEffect, useState } from 'react';

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  const iosStandalone = (window.navigator as any)?.standalone === true;
  return mq || iosStandalone;
}

export function isIPadOrTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ Safari reports Macintosh with multi-touch support
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS || navigator.maxTouchPoints > 0;
}

export function syncThemeColor(theme: 'dark' | 'light'): void {
  const color = theme === 'dark' ? '#0f172a' : '#f8fafc';
  const meta = document.getElementById('theme-color-meta') as HTMLMetaElement | null;
  if (meta) {
    meta.content = color;
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  document.body.style.backgroundColor = color;
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const swUrl = new URL('./sw.js', window.location.href).href;
    const reg = await navigator.serviceWorker.register(swUrl, { scope: './', updateViaCache: 'none' });
    // 앱이 다시 열릴 때 백그라운드로 새 버전 확인
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        reg.update().catch(() => {});
      }
    });
  } catch (err) {
    console.warn('[PWA] Service Worker 등록 실패:', err);
  }
}

/**
 * 홈 화면 웹앱을 삭제하지 않고 화면(UI) 캐시만 비운 뒤 최신 버전으로 즉시 새로고침합니다.
 * 사용자 코드(IndexedDB/localStorage)와 오프라인 엔진 캐시(Python/C)는 그대로 보존됩니다.
 */
export async function forceRefreshAppShell(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('code-studio-app-'))
        .map((k) => caches.delete(k))
    );
  }
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.update().catch(() => {});
    }
  }
  window.location.reload();
}

/**
 * iPadOS 가상 키보드가 올라올 때 visualViewport 높이를 실시간으로 반영하여
 * 코드 에디터가 키보드에 가려지지 않도록 보장하는 훅입니다.
 */
export function useVisualViewport(): {
  height: number;
  width: number;
  keyboardOpen: boolean;
  isPortrait: boolean;
} {
  const getSnapshot = () => {
    if (typeof window === 'undefined') {
      return { height: 800, width: 1024, keyboardOpen: false, isPortrait: false };
    }
    const vv = window.visualViewport;
    const height = vv ? Math.round(vv.height) : window.innerHeight;
    const width = vv ? Math.round(vv.width) : window.innerWidth;
    const keyboardOpen = vv ? window.innerHeight - vv.height > 120 : false;
    return { height, width, keyboardOpen, isPortrait: height > width };
  };

  const [vp, setVp] = useState(getSnapshot);

  useEffect(() => {
    const update = () => {
      const next = getSnapshot();
      setVp(next);
      document.documentElement.style.setProperty('--app-height', `${next.height}px`);
      // iOS Safari 키보드 오픈 시 불필요한 문서 스크롤 원위치
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    update();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return vp;
}

export function canUseFullscreen(): boolean {
  return typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function';
}
