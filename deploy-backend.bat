@echo off
setlocal
REM Script to Deploy HopIn Supabase Backend

echo ====================================================================
echo     HOPIN BACKEND DEPLOYMENT SCRIPT
echo     Target: Full Supabase migration chain through 012 + Edge Functions
echo ====================================================================
echo.

REM Check if the canonical migration and function entrypoints exist
if not exist "supabase\migrations\012_ai_support_observability.sql" (
    echo ERROR: Canonical migration file not found!
    echo Expected: supabase\migrations\012_ai_support_observability.sql
    exit /b 1
)

if not exist "supabase\functions\ai-support-chat\index.ts" (
    echo ERROR: ai-support-chat function entrypoint not found!
    echo Expected: supabase\functions\ai-support-chat\index.ts
    exit /b 1
)

echo [OK] Canonical migration and function files found
echo.

REM Try to use Supabase CLI
echo Attempting to deploy using Supabase CLI...
echo.

REM Check if supabase CLI is installed
where supabase >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Supabase CLI found
    echo.
    echo Applying migration chain...
    supabase db push
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo Deploying Edge Functions...
        call :deploy_function submit-contact-message || goto :deploy_failed
        call :deploy_function subscribe-to-journal || goto :deploy_failed
        call :deploy_function ai-support-chat || goto :deploy_failed
        call :deploy_function admin-review-driver-application || goto :deploy_failed
        call :deploy_function expire-rides || goto :deploy_failed
        echo.
        echo ====================================================================
        echo SUCCESS! Backend deployed to Supabase
        echo ====================================================================
        echo.
        echo Remember to configure the required function secrets:
        echo   - SUPABASE_SERVICE_ROLE_KEY
        echo   - GROQ_API_KEY
        echo   - GROQ_MODEL (optional)
        echo   - BACKEND_CRON_SECRET
        echo.
        echo Then attach a scheduler or secure webhook to expire-rides.
        echo.
        pause
        exit /b 0
    ) else (
        echo.
        echo ERROR: Supabase db push failed
        echo.
    )
) else (
    echo [WARN] Supabase CLI not found
    echo.
)

goto :manual

:deploy_function
echo   - %~1
supabase functions deploy %~1
if %ERRORLEVEL% NEQ 0 (
    exit /b 1
)
exit /b 0

:deploy_failed
echo.
echo ERROR: One or more Edge Function deployments failed
echo.

:manual
echo ====================================================================
echo MANUAL DEPLOYMENT INSTRUCTIONS
echo ====================================================================
echo.
echo Since automatic deployment failed, please deploy manually.
echo.
echo OPTION 1: Use the Supabase CLI
echo   1. Install and authenticate the CLI
echo   2. Run: supabase db push
echo   3. Run: supabase functions deploy submit-contact-message
echo   4. Run: supabase functions deploy subscribe-to-journal
echo   5. Run: supabase functions deploy ai-support-chat
echo   6. Run: supabase functions deploy admin-review-driver-application
echo   7. Run: supabase functions deploy expire-rides
echo.
echo OPTION 2: Use Supabase Dashboard for SQL, then CLI for functions
echo   1. Open the project's SQL Editor
echo   2. Apply the full migration chain through 012_ai_support_observability.sql
echo   3. Deploy the five Edge Functions listed above
echo.
echo OPTION 3: Use psql for database changes
echo   Apply the full supabase\migrations directory in order, then deploy functions.
echo.
echo ====================================================================
echo.
echo REQUIRED EDGE FUNCTION SECRETS:
echo.
echo   - SUPABASE_SERVICE_ROLE_KEY
echo   - GROQ_API_KEY
echo   - GROQ_MODEL (optional, defaults to llama3-8b-8192)
echo   - BACKEND_CRON_SECRET
echo.
echo VERIFICATION AFTER DEPLOYMENT:
echo.
echo   - Run npm run validate and npm run build locally
echo   - Test signed-in dashboard chat via ai-support-chat
echo   - Test contact form and newsletter signup
echo   - Verify expire-rides is called by a scheduler with x-cron-secret
echo.
echo ====================================================================
echo.
pause
