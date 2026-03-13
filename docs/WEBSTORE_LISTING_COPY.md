# Cleen - Chrome Web Store Copy Pack

Last updated: March 12, 2026

## Korean Copy

### Name
`Cleen`

### Short Description (option A)
비활성 탭을 자동으로 정리해서 Chrome 메모리를 가볍게 유지하는 익스텐션.

### Short Description (option B)
메모리 많이 먹는 탭을 찾고, 오래된 탭은 자동으로 suspend 해주는 Chrome 도우미.

### Full Description
Chrome 탭이 많아질수록 메모리 사용량은 금방 커집니다.
`Cleen`은 비활성 탭을 자동으로 suspend 하고, 어떤 탭이 무거운지 한눈에 보여줍니다.

- **Auto-Suspend**: 오래 비활성 상태인 탭을 자동으로 정리합니다.
- **Memory Dashboard**: 탭별 메모리 사용량을 빠르게 확인할 수 있습니다.
- **Heavy Site Detection**: YouTube, Claude, ChatGPT 같은 무거운 사이트를 식별합니다.
- **Custom Exclusions**: 절대 자동 정리하지 않을 사이트를 직접 지정할 수 있습니다.

로컬 우선 설계로 동작하며, 사용자의 탭 데이터는 외부로 전송되지 않습니다.

### Single Purpose
비활성 탭을 정리하고 탭 메모리 상태를 시각화해 Chrome 메모리 사용을 관리하는 확장 프로그램.

## English Copy

### Name
`Cleen`

### Short Description (option A)
Keep Chrome memory under control by suspending inactive tabs and highlighting heavy sites.

### Short Description (option B)
Track tab memory, detect heavy pages, and auto-suspend inactive tabs.

### Full Description
As your tab count grows, Chrome gets heavier.
`Cleen` helps you keep it under control with automatic tab suspension and a simple memory dashboard.

- **Auto-Suspend**: discard tabs that have been inactive for a long time.
- **Memory Dashboard**: inspect estimated per-tab memory usage at a glance.
- **Heavy Site Detection**: flag memory-hungry sites like YouTube, Claude, and ChatGPT.
- **Custom Exclusions**: protect important sites from automatic suspension.

Built with a local-first approach. No analytics, no tracking, and no remote processing of your browsing data.

### Single Purpose
Manage Chrome memory by monitoring tab usage and suspending inactive tabs.

## Suggested Privacy / Reviewer Notes

### Remote code
```text
No remote code is executed. All extension logic is bundled locally in the package.
```

### Reviewer note
```text
Cleen stores settings locally and does not send browsing or memory data to external servers.
The optional memory estimation fallback uses chrome.scripting inside the active browser only.
The extension's single purpose is Chrome tab memory management and inactive-tab suspension.
```

## Permissions Justification Draft

- `storage`: saves thresholds, exclusions, and cached session data locally.
- `alarms`: schedules periodic inactive-tab checks.
- `scripting`: reads in-page memory estimates when Chrome process info is unavailable.
- `host_permissions (*://*/*)`: required so the scripting fallback can run on pages the user has open.
