# Palette Journal

## 2024-05-23 - Initial Setup
**Learning:** Started fresh.
**Action:** Will document critical accessibility and UX patterns here.

## 2024-05-23 - Toast Accessibility
**Learning:** Toast notifications often lack semantic roles (`status`/`alert`) and live regions, making them invisible to screen readers.
**Action:** Always wrap toasts in a `role="region"` container and use `role="alert"` for errors to ensure immediate announcement.
