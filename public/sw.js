// Code Studio Service Worker (iPadOS Safari 오프라인 PWA 최적화)
const APP_CACHE = 'code-studio-app-v1';
const PYTHON_CACHE = 'code-studio-engine-python-v1';
const C_CACHE = 'code-studio-engine-c-v1';

const ALLOWED_CACHES = new Set([APP_CACHE, PYTHON_CACHE, C_CACHE]);

const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './engines/manifest.json',
];

/**
 * Safari 오프라인 버그 방지:
 * redirected=true 인 Response를 Cache API에 저장하면 오프라인 로드 시 TypeError가 발생할 수 있으므로
 * 깨끗한 Response로 복제하고 WASM MIME 타입을 보장합니다.
 */
async function sanitizeResponse(requestUrl, response) {
  const headers = new Headers(response.headers);
  if (requestUrl.endsWith('.wasm')) {
    headers.set('Content-Type', 'application/wasm');
  } else if (requestUrl.endsWith('.mjs') || requestUrl.endsWith('.js')) {
    headers.set('Content-Type', 'application/javascript; charset=utf-8');
  }
  if (!response.redirected && !requestUrl.endsWith('.wasm')) {
    return response;
  }
  const buf = await response.arrayBuffer();
  return new Response(buf, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then(async (cache) => {
      for (const url of APP_SHELL_URLS) {
        try {
          const resp = await fetch(url, { cache: 'no-cache' });
          if (resp.ok) {
            const clean = await sanitizeResponse(url, resp);
            await cache.put(url, clean);
          }
        } catch {
          // 개발 환경 등 일부 파일 누락 시 무시
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('code-studio-') && !ALLOWED_CACHES.has(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function getTargetCache(pathname) {
  if (pathname.includes('/engines/pyodide/')) return PYTHON_CACHE;
  if (pathname.includes('/engines/clang/')) return C_CACHE;
  return APP_CACHE;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 동일 출처 요청만 처리 (외부 서버 전송 및 CDN 차단 원칙)
  if (url.origin !== self.location.origin) return;

  // 1. 실행 엔진 파일 (/engines/pyodide/*, /engines/clang/*) -> Cache First (오프라인 최우선)
  if (url.pathname.includes('/engines/pyodide/') || url.pathname.includes('/engines/clang/')) {
    const cacheName = getTargetCache(url.pathname);
    event.respondWith(
      caches.open(cacheName).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        const networkResp = await fetch(req);
        if (networkResp && networkResp.ok) {
          const clean = await sanitizeResponse(url.pathname, networkResp.clone());
          await cache.put(req, clean);
        }
        return networkResp;
      })
    );
    return;
  }

  // 2. HTML 내비게이션 요청 -> Network First (no-cache로 GitHub Pages 10분 HTTP 캐시 우회)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(async (networkResp) => {
          if (networkResp && networkResp.ok) {
            const cache = await caches.open(APP_CACHE);
            const clean = await sanitizeResponse(url.pathname, networkResp.clone());
            await cache.put('./index.html', clean);
          }
          return networkResp;
        })
        .catch(async () => {
          const cache = await caches.open(APP_CACHE);
          return (
            (await cache.match('./index.html')) ||
            (await cache.match('./')) ||
            new Response('오프라인 상태입니다. 앱을 다시 열어주세요.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        })
    );
    return;
  }

  // 3. 정적 번들 자산 (JS/CSS/아이콘/매니페스트) -> Cache First with Background Update
  event.respondWith(
    caches.open(APP_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const networkPromise = fetch(req)
        .then(async (networkResp) => {
          if (networkResp && networkResp.ok) {
            const clean = await sanitizeResponse(url.pathname, networkResp.clone());
            await cache.put(req, clean);
          }
          return networkResp;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkPromise);
        return cached;
      }
      const fresh = await networkPromise;
      if (fresh) return fresh;
      return new Response('오프라인 캐시에 리소스가 없습니다.', { status: 503 });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
