import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

class ResizeObserverMock {
    observe() {
        // noop for jsdom tests
    }

    unobserve() {
        // noop for jsdom tests
    }

    disconnect() {
        // noop for jsdom tests
    }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.resetAllMocks();
    vi.clearAllMocks();
});