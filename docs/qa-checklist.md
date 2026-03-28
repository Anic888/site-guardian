# Site Guardian v0.3 — QA Checklist

## Smoke Test

- [ ] Extension loads without errors in Chrome
- [ ] Extension loads without errors in Firefox
- [ ] Popup opens when clicking the extension icon
- [ ] Options page opens from popup
- [ ] Background service worker is active

## Popup — Extension Monitor

- [ ] Navigate to YouTube → shows extensions active on page with risk badges
- [ ] Badge on extension icon shows count of active extensions
- [ ] Badge color matches risk level (red/orange/green)
- [ ] Extension list shows categories (Ad Blocker, Privacy Tool, VPN/Proxy, etc.)
- [ ] Disable button works for individual extensions
- [ ] Enable button works to re-enable

## Popup — Known Conflicts (F1)

- [ ] Navigate to YouTube with ad blocker → diagnostics shows "Known issue" about YouTube + ad blockers
- [ ] Have two ad blockers installed → shows ext_vs_ext conflict
- [ ] Navigate to netflix.com with VPN → shows category_vs_site warning
- [ ] Navigate to notion.so with Grammarly → shows ext_vs_site warning

## Popup — Auto-Rules (F2)

- [ ] Navigate to chase.com → diagnostics shows "Auto-rule: Banking — Safe Mode"
- [ ] Navigate to netflix.com → diagnostics shows recommendation to disable VPN
- [ ] Set manual site rule on chase.com → manual rule overrides auto-rule
- [ ] Navigate to example.com → no auto-rule fires

## Popup — Page Health (F5)

- [ ] Page Health section shows 6 metrics: errors, load time, DOM nodes, scripts, LCP, transferred
- [ ] Slow pages show yellow/red indicators
- [ ] Fast pages show green indicators
- [ ] Long tasks indicator appears when present

## Popup — Troubleshoot Mode

- [ ] Click "Troubleshoot" → all other extensions disabled
- [ ] Banner shows "Troubleshoot Mode Active" with count
- [ ] Click "End Troubleshoot" → extensions restored
- [ ] Close popup during troubleshoot → state preserved, shows active on reopen

## Popup — Site Mode

- [ ] Collapsible section — starts collapsed
- [ ] Expand → shows Normal/Safe/Disabled buttons
- [ ] Switching mode persists across popup close/reopen

## Popup — Diagnostics

- [ ] Collapsible section — starts collapsed
- [ ] Shows mode, rule source, extension analysis, performance warnings, conflict hints

## Options — Global Settings

- [ ] Radio buttons for default mode
- [ ] Change persists on page reload

## Options — Site Rules

- [ ] Shows all per-site rules
- [ ] Remove button works
- [ ] Empty state when no rules

## Options — Auto-Rules (F2)

- [ ] Shows built-in rules with enable/disable toggles
- [ ] Built-in rules have correct patterns listed
- [ ] Disabling a built-in rule persists
- [ ] Custom rules section shows placeholder

## Options — Extension Dashboard

- [ ] Shows all installed extensions with risk badges
- [ ] Filters work: All, High Risk, Injects Scripts
- [ ] Sorted by risk (high first)
- [ ] Disable/Enable buttons work

## Options — Cloud Sync (F3)

- [ ] Shows sync toggle (default: disabled)
- [ ] Shows storage backend info (local vs sync, bytes used)
- [ ] Click Enable Sync → migrates to sync, shows "sync" as active backend
- [ ] Click Disable Sync → migrates back to local
- [ ] If sync unavailable (Firefox without Sync) → shows "Sync available: No"

## Options — Transparency

- [ ] Privacy facts listed
- [ ] All 5 permissions explained (storage, activeTab, tabs, management, scripting)
- [ ] Storage explanation present

## Options — Danger Zone

- [ ] Two-step reset confirmation
- [ ] After reset → all settings cleared, sync disabled

## Onboarding

- [ ] 5-step flow (Welcome → Extension Monitoring → Modes → Safe Mode → Privacy)
- [ ] Progress bar and navigation work
- [ ] "Get Started" completes onboarding
- [ ] "Skip" works from any step

## Cross-Browser — Firefox Specific

- [ ] Firefox build loads in about:debugging
- [ ] Content script works (page health metrics appear)
- [ ] Badge displays correctly
- [ ] Sync toggle works if Firefox Sync is available
- [ ] Extension list populates correctly

## Performance

- [ ] Popup opens in < 500ms (includes content script injection)
- [ ] No console errors during normal operation
- [ ] Content script < 3KB
- [ ] Background bundle < 25KB

## Privacy Verification

- [ ] Network tab: zero external requests
- [ ] All storage under sg_ prefix
- [ ] No cookies created
- [ ] Extension list never transmitted

## DOM Tracer (F6 — Developer Feature)

- [ ] GET_DOM_TRACE message returns injection data
- [ ] Detects script/style/iframe injections
- [ ] Extension-origin URLs correctly identified
- [ ] Observer starts on demand, not automatically

## Known Conflict Database (F1)

- [ ] Database has 14+ entries
- [ ] Conflicts appear with source attribution
- [ ] Known conflicts shown separately from heuristic conflicts in diagnostics

## Categorization & Tags (F4)

- [ ] Extensions show auto-detected categories
- [ ] Risk scoring accounts for category (ad blockers = medium not high)
- [ ] Tag storage functions accessible via messages
