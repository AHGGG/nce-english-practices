## 2024-05-23 - Micro-interactions matter
**Learning:** Users often click buttons without filling inputs. A simple "shake" animation combined with a red border provides immediate, intuitive feedback without needing a text error message.
**Action:** Use `framer-motion` for simple state-based animations to guide user behavior. Ensure accessibility attributes (`aria-invalid`) mirror the visual state.

## 2025-12-11 - Communicating Async States
**Learning:** Buttons that trigger network requests (like sending a chat) feel broken if they don't provide immediate visual feedback. Adding a disabled state, cursor change, and loading spinner makes the UI feel responsive even during latency.
**Action:** Always wrap async handlers with `loading` state. Map `loading` to `disabled`, `cursor-not-allowed`, and a visible spinner icon (`lucide-react` is available). Use `aria-label` to clarify the action.
