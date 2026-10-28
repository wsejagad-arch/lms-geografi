#!/usr/bin/env python3
"""MCP stdio adapter untuk Hermes Agent API (OpenAI-compatible /v1).

Env: HERMES_BASE_URL (default http://127.0.0.1:8642/v1), HERMES_API_KEY, HERMES_MODEL (default "hermes-agent").
"""
import json
import os
import sys
import urllib.request
import urllib.error

BASE = (os.environ.get("HERMES_BASE_URL") or "http://127.0.0.1:8642/v1").rstrip("/")
KEY = os.environ.get("HERMES_API_KEY") or ""
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
]


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
    raise RuntimeError("Tool tidak dikenal: %s" % name)


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
