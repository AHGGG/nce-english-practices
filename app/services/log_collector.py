"""
Unified Log Collector Service

Collects logs from both frontend and backend.
Provides color-coded terminal output and file-based logging.
"""
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Optional
import threading


class LogSource(str, Enum):
    """Source of the log entry"""
    FRONTEND = "frontend"
    BACKEND = "backend"


class LogLevel(str, Enum):
    """Log severity level"""
    DEBUG = "debug"
    INFO = "info"
    WARN = "warn"
    ERROR = "error"


class LogCategory(str, Enum):
    """
    Generic log categories - NOT vendor-specific.
    These categories are designed to work across any voice/AI provider.
    """
    GENERAL = "general"           # Default category
    USER_INPUT = "user_input"     # User speech/text input, STT results
    AGENT_OUTPUT = "agent_output" # AI/Agent responses, TTS
    AUDIO = "audio"               # Audio processing, chunks, encoding
    NETWORK = "network"           # API calls, WebSocket, latency
    FUNCTION_CALL = "function_call"  # Tool/function calls
    LIFECYCLE = "lifecycle"       # Connect/disconnect/init/cleanup


# ANSI color codes for terminal output
class Colors:
    RESET = "\033[0m"
    WHITE = "\033[38;5;231m"      # Default
    BLUE = "\033[38;5;116m"       # User input
    GREEN = "\033[38;5;114m"      # Agent output
    VIOLET = "\033[38;5;183m"     # Function calls
    CYAN = "\033[38;5;81m"        # Audio
    YELLOW = "\033[38;5;186m"     # Network/latency
    RED = "\033[38;5;203m"        # Errors
    DIM = "\033[2m"               # Dim for timestamps


# Category to color mapping
CATEGORY_COLORS = {
    LogCategory.GENERAL: Colors.WHITE,
    LogCategory.USER_INPUT: Colors.BLUE,
    LogCategory.AGENT_OUTPUT: Colors.GREEN,
    LogCategory.FUNCTION_CALL: Colors.VIOLET,
    LogCategory.AUDIO: Colors.CYAN,
    LogCategory.NETWORK: Colors.YELLOW,
    LogCategory.LIFECYCLE: Colors.WHITE,
}


@dataclass
class LogEntry:
    """A single log entry"""
    timestamp: datetime
    source: LogSource
    level: LogLevel
    category: LogCategory
    message: str
    data: Optional[dict] = None


class LogCollector:
    """
    File-based log collector with color-coded terminal output.
    
    Features:
    - Collects logs from frontend (via API) and backend (via direct calls)
    - Color-coded terminal output for easy visual debugging
    - File-based logging (logs/unified.log) - cleared on each server restart
    """
    
    # Log file path (relative to project root)
    LOG_FILE = "logs/unified.log"
    
    def __init__(self):
        self._file_lock = threading.Lock()
        self._init_log_file()
    
    def _init_log_file(self) -> None:
        """Initialize log file - create directory and clear existing file on startup"""
        from pathlib import Path
        
        # Ensure logs directory exists
        log_dir = Path(self.LOG_FILE).parent
        log_dir.mkdir(exist_ok=True)
        
        # Clear log file on startup (new session)
        with open(self.LOG_FILE, "w", encoding="utf-8") as f:
            startup_msg = f"=== Log session started at {datetime.now().isoformat()} ===\n"
            f.write(startup_msg)
        
        print(f"[LogCollector] Log file initialized: {self.LOG_FILE}")
    
    def _write_to_file(self, entry: LogEntry) -> None:
        """Write log entry to file (plain text, no colors)"""
        with self._file_lock:
            try:
                # Format: TIMESTAMP [SOURCE] [LEVEL] [CATEGORY] MESSAGE
                ts = entry.timestamp.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                src = entry.source.value.upper()[:2]  # FE or BA
                lvl = entry.level.value.upper()[:4]   # INFO, WARN, ERRO, DEBU
                cat = entry.category.value[:8]        # First 8 chars
                
                line = f"{ts} [{src}] [{lvl}] [{cat}] {entry.message}\n"
                
                # Append data if present
                if entry.data:
                    stack = entry.data.get("stack")
                    if stack:
                        line += f"  STACK: {stack[:500]}...\n" if len(stack) > 500 else f"  STACK: {stack}\n"
                    other = {k: v for k, v in entry.data.items() if k != "stack"}
                    if other:
                        line += f"  DATA: {other}\n"
                
                with open(self.LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(line)
            except Exception as e:
                # Don't crash on file write errors
                print(f"[LogCollector] File write error: {e}")
    
    def add(self, entry: LogEntry) -> None:
        """Add a log entry - print to terminal and write to file"""
        self._print_colored(entry)
        self._write_to_file(entry)
    
    def log(
        self,
        message: str,
        level: LogLevel = LogLevel.INFO,
        category: LogCategory = LogCategory.GENERAL,
        source: LogSource = LogSource.BACKEND,
        data: Optional[dict] = None
    ) -> None:
        """Convenience method for backend logging"""
        entry = LogEntry(
            timestamp=datetime.now(),
            source=source,
            level=level,
            category=category,
            message=message,
            data=data
        )
        self.add(entry)
    
    def _print_colored(self, entry: LogEntry) -> None:
        """Print log entry to terminal with color coding"""
        # Determine color based on level (errors override category color)
        if entry.level == LogLevel.ERROR:
            color = Colors.RED
        elif entry.level == LogLevel.WARN:
            color = Colors.YELLOW
        else:
            color = CATEGORY_COLORS.get(entry.category, Colors.WHITE)
        
        # Format timestamp
        ts = entry.timestamp.strftime("%H:%M:%S.%f")[:-3]
        
        # Format source tag
        src_tag = "FE" if entry.source == LogSource.FRONTEND else "BE"
        
        # Format category tag (abbreviated)
        cat_abbrev = {
            LogCategory.GENERAL: "GEN",
            LogCategory.USER_INPUT: "USR",
            LogCategory.AGENT_OUTPUT: "AGT",
            LogCategory.AUDIO: "AUD",
            LogCategory.NETWORK: "NET",
            LogCategory.FUNCTION_CALL: "FNC",
            LogCategory.LIFECYCLE: "LIF",
        }
        cat_tag = cat_abbrev.get(entry.category, "???")
        
        # Build and print the log line
        prefix = f"{Colors.DIM}{ts}{Colors.RESET} [{src_tag}] [{cat_tag}]"
        print(f"{prefix} {color}{entry.message}{Colors.RESET}")
        
        # Print data if present (indented)
        if entry.data:
            # Handle stack traces specially
            stack = entry.data.get("stack")
            if stack:
                print(f"{Colors.DIM}  Stack:{Colors.RESET}")
                for line in stack.split("\n")[:5]:  # Limit stack trace lines
                    print(f"{Colors.DIM}    {line}{Colors.RESET}")
            
            # Print other data
            other_data = {k: v for k, v in entry.data.items() if k != "stack"}
            if other_data:
                print(f"{Colors.DIM}  Data: {other_data}{Colors.RESET}")


def detect_category(message: str, data: Optional[dict] = None) -> LogCategory:
    """
    Detect log category from message content.
    Uses generic patterns that work across any vendor.
    """
    msg_lower = message.lower()
    
    # Lifecycle events
    if any(kw in msg_lower for kw in [
        "connected", "disconnected", "initialized", "closed", 
        "started", "stopped", "ready", "session"
    ]):
        return LogCategory.LIFECYCLE
    
    # User input (STT, transcripts)
    if any(kw in msg_lower for kw in [
        "transcript", "user said", "user input", "speech-to-text", 
        "stt", "recognition", "user:"
    ]):
        return LogCategory.USER_INPUT
    
    # Agent output (TTS, responses)
    if any(kw in msg_lower for kw in [
        "agent", "assistant", "response", "text-to-speech",
        "tts", "speaking", "agent:"
    ]):
        return LogCategory.AGENT_OUTPUT
    
    # Audio processing
    if any(kw in msg_lower for kw in [
        "audio", "playback", "chunk", "sample rate", "buffer",
        "pcm", "mp3", "wav", "encoding"
    ]):
        return LogCategory.AUDIO
    
    # Function/tool calls
    if any(kw in msg_lower for kw in [
        "function", "tool", "calling", "invoke", "execute"
    ]):
        return LogCategory.FUNCTION_CALL
    
    # Network/API
    if any(kw in msg_lower for kw in [
        "websocket", "api", "fetch", "request", "response",
        "latency", "timeout", "error"
    ]):
        return LogCategory.NETWORK
    
    return LogCategory.GENERAL


# Singleton instance
log_collector = LogCollector()
