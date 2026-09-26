"""NFR1 benchmark: time /predict on every bundled character image, CPU only.

Standard library only. Run it with the backend venv's Python so the library
versions it records are the backend's own.

For each run it starts a fresh backend (no --reload, CUDA_VISIBLE_DEVICES=-1,
a new test database under backend/data/e2e/), measures startup until GET /
answers, sends one cold request, a few uncounted warm-up requests, then every
image once, one at a time. The backend's own stage timings are read from its
log, which a generated --log-config turns on without touching app code.
"""
import argparse
import ctypes
import csv
import hashlib
import http.client
import importlib.metadata
import json
import math
import os
import platform
import re
import shutil
import statistics
import subprocess
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
E2E_DATA_DIR = BACKEND_DIR / "data" / "e2e"
NORMAL_DB = BACKEND_DIR / "data" / "emolearn.db"
DEFAULT_IMAGES = PROJECT_DIR / "frontend" / "public" / "images" / "characters"

U2NET_MD5 = "60024c5c889badc19c04ad937298a77b"  # rembg's own checksum for u2net.onnx
MODEL_FILES = {
    "face_weights": BACKEND_DIR / "app" / "ml" / "face_branch" / "models" / "face_branch_v4_clean.weights.h5",
    "pose_model": BACKEND_DIR / "app" / "ml" / "pose_branch" / "models" / "random_forest_pose_model_bg_removed.pkl",
    "pose_label_encoder": BACKEND_DIR / "app" / "ml" / "pose_branch" / "models" / "label_encoder_bg_removed.pkl",
}
LIBRARIES = ["tensorflow", "keras", "onnxruntime", "rembg", "mediapipe", "scikit-learn", "numpy", "pillow", "fastapi", "uvicorn"]
STAGES = ["prep", "face", "pose", "heatmap", "explain", "total"]
TIMINGS_RE = re.compile(r"predict timings \(s\): " + " ".join(rf"{s}=(?P<{s}>[\d.]+)" for s in STAGES))

CSV_FIELDS = [
    "run", "phase", "seq", "filename", "true_emotion", "bytes", "status", "duration_ms", "error",
    "predicted_emotion", "confidence", "mode",
] + [f"server_{s}_ms" for s in STAGES]


# ---------- machine ----------

def _windows_registry(path: str, names: list) -> dict:
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path) as key:
            return {n: winreg.QueryValueEx(key, n)[0] for n in names}
    except (ImportError, OSError):
        return {}


def _total_ram_bytes():
    if sys.platform != "win32":
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")

    class MemoryStatus(ctypes.Structure):
        _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong)] + [
            (n, ctypes.c_ulonglong) for n in
            ("ullTotalPhys", "ullAvailPhys", "ullTotalPageFile", "ullAvailPageFile",
             "ullTotalVirtual", "ullAvailVirtual", "ullAvailExtendedVirtual")
        ]

    status = MemoryStatus()
    status.dwLength = ctypes.sizeof(MemoryStatus)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
    return status.ullTotalPhys


def _on_mains_power():
    if sys.platform != "win32":
        return None

    class PowerStatus(ctypes.Structure):
        _fields_ = [("ACLineStatus", ctypes.c_byte), ("BatteryFlag", ctypes.c_byte), ("BatteryLifePercent", ctypes.c_byte),
                    ("SystemStatusFlag", ctypes.c_byte), ("BatteryLifeTime", ctypes.c_ulong), ("BatteryFullLifeTime", ctypes.c_ulong)]

    status = PowerStatus()
    if not ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(status)):
        return None
    return {1: True, 0: False}.get(status.ACLineStatus)


def _file_info(path: Path) -> dict:
    if not path.is_file():
        return {"path": str(path), "exists": False}
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    return {"path": str(path), "exists": True, "bytes": path.stat().st_size, "sha256": digest.hexdigest()}


def _git(*args):
    try:
        return subprocess.run(["git", *args], cwd=PROJECT_DIR, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def machine_info(u2net: Path) -> dict:
    cpu = _windows_registry(r"HARDWARE\DESCRIPTION\System\CentralProcessor\0", ["ProcessorNameString", "~MHz"])
    os_info = _windows_registry(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion", ["ProductName", "DisplayVersion", "CurrentBuild"])
    libraries = {}
    for name in LIBRARIES:
        try:
            libraries[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            libraries[name] = None
    try:
        mediapipe_dir = Path(importlib.metadata.distribution("mediapipe").locate_file("mediapipe"))
        pose_tflite = mediapipe_dir / "modules" / "pose_landmark" / "pose_landmark_full.tflite"
    except importlib.metadata.PackageNotFoundError:
        pose_tflite = None
    models = {name: _file_info(path) for name, path in MODEL_FILES.items()}
    models["rembg_u2net"] = _file_info(u2net)
    if pose_tflite is not None:
        models["mediapipe_pose_landmark_full"] = _file_info(pose_tflite)
    os_name = " ".join(str(v) for v in (os_info.get("ProductName"), os_info.get("DisplayVersion"), f"build {os_info.get('CurrentBuild')}") if v)
    # The registry still says "Windows 10" on Windows 11; the build number tells them apart
    if os_name.startswith("Windows 10") and int(os_info.get("CurrentBuild", 0)) >= 22000:
        os_name = "Windows 11" + os_name[len("Windows 10"):]
    return {
        "cpu": cpu.get("ProcessorNameString", platform.processor()).strip(),
        "cpu_base_mhz": cpu.get("~MHz"),
        "logical_cpus": os.cpu_count(),
        "ram_gb": round(_total_ram_bytes() / 1024 ** 3, 1),
        "on_mains_power": _on_mains_power(),
        "os": os_name or platform.platform(),
        "platform": platform.platform(),
        "python": sys.version.split()[0],
        "python_executable": sys.executable,
        "libraries": libraries,
        "model_files": models,
        "git_commit": _git("rev-parse", "HEAD"),
        "git_dirty": bool(_git("status", "--porcelain")),
    }


# ---------- checks ----------

def check_u2net() -> Path:
    home = Path(os.environ.get("U2NET_HOME", os.path.join(os.environ.get("XDG_DATA_HOME", "~"), ".u2net"))).expanduser()
    path = home / "u2net.onnx"
    if not path.is_file():
        sys.exit(f"u2net.onnx is not cached at {path}; rembg would download it at startup. Not running.")
    digest = hashlib.md5()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    if digest.hexdigest() != U2NET_MD5:
        sys.exit(f"u2net.onnx at {path} has MD5 {digest.hexdigest()}, expected {U2NET_MD5}; rembg would download it again. Not running.")
    return path


def safe_db_path(run_id: str) -> Path:
    db = (E2E_DATA_DIR / run_id / "test.db").resolve()
    allowed = E2E_DATA_DIR.resolve()
    if allowed not in db.parents:
        sys.exit(f"Refusing to run: {db} is outside {allowed}")
    if os.path.normcase(str(db)) == os.path.normcase(str(NORMAL_DB.resolve())):
        sys.exit("Refusing to run: that is the normal emolearn.db")
    if db.parent.exists():
        sys.exit(f"Refusing to run: {db.parent} already exists")
    return db


# ---------- backend ----------

def log_config(log_file: Path) -> dict:
    handler = {"class": "logging.FileHandler", "filename": str(log_file), "encoding": "utf-8", "formatter": "plain"}
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {"plain": {"format": "%(asctime)s %(name)s %(levelname)s %(message)s"}},
        "handlers": {"file": handler},
        "loggers": {
            "uvicorn": {"handlers": ["file"], "level": "INFO", "propagate": False},
            "uvicorn.access": {"handlers": ["file"], "level": "WARNING", "propagate": False},
            "app.api.routes.predict": {"handlers": ["file"], "level": "INFO", "propagate": False},
        },
    }


def http_get_status(port: int, path: str, timeout: float):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=timeout)
    try:
        conn.request("GET", path)
        return conn.getresponse().status
    finally:
        conn.close()


def start_backend(port: int, db: Path, run_dir: Path, timeout: float):
    log_file = run_dir / "backend.log"
    config_file = run_dir / "log-config.json"
    config_file.write_text(json.dumps(log_config(log_file), indent=2), encoding="utf-8")
    env = dict(os.environ, CUDA_VISIBLE_DEVICES="-1", EMOLEARN_DB_PATH=str(db))
    python = BACKEND_DIR / "venv" / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    stderr = (run_dir / "backend.stderr.log").open("w", encoding="utf-8")
    started = time.monotonic()
    proc = subprocess.Popen(
        [str(python), "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port), "--log-config", str(config_file)],
        cwd=BACKEND_DIR, env=env, stdout=stderr, stderr=subprocess.STDOUT,
    )
    while True:
        if proc.poll() is not None:
            raise RuntimeError(f"Backend exited with code {proc.returncode} during startup; see {stderr.name}")
        try:
            if http_get_status(port, "/", 2) == 200:
                return proc, time.monotonic() - started, log_file, stderr
        except OSError:
            pass
        if time.monotonic() - started > timeout:
            proc.terminate()
            raise RuntimeError(f"Backend not ready after {timeout}s")
        time.sleep(0.2)


def remove_run_db(db: Path):
    folder = db.parent
    if folder.parent != E2E_DATA_DIR.resolve() or not folder.name.startswith("bench-"):
        print(f"Not removing unexpected folder {folder}", flush=True)
        return
    # Windows can hold the file for a moment after the backend exits
    for _ in range(20):
        try:
            shutil.rmtree(folder)
            return
        except FileNotFoundError:
            return
        except OSError as exc:
            error = exc
            time.sleep(0.5)
    print(f"Could not remove {folder}: {error}", flush=True)


def stop_backend(proc, stderr):
    proc.terminate()
    try:
        proc.wait(timeout=30)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
    stderr.close()


# ---------- requests ----------

def post_image(port: int, image: Path, timeout: float) -> dict:
    data = image.read_bytes()
    boundary = uuid.uuid4().hex
    body = b"".join([
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="file"; filename="{image.name}"\r\n'.encode(),
        b"Content-Type: image/png\r\n\r\n",
        data,
        f"\r\n--{boundary}--\r\n".encode(),
    ])
    headers = {"Content-Type": f"multipart/form-data; boundary={boundary}", "Content-Length": str(len(body))}
    result = {"filename": image.name, "true_emotion": image.parent.name, "bytes": len(data), "status": None, "error": ""}
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=timeout)
    started = time.monotonic()
    try:
        conn.request("POST", "/predict", body=body, headers=headers)
        response = conn.getresponse()
        payload = response.read()
        result["duration_ms"] = round((time.monotonic() - started) * 1000, 1)
        result["status"] = response.status
        if response.status == 200:
            parsed = json.loads(payload)
            result.update(predicted_emotion=parsed.get("emotion"), confidence=parsed.get("confidence"), mode=parsed.get("mode"))
        else:
            result["error"] = payload[:300].decode("utf-8", "replace")
    except (OSError, http.client.HTTPException, ValueError) as exc:
        result["duration_ms"] = round((time.monotonic() - started) * 1000, 1)
        result["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        conn.close()
    return result


class StageLog:
    """Reads the backend log a little at a time; each request adds one timings line."""

    def __init__(self, path: Path):
        self.path, self.offset = path, 0

    def take(self) -> dict:
        with self.path.open("r", encoding="utf-8", errors="replace") as f:
            f.seek(self.offset)
            text = f.read()
            self.offset = f.tell()
        matches = list(TIMINGS_RE.finditer(text))
        if len(matches) != 1:
            return {}
        return {f"server_{s}_ms": round(float(matches[0][s]) * 1000, 1) for s in STAGES}


# ---------- statistics ----------

def nearest_rank(values: list, pct: float):
    ordered = sorted(values)
    return ordered[max(1, math.ceil(pct / 100 * len(ordered))) - 1]


def describe(values: list) -> dict:
    if not values:
        return {"count": 0}
    return {
        "count": len(values),
        "min_ms": min(values),
        "median_ms": round(statistics.median(values), 1),
        "mean_ms": round(statistics.fmean(values), 1),
        "p95_ms": nearest_rank(values, 95),
        "max_ms": max(values),
    }


def summarise(rows: list, target_p95_ms: float, target_max_ms: float) -> dict:
    measured = [r for r in rows if r["phase"] == "measured"]
    ok = [r for r in measured if r["status"] == 200]
    failures = len(measured) - len(ok)
    durations = [r["duration_ms"] for r in ok]
    stats = describe(durations)
    stages = {s: describe([r[f"server_{s}_ms"] for r in ok if r.get(f"server_{s}_ms") is not None]) for s in STAGES}
    overhead = [r["duration_ms"] - r["server_total_ms"] for r in ok if r.get("server_total_ms") is not None]
    met = bool(durations) and failures == 0 and stats["p95_ms"] <= target_p95_ms and stats["max_ms"] <= target_max_ms
    return {
        "requests": len(measured),
        "failures": failures,
        "failure_rate": round(failures / len(measured), 4) if measured else None,
        "client_duration": stats,
        "server_stages": stages,
        "client_minus_server_total": describe([round(o, 1) for o in overhead]),
        "target_met": met,
    }


# ---------- main ----------

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", required=True, help="Output folder (created; must not exist yet)")
    parser.add_argument("--runs", type=int, default=1, help="Backend starts, each with the full measured set (default 1)")
    parser.add_argument("--warmup", type=int, default=4, help="Uncounted warm-up requests after the cold one (default 4)")
    parser.add_argument("--images", type=Path, default=DEFAULT_IMAGES)
    parser.add_argument("--port", type=int, default=8002)
    parser.add_argument("--startup-timeout", type=float, default=180)
    parser.add_argument("--request-timeout", type=float, default=60)
    parser.add_argument("--target-p95", type=float, default=3.0, help="Seconds (default 3.0)")
    parser.add_argument("--target-max", type=float, default=5.0, help="Seconds (default 5.0)")
    args = parser.parse_args()

    out = Path(args.out).resolve()
    if out.exists():
        sys.exit(f"{out} already exists")
    images = sorted(p for p in args.images.rglob("*") if p.suffix.lower() in {".png", ".jpg", ".jpeg"})
    if not images:
        sys.exit(f"No images under {args.images}")
    u2net = check_u2net()
    out.mkdir(parents=True)

    target_p95_ms, target_max_ms = args.target_p95 * 1000, args.target_max * 1000
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    all_rows, runs = [], []

    for run in range(1, args.runs + 1):
        run_dir = out / f"run-{run}"
        run_dir.mkdir()
        db = safe_db_path(f"bench-{stamp}-run{run}")
        print(f"[run {run}] starting backend (db {db})", flush=True)
        proc, startup_s, log_file, stderr = start_backend(args.port, db, run_dir, args.startup_timeout)
        print(f"[run {run}] ready after {startup_s:.1f}s", flush=True)
        stage_log = StageLog(log_file)
        stage_log.take()
        rows = []
        succeeded = False
        try:
            plan = [("cold", images[0])] + [("warmup", images[(i + 1) % len(images)]) for i in range(args.warmup)]
            plan += [("measured", image) for image in images]
            for seq, (phase, image) in enumerate(plan, start=1):
                row = {"run": run, "phase": phase, "seq": seq, **post_image(args.port, image, args.request_timeout)}
                row.update(stage_log.take())
                rows.append(row)
                if phase != "measured" or seq % 12 == 0:
                    print(f"[run {run}] {seq}/{len(plan)} {phase} {image.name} {row['status']} {row['duration_ms']} ms", flush=True)
            succeeded = True
        finally:
            stop_backend(proc, stderr)
            # Kept for inspection if the run broke off
            if succeeded:
                remove_run_db(db)

        cold = rows[0]
        runs.append({
            "run": run,
            "startup_s": round(startup_s, 2),
            "cold_request": {k: cold.get(k) for k in ("filename", "status", "duration_ms", "server_total_ms", "error")},
            **summarise(rows, target_p95_ms, target_max_ms),
        })
        all_rows += rows

    with (out / "results.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_rows)

    summary = {
        "nfr": "NFR1: prediction within a few seconds on a CPU-only laptop",
        "target": {"p95_s": args.target_p95, "max_s": args.target_max, "failures": 0},
        "method": {
            "timer": "time.monotonic around each full HTTP request (connect, upload, server work, response read)",
            "p95": "nearest-rank on sorted measured durations",
            "requests_per_run": f"1 cold + {args.warmup} warm-up (not counted) + {len(images)} measured, one at a time",
            "backend": "uvicorn app.main:app, no --reload, CUDA_VISIBLE_DEVICES=-1, fresh test DB under backend/data/e2e/",
            "stage_timings": "the backend's own 'predict timings' log line, enabled via --log-config",
        },
        "started": stamp,
        "images": {"folder": str(args.images), "count": len(images)},
        "machine": machine_info(u2net),
        "runs": runs,
        "combined": summarise(all_rows, target_p95_ms, target_max_ms),
    }
    summary["target_met"] = summary["combined"]["target_met"] and all(r["target_met"] for r in runs)
    (out / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    c = summary["combined"]["client_duration"]
    print(f"combined: n={c['count']} median={c['median_ms']} p95={c['p95_ms']} max={c['max_ms']} ms, "
          f"failures={summary['combined']['failures']}, target met={summary['target_met']}")


if __name__ == "__main__":
    main()
