# Test Configuration Guide

## Overview

You can control which voice provider tests run by setting environment variables in your `.env` file.

## Configuration

Add these variables to your `.env` file:

```bash
# Voice Provider Test Controls
# Set to False to skip provider tests (useful when credits are low)

TEST_ELEVENLABS_ENABLED=false   # Default: false (skip ElevenLabs tests)
TEST_DEEPGRAM_ENABLED=true      # Default: true (run Deepgram tests)
TEST_DASHSCOPE_ENABLED=true     # Default: true (run Dashscope tests)
TEST_GOOGLE_ENABLED=true        # Default: true (run Google tests)
```

## Usage

### Running All Tests

```bash
uv run pytest tests/
```

### Enabling/Disabling Specific Providers

**Example 1: Skip ElevenLabs tests (default)**

Already configured by default. Tests will be skipped with message:
```
SKIPPED [1] tests/test_voice_lab_integration.py:31: ElevenLabs tests disabled (TEST_ELEVENLABS_ENABLED=False)
```

**Example 2: Enable ElevenLabs tests**

In `.env`:
```bash
TEST_ELEVENLABS_ENABLED=true
ELEVENLABS_API_KEY=your_api_key_here
```

**Example 3: Skip all voice provider tests**

In `.env`:
```bash
TEST_ELEVENLABS_ENABLED=false
TEST_DEEPGRAM_ENABLED=false
TEST_DASHSCOPE_ENABLED=false
TEST_GOOGLE_ENABLED=false
```

## Benefits

- **Save API Credits**: Skip providers when credits are low
- **Faster Tests**: Only test providers you're actively using
- **CI/CD Flexibility**: Different test configurations for different environments
- **Local Development**: Focus on specific providers during development

## Affected Test Files

- `tests/test_voice_lab_integration.py` - TTS/STT round-trip tests
- `tests/test_elevenlabs_websocket.py` - ElevenLabs WebSocket tests
- `tests/test_deepgram_websocket.py` - Deepgram WebSocket tests (future)

## Default Behavior

By default:
- ✅ Deepgram tests: **Enabled**
- ✅ Dashscope tests: **Enabled**
- ✅ Google tests: **Enabled**
- ❌ ElevenLabs tests: **Disabled** (to save credits)

You can override any of these in your `.env` file.
