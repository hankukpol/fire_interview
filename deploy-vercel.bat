@echo off
setlocal EnableExtensions DisableDelayedExpansion

cd /d "%~dp0"

set "CHECK_ONLY=0"
set "RUN_BUILD=0"
set "AUTO_YES=0"
set "DIRECT_VERCEL=1"
set "HAS_VERCEL_LINK=0"
set "HAS_LOCAL_CHANGES=0"
set "LIKELY_PROD=0"
set "CURRENT_BRANCH="
set "COMMIT_MESSAGE="

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--check" (
  set "CHECK_ONLY=1"
  shift
  goto parse_args
)
if /I "%~1"=="--with-build" (
  set "RUN_BUILD=1"
  shift
  goto parse_args
)
if /I "%~1"=="--yes" (
  set "AUTO_YES=1"
  shift
  goto parse_args
)
if /I "%~1"=="--push-only" (
  set "DIRECT_VERCEL=0"
  shift
  goto parse_args
)
if /I "%~1"=="--direct-vercel" (
  set "DIRECT_VERCEL=1"
  shift
  goto parse_args
)
if defined COMMIT_MESSAGE (
  set "COMMIT_MESSAGE=%COMMIT_MESSAGE% %~1"
) else (
  set "COMMIT_MESSAGE=%~1"
)
shift
goto parse_args

:args_done
echo [deploy] Project root: %CD%

where git >nul 2>&1
if errorlevel 1 (
  echo [deploy] Git is not installed or not available on PATH.
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [deploy] Node.js is not installed or not available on PATH.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [deploy] npm is not installed or not available on PATH.
  exit /b 1
)

where npx >nul 2>&1
if errorlevel 1 (
  echo [deploy] npx is not installed or not available on PATH.
  exit /b 1
)

if not exist package.json (
  echo [deploy] package.json was not found in this folder.
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [deploy] This folder is not a Git repository.
  exit /b 1
)

for /f "delims=" %%i in ('git branch --show-current') do set "CURRENT_BRANCH=%%i"
if not defined CURRENT_BRANCH (
  echo [deploy] Could not determine the current Git branch.
  exit /b 1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [deploy] Git remote 'origin' was not found.
  exit /b 1
)

if exist .vercel\project.json set "HAS_VERCEL_LINK=1"
if /I "%CURRENT_BRANCH%"=="main" set "LIKELY_PROD=1"
if /I "%CURRENT_BRANCH%"=="master" set "LIKELY_PROD=1"

echo [deploy] Branch: %CURRENT_BRANCH%
if "%HAS_VERCEL_LINK%"=="1" (
  echo [deploy] Vercel project link detected.
) else (
  echo [deploy] No .vercel\project.json file was found.
)
if "%DIRECT_VERCEL%"=="1" (
  echo [deploy] Mode: push plus direct Vercel production deploy.
) else (
  echo [deploy] Mode: push only.
)

if "%CHECK_ONLY%"=="1" (
  echo [deploy] Checks passed.
  exit /b 0
)

if "%RUN_BUILD%"=="1" (
  echo [deploy] Running production build before push...
  call npm run build
  if errorlevel 1 (
    echo [deploy] Build failed. Push and deploy were skipped.
    exit /b 1
  )
) else (
  echo [deploy] Local build check skipped. Use --with-build to run npm run build first.
)

echo [deploy] Current working tree:
git status --short

git status --porcelain | findstr . >nul
if errorlevel 1 goto push_step

set "HAS_LOCAL_CHANGES=1"
if "%AUTO_YES%"=="0" (
  if "%DIRECT_VERCEL%"=="1" (
    choice /M "Stage all changes, commit, push, and run direct Vercel deploy"
  ) else (
    choice /M "Stage all changes, commit, and push this branch"
  )
  if errorlevel 2 (
    echo [deploy] Cancelled.
    exit /b 1
  )
)

if not defined COMMIT_MESSAGE set "COMMIT_MESSAGE=deploy: %DATE% %TIME%"

echo [deploy] Staging all changes...
git add -A
if errorlevel 1 (
  echo [deploy] git add failed.
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 goto commit_step

echo [deploy] Nothing was staged after git add -A. Skipping commit.
goto push_step

:commit_step
echo [deploy] Creating commit: %COMMIT_MESSAGE%
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
  echo [deploy] git commit failed.
  exit /b 1
)

:push_step
if "%HAS_LOCAL_CHANGES%"=="0" echo [deploy] No local changes detected. Continuing with push only.

echo [deploy] Pushing to origin/%CURRENT_BRANCH%...
git push origin %CURRENT_BRANCH%
if errorlevel 1 (
  echo [deploy] git push failed.
  exit /b 1
)

if "%HAS_VERCEL_LINK%"=="0" (
  echo [deploy] Git push completed. Direct Vercel deploy was skipped because no local Vercel link was found.
  exit /b 0
)

if "%DIRECT_VERCEL%"=="1" (
  echo [deploy] Running direct Vercel production deploy...
  call npx vercel --prod --yes
  if errorlevel 1 (
    echo [deploy] Vercel CLI deploy failed.
    exit /b 1
  )
  echo [deploy] Vercel production deploy completed.
  exit /b 0
)

if "%LIKELY_PROD%"=="1" (
  echo [deploy] Git push completed. Vercel should deploy this branch if it is configured as the production branch.
) else (
  echo [deploy] Git push completed. Vercel should create a preview deployment for this branch when Git integration is enabled.
)
echo [deploy] Use --push-only to skip the direct Vercel production deploy.

exit /b 0
