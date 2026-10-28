#!/usr/bin/env python3
"""MCP stdio adapter untuk Hermes Agent API (OpenAI-compatible /v1).

Env: HERMES_BASE_URL (default http://127.0.0.1:8642/v1), HERMES_API_KEY, HERMES_MODEL (default "hermes-agent").
"""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

BASE = (os.environ.get("HERMES_BASE_URL") or "http://127.0.0.1:8642/v1").rstrip("/")


def load_key():
    key = (os.environ.get("HERMES_API_KEY") or "").strip()
    if key:
        return key
    path = os.path.join(os.path.expanduser("~"), ".hermes", "api-key.txt")
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read().strip()
    except OSError:
        return ""


KEY = load_key()
MODEL = os.environ.get("HERMES_MODEL") or "hermes-agent"
TIMEOUT = float(os.environ.get("HERMES_TIMEOUT_MS") or 120000) / 1000.0

TOOLS = [
    {
        "name": "hermes_list_models",
        "description": "Daftar model yang tersedia di server Hermes.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "hermes_chat",
        "description": "Kirim prompt ke model Hermes dan kembalikan jawabannya.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "Pesan pengguna"},
                "system": {"type": "string", "description": "System prompt (opsional)"},
                "model": {"type": "string", "description": "Nama model (opsional)"},
                "temperature": {"type": "number", "description": "Suhu sampling (opsional)"},
            },
            "required": ["prompt"],
            "additionalProperties": False,
        },
    },
    {
        "name": "hermes_agent_task",
        "description": "Minta Hermes mengerjakan tugas coding; opsional sertakan isi beberapa file workspace.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task": {"type": "string", "description": "Tugas/perubahan yang diminta"},
                "files": {"type": "array", "items": {"type": "string"}, "description": "Path file (relatif workspace) yang isinya ikut dikirim"},
                "context": {"type": "string", "description": "Konteks tambahan (opsional)"}
            },
            "required": ["task"],
            "additionalProperties": False,
        },
    },
    {
        "name": "hermes_review_diff",
        "description": "Kirim git diff (staged/unstaged/branch) ke Hermes untuk direview.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "description": "staged | unstaged | branch (default unstaged)"},
                "base": {"type": "string", "description": "Branch pembanding saat mode=branch (default origin/main)"},
                "diff": {"type": "string", "description": "Diff siap pakai (opsional, menimpa mode)"}
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "hermes_run",
        "description": "Jalankan perintah shell apa pun. Output penuh (tanpa potong).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Perintah yang dijalankan"},
                "cwd": {"type": "string", "description": "Folder kerja (default: workspace)"},
                "timeout_ms": {"type": "number", "description": "Batas waktu ms (opsional; kosong = tanpa batas)"}
            },
            "required": ["command"],
            "additionalProperties": False,
        },
    },
    {
        "name": "hermes_write_file",
        "description": "Tulis/ubah file apa pun (path relatif atau absolut). Folder dibuat otomatis.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path file (relatif workspace atau absolut)"},
                "content": {"type": "string", "description": "Isi file baru (lengkap)"}
            },
            "required": ["path", "content"],
            "additionalProperties": False,
        },
    },
    {
        "name": "hermes_apply_patch",
        "description": "Terapkan unified diff (git/patch) di folder mana pun; ada fallback 3-way, recount, dan patch -p1.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "diff": {"type": "string", "description": "Isi patch unified diff"},
                "cwd": {"type": "string", "description": "Folder repo (default: workspace)"},
                "dry_run": {"type": "boolean", "description": "Hanya cek, tidak menulis"}
            },
            "required": ["diff"],
            "additionalProperties": False,
        },
    },
    {
        "name": "hermes_autocode",
        "description": "Minta Hermes menulis patch untuk sebuah tugas lalu menerapkannya ke workspace.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task": {"type": "string", "description": "Perubahan yang diinginkan"},
                "files": {"type": "array", "items": {"type": "string"}, "description": "File konteks (opsional)"},
                "apply": {"type": "boolean", "description": "Terapkan patch otomatis (default true)"}
            },
            "required": ["task"],
            "additionalProperties": False,
        },
    },
    {
        "name": "hermes_read_file",
        "description": "Baca isi file apa pun (relatif atau absolut).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path file"},
                "max_bytes": {"type": "number", "description": "Opsional: batasi jumlah byte"}
            },
            "required": ["path"],
            "additionalProperties": False,
        },
    },
]


def git_diff(mode, base):
    args = ["git", "--no-pager", "diff", "--no-color"]
    if mode == "staged":
        args.insert(2, "--staged")
    elif mode == "branch":
        return run(["git", "--no-pager", "diff", "--no-color", "%s...HEAD" % (base or "origin/main")])
    return run(args)


def run(cmd):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return (out.stdout or out.stderr or "").strip()
    except Exception as exc:  # noqa: BLE001
        return "GAGAL menjalankan %s: %s" % (" ".join(cmd), exc)


def read_workspace_file(path):
    full = path if os.path.isabs(path) else os.path.join(os.getcwd(), path)
    with open(os.path.abspath(full), "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()



def call_api(path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, method="POST" if data else "GET")
    req.add_header("content-type", "application/json")
    if KEY:
        req.add_header("authorization", "Bearer " + KEY)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            body = res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        raise RuntimeError("HTTP %s: %s" % (err.code, err.read().decode("utf-8", "replace")[:300]))
    try:
        return json.loads(body)
    except ValueError:
        return body


def run_tool(name, args):
    if name == "hermes_list_models":
        data = call_api("/models")
        ids = [m.get("id") for m in (data.get("data") or [])] if isinstance(data, dict) else []
        return "\n".join([i for i in ids if i]) or str(data)[:500]
    if name == "hermes_chat":
        messages = []
        if args.get("system"):
            messages.append({"role": "system", "content": args["system"]})
        messages.append({"role": "user", "content": str(args.get("prompt") or "")})
        body = {"model": args.get("model") or MODEL, "messages": messages, "stream": False}
        if isinstance(args.get("temperature"), (int, float)):
            body["temperature"] = args["temperature"]
        data = call_api("/chat/completions", body)
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return str(data)[:2000]
        return content if isinstance(content, str) else str(content)
    if name == "hermes_review_diff":
        diff = args.get("diff") or git_diff(args.get("mode") or "unstaged", args.get("base"))
        if not diff:
            return "Tidak ada diff untuk direview."
        data = call_api("/chat/completions", {
            "model": args.get("model") or MODEL,
            "stream": False,
            "messages": [
                {"role": "system", "content": "Kamu senior code reviewer. Temukan bug/logic error/risiko keamanan. Ringkas per file, sertakan saran patch minimal. Bahasa Indonesia."},
                {"role": "user", "content": "Review diff berikut:\n\n" + diff},
            ],
        })
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return str(data)[:4000]
    if name == "hermes_agent_task":
        parts = []
        if args.get("context"):
            parts.append("Konteks:\n" + str(args["context"]))
        for rel in (args.get("files") or []):
            parts.append("=== %s ===\n%s" % (rel, read_workspace_file(str(rel))))
        parts.append("Tugas:\n" + str(args.get("task") or ""))
        body = "".join(parts)
        data = call_api("/chat/completions", {
            "model": args.get("model") or MODEL,
            "stream": False,
            "messages": [
                {"role": "system", "content": "Kamu asisten coding. Balas dengan patch/snippet yang bisa langsung ditempel, bahasa Indonesia ringkas."},
                {"role": "user", "content": body},
            ],
        })
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return str(data)[:4000]
    if name == "hermes_run":
        timeout = args.get("timeout_ms")
        timeout = float(timeout) / 1000.0 if timeout else None
        try:
            out = subprocess.run(
                str(args.get("command") or ""),
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=str(args.get("cwd") or os.getcwd()),
            )
        except subprocess.TimeoutExpired:
            return "Timeout setelah %ss" % int(timeout)
        text = ((out.stdout or "") + (("\n[stderr]\n" + out.stderr) if out.stderr else "")).strip()
        return ("exit=%s\n" % out.returncode) + (text or "(tanpa output)")
    if name == "hermes_write_file":
        rel = str(args.get("path") or "")
        content = str(args.get("content") or "")
        full = os.path.abspath(rel if os.path.isabs(rel) else os.path.join(os.getcwd(), rel))
        parent = os.path.dirname(full)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(full, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(content)
        return "Ditulis: %s (%d byte)" % (full, len(content))
    if name == "hermes_apply_patch":
        diff = str(args.get("diff") or "")
        if not diff.strip():
            raise RuntimeError("Patch kosong")
        if not diff.endswith("\n"):
            diff += "\n"
        return apply_diff(diff, cwd=args.get("cwd"), dry_run=bool(args.get("dry_run")))
    if name == "hermes_read_file":
        data = read_workspace_file(str(args.get("path") or ""))
        limit = args.get("max_bytes")
        if limit:
            data = data[: int(limit)]
        return data
    if name == "hermes_autocode":
        parts = []
        for rel in (args.get("files") or []):
            parts.append("=== %s ===\n%s" % (rel, read_workspace_file(str(rel))))
        parts.append("Tugas:\n" + str(args.get("task") or ""))
        data = call_api("/chat/completions", {
            "model": args.get("model") or MODEL,
            "stream": False,
            "messages": [
                {"role": "system", "content": "Kamu coding agent. Balas HANYA satu blok kode berpagar ```diff berisi unified diff (format git apply, path relatif repo). Tanpa penjelasan di luar blok."},
                {"role": "user", "content": "".join(parts)},
            ],
        })
        try:
            reply = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return str(data)[:4000]
        start = reply.find("```diff")
        end = reply.find("```", start + 7) if start >= 0 else -1
        if start < 0 or end < 0:
            return "Hermes tidak mengirim blok diff. Balasan:\n" + str(reply)[:3000]
        diff = reply[start + 7:end].strip() + "\n"
        if args.get("apply") is False:
            return "Diff dari Hermes (belum diterapkan):\n" + diff
        return apply_diff(diff, cwd=args.get("cwd"))
    raise RuntimeError("Tool tidak dikenal: %s" % name)


def git_apply(diff, check=False, cwd=None, extra=None):
    args = ["git", "apply"] + (["--check"] if check else []) + (extra or []) + ["-"]
    proc = subprocess.run(args, input=diff.encode("utf-8"), capture_output=True, cwd=cwd or os.getcwd())
    return proc.returncode, (proc.stderr or proc.stdout).decode("utf-8", "replace")


def apply_diff(diff, cwd=None, dry_run=False):
    workdir = str(cwd or os.getcwd())
    if dry_run:
        code, err = git_apply(diff, check=True, cwd=workdir)
        return "Patch valid (dry-run)." if code == 0 else "Patch gagal cek:\n" + err[:2000]
    code, err = git_apply(diff, cwd=workdir)
    if code == 0:
        return "Patch diterapkan.\n\n" + diff
    for extra in (["-3"], ["--recount"], ["--ignore-whitespace"], ["-p0"]):
        code, err2 = git_apply(diff, cwd=workdir, extra=extra)
        if code == 0:
            return "Patch diterapkan (fallback %s).\n\n%s" % (" ".join(extra), diff)
    try:
        proc = subprocess.run(["patch", "-p1", "--forward"], input=diff.encode("utf-8"), capture_output=True, cwd=workdir)
        if proc.returncode == 0:
            return "Patch diterapkan (patch -p1).\n\n" + diff
    except FileNotFoundError:
        pass
    return "Gagal menerapkan:\n" + err[:2000] + "\n\nDiff:\n" + diff


def run_apply(diff):
    return apply_diff(diff)


def send(payload):
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def handle(msg):
    msg_id = msg.get("id")
    method = msg.get("method")
    params = msg.get("params") or {}

    if method == "initialize":
        send({"jsonrpc": "2.0", "id": msg_id, "result": {
            "protocolVersion": params.get("protocolVersion") or "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "hermes-agent", "version": "1.0.0"},
        }})
        return
    if method == "notifications/initialized":
        return
    if method == "ping":
        send({"jsonrpc": "2.0", "id": msg_id, "result": {}})
        return
    if method == "tools/list":
        send({"jsonrpc": "2.0", "id": msg_id, "result": {"tools": TOOLS}})
        return
    if method == "tools/call":
        try:
            text = run_tool(params.get("name"), params.get("arguments") or {})
            send({"jsonrpc": "2.0", "id": msg_id, "result": {"content": [{"type": "text", "text": text}]}})
        except Exception as exc:  # noqa: BLE001 - laporkan ke klien MCP
            send({"jsonrpc": "2.0", "id": msg_id, "result": {"isError": True, "content": [{"type": "text", "text": str(exc)}]}})
        return
    if msg_id is not None:
        send({"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": "Method tidak didukung: %s" % method}})


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            handle(json.loads(line))
        except ValueError:
            continue


if __name__ == "__main__":
    main()
