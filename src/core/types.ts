// ---------------------------------------------------------------------------
// Site Guardian — Core Types
// ---------------------------------------------------------------------------

// Storage key prefix to avoid collisions with other extensions
export const STORAGE_PREFIX = 'sg_' as const;

// Storage keys
export const STORAGE_KEYS = {
  GLOBAL_SETTINGS: `${STORAGE_PREFIX}global_settings`,
  SITE_RULES: `${STORAGE_PREFIX}site_rules`,
  EXTENSION_STATE: `${STORAGE_PREFIX}extension_state`,
  TROUBLESHOOT_SESSION: `${STORAGE_PREFIX}troubleshoot_session`,
  AUTO_RULES: `${STORAGE_PREFIX}auto_rules`,
  TAG_CONFIG: `${STORAGE_PREFIX}tag_config`,
} as const;

// Current schema version — increment on breaking storage changes
export const SCHEMA_VERSION = 3;

// ---------------------------------------------------------------------------
// Site Mode
// ---------------------------------------------------------------------------

export enum SiteMode {
  /** Full functionality enabled */
  Normal = 'normal',
  /** Reduced footprint — compatibility mode */
  Safe = 'safe',
  /** Extension is inactive for this site */
  Disabled = 'disabled',
}

/** Labels shown to users in the UI */
export const SITE_MODE_LABELS: Record<SiteMode, string> = {
  [SiteMode.Normal]: 'Normal',
  [SiteMode.Safe]: 'Safe Mode',
  [SiteMode.Disabled]: 'Disabled',
};

/** Short descriptions for each mode */
export const SITE_MODE_DESCRIPTIONS: Record<SiteMode, string> = {
  [SiteMode.Normal]: 'All features active.',
  [SiteMode.Safe]: 'Reduced footprint to avoid conflicts.',
  [SiteMode.Disabled]: 'Extension is inactive on this site.',
};

// ---------------------------------------------------------------------------
// Site Rule — per-site configuration
// ---------------------------------------------------------------------------

export interface SiteRule {
  /** The site mode for this hostname */
  mode: SiteMode;
  /** ISO timestamp of when this rule was last updated */
  updatedAt: string;
}

/** Map of hostname → SiteRule */
export type SiteRulesMap = Record<string, SiteRule>;

// ---------------------------------------------------------------------------
// Global Settings
// ---------------------------------------------------------------------------

export interface GlobalSettings {
  /** Default mode applied when no site-specific rule exists */
  defaultMode: SiteMode;
  /** Whether the first-run onboarding has been completed */
  firstRunComplete: boolean;
  /** Schema version for future migration support */
  schemaVersion: number;
  /** Whether browser.storage.sync is enabled (opt-in) */
  syncEnabled: boolean;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  defaultMode: SiteMode.Normal,
  firstRunComplete: false,
  schemaVersion: SCHEMA_VERSION,
  syncEnabled: false,
};

// ---------------------------------------------------------------------------
// Storage Backend Info — for diagnostics/transparency
// ---------------------------------------------------------------------------

export interface StorageBackendInfo {
  /** Which backend is active for syncable data */
  activeBackend: 'local' | 'sync';
  /** Whether sync is available in this browser */
  syncAvailable: boolean;
  /** Bytes used in local storage (-1 if unavailable) */
  localBytesUsed: number;
  /** Bytes used in sync storage (-1 if unavailable) */
  syncBytesUsed: number;
  /** Sync quota limit in bytes */
  syncQuotaBytes: number;
}

// ---------------------------------------------------------------------------
// Extension State — internal metadata
// ---------------------------------------------------------------------------

export interface ExtensionState {
  /** ISO timestamp of when the extension was first installed */
  installedAt: string;
  /** ISO timestamp of last background service worker activation */
  lastActiveAt: string;
}

export const DEFAULT_EXTENSION_STATE: ExtensionState = {
  installedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Diagnostics — status snapshot for the current site
// ---------------------------------------------------------------------------

export enum DiagnosticSeverity {
  Info = 'info',
  Warning = 'warning',
}

export interface DiagnosticEntry {
  /** Machine-readable code for this diagnostic */
  code: string;
  /** Human-readable title */
  title: string;
  /** Human-readable explanation */
  detail: string;
  severity: DiagnosticSeverity;
}

export interface SiteDiagnostics {
  /** The hostname being diagnosed */
  hostname: string;
  /** Current effective mode for this site */
  effectiveMode: SiteMode;
  /** Whether a site-specific rule exists (vs. using global default) */
  hasExplicitRule: boolean;
  /** List of diagnostic entries */
  entries: DiagnosticEntry[];
  /** ISO timestamp of when diagnostics were generated */
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Tab Status — what the popup receives about the current tab
// ---------------------------------------------------------------------------

export interface TabStatus {
  /** The full URL of the current tab */
  url: string;
  /** The extracted hostname (e.g., "example.com") */
  hostname: string;
  /** Whether this is a valid web page (not chrome://, about:, etc.) */
  isWebPage: boolean;
  /** Current effective mode */
  effectiveMode: SiteMode;
  /** Whether a site-specific rule exists */
  hasExplicitRule: boolean;
  /** Diagnostics snapshot */
  diagnostics: SiteDiagnostics;
  /** Extension analysis for this site (available when management permission granted) */
  extensionReport: SiteExtensionReport | null;
  /** Page health report from content script (errors, performance) */
  pageHealth: PageHealthReport | null;
}

// ---------------------------------------------------------------------------
// Extension Analysis — real functionality
// ---------------------------------------------------------------------------

export enum ExtensionRisk {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export const EXTENSION_RISK_LABELS: Record<ExtensionRisk, string> = {
  [ExtensionRisk.Low]: 'Low Risk',
  [ExtensionRisk.Medium]: 'Medium Risk',
  [ExtensionRisk.High]: 'High Risk',
};

export interface ExtensionInfo {
  /** Extension ID */
  id: string;
  /** Display name */
  name: string;
  /** Version string */
  version: string;
  /** Whether the extension is currently enabled */
  enabled: boolean;
  /** Extension type (extension, theme, app) */
  type: string;
  /** Declared permissions */
  permissions: string[];
  /** Host permissions (e.g., <all_urls>, specific domains) */
  hostPermissions: string[];
  /** Content script URL match patterns */
  contentScriptPatterns: string[];
  /** Whether this extension injects scripts on the current page */
  activeOnCurrentPage: boolean;
  /** Computed risk level */
  risk: ExtensionRisk;
  /** URL to the extension's icon (if available) */
  iconUrl: string;
  /** Short description */
  description: string;
  /** Whether this is Site Guardian itself */
  isSelf: boolean;
  /** Auto-detected category (ad-blocker, privacy-tool, etc.) */
  category: string;
  /** User-assigned tags */
  userTags: string[];
  /** User override of auto-detected category (null = use auto) */
  categoryOverride: string | null;
  /** Effective category: categoryOverride ?? category */
  effectiveCategory: string;
}

// ---------------------------------------------------------------------------
// Tag Configuration (persisted)
// ---------------------------------------------------------------------------

export interface ExtensionTagEntry {
  tags: string[];
  categoryOverride: string | null;
}

export interface TagConfig {
  /** Map: extensionId → tag entry */
  extensions: Record<string, ExtensionTagEntry>;
  /** User-created custom tag names */
  customTags: string[];
}

export const DEFAULT_TAG_CONFIG: TagConfig = {
  extensions: {},
  customTags: [],
};

/** Built-in suggested tags */
export const SUGGESTED_TAGS = [
  'Essential',
  'Work',
  'Personal',
  'Development',
  'Testing',
] as const;

export interface ConflictSignal {
  /** Machine-readable type */
  type:
    | 'multiple_injectors'
    | 'broad_permissions'
    | 'many_content_scripts'
    | 'duplicate_category'
    | 'known_ext_vs_ext'
    | 'known_ext_vs_site'
    | 'known_category_vs_site';
  /** Human-readable explanation */
  message: string;
  /** Extensions involved */
  extensionIds: string[];
  /** Source of the conflict information (for known conflicts) */
  source?: string;
}

// ---------------------------------------------------------------------------
// Known Conflict Database types
// ---------------------------------------------------------------------------

export interface KnownConflictExtVsExt {
  type: 'ext_vs_ext';
  extA: { namePattern: string };
  extB: { namePattern: string };
  description: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
}

export interface KnownConflictExtVsSite {
  type: 'ext_vs_site';
  ext: { namePattern: string };
  sitePattern: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
}

export interface KnownConflictCategoryVsSite {
  type: 'category_vs_site';
  category: string;
  sitePattern: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
}

export type KnownConflict =
  | KnownConflictExtVsExt
  | KnownConflictExtVsSite
  | KnownConflictCategoryVsSite;

export interface SiteExtensionReport {
  /** Total installed extensions (excluding themes) */
  totalExtensions: number;
  /** Extensions that inject content scripts on this page */
  activeOnPage: ExtensionInfo[];
  /** All enabled extensions */
  allEnabled: ExtensionInfo[];
  /** Detected conflict signals */
  conflicts: ConflictSignal[];
  /** Overall conflict risk for this page */
  overallRisk: ExtensionRisk;
  /** ISO timestamp */
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Page Error Monitoring (content script → background)
// ---------------------------------------------------------------------------

export interface PageError {
  /** Error message */
  message: string;
  /** Source file URL (if available) */
  source: string;
  /** Line number */
  line: number;
  /** Column number */
  col: number;
  /** ISO timestamp */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Performance Metric Model
// ---------------------------------------------------------------------------

export type MetricConfidence = 'measured' | 'inferred' | 'unavailable';

export interface PerformanceMetric {
  /** Machine-readable name */
  name: string;
  /** Human-readable label */
  label: string;
  /** Metric value (null if unavailable) */
  value: number | null;
  /** Unit of measurement */
  unit: string;
  /** How reliable is this metric? */
  confidence: MetricConfidence;
  /** Short description */
  description: string;
}

export interface PageHealthReport {
  /** URL of the page */
  url: string;
  /** Total JS errors caught on the page */
  errorCount: number;
  /** Last N errors (most recent first) */
  errors: PageError[];
  /** Page load time in ms (performance.timing) */
  pageLoadTimeMs: number;
  /** Number of DOM nodes (rough complexity indicator) */
  domNodeCount: number;
  /** Largest Contentful Paint in ms (-1 if unavailable) */
  lcpMs: number;
  /** Number of long tasks (>50ms) detected since injection (-1 if unavailable) */
  longTaskCount: number;
  /** Total scripts loaded on the page */
  scriptCount: number;
  /** Total stylesheets loaded on the page */
  stylesheetCount: number;
  /** Total resource transfer size in bytes (-1 if unavailable) */
  totalTransferBytes: number;
  /** Whether performance.memory is available (Chrome only) */
  jsHeapUsedBytes: number;
  /** ISO timestamp of report generation */
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// DOM Injection Tracer
// ---------------------------------------------------------------------------

export interface DOMInjection {
  /** Type of injected element */
  type: 'script' | 'style' | 'iframe' | 'element';
  /** Source URL or 'inline' */
  src: string;
  /** Whether the source URL indicates an extension origin */
  isExtensionOrigin: boolean;
  /** Extension ID extracted from URL (empty if not extension origin) */
  extensionId: string;
  /** CSS selector identifying the element */
  selector: string;
  /** ISO timestamp when detected */
  timestamp: string;
}

export interface DOMTraceReport {
  /** Detected injections */
  injections: DOMInjection[];
  /** ISO timestamp when observer started */
  observerStartedAt: string;
  /** How long the observer ran (ms) */
  observerDurationMs: number;
  /** Total mutation events observed */
  totalMutations: number;
}

// ---------------------------------------------------------------------------
// Smart Troubleshoot (one-by-one)
// ---------------------------------------------------------------------------

export enum TroubleshootStepStatus {
  Pending = 'pending',
  Testing = 'testing',
  Done = 'done',
}

export interface TroubleshootStep {
  extensionId: string;
  extensionName: string;
  status: TroubleshootStepStatus;
  /** Was the page healthy with this extension disabled? */
  result: 'unknown' | 'healthy' | 'still_broken';
}

// ---------------------------------------------------------------------------
// Troubleshoot Session
// ---------------------------------------------------------------------------

export interface TroubleshootSession {
  /** Whether troubleshoot mode is currently active */
  active: boolean;
  /** Extension IDs that were disabled by troubleshoot mode (bulk mode) */
  disabledExtensionIds: string[];
  /** Smart troubleshoot steps (one-by-one mode) */
  smartSteps?: TroubleshootStep[];
  /** Which mode: 'bulk' disables all, 'smart' tests one-by-one */
  mode: 'bulk' | 'smart';
  /** ISO timestamp when session started */
  startedAt: string;
}

// ---------------------------------------------------------------------------
// Auto-Rules
// ---------------------------------------------------------------------------

export interface AutoRuleCondition {
  /** Hostname glob patterns (e.g., "*.bank.com", "localhost") */
  urlPatterns: string[];
}

export interface AutoRuleAction {
  /** Set Site Guardian mode for matching sites */
  setSiteMode?: SiteMode;
  /** Recommend disabling extensions in these categories */
  recommendDisable?: string[];
}

export interface AutoRule {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Whether the rule is active */
  enabled: boolean;
  /** Higher number = evaluated first */
  priority: number;
  /** When does this rule fire? */
  condition: AutoRuleCondition;
  /** What happens when it fires? */
  action: AutoRuleAction;
  /** Shipped with extension (true) vs user-created (false) */
  builtIn: boolean;
}

/** Result when an auto-rule matches the current hostname */
export interface AutoRuleMatch {
  rule: AutoRule;
  /** Which pattern in the condition matched */
  matchedPattern: string;
}

// ---------------------------------------------------------------------------
// Permission explanation — for the transparency section
// ---------------------------------------------------------------------------

export interface PermissionExplanation {
  /** The permission name as declared in manifest.json */
  permission: string;
  /** Why this permission is needed */
  reason: string;
  /** What it allows the extension to do */
  capability: string;
  /** What this permission does NOT allow */
  limitation: string;
}

export const PERMISSION_EXPLANATIONS: PermissionExplanation[] = [
  {
    permission: 'storage',
    reason: 'Save your settings and per-site rules locally.',
    capability: 'Read and write data to local browser storage.',
    limitation: 'Cannot access your browsing data, history, or cookies.',
  },
  {
    permission: 'activeTab',
    reason: 'Identify which website you are currently viewing.',
    capability:
      'Access the URL of the active tab when you interact with the extension.',
    limitation:
      'Cannot read page content, track browsing, or access tabs you have not interacted with.',
  },
  {
    permission: 'tabs',
    reason: 'Keep the extension status up-to-date as you navigate.',
    capability: 'Listen for tab navigation events and query tab URLs.',
    limitation:
      'Cannot read page content, inject scripts, or access other browser data.',
  },
  {
    permission: 'management',
    reason: 'See which extensions are installed and detect conflicts.',
    capability:
      'List installed extensions, read their permissions and content script patterns, enable or disable extensions at your request.',
    limitation:
      'Cannot modify other extensions, read their data, or access their internal state. Extension list never leaves your device.',
  },
  {
    permission: 'scripting',
    reason: 'Monitor page health — detect JavaScript errors and measure performance.',
    capability:
      'Inject a lightweight read-only script into the current page when you open the popup to collect error counts and load times.',
    limitation:
      'Cannot modify page content, read your personal data, or inject scripts without your interaction.',
  },
];

// ---------------------------------------------------------------------------
// Privacy statement — for the transparency section
// ---------------------------------------------------------------------------

export const PRIVACY_FACTS = [
  'All settings are stored locally on your device.',
  'No data is sent to any server.',
  'No analytics or telemetry of any kind.',
  'No external network requests.',
  'No browsing history is recorded or accessed.',
  'Your extension list is analyzed locally and never transmitted.',
  'You can export or delete all data at any time from Settings.',
] as const;
