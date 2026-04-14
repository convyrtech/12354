$raw = [Console]::In.ReadToEnd()

if ([string]::IsNullOrWhiteSpace($raw)) {
  exit 0
}

try {
  $payload = $raw | ConvertFrom-Json -Depth 100
} catch {
  exit 0
}

if (-not $payload.tool_input) {
  exit 0
}

$filePath = $payload.tool_input.file_path
if (-not $filePath) {
  $filePath = $payload.tool_input.path
}

if (-not $filePath) {
  exit 0
}

$projectDir = [System.IO.Path]::GetFullPath($env:CLAUDE_PROJECT_DIR)

if ([System.IO.Path]::IsPathRooted($filePath)) {
  $fullPath = [System.IO.Path]::GetFullPath($filePath)
} else {
  $fullPath = [System.IO.Path]::GetFullPath((Join-Path $projectDir $filePath))
}

$projectPrefix = $projectDir.TrimEnd("\")
$relative = $fullPath

if ($fullPath.StartsWith($projectPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  $relative = $fullPath.Substring($projectPrefix.Length).TrimStart("\")
}

$normalizedRelative = $relative.Replace("/", "\")
$isSecretEnv =
  $normalizedRelative -ieq ".env" -or
  ($normalizedRelative -like ".env.*" -and $normalizedRelative -ine ".env.example")
$isGenerated =
  $normalizedRelative.StartsWith(".next\", [System.StringComparison]::OrdinalIgnoreCase) -or
  $normalizedRelative.StartsWith("node_modules\", [System.StringComparison]::OrdinalIgnoreCase)

if (-not ($isSecretEnv -or $isGenerated)) {
  exit 0
}

$reason =
  if ($isSecretEnv) {
    "Project hook blocked editing a secret environment file. Use .env.example or edit secrets manually."
  } else {
    "Project hook blocked editing generated artifacts. Change source files instead of .next or node_modules."
  }

$output = @{
  hookSpecificOutput = @{
    hookEventName = "PreToolUse"
    permissionDecision = "deny"
    permissionDecisionReason = $reason
  }
}

$output | ConvertTo-Json -Depth 10 -Compress
