## 2024-05-23 - Accessibility Patterns: ARIA Labels and Roles

**Learning:**
I discovered that critical interactive elements (icon-only buttons) were missing accessible names, making them invisible to screen reader users. Specifically, the "Voice Toggle" and "Send" buttons in the chat interface were inaccessible. Also, toast notifications were using generic `div`s, which means they wouldn't automatically be announced.

**Action:**
When adding icon-only buttons, ALWAYS include `aria-label`. For toggle buttons, use `aria-pressed`. For status updates (like toasts), use `role="status"` or `role="alert"` with `aria-live`.
