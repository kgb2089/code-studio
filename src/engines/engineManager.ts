import type { EngineStatus, Language } from '../types/ide';

interface EngineManifestEntry {
  name: string;
  version: string;
  cacheName: string;
  totalBytes: number;
  files: Array<{ path: string; size: number }>;
}

interface EngineManifest {
  generatedAt: string;
  engines: Record<Language, EngineManifestEntry>;
}

let cachedManifest: EngineManifest | null = null;

function getBaseUrl(): string {
  // Vite base './' 지원: 현재 문서 경로 기준 상대 경로 계산
  const href = window.location.href;
  const url = new URL('./', href);
  return url.href;
}

export async function loadEngineManifest(): Promise<EngineManifest> {
  if (cachedManifest) return cachedManifest;
  const manifestUrl = new URL('engines/manifest.json', getBaseUrl()).href;
  const resp = await fetch(manifestUrl);
  if (!resp.ok) {
    throw new Error('엔진 매니페스트(engines/manifest.json)를 불러올 수 없습니다.');
  }
  cachedManifest = (await resp.json()) as EngineManifest;
  return cachedManifest;
}

/**
 * Safari/iPadOS에서 브라우저가 캐시를 임의로 삭제하지 않도록 영구 저장 권한을 요청합니다.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      return await navigator.storage.persist();
    }
  } catch {
    // 지원하지 않는 환경 무시
  }
  return false;
}

/**
 * 특정 언어의 실행 엔진 파일이 모두 Cache API에 저장되어 오프라인 실행이 가능한지 확인합니다.
 */
export async function checkEngineCacheStatus(lang: Language): Promise<EngineStatus> {
  try {
    const manifest = await loadEngineManifest();
    const info = manifest.engines[lang];
    if (!('caches' in window)) {
      return {
        state: 'idle',
        cached: false,
        version: info.version,
        totalBytes: info.totalBytes,
        downloadedBytes: 0,
        progress: 0,
        message: '브라우저가 Cache API를 지원하지 않습니다.',
      };
    }

    const cache = await caches.open(info.cacheName);
    let cachedBytes = 0;
    let allPresent = true;
    const base = getBaseUrl();

    for (const f of info.files) {
      const fullUrl = new URL(f.path, base).href;
      const match = await cache.match(fullUrl, { ignoreSearch: true });
      if (match) {
        cachedBytes += f.size;
      } else {
        allPresent = false;
      }
    }

    const progress = info.totalBytes > 0 ? Math.round((cachedBytes / info.totalBytes) * 100) : 0;

    return {
      state: allPresent ? 'ready' : 'idle',
      cached: allPresent,
      version: info.version,
      totalBytes: info.totalBytes,
      downloadedBytes: cachedBytes,
      progress,
      message: allPresent ? '오프라인 캐시 완료' : '미설치 (실행 시 또는 다운로드 시 설치)',
    };
  } catch (err) {
    return {
      state: 'error',
      cached: false,
      version: 'unknown',
      totalBytes: 0,
      downloadedBytes: 0,
      progress: 0,
      message: '엔진 상태 확인 실패',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 지정한 엔진의 모든 WASM/리소스 파일을 스트리밍 다운로드하여 Cache API에 저장하고
 * 바이트 단위 진행률(0~100%)을 콜백으로 전달합니다.
 */
export async function downloadAndCacheEngine(
  lang: Language,
  onProgress: (status: EngineStatus) => void
): Promise<EngineStatus> {
  await requestPersistentStorage();
  const manifest = await loadEngineManifest();
  const info = manifest.engines[lang];
  const base = getBaseUrl();

  const cache = 'caches' in window ? await caches.open(info.cacheName) : null;
  let completedBytes = 0;

  onProgress({
    state: 'downloading',
    cached: false,
    version: info.version,
    totalBytes: info.totalBytes,
    downloadedBytes: 0,
    progress: 0,
    message: `${info.name} 다운로드 시작...`,
  });

  for (const file of info.files) {
    const fileUrl = new URL(file.path, base).href;

    // 이미 캐시되어 있으면 재다운로드 건너뛰기
    if (cache) {
      const existing = await cache.match(fileUrl, { ignoreSearch: true });
      if (existing) {
        completedBytes += file.size;
        const pct = Math.min(100, Math.round((completedBytes / info.totalBytes) * 100));
        onProgress({
          state: 'downloading',
          cached: false,
          version: info.version,
          totalBytes: info.totalBytes,
          downloadedBytes: completedBytes,
          progress: pct,
          message: `캐시 확인 중... (${pct}%)`,
        });
        continue;
      }
    }

    const resp = await fetch(fileUrl);
    if (!resp.ok) {
      throw new Error(`파일 다운로드 실패 (${resp.status}): ${file.path}`);
    }

    const chunks: Uint8Array[] = [];
    let fileLoaded = 0;

    if (resp.body) {
      const reader = resp.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          fileLoaded += value.byteLength;
          const totalNow = Math.min(info.totalBytes, completedBytes + fileLoaded);
          const pct = info.totalBytes > 0 ? Math.min(100, Math.round((totalNow / info.totalBytes) * 100)) : 0;
          onProgress({
            state: 'downloading',
            cached: false,
            version: info.version,
            totalBytes: info.totalBytes,
            downloadedBytes: totalNow,
            progress: pct,
            message: `${file.path.split('/').pop()} 다운로드 중 (${pct}%)`,
          });
        }
      }
    } else {
      const buf = new Uint8Array(await resp.arrayBuffer());
      chunks.push(buf);
      fileLoaded = buf.byteLength;
    }

    completedBytes += file.size;

    if (cache) {
      // Safari 오프라인 WASM MIME 타입 및 비리디렉션 Response 보장
      const merged = new Uint8Array(fileLoaded);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.byteLength;
      }
      const headers = new Headers();
      if (file.path.endsWith('.wasm')) {
        headers.set('Content-Type', 'application/wasm');
      } else if (file.path.endsWith('.mjs') || file.path.endsWith('.js')) {
        headers.set('Content-Type', 'application/javascript; charset=utf-8');
      } else if (file.path.endsWith('.json')) {
        headers.set('Content-Type', 'application/json; charset=utf-8');
      } else {
        headers.set('Content-Type', 'application/octet-stream');
      }
      headers.set('Content-Length', String(merged.byteLength));

      const cleanResponse = new Response(merged, {
        status: 200,
        statusText: 'OK',
        headers,
      });
      await cache.put(fileUrl, cleanResponse);
    }
  }

  const finalStatus: EngineStatus = {
    state: 'ready',
    cached: true,
    version: info.version,
    totalBytes: info.totalBytes,
    downloadedBytes: info.totalBytes,
    progress: 100,
    message: '오프라인 캐시 완료',
  };
  onProgress(finalStatus);
  return finalStatus;
}

/**
 * 특정 언어 실행 엔진의 캐시를 삭제합니다 (사용자 IndexedDB 프로젝트는 절대 삭제하지 않음).
 */
export async function clearEngineCache(lang: Language): Promise<void> {
  const manifest = await loadEngineManifest();
  const info = manifest.engines[lang];
  if ('caches' in window) {
    await caches.delete(info.cacheName);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
