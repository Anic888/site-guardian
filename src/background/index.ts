// ---------------------------------------------------------------------------
// Site Guardian — Background Service Worker
// ---------------------------------------------------------------------------

import { browser } from '@core/browser-api';
import { MessageType, type Message, type MessageResponse } from '@core/messaging';
import {
  clearTroubleshootSession,
  deleteAutoRule,
  addCustomTag,
  disableSync,
  enableSync,
  getAllSiteRules,
  getTagConfig,
  getGlobalSettings,
  getStorageBackendInfo,
  getTroubleshootSession,
  getUserAutoRules,
  markFirstRunComplete,
  removeCustomTag,
  removeSiteRule,
  resetAllSettings,
  setExtensionTags,
  saveTroubleshootSession,
  setAutoRule,
  setSiteMode,
  updateGlobalSettings,
  updateLastActive,
} from '@core/storage';
import { BUILT_IN_RULES, mergeRules } from '@core/auto-rules';
import { buildTabStatus, validateHostname } from '@core/site-mode';
import {
  SiteMode,
  type PageHealthReport,
  type TroubleshootSession,
  type TroubleshootStep,
  TroubleshootStepStatus,
} from '@core/types';
import {
  analyzeExtension,
  buildSiteReport,
  type RawExtensionInfo,
} from '@core/extension-analyzer';

const VALID_MODES = new Set<string>(Object.values(SiteMode));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function success<T>(data: T): MessageResponse<T> {
  return { ok: true, data };
}

function failure(error: string): MessageResponse<never> {
  return { ok: false, error };
}

async function getActiveTabUrl(): Promise<string> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.url ?? '';
  } catch {
    return '';
  }
}

async function getActiveTabId(): Promise<number | null> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id ?? null;
  } catch {
    return null;
  }
}

function getSelfId(): string {
  return browser.runtime.id;
}

async function getAllRawExtensions(): Promise<RawExtensionInfo[]> {
  try {
    const all = await browser.management.getAll();
    return all as unknown as RawExtensionInfo[];
  } catch (err) {
    console.error('[Site Guardian] management.getAll() failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Badge update
// ---------------------------------------------------------------------------

async function updateBadge(tabId: number, url: string): Promise<void> {
  try {
    const raw = await getAllRawExtensions();
    if (raw.length === 0) {
      await browser.action.setBadgeText({ text: '', tabId });
      return;
    }

    const report = buildSiteReport(raw, url, getSelfId(), await getTagConfig());
    const count = report.activeOnPage.length;

    if (count === 0) {
      await browser.action.setBadgeText({ text: '', tabId });
    } else {
      await browser.action.setBadgeText({ text: String(count), tabId });
      // Color based on risk
      const color = report.overallRisk === 'high'
        ? '#dc2626'
        : report.overallRisk === 'medium'
          ? '#d97706'
          : '#16a34a';
      await browser.action.setBadgeBackgroundColor({ color, tabId });
      await browser.action.setBadgeTextColor({ color: '#ffffff', tabId });
    }
  } catch {
    // Badge API may not be available in all contexts
  }
}

// ---------------------------------------------------------------------------
// Content script injection (on-demand)
// ---------------------------------------------------------------------------

async function getPageHealth(tabId: number): Promise<PageHealthReport | null> {
  try {
    // Inject content script — requires activeTab (granted when user clicks extension icon)
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
  } catch (err) {
    console.warn('[Site Guardian] Content script injection failed:', err);
    return null;
  }

  // Give the script time to register its message listener
  await new Promise((r) => setTimeout(r, 200));

  try {
    const response = await browser.tabs.sendMessage(tabId, { type: 'GET_PAGE_HEALTH' });
    if (response && typeof response === 'object' && 'errorCount' in response) {
      return response as PageHealthReport;
    }
    return null;
  } catch (err) {
    console.warn('[Site Guardian] Page health query failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async function handleMessage(
  message: Message,
): Promise<MessageResponse<unknown>> {
  try {
    switch (message.type) {
      case MessageType.GET_TAB_STATUS: {
        const url = await getActiveTabUrl();
        const tabId = await getActiveTabId();
        const raw = await getAllRawExtensions();
        const report = raw.length > 0 ? buildSiteReport(raw, url, getSelfId(), await getTagConfig()) : null;

        // Get page health before building status (so diagnostics can use it)
        let pageHealth: PageHealthReport | null = null;
        if (tabId) {
          pageHealth = await getPageHealth(tabId);
        }

        const status = await buildTabStatus(url, report, pageHealth);
        return success(status);
      }

      case MessageType.SET_SITE_MODE: {
        const hostCheck = validateHostname(message.hostname);
        if (!hostCheck.valid) return failure(hostCheck.reason);
        if (!VALID_MODES.has(message.mode)) return failure('Invalid site mode.');
        const rule = await setSiteMode(hostCheck.hostname, message.mode);
        return success(rule);
      }

      case MessageType.REMOVE_SITE_RULE: {
        const hostCheck = validateHostname(message.hostname);
        if (!hostCheck.valid) return failure(hostCheck.reason);
        await removeSiteRule(hostCheck.hostname);
        return success(undefined);
      }

      case MessageType.GET_ALL_SITE_RULES: {
        return success(await getAllSiteRules());
      }

      case MessageType.GET_GLOBAL_SETTINGS: {
        return success(await getGlobalSettings());
      }

      case MessageType.UPDATE_GLOBAL_SETTINGS: {
        if (
          message.settings.defaultMode !== undefined &&
          !VALID_MODES.has(message.settings.defaultMode)
        ) {
          return failure('Invalid default mode.');
        }
        return success(await updateGlobalSettings(message.settings));
      }

      case MessageType.MARK_FIRST_RUN_COMPLETE: {
        await markFirstRunComplete();
        return success(undefined);
      }

      case MessageType.RESET_ALL_SETTINGS: {
        const session = await getTroubleshootSession();
        if (session?.active) {
          await restoreExtensions(session);
        }
        await resetAllSettings();
        return success(undefined);
      }

      // --- Extension management ---

      case MessageType.GET_SITE_EXTENSIONS: {
        const url = await getActiveTabUrl();
        const raw = await getAllRawExtensions();
        return success(buildSiteReport(raw, url, getSelfId(), await getTagConfig()));
      }

      case MessageType.GET_ALL_EXTENSIONS: {
        const raw = await getAllRawExtensions();
        const selfId = getSelfId();
        const tags = await getTagConfig();
        const analyzed = raw
          .filter((r) => r.type === 'extension')
          .map((r) => analyzeExtension(r, '', selfId, tags));
        return success(analyzed);
      }

      case MessageType.SET_EXTENSION_ENABLED: {
        if (!message.extensionId || typeof message.extensionId !== 'string') {
          return failure('Invalid extension ID.');
        }
        try {
          await browser.management.setEnabled(message.extensionId, message.enabled);
          return success(undefined);
        } catch {
          return failure('Failed to change extension state.');
        }
      }

      case MessageType.START_TROUBLESHOOT: {
        const existing = await getTroubleshootSession();
        if (existing?.active) return failure('Troubleshoot mode is already active.');

        const raw = await getAllRawExtensions();
        const selfId = getSelfId();
        const toDisable = raw.filter(
          (r) => r.type === 'extension' && r.enabled && r.id !== selfId,
        );

        const disabledIds: string[] = [];
        for (const ext of toDisable) {
          try {
            await browser.management.setEnabled(ext.id, false);
            disabledIds.push(ext.id);
          } catch { /* managed by policy */ }
        }

        const session: TroubleshootSession = {
          active: true,
          disabledExtensionIds: disabledIds,
          mode: 'bulk',
          startedAt: new Date().toISOString(),
        };
        await saveTroubleshootSession(session);
        return success(session);
      }

      case MessageType.STOP_TROUBLESHOOT: {
        const session = await getTroubleshootSession();
        if (!session?.active) return failure('No active troubleshoot session.');
        await restoreExtensions(session);
        await clearTroubleshootSession();
        return success(undefined);
      }

      case MessageType.GET_TROUBLESHOOT_SESSION: {
        return success(await getTroubleshootSession());
      }

      case MessageType.START_SMART_TROUBLESHOOT: {
        const existing = await getTroubleshootSession();
        if (existing?.active) return failure('Troubleshoot mode is already active.');

        const url = await getActiveTabUrl();
        const raw = await getAllRawExtensions();
        const selfId = getSelfId();
        const report = buildSiteReport(raw, url, selfId, await getTagConfig());

        // Build steps — test active-on-page extensions first, then others
        const steps: TroubleshootStep[] = [
          ...report.activeOnPage,
          ...report.allEnabled.filter((e) => !e.activeOnCurrentPage),
        ].map((ext) => ({
          extensionId: ext.id,
          extensionName: ext.name,
          status: TroubleshootStepStatus.Pending,
          result: 'unknown' as const,
        }));

        const session: TroubleshootSession = {
          active: true,
          disabledExtensionIds: [],
          mode: 'smart',
          smartSteps: steps,
          startedAt: new Date().toISOString(),
        };
        await saveTroubleshootSession(session);
        return success(session);
      }

      case MessageType.TROUBLESHOOT_NEXT_STEP: {
        const session = await getTroubleshootSession();
        if (!session?.active || session.mode !== 'smart' || !session.smartSteps) {
          return failure('No active smart troubleshoot session.');
        }

        // Re-enable previously tested extension
        const currentTesting = session.smartSteps.find(
          (s) => s.status === TroubleshootStepStatus.Testing,
        );
        if (currentTesting) {
          try {
            await browser.management.setEnabled(currentTesting.extensionId, true);
          } catch { /* ok */ }
          currentTesting.status = TroubleshootStepStatus.Done;
          currentTesting.result = message.lastStepHealthy ? 'healthy' : 'still_broken';
        }

        // Find next pending step
        const nextStep = session.smartSteps.find(
          (s) => s.status === TroubleshootStepStatus.Pending,
        );

        if (!nextStep) {
          // All steps done
          session.active = false;
          await saveTroubleshootSession(session);
          return success({ done: true, steps: session.smartSteps });
        }

        // Disable next extension for testing
        try {
          await browser.management.setEnabled(nextStep.extensionId, false);
          nextStep.status = TroubleshootStepStatus.Testing;
          session.disabledExtensionIds = [nextStep.extensionId];
        } catch {
          nextStep.status = TroubleshootStepStatus.Done;
          nextStep.result = 'unknown';
        }

        await saveTroubleshootSession(session);
        return success({
          done: false,
          currentStep: nextStep,
          steps: session.smartSteps,
        });
      }

      // --- Auto-rules ---

      case MessageType.GET_AUTO_RULES: {
        const userRules = await getUserAutoRules();
        const all = mergeRules(BUILT_IN_RULES, userRules);
        return success(all);
      }

      case MessageType.SET_AUTO_RULE: {
        if (!message.rule || typeof message.rule !== 'object') {
          return failure('Invalid rule.');
        }
        await setAutoRule(message.rule);
        return success(undefined);
      }

      case MessageType.DELETE_AUTO_RULE: {
        if (!message.ruleId || typeof message.ruleId !== 'string') {
          return failure('Invalid rule ID.');
        }
        await deleteAutoRule(message.ruleId);
        return success(undefined);
      }

      // --- DOM Tracer ---

      case MessageType.GET_DOM_TRACE: {
        const tabId = await getActiveTabId();
        if (!tabId) return failure('No active tab.');
        try {
          // Inject content script if not already present
          await browser.scripting.executeScript({
            target: { tabId },
            files: ['content.js'],
          });
          await new Promise((r) => setTimeout(r, 200));
          const trace = await browser.tabs.sendMessage(tabId, { type: 'GET_DOM_TRACE' });
          if (trace && typeof trace === 'object') {
            return success(trace);
          }
          return failure('No trace data available.');
        } catch {
          return failure('Failed to collect DOM trace.');
        }
      }

      // --- Tags ---

      case MessageType.GET_TAG_CONFIG: {
        return success(await getTagConfig());
      }

      case MessageType.SET_EXTENSION_TAGS: {
        if (!message.extensionId) return failure('Invalid extension ID.');
        await setExtensionTags(message.extensionId, message.entry);
        return success(undefined);
      }

      case MessageType.ADD_CUSTOM_TAG: {
        if (!message.tag) return failure('Invalid tag.');
        await addCustomTag(message.tag);
        return success(undefined);
      }

      case MessageType.REMOVE_CUSTOM_TAG: {
        if (!message.tag) return failure('Invalid tag.');
        await removeCustomTag(message.tag);
        return success(undefined);
      }

      // --- Storage sync ---

      case MessageType.ENABLE_SYNC: {
        try {
          const info = await enableSync();
          return success(info);
        } catch {
          return failure('Failed to enable sync. Sync may not be available in this browser.');
        }
      }

      case MessageType.DISABLE_SYNC: {
        const info = await disableSync();
        return success(info);
      }

      case MessageType.GET_STORAGE_INFO: {
        return success(await getStorageBackendInfo());
      }

      default: {
        const _exhaustive: never = message;
        return failure(`Unknown message type: ${(_exhaustive as Message).type}`);
      }
    }
  } catch (err) {
    console.error('[Site Guardian] Message handler error:', err);
    return failure('An unexpected error occurred. Please try again.');
  }
}

async function restoreExtensions(session: TroubleshootSession): Promise<void> {
  // Restore bulk disabled
  for (const id of session.disabledExtensionIds) {
    try { await browser.management.setEnabled(id, true); } catch { /* ok */ }
  }
  // Restore smart troubleshoot disabled
  if (session.smartSteps) {
    for (const step of session.smartSteps) {
      if (step.status === TroubleshootStepStatus.Testing) {
        try { await browser.management.setEnabled(step.extensionId, true); } catch { /* ok */ }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

browser.runtime.onMessage.addListener(
  async (message: unknown, _sender: browser.Runtime.MessageSender): Promise<unknown> => {
    if (
      !message ||
      typeof message !== 'object' ||
      !('type' in message) ||
      typeof (message as Record<string, unknown>).type !== 'string'
    ) {
      return undefined;
    }
    return handleMessage(message as Message);
  },
);

// Badge update on tab switch and navigation
browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await updateBadge(activeInfo.tabId, tab.url);
    }
  } catch { /* ok */ }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await updateBadge(tabId, tab.url);
  }
});

// Lifecycle
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const settings = await getGlobalSettings();
    if (!settings.firstRunComplete) {
      const onboardingUrl = browser.runtime.getURL('src/onboarding/index.html');
      await browser.tabs.create({ url: onboardingUrl });
    }
  }
  await updateLastActive();
});

browser.runtime.onStartup.addListener(async () => {
  await updateLastActive();
});
