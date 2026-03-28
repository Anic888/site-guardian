// ---------------------------------------------------------------------------
// useMessaging — Hook for background service worker communication
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { sendMessage, MessageType } from '@core/messaging';
import type {
  AutoRule,
  DOMTraceReport,
  ExtensionInfo,
  ExtensionTagEntry,
  GlobalSettings,
  SiteExtensionReport,
  SiteMode,
  SiteRule,
  SiteRulesMap,
  StorageBackendInfo,
  TabStatus,
  TagConfig,
  TroubleshootSession,
} from '@core/types';

// ---------------------------------------------------------------------------
// Generic async data hook
// ---------------------------------------------------------------------------

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      setState({ data: null, loading: false, error: message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}

// ---------------------------------------------------------------------------
// Typed hooks for specific messages
// ---------------------------------------------------------------------------

export function useTabStatus() {
  return useAsyncData<TabStatus>(
    () => sendMessage<TabStatus>({ type: MessageType.GET_TAB_STATUS }),
  );
}

export function useGlobalSettings() {
  return useAsyncData<GlobalSettings>(
    () =>
      sendMessage<GlobalSettings>({ type: MessageType.GET_GLOBAL_SETTINGS }),
  );
}

export function useAllSiteRules() {
  return useAsyncData<SiteRulesMap>(
    () =>
      sendMessage<SiteRulesMap>({ type: MessageType.GET_ALL_SITE_RULES }),
  );
}

// ---------------------------------------------------------------------------
// Mutation helpers (not hooks — called imperatively)
// ---------------------------------------------------------------------------

export async function setSiteMode(
  hostname: string,
  mode: SiteMode,
): Promise<SiteRule> {
  return sendMessage<SiteRule>({
    type: MessageType.SET_SITE_MODE,
    hostname,
    mode,
  });
}

export async function removeSiteRule(hostname: string): Promise<void> {
  return sendMessage<void>({
    type: MessageType.REMOVE_SITE_RULE,
    hostname,
  });
}

export async function updateGlobalSettings(
  settings: { defaultMode?: SiteMode },
): Promise<GlobalSettings> {
  return sendMessage<GlobalSettings>({
    type: MessageType.UPDATE_GLOBAL_SETTINGS,
    settings,
  });
}

export async function markFirstRunComplete(): Promise<void> {
  return sendMessage<void>({
    type: MessageType.MARK_FIRST_RUN_COMPLETE,
  });
}

export async function resetAllSettings(): Promise<void> {
  return sendMessage<void>({
    type: MessageType.RESET_ALL_SETTINGS,
  });
}

// ---------------------------------------------------------------------------
// Extension management hooks & mutations (v0.2)
// ---------------------------------------------------------------------------

export function useSiteExtensions() {
  return useAsyncData<SiteExtensionReport>(
    () => sendMessage<SiteExtensionReport>({ type: MessageType.GET_SITE_EXTENSIONS }),
  );
}

export function useAllExtensions() {
  return useAsyncData<ExtensionInfo[]>(
    () => sendMessage<ExtensionInfo[]>({ type: MessageType.GET_ALL_EXTENSIONS }),
  );
}

export function useTroubleshootSession() {
  return useAsyncData<TroubleshootSession | null>(
    () => sendMessage<TroubleshootSession | null>({ type: MessageType.GET_TROUBLESHOOT_SESSION }),
  );
}

export async function setExtensionEnabled(
  extensionId: string,
  enabled: boolean,
): Promise<void> {
  return sendMessage<void>({
    type: MessageType.SET_EXTENSION_ENABLED,
    extensionId,
    enabled,
  });
}

export async function startTroubleshoot(): Promise<TroubleshootSession> {
  return sendMessage<TroubleshootSession>({
    type: MessageType.START_TROUBLESHOOT,
  });
}

export async function stopTroubleshoot(): Promise<void> {
  return sendMessage<void>({
    type: MessageType.STOP_TROUBLESHOOT,
  });
}

export async function startSmartTroubleshoot(): Promise<TroubleshootSession> {
  return sendMessage<TroubleshootSession>({
    type: MessageType.START_SMART_TROUBLESHOOT,
  });
}

export async function troubleshootNextStep(
  lastStepHealthy: boolean,
): Promise<unknown> {
  return sendMessage<unknown>({
    type: MessageType.TROUBLESHOOT_NEXT_STEP,
    lastStepHealthy,
  });
}

// ---------------------------------------------------------------------------
// Auto-rules hooks & mutations
// ---------------------------------------------------------------------------

export function useAutoRules() {
  return useAsyncData<AutoRule[]>(
    () => sendMessage<AutoRule[]>({ type: MessageType.GET_AUTO_RULES }),
  );
}

export async function saveAutoRule(rule: AutoRule): Promise<void> {
  return sendMessage<void>({
    type: MessageType.SET_AUTO_RULE,
    rule,
  });
}

export async function deleteAutoRule(ruleId: string): Promise<void> {
  return sendMessage<void>({
    type: MessageType.DELETE_AUTO_RULE,
    ruleId,
  });
}

// ---------------------------------------------------------------------------
// DOM Tracer
// ---------------------------------------------------------------------------

export async function getDOMTrace(): Promise<DOMTraceReport> {
  return sendMessage<DOMTraceReport>({
    type: MessageType.GET_DOM_TRACE,
  });
}

// ---------------------------------------------------------------------------
// Tag hooks & mutations
// ---------------------------------------------------------------------------

export function useTagConfig() {
  return useAsyncData<TagConfig>(
    () => sendMessage<TagConfig>({ type: MessageType.GET_TAG_CONFIG }),
  );
}

export async function setExtensionTags(
  extensionId: string,
  entry: ExtensionTagEntry,
): Promise<void> {
  return sendMessage<void>({
    type: MessageType.SET_EXTENSION_TAGS,
    extensionId,
    entry,
  });
}

export async function addCustomTag(tag: string): Promise<void> {
  return sendMessage<void>({
    type: MessageType.ADD_CUSTOM_TAG,
    tag,
  });
}

export async function removeCustomTag(tag: string): Promise<void> {
  return sendMessage<void>({
    type: MessageType.REMOVE_CUSTOM_TAG,
    tag,
  });
}

// ---------------------------------------------------------------------------
// Storage sync hooks & mutations
// ---------------------------------------------------------------------------

export function useStorageInfo() {
  return useAsyncData<StorageBackendInfo>(
    () => sendMessage<StorageBackendInfo>({ type: MessageType.GET_STORAGE_INFO }),
  );
}

export async function enableSync(): Promise<StorageBackendInfo> {
  return sendMessage<StorageBackendInfo>({
    type: MessageType.ENABLE_SYNC,
  });
}

export async function disableSync(): Promise<StorageBackendInfo> {
  return sendMessage<StorageBackendInfo>({
    type: MessageType.DISABLE_SYNC,
  });
}
