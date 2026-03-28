# Site Guardian

See what extensions do on every site. Detect conflicts. Take control.

Site Guardian monitors all your installed extensions, shows which ones are active on each page, detects potential conflicts using a known-conflict database, automatically adjusts behavior with smart rules, and lets you troubleshoot problems with one click.

## Features

### Core
- **Extension monitor** — see which extensions inject scripts on the current page
- **Risk assessment** — each extension scored Low/Medium/High based on permissions and category
- **Conflict detection** — heuristic + known-conflict database with 14+ documented incompatibilities
- **Quick disable** — enable/disable any extension from the popup
- **Troubleshoot Mode** — one click to disable all other extensions and find the culprit
- **Per-site control** — Normal, Safe Mode, or Disabled for each website

### Advanced (v0.3)
- **Known Conflict Database** — bundled database of known extension-vs-extension, extension-vs-site, and category-vs-site conflicts with source attribution
- **Smart Auto-Rules** — automatic mode switching based on URL patterns (banking sites → Safe Mode, streaming + VPN → warning)
- **Browser Sync** — opt-in sync of settings via browser.storage.sync (Chrome/Google, Firefox/Firefox Sync)
- **Extension Categories** — auto-detection (ad-blocker, privacy-tool, VPN, AI assistant, etc.) with user tag overrides
- **Performance Monitoring** — page load time, LCP, script count, long tasks, resource transfer size, DOM complexity
- **DOM Injection Tracer** — opt-in MutationObserver detecting script/style/iframe injections with extension-origin attribution

### Privacy
- All data stored locally (or via browser's built-in sync — never our servers)
- Zero external network requests
- Zero analytics or telemetry
- Extension list analyzed locally and never transmitted

## Quick Start

```bash
cd site-guardian
npm install
npm run build:chrome    # Chrome build
npm run build:firefox   # Firefox build
```

### Load in Chrome
1. `chrome://extensions` → Developer mode → Load unpacked → select `dist/`

### Load in Firefox
1. `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `dist/manifest.json`

## Architecture

```
src/
├── core/                         # Pure logic (zero browser API calls)
│   ├── types.ts                  # All types, enums, constants
│   ├── storage.ts                # Storage CRUD with validation
│   ├── storage-backend.ts        # Sync/local routing abstraction
│   ├── extension-analyzer.ts     # Risk scoring, conflict detection, categories
│   ├── known-conflicts.ts        # Bundled conflict database (14+ entries)
│   ├── auto-rules.ts             # Smart rule engine (4 built-in rules)
│   ├── site-mode.ts              # URL parsing, mode resolution
│   ├── diagnostics.ts            # Diagnostic entry assembly
│   ├── messaging.ts              # 27 typed message contracts
│   └── browser-api.ts            # Cross-browser abstraction
│
├── background/index.ts           # Service worker (27 handlers, badge, lifecycle)
├── content/index.ts              # Error/perf monitor + DOM tracer (2KB)
├── popup/                        # Extension popup (React)
├── options/                      # Settings page (React)
├── onboarding/                   # First-run flow (React)
└── shared/                       # Hooks and UI components
```

## Permissions

| Permission | Why |
|------------|-----|
| `storage` | Save settings and per-site rules locally (+ optional sync) |
| `activeTab` | Read current tab URL when you interact with the extension |
| `tabs` | Keep status up-to-date as you navigate |
| `management` | List extensions, read permissions, enable/disable at your request |
| `scripting` | Inject page health monitor to collect errors and performance data |

## Development

```bash
npm run dev          # Watch mode
npm run typecheck    # TypeScript checking
npm test             # Run unit tests (132 tests)
npm run test:watch   # Tests in watch mode
```

## Testing

132 unit tests across 7 test files:
- Extension analyzer (pattern matching, risk scoring, conflicts)
- Known conflict database (ext-vs-ext, ext-vs-site, category-vs-site)
- Auto-rules engine (pattern matching, precedence, built-in rules)
- Storage backend (sync/local key classification)
- Hostname normalization and validation
- Diagnostics generation
- Type/enum integrity

Manual QA: see `docs/qa-checklist.md` (80+ scenarios).

## Browser Compatibility

| Feature | Chrome | Firefox |
|---------|--------|---------|
| Extension monitoring | Yes | Yes |
| Risk assessment | Yes | Yes |
| Known conflicts | Yes | Yes |
| Auto-rules | Yes | Yes |
| Browser sync | Yes (Google) | Yes (Firefox Sync) |
| Badge counter | Yes | Yes |
| Page health (LCP, long tasks) | Yes | Yes (FF 122+/132+) |
| JS heap memory | Yes | No (returns unavailable) |
| DOM tracer | Yes | Yes |
| Minimum version | Any recent | 112+ |

## License

MIT
