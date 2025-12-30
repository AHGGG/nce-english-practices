# Palette's Journal

## 2024-05-22 - Accessible Tabs Pattern
**Learning:** Tabs are a common navigation pattern that often lacks semantic structure for screen readers.
**Action:** Always use the `tablist` > `tab` > `tabpanel` hierarchy. Ensure `aria-controls` on the tab points to the `id` of the panel, and `aria-labelledby` on the panel points back to the `id` of the tab.
