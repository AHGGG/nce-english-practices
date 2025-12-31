## 2025-05-23 - Accessibility Gaps in Feedback Components
**Learning:** Crucial feedback components like Toasts are missing basic accessibility attributes (role, aria-label, aria-live), making them invisible to screen reader users despite being visual "interruptions".
**Action:** Always verify that "floating" or overlay components (toasts, modals, tooltips) have appropriate roles and live region attributes to ensure they are announced.
