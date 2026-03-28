# Privacy Policy — Site Guardian

**Last updated:** March 28, 2026

## Summary

Site Guardian does not collect, transmit, or sell any user data. Everything stays on your device.

---

## What Data Site Guardian Accesses

### Extension Information
Site Guardian reads the list of your installed browser extensions using the browser's `management` API. This includes extension names, permissions, and content script patterns. This data is used **only** to display extension information to you and detect potential conflicts. It is **never** transmitted anywhere.

### Page Performance Data
When you open the Site Guardian popup, a lightweight script is injected into the current page to collect:
- JavaScript error count and messages
- Page load timing (Navigation Timing API)
- Resource count and transfer size
- DOM node count
- Largest Contentful Paint (LCP)
- Long task count

This data is displayed to you in the popup and is **not** stored persistently or transmitted.

### DOM Injection Tracing (Optional)
When explicitly requested, Site Guardian can observe DOM changes on the current page using a MutationObserver. This detects script, style, and iframe injections. Only element tag names and source URLs are recorded — **never** page content, text, or personal information. This feature only activates when you request it.

### Site Rules and Settings
Your per-site mode settings, auto-rules, tags, and preferences are stored locally in your browser using `browser.storage.local`. If you opt in to browser sync, these settings may also be stored in `browser.storage.sync`, which uses your browser's built-in sync service (Google account for Chrome, Firefox Sync for Firefox). **Site Guardian has no servers and no access to your synced data.**

---

## What Data Site Guardian Does NOT Access

- Browsing history
- Cookies
- Passwords or autofill data
- Page content or text you type
- Files on your computer
- Camera or microphone
- Location data
- Any data from other extensions

---

## What Data Site Guardian Stores

All stored data uses the `sg_` prefix in `browser.storage.local`:

| Key | What it contains |
|-----|-----------------|
| `sg_global_settings` | Your default mode preference and sync toggle |
| `sg_site_rules` | Per-site mode overrides you have set |
| `sg_auto_rules` | Custom auto-rule configurations |
| `sg_tag_config` | Custom tags you've assigned to extensions |
| `sg_extension_state` | Install date and last active timestamp |
| `sg_troubleshoot_session` | Temporary troubleshoot session state |

You can view and delete all stored data from the Settings page at any time.

---

## Network Requests

**Site Guardian makes zero network requests.** No analytics. No telemetry. No external API calls. No phone-home behavior of any kind.

The only network activity that may occur is through `browser.storage.sync` if you explicitly enable browser sync — and that traffic goes through your browser's own sync service, not through any Site Guardian server.

---

## Permissions Explained

| Permission | Why it's needed | What it does NOT do |
|------------|----------------|-------------------|
| `storage` | Save your settings and site rules locally | Cannot access browsing data, history, or cookies |
| `activeTab` | Read the URL of the tab you're viewing when you click the extension | Cannot read page content or track browsing |
| `tabs` | Keep the extension badge updated as you navigate | Cannot read page content or access other browser data |
| `management` | List installed extensions and their permissions to detect conflicts | Cannot modify extensions, read their data, or access their internal state |
| `scripting` | Inject a read-only script to collect page health metrics when you open the popup | Cannot modify page content or inject scripts without your interaction |

---

## Third-Party Services

Site Guardian uses **no** third-party services, SDKs, analytics platforms, or external dependencies at runtime. The only runtime dependency is the `webextension-polyfill` library for cross-browser compatibility, which makes zero network requests.

---

## Data Sharing

Site Guardian shares data with **no one**. There are no partners, advertisers, data brokers, or analytics providers. Your extension list, browsing patterns, and settings never leave your device (unless you enable browser sync, in which case they go through your browser vendor's sync service — not ours).

---

## Children's Privacy

Site Guardian does not knowingly collect any information from children under 13. The extension does not collect any personal information from anyone.

---

## Changes to This Policy

If this privacy policy changes, the updated version will be published in the extension's GitHub repository and included with the extension update. The "Last updated" date at the top will reflect the change.

---

## Contact

For questions about this privacy policy:
- GitHub Issues: [https://github.com/Anic888/site-guardian/issues](https://github.com/Anic888/site-guardian/issues)

---

## Open Source

Site Guardian is open source. You can review every line of code at:
[https://github.com/Anic888/site-guardian](https://github.com/Anic888/site-guardian)
