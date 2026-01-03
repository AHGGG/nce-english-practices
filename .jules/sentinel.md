## 2024-05-23 - Centralized Input Validation Pattern
**Vulnerability:** Input validation was scattered or missing, particularly in TTS endpoints where parameters like `voice_id` were injected directly into URLs or API calls, creating risks of SSRF or Parameter Injection.
**Learning:** Hardcoding validation logic in every endpoint leads to inconsistencies. A centralized regex-based validation pattern ensures consistent security boundaries across the application.
**Prevention:** Use `app.core.utils.validate_input` with `SAFE_INPUT_PATTERN` or `SAFE_ID_PATTERN` for all external inputs before processing.
