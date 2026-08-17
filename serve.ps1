# Minimal static file server for local preview.
#
# Usage:  powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1 [port]
# Or, from a POSIX shell:  bash serve.sh
#
# Serves the project root, so paths resolve the same way they will in production.
param([int]$Port = 8761)

Set-Location -LiteralPath $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $(Get-Location) at http://localhost:$Port/"
Write-Host 'Press Ctrl+C to stop.'

$mime = @{
  '.html' = 'text/html'; '.css' = 'text/css'; '.js' = 'application/javascript';
  '.json' = 'application/json'; '.png' = 'image/png'; '.jpg' = 'image/jpeg';
  '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.svg' = 'image/svg+xml';
  '.ico' = 'image/x-icon'; '.woff2' = 'font/woff2'
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path (Get-Location) ($path.TrimStart('/'))
    if (Test-Path $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file)
      $ct = $mime[$ext]
      if (-not $ct) { $ct = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $res.ContentType = $ct
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found: ' + $path)
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.OutputStream.Close()
  }
}
