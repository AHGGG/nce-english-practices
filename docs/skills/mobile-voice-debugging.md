---
name: Mobile Voice Debugging
description: Guide for debugging voice features on mobile devices, including HTTPS and certificate setup.
---

# Mobile Voice Debugging

Mobile browsers require HTTPS for accessing microphone (getUserMedia) and WebSocket connections.

## HTTPS Setup

1. **Generate Certificate**:
   ```bash
   uv run python scripts/generate_cert.py
   ```
   This creates a self-signed certificate in the root directory.

2. **Start Server with HTTPS**:
   ```powershell
   ./scripts/dev.ps1 -Https
   ```

3. **Trust Certificate**:
   - Navigate to `https://<YOUR_LOCAL_IP>:5173` on your mobile device.
   - You will see a security warning. You MUST accept it to proceed.

## Troubleshooting

### PowerShell HTTPS Testing

PowerShell's `curl` (alias for `Invoke-WebRequest`) often fails with self-signed certificates even with `-k`.

**Solution**: Use Node.js for quick API testing:
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED=0; node -e "fetch('https://localhost:5173/api/auth/me').then(r=>r.json()).then(console.log)"
```

### Common Issues
- **WebSocket Disconnection**: Mobile browsers aggressively throttle background tabs. Keep the tab active.
- **Microphone Permission**: Ensure you've granted system-level permissions to the browser app.
