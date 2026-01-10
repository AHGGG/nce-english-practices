import asyncio
import os
import sys
from tabulate import tabulate
from colorama import Fore, Style, init

# Ensure app imports work
sys.path.insert(0, os.getcwd())

from app.services.voice_tester import voice_tester as tester

# Initialize colorama
init(autoreset=True)


async def run_voice_health_check():
    print(
        f"\n{Style.BRIGHT}=== 🎙️  Voice Lab Automated Health Check 🎙️  ==={Style.RESET_ALL}\n"
    )

    results = []

    # --- Test Cases ---

    test_phrase = "The quick brown fox jumps over the lazy dog."

    # 1. Deepgram TTS Integrity
    print(
        f"Testing {Fore.CYAN}Deepgram TTS{Style.RESET_ALL} (Model: aura-asteria-en)..."
    )
    res = await tester.evaluate_tts(
        tts_provider_name="deepgram",
        tts_model="aura-asteria-en",  # Voice name as model
        text=test_phrase,
    )
    results.append(
        [
            "Deepgram TTS",
            res.passed,
            res.score,
            f"{res.latency_ms:.0f}ms",
            res.error or "",
        ]
    )

    # 2. ElevenLabs TTS Integrity
    print(
        f"Testing {Fore.MAGENTA}ElevenLabs TTS{Style.RESET_ALL} (Model: eleven_turbo_v2_5)..."
    )
    res = await tester.evaluate_tts(
        tts_provider_name="elevenlabs", tts_model="eleven_turbo_v2_5", text=test_phrase
    )
    results.append(
        [
            "ElevenLabs TTS",
            res.passed,
            res.score,
            f"{res.latency_ms:.0f}ms",
            res.error or "",
        ]
    )

    # 3. Google TTS Integrity
    print(
        f"Testing {Fore.GREEN}Google TTS{Style.RESET_ALL} (Model: gemini-2.5-flash-native-audio-latest)..."
    )
    res = await tester.evaluate_tts(
        tts_provider_name="google",
        tts_model="gemini-2.5-flash-native-audio-latest",
        text=test_phrase,
    )
    results.append(
        [
            "Google TTS",
            res.passed,
            res.score,
            f"{res.latency_ms:.0f}ms",
            res.error or "",
        ]
    )

    # 4. ElevenLabs STT Accuracy
    print(f"Testing {Fore.MAGENTA}ElevenLabs STT{Style.RESET_ALL} (Scribe)...")
    res = await tester.evaluate_stt(
        stt_provider_name="elevenlabs", stt_model="scribe_v1", text=test_phrase
    )
    results.append(
        [
            "ElevenLabs STT",
            res.passed,
            res.score,
            f"{res.latency_ms:.0f}ms",
            res.error or "",
        ]
    )

    # 5. ElevenLabs Voice Changer Integrity
    print(f"Testing {Fore.MAGENTA}ElevenLabs STS{Style.RESET_ALL} (Voice Changer)...")
    res = await tester.evaluate_sts(
        sts_provider_name="elevenlabs",
        voice_id="D38z5RcWu1voky8WS1ja",  # Fin
        text=test_phrase,
    )
    results.append(
        [
            "ElevenLabs STS",
            res.passed,
            res.score,
            f"{res.latency_ms:.0f}ms",
            res.error or "",
        ]
    )

    # --- Report ---

    print("\n" + "=" * 60)
    print(f"{Style.BRIGHT}TEST REPORT{Style.RESET_ALL}")
    print("=" * 60)

    headers = ["Component", "Status", "Score", "Latency", "Notes"]
    table_data = []

    for r in results:
        component, passed, score, latency, error = r
        status = (
            f"{Fore.GREEN}PASS{Style.RESET_ALL}"
            if passed
            else f"{Fore.RED}FAIL{Style.RESET_ALL}"
        )
        score_fmt = f"{score * 100:.1f}%"
        if score > 0.9:
            score_fmt = f"{Fore.GREEN}{score_fmt}{Style.RESET_ALL}"
        elif score > 0.7:
            score_fmt = f"{Fore.YELLOW}{score_fmt}{Style.RESET_ALL}"
        else:
            score_fmt = f"{Fore.RED}{score_fmt}{Style.RESET_ALL}"

        table_data.append([component, status, score_fmt, latency, error])

    print(tabulate(table_data, headers=headers, tablefmt="grid"))
    print("\n")


if __name__ == "__main__":
    asyncio.run(run_voice_health_check())
