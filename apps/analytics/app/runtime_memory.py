"""Lightweight process memory telemetry and OS heap release helpers (zero external deps)."""

import ctypes
import gc
import resource
import sys
from typing import Dict, Optional

_LIBC: Optional[ctypes.CDLL] = None
_LIBC_LOAD_ATTEMPTED = False


def _get_linux_libc() -> Optional[ctypes.CDLL]:
    global _LIBC, _LIBC_LOAD_ATTEMPTED
    if not sys.platform.startswith("linux"):
        return None
    if not _LIBC_LOAD_ATTEMPTED:
        _LIBC_LOAD_ATTEMPTED = True
        try:
            _LIBC = ctypes.CDLL("libc.so.6")
        except OSError:
            _LIBC = None
    return _LIBC


def get_process_memory_mb() -> Dict[str, Optional[float]]:
    """Return current RSS and peak RSS in MiB using /proc/self/status on Linux or ru_maxrss fallback."""
    rss_mb: Optional[float] = None
    peak_rss_mb: Optional[float] = None

    if sys.platform.startswith("linux"):
        try:
            with open("/proc/self/status", "r", encoding="utf-8") as fh:
                for line in fh:
                    if line.startswith("VmRSS:"):
                        rss_mb = round(int(line.split()[1]) / 1024.0, 2)
                    elif line.startswith("VmHWM:"):
                        peak_rss_mb = round(int(line.split()[1]) / 1024.0, 2)
        except OSError:
            pass

    if peak_rss_mb is None:
        raw_maxrss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        divisor = (1024.0 * 1024.0) if sys.platform == "darwin" else 1024.0
        peak_rss_mb = round(raw_maxrss / divisor, 2)

    return {
        "rss_mb": rss_mb,
        "peak_rss_mb": peak_rss_mb,
    }


def trim_glibc_heap() -> bool:
    """Ask glibc on Linux to return free heap arenas back to the OS kernel."""
    libc = _get_linux_libc()
    if libc is None:
        return False
    try:
        malloc_trim = getattr(libc, "malloc_trim", None)
        if malloc_trim is None:
            return False
        malloc_trim.argtypes = [ctypes.c_size_t]
        malloc_trim.restype = ctypes.c_int
        return bool(malloc_trim(0))
    except Exception:
        return False


def release_memory(trim_allocator: bool = True) -> Dict[str, Optional[float]]:
    """Collect cyclic Python garbage and optionally trim glibc heap arenas on Linux."""
    gc.collect()
    if trim_allocator:
        trim_glibc_heap()
    return get_process_memory_mb()
