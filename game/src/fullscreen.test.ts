import { describe, expect, it, vi } from 'vitest';
import { isFullscreenSupported, toggleFullScreen } from './fullscreen';

describe('fullscreen helpers', () => {
  it('detects browser fullscreen support', () => {
    const originalDocument = globalThis.document;

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        fullscreenElement: null,
        documentElement: { requestFullscreen: vi.fn() },
        exitFullscreen: vi.fn(),
      },
    });

    try {
      expect(isFullscreenSupported()).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
    }
  });

  it('requests fullscreen when it is not active', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const exitFullscreen = vi.fn();
    const originalDocument = globalThis.document;

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        fullscreenElement: null,
        documentElement: { requestFullscreen: requestFullscreen },
        exitFullscreen: exitFullscreen,
      },
    });

    try {
      await toggleFullScreen();
      expect(requestFullscreen).toHaveBeenCalledTimes(1);
      expect(exitFullscreen).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
    }
  });
});
