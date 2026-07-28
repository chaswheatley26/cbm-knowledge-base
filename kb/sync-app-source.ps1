<#
  Pushes kb/app-source.jsx into the <script type="text/plain" id="app-source">
  block inside kb/index.html, replacing its contents in place.

  Why this exists: the JSX source has to live inline as inert text inside
  index.html so a bootstrap script can Babel-compile it at load time (see the
  comment above that <script> tag, and CLAUDE.md gotcha #1) — but most editors
  (VS Code included) refuse to apply JS/JSX syntax highlighting inside a
  <script type="text/plain"> block, since that type explicitly says "not
  code". app-source.jsx is a plain, fully-highlighted scratch copy of that
  same source. Edit app-source.jsx, then run this script to sync those edits
  back into index.html before testing or committing. Never hand-edit the
  embedded block in index.html directly — it'll just get overwritten the next
  time this runs, and edits made only there are invisible to app-source.jsx.

  Usage: powershell -File kb/sync-app-source.ps1
#>

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$htmlPath = Join-Path $here "index.html"
$jsxPath = Join-Path $here "app-source.jsx"

$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$jsx = [System.IO.File]::ReadAllText($jsxPath, [System.Text.Encoding]::UTF8).TrimEnd("`r", "`n")

$startMarker = '<script type="text/plain" id="app-source">'
$endMarker = "`n</script>"

$startIdx = $html.IndexOf($startMarker)
if ($startIdx -lt 0) { throw "Couldn't find the app-source <script> opening tag in index.html" }
$contentStart = $startIdx + $startMarker.Length

$endIdx = $html.IndexOf($endMarker, $contentStart)
if ($endIdx -lt 0) { throw "Couldn't find the closing </script> tag after app-source in index.html" }

$before = $html.Substring(0, $contentStart)
$after = $html.Substring($endIdx)

$newHtml = $before + "`n" + $jsx + $after

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($htmlPath, $newHtml, $utf8NoBom)

Write-Host "Synced app-source.jsx into index.html ($($jsx.Length) chars)."
