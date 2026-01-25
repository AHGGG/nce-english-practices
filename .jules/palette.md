## 2024-05-23 - Accessible Form Validation Pattern
**Learning:** Using `React.useId()` in base `Input` and `Select` components allows for automatic, robust linking of error messages to form fields via `aria-describedby`, significantly improving screen reader experience without requiring manual ID management from consumers.
**Action:** Apply this pattern to all future form components (Textarea, Checkbox, etc.) to ensure consistent accessibility.

## 2025-02-18 - Label Association for Raw Inputs
**Learning:** Raw `<input>`/`<select>` elements in feature panels often lack `id` and `htmlFor` associations, unlike the base UI components which handle this.
**Action:** When auditing feature panels, check for disconnected labels on raw form elements and use `useId` to fix them.

## 2025-05-24 - ARIA Tab Pattern & Layout
**Learning:** Adding semantic `role="tabpanel"` wrappers to implement the WAI-ARIA Tab Pattern breaks parent-managed spacing (e.g., `space-y-*` in Tailwind) because the content elements are no longer direct siblings.
**Action:** When introducing semantic wrappers, move or duplicate the spacing classes to the new wrapper element to preserve visual layout.
