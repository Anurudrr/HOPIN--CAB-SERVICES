#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy HopIn to production with all migrations and edge functions

.DESCRIPTION
    This script deploys the complete HopIn application including:
    - All 22 Supabase migrations
    - 8 Edge Functions
    - Environment variables
    - Build and deploy frontend to Vercel

.PREREQUISITES
    - Supabase CLI installed and logged in
    - Vercel CLI installed and logged in
    - Stripe account with API keys
    - VAPID keys for push notifications

.EXAMPLE
    .\deploy.ps1 -ProjectRef "your-project-ref" -Environment "production"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectRef,

    [Parameter(Mandatory=$true)]
    [ValidateSet("staging", "production")]
    [string]$Environment,

    [string]$StripeSecretKey,
    [string]$StripeWebhookSecret,
    [string]$VapidPublicKey,
    [string]$VapidPrivateKey,
    [string]$VapidSubject = "mailto:admin@hopin.app",
    [string]$MapboxToken,
    [string]$SupabaseServiceRoleKey
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✓ $msg" -ForegroundColor Green }
function Write-Error($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✗ $msg" -ForegroundColor Red }
function Write-Warning($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ⚠ $msg" -ForegroundColor Yellow }

Write-Info "Starting HopIn deployment to $Environment..."
Write-Info "Project: $ProjectRef"

# Check prerequisites
Write-Info "Checking prerequisites..."
$tools = @("supabase", "vercel", "node", "npm")
foreach ($tool in $tools) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Error "$tool is not installed or not in PATH"
        exit 1
    }
}
Write-Success "All tools available"

# Set Supabase project
Write-Info "Linking Supabase project..."
supabase link --project-ref $ProjectRef

# Run migrations
Write-Info "Running database migrations..."
$migrationsDir = "supabase/migrations"
$migrationFiles = Get-ChildItem $migrationsDir -Filter "*.sql" | Sort-Object Name

foreach ($file in $migrationFiles) {
    Write-Info "Applying $($file.Name)..."
    try {
        supabase db push --file $file.FullName
        Write-Success "Applied $($file.Name)"
    } catch {
        Write-Warning "Migration $($file.Name) may have already been applied or failed: $_"
    }
}

# Deploy edge functions
Write-Info "Deploying edge functions..."
$functionsDir = "supabase/functions"
$functionDirs = Get-ChildItem $functionsDir -Directory

foreach ($funcDir in $functionDirs) {
    $funcName = $funcDir.Name
    Write-Info "Deploying $funcName..."
    try {
        supabase functions deploy $funcName --project-ref $ProjectRef
        Write-Success "Deployed $funcName"
    } catch {
        Write-Error "Failed to deploy $funcName: $_"
        exit 1
    }
}

# Set secrets
Write-Info "Setting edge function secrets..."
$secrets = @{
    STRIPE_SECRET_KEY = $StripeSecretKey
    STRIPE_WEBHOOK_SECRET = $StripeWebhookSecret
    VAPID_PUBLIC_KEY = $VapidPublicKey
    VAPID_PRIVATE_KEY = $VapidPrivateKey
    VAPID_SUBJECT = $VapidSubject
    MAPBOX_TOKEN = $MapboxToken
    SUPABASE_SERVICE_ROLE_KEY = $SupabaseServiceRoleKey
}

foreach ($secret in $secrets.Keys) {
    if ($secrets[$secret]) {
        Write-Info "Setting $secret..."
        try {
            supabase secrets set --project-ref $ProjectRef "$secret=$($secrets[$secret])"
            Write-Success "Set $secret"
        } catch {
            Write-Warning "Failed to set $secret: $_"
        }
    }
}

# Build frontend
Write-Info "Building frontend..."
try {
    npm run build
    Write-Success "Frontend built"
} catch {
    Write-Error "Frontend build failed: $_"
    exit 1
}

# Deploy to Vercel
Write-Info "Deploying to Vercel..."
$vercelArgs = @("deploy", "--prod")
if ($Environment -eq "staging") { $vercelArgs = @("deploy") }

try {
    & vercel @vercelArgs
    Write-Success "Deployed to Vercel"
} catch {
    Write-Error "Vercel deployment failed: $_"
    exit 1
}

Write-Success "🎉 HopIn deployed successfully to $Environment!"
Write-Info "Next steps:"
Write-Info "1. Configure Stripe webhook endpoint in Stripe Dashboard"
Write-Info "2. Test all user flows (booking, payments, chat, tracking)"
Write-Info "3. Monitor edge function logs: supabase functions logs --project-ref $ProjectRef"
Write-Info "4. Set up monitoring alerts for payment failures and errors"