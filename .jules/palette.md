## 2024-05-23 - Accessible Form Validation Pattern
**Learning:** Using `React.useId()` in base `Input` and `Select` components allows for automatic, robust linking of error messages to form fields via `aria-describedby`, significantly improving screen reader experience without requiring manual ID management from consumers.
**Action:** Apply this pattern to all future form components (Textarea, Checkbox, etc.) to ensure consistent accessibility.

## 2025-02-18 - Label Association for Raw Inputs
**Learning:** Raw `<input>`/`<select>` elements in feature panels often lack `id` and `htmlFor` associations, unlike the base UI components which handle this.
**Action:** When auditing feature panels, check for disconnected labels on raw form elements and use `useId` to fix them.

## 2025-02-19 - Standardizing Textarea
**Learning:** The absence of a standard `Textarea` component led to bespoke, inconsistent, and less accessible implementations in feature panels like `TTSPanel`.
**Action:** Introduced `Textarea` to the shared UI library, mirroring `Input` patterns, to standardize styling and accessibility (focus states, error linking) for multi-line inputs.
