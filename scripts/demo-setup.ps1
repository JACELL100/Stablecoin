# Demo Setup Script for Windows PowerShell
# Disaster Relief System - Hackathon Demo Setup

Write-Host "🌍 Disaster Relief System - Demo Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm -v
    Write-Host "✓ npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Install blockchain dependencies
Write-Host "`nInstalling blockchain dependencies..." -ForegroundColor Yellow
Set-Location "$projectRoot\blockchain"
npm install
Write-Host "✓ Blockchain dependencies installed" -ForegroundColor Green

# Compile smart contracts
Write-Host "`nCompiling smart contracts..." -ForegroundColor Yellow
npx hardhat compile
Write-Host "✓ Smart contracts compiled" -ForegroundColor Green

# Install frontend dependencies
Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"
npm install
Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green

# Install backend dependencies
Write-Host "`nInstalling backend dependencies..." -ForegroundColor Yellow
Set-Location "$projectRoot\backend"
if (-not (Test-Path "venv")) {
    python -m venv venv
}
& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt
Write-Host "✓ Backend dependencies installed" -ForegroundColor Green

# Create sample .env files
Write-Host "`nCreating sample environment files..." -ForegroundColor Yellow

# Blockchain .env
Set-Location "$projectRoot\blockchain"
if (-not (Test-Path ".env")) {
    @"
# Get a Sepolia RPC URL from Infura or Alchemy
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Your deployer wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# For contract verification on Etherscan
ETHERSCAN_API_KEY=your_etherscan_api_key
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✓ Created blockchain\.env" -ForegroundColor Green
}

# Frontend .env
Set-Location "$projectRoot\frontend"
if (-not (Test-Path ".env")) {
    @"
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
VITE_API_URL=http://localhost:8000/api

# Smart Contract Addresses (after deployment)
VITE_RELIEF_TOKEN_ADDRESS=
VITE_SPENDING_CONTROLLER_ADDRESS=
VITE_CAMPAIGN_MANAGER_ADDRESS=
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✓ Created frontend\.env" -ForegroundColor Green
}

# Backend .env
Set-Location "$projectRoot\backend"
if (-not (Test-Path ".env")) {
    @"
DEBUG=True
SECRET_KEY=your-secret-key-for-development-only

# Database (using Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Ethereum
WEB3_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
RELIEF_TOKEN_ADDRESS=
SPENDING_CONTROLLER_ADDRESS=
CAMPAIGN_MANAGER_ADDRESS=
DEPLOYER_PRIVATE_KEY=
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✓ Created backend\.env" -ForegroundColor Green
}

Set-Location $projectRoot

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ Demo setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update .env files with your actual keys"
Write-Host "2. Set up Supabase project and run migrations"
Write-Host "3. Deploy smart contracts:"
Write-Host "   cd blockchain; npx hardhat run scripts/deploy.js --network sepolia"
Write-Host "4. Start backend:"
Write-Host "   cd backend; python manage.py runserver"
Write-Host "5. Start frontend:"
Write-Host "   cd frontend; npm run dev"
Write-Host ""
Write-Host "For the hackathon demo:" -ForegroundColor Yellow
Write-Host "- Use Sepolia testnet (get test ETH from sepoliafaucet.com)"
Write-Host "- MetaMask should be connected to Sepolia"
Write-Host "- Demo accounts are created with Google OAuth"
Write-Host ""
Write-Host "📖 See README.md for detailed documentation"
