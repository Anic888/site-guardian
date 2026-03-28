// ---------------------------------------------------------------------------
// Site Guardian — Content Script (Health & Performance Monitor)
// ---------------------------------------------------------------------------
//
// Injected via scripting.executeScript when user opens the popup.
// Collects: JS errors, page load timing, resource stats, long tasks, LCP, DOM tracing.
// Zero DOM modification. Read-only observation only.
// Works in both Chrome (chrome.runtime) and Firefox (browser.runtime).
// ---------------------------------------------------------------------------

// Firefox global
declare const browser: typeof chrome | undefined;

(() => {
  // Guard against multiple injections
  if ((window as unknown as Record<string, boolean>).__siteGuardianInjected) return;
  (window as unknown as Record<string, boolean>).__siteGuardianInjected = true;

  // Cross-browser runtime shim — Firefox uses `browser`, Chrome uses `chrome`
  const runtime = (typeof browser !== 'undefined' ? browser : chrome).runtime;

  // ---------------------------------------------------------------------------
  // Error collection
  // ---------------------------------------------------------------------------

  interface PageError {
    message: string;
    source: string;
    line: number;
    col: number;
    timestamp: string;
  }

  const MAX_ERRORS = 20;
  const collectedErrors: PageError[] = [];

  window.addEventListener('error', (event) => {
    if (collectedErrors.length >= MAX_ERRORS) return;
    collectedErrors.push({
      message: event.message || 'Unknown error',
      source: event.filename || '',
      line: event.lineno || 0,
      col: event.colno || 0,
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (collectedErrors.length >= MAX_ERRORS) return;
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    collectedErrors.push({
      message,
      source: '',
      line: 0,
      col: 0,
      timestamp: new Date().toISOString(),
    });
  });

  // ---------------------------------------------------------------------------
  // Long task detection
  // ---------------------------------------------------------------------------

  let longTaskCount = -1; // -1 = unsupported

  try {
    if (typeof PerformanceObserver !== 'undefined') {
      longTaskCount = 0;
      const observer = new PerformanceObserver((list) => {
        longTaskCount += list.getEntries().length;
      });
      observer.observe({ type: 'longtask', buffered: true });
    }
  } catch {
    // PerformanceObserver or longtask not supported
  }

  // ---------------------------------------------------------------------------
  // LCP detection
  // ---------------------------------------------------------------------------

  let lcpMs = -1; // -1 = unsupported

  try {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const last = entries[entries.length - 1];
          if (last) {
            lcpMs = Math.round(last.startTime);
          }
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    }
  } catch {
    // LCP not supported
  }

  // ---------------------------------------------------------------------------
  // Metrics collection functions
  // ---------------------------------------------------------------------------

  function getPageLoadTimeMs(): number {
    try {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (nav) return Math.round(nav.loadEventEnd - nav.startTime);
    } catch { /* ok */ }
    return -1;
  }

  function getDomNodeCount(): number {
    try {
      return document.querySelectorAll('*').length;
    } catch {
      return -1;
    }
  }

  function getResourceStats(): {
    scriptCount: number;
    stylesheetCount: number;
    totalTransferBytes: number;
  } {
    try {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let scriptCount = 0;
      let stylesheetCount = 0;
      let totalTransferBytes = 0;

      for (const r of resources) {
        if (r.initiatorType === 'script') scriptCount++;
        if (r.initiatorType === 'link' || r.initiatorType === 'css') stylesheetCount++;
        if (r.transferSize > 0) totalTransferBytes += r.transferSize;
      }

      return { scriptCount, stylesheetCount, totalTransferBytes };
    } catch {
      return { scriptCount: -1, stylesheetCount: -1, totalTransferBytes: -1 };
    }
  }

  function getJsHeapUsedBytes(): number {
    try {
      // Chrome-only, deprecated but still works
      const mem = (performance as unknown as Record<string, unknown>).memory as
        | { usedJSHeapSize?: number }
        | undefined;
      if (mem?.usedJSHeapSize) return mem.usedJSHeapSize;
    } catch { /* ok */ }
    return -1;
  }

  // ---------------------------------------------------------------------------
  // Message handler
  // ---------------------------------------------------------------------------

  runtime.onMessage.addListener(
    (
      message: unknown,
      _sender: unknown,
      sendResponse: (response: unknown) => void,
    ): true | undefined => {
      if (
        message &&
        typeof message === 'object' &&
        (message as Record<string, unknown>).type === 'GET_PAGE_HEALTH'
      ) {
        const resourceStats = getResourceStats();

        sendResponse({
          url: window.location.href,
          errorCount: collectedErrors.length,
          errors: [...collectedErrors].reverse(),
          pageLoadTimeMs: getPageLoadTimeMs(),
          domNodeCount: getDomNodeCount(),
          lcpMs,
          longTaskCount,
          scriptCount: resourceStats.scriptCount,
          stylesheetCount: resourceStats.stylesheetCount,
          totalTransferBytes: resourceStats.totalTransferBytes,
          jsHeapUsedBytes: getJsHeapUsedBytes(),
          generatedAt: new Date().toISOString(),
        });
        return true;
      }
      return undefined;
    },
  );
})();
