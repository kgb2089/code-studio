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
    await navigator.serviceWorker.register(swUrl, { scope: './' });
  } catch (err) {
    console.warn('[PWA] Service Worker 등록 실패:', err);
  }
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
