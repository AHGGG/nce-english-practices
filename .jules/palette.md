## 2026-01-11 - Toast Notification Accessibility
**Learning:** Toast notifications require specific ARIA roles to be correctly prioritized by screen readers. A generic `role="status"` is insufficient for errors.
**Action:** Use `role="alert"` for critical errors/warnings (assertive announcement) and `role="status"` for info/success messages (polite announcement).
**Learning:** Dismiss buttons on toasts must have `aria-label` since they are often icon-only.
**Action:** Always add `aria-label="Dismiss notification"` or similar to close buttons.
