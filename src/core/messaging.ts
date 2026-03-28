// ---------------------------------------------------------------------------
// Site Guardian — Type-safe Message Passing
// ---------------------------------------------------------------------------
//
// All communication between UI contexts (popup, options, onboarding)
// and the background service worker goes through these message types.
//
// Pattern: request/response via browser.runtime.sendMessage
// ---------------------------------------------------------------------------

import type {
  AutoRule,
  ExtensionTagEntry,
  GlobalSettings,
  SiteMode,
  SiteRule,
  SiteRulesMap,
  TabStatus,
} from './types';

// ---------------------------------------------------------------------------
// Message type discriminator
// ---------------------------------------------------------------------------

export enum MessageType {
  // Tab & site status
  GET_TAB_STATUS = 'GET_TAB_STATUS',

  // Site mode management
  SET_SITE_MODE = 'SET_SITE_MODE',
  REMOVE_SITE_RULE = 'REMOVE_SITE_RULE',
  GET_ALL_SITE_RULES = 'GET_ALL_SITE_RULES',

  // Global settings
  GET_GLOBAL_SETTINGS = 'GET_GLOBAL_SETTINGS',
  UPDATE_GLOBAL_SETTINGS = 'UPDATE_GLOBAL_SETTINGS',

  // Lifecycle
  MARK_FIRST_RUN_COMPLETE = 'MARK_FIRST_RUN_COMPLETE',

  // Danger zone
  RESET_ALL_SETTINGS = 'RESET_ALL_SETTINGS',

  // Extension management (v0.2)
  GET_SITE_EXTENSIONS = 'GET_SITE_EXTENSIONS',
  GET_ALL_EXTENSIONS = 'GET_ALL_EXTENSIONS',
  SET_EXTENSION_ENABLED = 'SET_EXTENSION_ENABLED',
  START_TROUBLESHOOT = 'START_TROUBLESHOOT',
  STOP_TROUBLESHOOT = 'STOP_TROUBLESHOOT',
  GET_TROUBLESHOOT_SESSION = 'GET_TROUBLESHOOT_SESSION',
  START_SMART_TROUBLESHOOT = 'START_SMART_TROUBLESHOOT',
  TROUBLESHOOT_NEXT_STEP = 'TROUBLESHOOT_NEXT_STEP',

  // Auto-rules
  GET_AUTO_RULES = 'GET_AUTO_RULES',
  SET_AUTO_RULE = 'SET_AUTO_RULE',
  DELETE_AUTO_RULE = 'DELETE_AUTO_RULE',

  // DOM Tracer
  GET_DOM_TRACE = 'GET_DOM_TRACE',

  // Tags
  GET_TAG_CONFIG = 'GET_TAG_CONFIG',
  SET_EXTENSION_TAGS = 'SET_EXTENSION_TAGS',
  ADD_CUSTOM_TAG = 'ADD_CUSTOM_TAG',
  REMOVE_CUSTOM_TAG = 'REMOVE_CUSTOM_TAG',

  // Storage sync
  ENABLE_SYNC = 'ENABLE_SYNC',
  DISABLE_SYNC = 'DISABLE_SYNC',
  GET_STORAGE_INFO = 'GET_STORAGE_INFO',
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface GetTabStatusRequest {
  type: MessageType.GET_TAB_STATUS;
}

export interface SetSiteModeRequest {
  type: MessageType.SET_SITE_MODE;
  hostname: string;
  mode: SiteMode;
}

export interface RemoveSiteRuleRequest {
  type: MessageType.REMOVE_SITE_RULE;
  hostname: string;
}

export interface GetAllSiteRulesRequest {
  type: MessageType.GET_ALL_SITE_RULES;
}

export interface GetGlobalSettingsRequest {
  type: MessageType.GET_GLOBAL_SETTINGS;
}

export interface UpdateGlobalSettingsRequest {
  type: MessageType.UPDATE_GLOBAL_SETTINGS;
  settings: Partial<Pick<GlobalSettings, 'defaultMode'>>;
}

export interface MarkFirstRunCompleteRequest {
  type: MessageType.MARK_FIRST_RUN_COMPLETE;
}

export interface ResetAllSettingsRequest {
  type: MessageType.RESET_ALL_SETTINGS;
}

export interface GetSiteExtensionsRequest {
  type: MessageType.GET_SITE_EXTENSIONS;
}

export interface GetAllExtensionsRequest {
  type: MessageType.GET_ALL_EXTENSIONS;
}

export interface SetExtensionEnabledRequest {
  type: MessageType.SET_EXTENSION_ENABLED;
  extensionId: string;
  enabled: boolean;
}

export interface StartTroubleshootRequest {
  type: MessageType.START_TROUBLESHOOT;
}

export interface StopTroubleshootRequest {
  type: MessageType.STOP_TROUBLESHOOT;
}

export interface GetTroubleshootSessionRequest {
  type: MessageType.GET_TROUBLESHOOT_SESSION;
}

export interface StartSmartTroubleshootRequest {
  type: MessageType.START_SMART_TROUBLESHOOT;
}

export interface TroubleshootNextStepRequest {
  type: MessageType.TROUBLESHOOT_NEXT_STEP;
  lastStepHealthy: boolean;
}

export interface GetAutoRulesRequest {
  type: MessageType.GET_AUTO_RULES;
}

export interface SetAutoRuleRequest {
  type: MessageType.SET_AUTO_RULE;
  rule: AutoRule;
}

export interface DeleteAutoRuleRequest {
  type: MessageType.DELETE_AUTO_RULE;
  ruleId: string;
}

export interface GetDOMTraceRequest {
  type: MessageType.GET_DOM_TRACE;
}

export interface GetTagConfigRequest {
  type: MessageType.GET_TAG_CONFIG;
}

export interface SetExtensionTagsRequest {
  type: MessageType.SET_EXTENSION_TAGS;
  extensionId: string;
  entry: ExtensionTagEntry;
}

export interface AddCustomTagRequest {
  type: MessageType.ADD_CUSTOM_TAG;
  tag: string;
}

export interface RemoveCustomTagRequest {
  type: MessageType.REMOVE_CUSTOM_TAG;
  tag: string;
}

export interface EnableSyncRequest {
  type: MessageType.ENABLE_SYNC;
}

export interface DisableSyncRequest {
  type: MessageType.DISABLE_SYNC;
}

export interface GetStorageInfoRequest {
  type: MessageType.GET_STORAGE_INFO;
}

export type Message =
  | GetTabStatusRequest
  | SetSiteModeRequest
  | RemoveSiteRuleRequest
  | GetAllSiteRulesRequest
  | GetGlobalSettingsRequest
  | UpdateGlobalSettingsRequest
  | MarkFirstRunCompleteRequest
  | ResetAllSettingsRequest
  | GetSiteExtensionsRequest
  | GetAllExtensionsRequest
  | SetExtensionEnabledRequest
  | StartTroubleshootRequest
  | StopTroubleshootRequest
  | GetTroubleshootSessionRequest
  | StartSmartTroubleshootRequest
  | TroubleshootNextStepRequest
  | GetAutoRulesRequest
  | SetAutoRuleRequest
  | DeleteAutoRuleRequest
  | GetDOMTraceRequest
  | GetTagConfigRequest
  | SetExtensionTagsRequest
  | AddCustomTagRequest
  | RemoveCustomTagRequest
  | EnableSyncRequest
  | DisableSyncRequest
  | GetStorageInfoRequest;

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/** Wrapper for all responses — includes success/error discrimination */
export type MessageResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Specific response data types per message
export type GetTabStatusResponse = MessageResponse<TabStatus>;
export type SetSiteModeResponse = MessageResponse<SiteRule>;
export type RemoveSiteRuleResponse = MessageResponse<void>;
export type GetAllSiteRulesResponse = MessageResponse<SiteRulesMap>;
export type GetGlobalSettingsResponse = MessageResponse<GlobalSettings>;
export type UpdateGlobalSettingsResponse = MessageResponse<GlobalSettings>;
export type MarkFirstRunCompleteResponse = MessageResponse<void>;
export type ResetAllSettingsResponse = MessageResponse<void>;

// ---------------------------------------------------------------------------
// Helper to send a typed message from UI → background
// ---------------------------------------------------------------------------

import { browser } from './browser-api';

export async function sendMessage<T>(message: Message): Promise<T> {
  const response = (await browser.runtime.sendMessage(message)) as
    | MessageResponse<T>
    | undefined;

  if (!response) {
    throw new Error('No response from background service worker.');
  }

  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.data as T;
}
