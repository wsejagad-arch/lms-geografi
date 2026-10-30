# Jalankan Ollama lokal di port sendiri agar tidak bentrok dengan tunnel SSH
# yang memakai 127.0.0.1:11434 (hermes-vps).
#
#   .\scripts\ollama-local.ps1                 # cek + jalankan di port 11435
#   .\scripts\ollama-local.ps1 -Model qwen2.5-coder:7b
#   .\scripts\ollama-local.ps1 -CheckOnly      # hanya laporan, tidak menjalankan
#
# Klien (Continue/Cline/Aider) diarahkan ke base URL yang dicetak di akhir.

[CmdletBinding()]
param(
  [int]$Port = 11435,
  [string]$Model = 'qwen2.5-coder:3b',
  [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'

# Perkiraan RAM yang dibutuhkan model (GB), sudah termasuk overhead context.
$needs = @{
  'qwen2.5-coder:3b'     = 3.0
  'qwen3:4b'             = 3.5
  'qwen2.5-coder:7b'     = 6.0
  'deepseek-coder-v2:16b'= 11.0
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  throw 'ollama tidak ditemukan di PATH. Pasang dari https://ollama.com/download'
}

function Test-PortFree([int]$p) {
  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) { $listener.Stop() }
  }
}

function Test-OllamaUp([int]$p) {
  try {
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:$p/api/tags" -TimeoutSec 3
    return [bool]$r
  } catch {
    return $false
  }
}

$alreadyUp = Test-OllamaUp $Port

# Bila server Ollama lokal sudah berjalan di port utama, pakai itu — jangan pilih
# port baru, karena klien (Continue/Cline) dikonfigurasi ke base URL tetap.
if ($alreadyUp -and -not $CheckOnly) {
  Write-Host "Ollama sudah berjalan di port $Port"
  Write-Host "Base URL     : http://127.0.0.1:$Port"
  Write-Host 'Tidak menjalankan server baru. Hentikan dulu prosesnya bila ingin restart.'
  return
}

if ($alreadyUp) {
  $chosen = $Port
} else {
  $chosen = $null
  foreach ($p in $Port..($Port + 9)) {
    if (Test-PortFree $p) { $chosen = $p; break }
  }
  if (-not $chosen) { throw "Tidak ada port bebas di rentang $Port-$($Port + 9)." }
  if ($chosen -ne $Port) {
    Write-Warning "Port $Port sedang dipakai proses lain (bukan Ollama); memakai $chosen."
    Write-Warning "Klien yang menunjuk http://127.0.0.1:$Port perlu disesuaikan."
  }
}

# Penting: arahkan klien ollama ke port kita dulu, karena 127.0.0.1:11434
# bisa dipegang tunnel SSH dan membuat 'ollama list' menggantung.
$env:OLLAMA_HOST = "127.0.0.1:$chosen"

function Test-ModelInstalled([string]$name) {
  $parts = $name -split ':'
  $repo = $parts[0]
  $tag = if ($parts.Count -gt 1) { $parts[1] } else { 'latest' }
  $root = Join-Path $env:USERPROFILE '.ollama\models'
  # Ollama lama: manifests/registry.ollama.ai/library/... ; baru: manifests-v2/ollama.com/library/...
  $paths = @(
    (Join-Path $root "manifests\registry.ollama.ai\library\$repo\$tag"),
    (Join-Path $root "manifests-v2\ollama.com\library\$repo\$tag")
  )
  foreach ($p in $paths) { if (Test-Path $p) { return $true } }
  return $false
}

function Get-InstalledModels {
  $root = Join-Path $env:USERPROFILE '.ollama\models'
  $found = @()
  foreach ($base in @("$root\manifests\registry.ollama.ai\library", "$root\manifests-v2\ollama.com\library")) {
    if (-not (Test-Path $base)) { continue }
    foreach ($dir in Get-ChildItem $base -Directory) {
      foreach ($tagItem in Get-ChildItem $dir.FullName) {
        $found += "$($dir.Name):$($tagItem.Name)"
      }
    }
  }
  return @($found | Sort-Object -Unique)
}

$freeGB = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 1)
if (-not (Test-ModelInstalled $Model)) {
  Write-Warning "Model '$Model' belum terunduh. Jalankan: ollama pull $Model"
}
Write-Host "Model lokal  : $((Get-InstalledModels) -join ', ')"
Write-Host "Server       : $(if ($alreadyUp) { "hidup di port $Port" } else { 'belum berjalan' })"

$needGB = if ($needs.ContainsKey($Model)) { $needs[$Model] } else { 6.0 }

Write-Host "Model        : $Model (butuh ~$needGB GB RAM)"
Write-Host "RAM bebas    : $freeGB GB"
Write-Host "Port dipakai : $chosen"
Write-Host "Base URL     : http://127.0.0.1:$chosen"

if ($freeGB -lt $needGB) {
  Write-Warning "RAM bebas kurang dari kebutuhan. Tutup aplikasi lain atau pakai model lebih kecil:"
  Write-Warning "  .\scripts\ollama-local.ps1 -Model qwen2.5-coder:3b"
}

if ($CheckOnly) { return }

# Hemat RAM + lebih cepat di CPU/iGPU: flash attention dan KV cache 8-bit.
# Hasil ukur di laptop ini (qwen2.5-coder:7b): load 68 s -> 11 s, 4,4 -> 5,8 tok/s.
$env:OLLAMA_FLASH_ATTENTION = '1'
$env:OLLAMA_KV_CACHE_TYPE = 'q8_0'
# Biarkan model tetap termuat agar autocomplete tidak menunggu cold start.
$env:OLLAMA_KEEP_ALIVE = '30m'

Write-Host 'Menjalankan ollama serve (Ctrl+C untuk berhenti)...' -ForegroundColor Cyan
ollama serve
