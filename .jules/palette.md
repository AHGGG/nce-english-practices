## 2024-05-22 - [Voice Lab Tab Accessibility]
**Learning:** Tab interfaces require a strict ARIA hierarchy (`tablist` > `tab` > `tabpanel`) to be fully accessible. Adding `aria-controls` on the tab and `aria-labelledby` on the panel, along with `role="tabpanel"`, significantly improves the experience for screen reader users by properly associating controls with their content.
**Action:** When creating or refactoring tab components, always ensure:
1. Container has `role="tablist"` and a label.
2. Triggers have `role="tab"`, `aria-selected`, and `aria-controls`.
3. Content panels have `role="tabpanel"`, `id`, and `aria-labelledby`.
