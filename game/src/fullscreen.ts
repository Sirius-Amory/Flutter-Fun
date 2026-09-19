export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;

  const element = document.documentElement as Document['documentElement'] & {
    requestFullscreen?: () => Promise<void>;
  };

  return typeof document.fullscreenElement !== 'undefined' && typeof element.requestFullscreen === 'function';
}

export async function toggleFullScreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  if (document.fullscreenElement) {
    if (typeof document.exitFullscreen === 'function') {
      await document.exitFullscreen();
      return true;
    }
    return false;
  }

  const element = document.documentElement as Document['documentElement'] & {
    requestFullscreen?: () => Promise<void>;
  };

  if (typeof element.requestFullscreen === 'function') {
    await element.requestFullscreen();
    return true;
  }

  return false;
}
