// ---------------------------------------------------------------------------
// Site Guardian — Known Conflict Database
// ---------------------------------------------------------------------------
//
// Bundled database of known extension incompatibilities.
// Shipped with the extension, versioned alongside code.
//
// Three conflict types:
//   1. ext_vs_ext — two specific extensions clash
//   2. ext_vs_site — an extension breaks a specific site
//   3. category_vs_site — a category of extensions causes issues on a site
//
// All matching is case-insensitive regex on extension names.
// Site patterns use simple hostname glob matching.
// ---------------------------------------------------------------------------

import type {
  ConflictSignal,
  ExtensionInfo,
  KnownConflict,
} from './types';

// ---------------------------------------------------------------------------
// Database version — bump when entries change
// ---------------------------------------------------------------------------

export const KNOWN_CONFLICTS_VERSION = 1;

// ---------------------------------------------------------------------------
// Known conflict entries
// ---------------------------------------------------------------------------

const DATABASE: KnownConflict[] = [
  // --- Extension vs Extension ---
  {
    type: 'ext_vs_ext',
    extA: { namePattern: 'ublock origin' },
    extB: { namePattern: 'adblock plus' },
    description:
      'Both are ad blockers that inject content scripts on every page. Running both causes duplicate filtering, slower page loads, and occasional rendering issues.',
    severity: 'medium',
    source: 'community-reported',
  },
  {
    type: 'ext_vs_ext',
    extA: { namePattern: 'ghostery' },
    extB: { namePattern: 'privacy badger' },
    description:
      'Both tracker blockers intercept the same requests. Running both can cause double-blocking and break site functionality.',
    severity: 'medium',
    source: 'community-reported',
  },
  {
    type: 'ext_vs_ext',
    extA: { namePattern: 'grammarly' },
    extB: { namePattern: 'languagetool' },
    description:
      'Both inject text-editing overlays into input fields. Running both causes visual glitches, duplicate suggestions, and input lag.',
    severity: 'medium',
    source: 'community-reported',
  },
  {
    type: 'ext_vs_ext',
    extA: { namePattern: 'lastpass' },
    extB: { namePattern: 'bitwarden' },
    description:
      'Both password managers inject autofill popups on login forms. Running both causes overlapping popups and autofill confusion.',
    severity: 'low',
    source: 'community-reported',
  },
  {
    type: 'ext_vs_ext',
    extA: { namePattern: 'react developer tools' },
    extB: { namePattern: 'vue\\.js devtools' },
    description:
      'Both dev tools inject into the browser DevTools panel. While not harmful, both add overhead on non-relevant sites.',
    severity: 'low',
    source: 'community-reported',
  },

  // --- Extension vs Site ---
  {
    type: 'ext_vs_site',
    ext: { namePattern: 'dark reader' },
    sitePattern: '*.google.com',
    description:
      'Dark Reader is known to cause rendering issues on Google Docs and Google Sheets, breaking toolbar styling and color pickers.',
    severity: 'medium',
    source: 'vendor-documented',
  },
  {
    type: 'ext_vs_site',
    ext: { namePattern: 'grammarly' },
    sitePattern: '*.notion.so',
    description:
      'Grammarly injects into Notion\'s rich text editor, causing cursor jumps, lost formatting, and occasional data loss.',
    severity: 'high',
    source: 'community-reported',
  },
  {
    type: 'ext_vs_site',
    ext: { namePattern: 'grammarly' },
    sitePattern: '*.figma.com',
    description:
      'Grammarly interferes with Figma\'s text editing, causing input lag and unexpected text changes.',
    severity: 'medium',
    source: 'community-reported',
  },
  {
    type: 'ext_vs_site',
    ext: { namePattern: 'adblock' },
    sitePattern: '*.twitch.tv',
    description:
      'Ad blockers frequently break Twitch video playback due to Twitch\'s anti-adblock detection.',
    severity: 'medium',
    source: 'community-reported',
  },

  // --- Category vs Site ---
  {
    type: 'category_vs_site',
    category: 'vpn-proxy',
    sitePattern: '*.netflix.com',
    description:
      'VPN and proxy extensions are detected by Netflix and may cause playback errors or content restrictions.',
    severity: 'medium',
    source: 'vendor-documented',
  },
  {
    type: 'category_vs_site',
    category: 'vpn-proxy',
    sitePattern: '*.disneyplus.com',
    description:
      'VPN extensions trigger geo-restriction enforcement on Disney+, blocking playback.',
    severity: 'medium',
    source: 'vendor-documented',
  },
  {
    type: 'category_vs_site',
    category: 'ad-blocker',
    sitePattern: '*.youtube.com',
    description:
      'YouTube actively detects ad blockers and may show warnings, delay video playback, or degrade quality.',
    severity: 'low',
    source: 'community-reported',
  },
  {
    type: 'category_vs_site',
    category: 'ai-assistant',
    sitePattern: '*.github.dev',
    description:
      'AI assistant extensions may interfere with GitHub\'s web-based VS Code editor, causing input handling conflicts.',
    severity: 'low',
    source: 'community-reported',
  },
];

// ---------------------------------------------------------------------------
// Matching logic
// ---------------------------------------------------------------------------

/** Test if an extension name matches a pattern (case-insensitive substring) */
function nameMatches(extensionName: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, 'i').test(extensionName);
  } catch {
    // Invalid regex — fall back to case-insensitive includes
    return extensionName.toLowerCase().includes(pattern.toLowerCase());
  }
}

/** Test if a hostname matches a site pattern (simple glob: *.example.com) */
function siteMatches(hostname: string, pattern: string): boolean {
  if (!hostname || !pattern) return false;

  // Exact match
  if (hostname === pattern) return true;

  // Glob: *.example.com
  if (pattern.startsWith('*.')) {
    const base = pattern.slice(2);
    return hostname === base || hostname.endsWith('.' + base);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Match active extensions against the known conflict database.
 * Returns ConflictSignal entries for any matches found.
 */
export function matchKnownConflicts(
  activeExtensions: ExtensionInfo[],
  hostname: string,
): ConflictSignal[] {
  const signals: ConflictSignal[] = [];

  for (const entry of DATABASE) {
    switch (entry.type) {
      case 'ext_vs_ext': {
        const matchA = activeExtensions.filter((e) =>
          nameMatches(e.name, entry.extA.namePattern),
        );
        const matchB = activeExtensions.filter((e) =>
          nameMatches(e.name, entry.extB.namePattern),
        );
        if (matchA.length > 0 && matchB.length > 0) {
          signals.push({
            type: 'known_ext_vs_ext',
            message: `Known conflict: ${matchA[0]!.name} and ${matchB[0]!.name}. ${entry.description}`,
            extensionIds: [
              ...matchA.map((e) => e.id),
              ...matchB.map((e) => e.id),
            ],
            source: entry.source,
          });
        }
        break;
      }

      case 'ext_vs_site': {
        if (!siteMatches(hostname, entry.sitePattern)) break;
        const matches = activeExtensions.filter((e) =>
          nameMatches(e.name, entry.ext.namePattern),
        );
        for (const ext of matches) {
          signals.push({
            type: 'known_ext_vs_site',
            message: `Known issue: ${ext.name} on ${hostname}. ${entry.description}`,
            extensionIds: [ext.id],
            source: entry.source,
          });
        }
        break;
      }

      case 'category_vs_site': {
        if (!siteMatches(hostname, entry.sitePattern)) break;
        const matches = activeExtensions.filter(
          (e) => e.category === entry.category,
        );
        if (matches.length > 0) {
          signals.push({
            type: 'known_category_vs_site',
            message: `Caution: ${matches.map((e) => e.name).join(', ')} — ${entry.description}`,
            extensionIds: matches.map((e) => e.id),
            source: entry.source,
          });
        }
        break;
      }
    }
  }

  return signals;
}

/** Get the total number of entries in the database */
export function getKnownConflictCount(): number {
  return DATABASE.length;
}
