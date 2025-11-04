@echo off
REM 🚀 Quick Deploy Script for serverQdrChat2 (Windows)
REM Usage: deploy.bat

echo.
echo ========================================
echo  Deploying to Google Cloud Run
echo ========================================
echo.

REM 프로젝트 설정
set PROJECT_ID=mtree-e0249
set REGION=asia-northeast3
set SERVICE_NAME=aijob-server
set REPO_NAME=aijob-repo

echo [Step 1] Checking Google Cloud project...
gcloud config set project %PROJECT_ID%
if errorlevel 1 (
    echo ERROR: Failed to set project
    exit /b 1
)
echo OK: Project set to %PROJECT_ID%
echo.

echo [Step 2] Checking Artifact Registry...
gcloud artifacts repositories describe %REPO_NAME% --location=%REGION% >nul 2>&1
if errorlevel 1 (
    echo Creating Artifact Registry repository...
    gcloud artifacts repositories create %REPO_NAME% ^
        --repository-format=docker ^
        --location=%REGION% ^
        --description="AI Job Backend Repository"
    echo OK: Repository created
) else (
    echo OK: Repository already exists
)
echo.

echo [Step 3] Configuring Docker authentication...
gcloud auth configure-docker %REGION%-docker.pkg.dev
echo OK: Docker authentication configured
echo.

echo [Step 4] Building Docker image...
set IMAGE_TAG=%REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO_NAME%/%SERVICE_NAME%:latest
docker build -t %IMAGE_TAG% .
if errorlevel 1 (
    echo ERROR: Failed to build Docker image
    exit /b 1
)
echo OK: Docker image built successfully
echo.

echo [Step 5] Pushing Docker image...
docker push %IMAGE_TAG%
if errorlevel 1 (
    echo ERROR: Failed to push Docker image
    exit /b 1
)
echo OK: Image pushed successfully
echo.

echo [Step 6] Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
    --image %IMAGE_TAG% ^
    --region %REGION% ^
    --platform managed ^
    --allow-unauthenticated ^
    --env-vars-file env.yaml ^
    --memory 2Gi ^
    --cpu 2 ^
    --timeout 300 ^
    --max-instances 10 ^
    --min-instances 0

if errorlevel 1 (
    echo ERROR: Failed to deploy to Cloud Run
    exit /b 1
)
echo OK: Deployment completed!
echo.

echo [Step 7] Getting service URL...
for /f "delims=" %%i in ('gcloud run services describe %SERVICE_NAME% --region %REGION% --format "value(status.url)"') do set SERVICE_URL=%%i
echo Service URL: %SERVICE_URL%
echo.

echo [Step 8] Running health check...
timeout /t 5 /nobreak >nul
curl -s "%SERVICE_URL%/health"
echo.
echo.

echo ========================================
echo  Deployment completed successfully!
echo ========================================
echo Service URL: %SERVICE_URL%
echo Health Check: %SERVICE_URL%/health
echo Region: %REGION%
echo Memory: 2 GiB
echo CPU: 2
echo ========================================
echo.

echo Next steps:
echo 1. Update frontend to use: %SERVICE_URL%
echo 2. Test the API endpoints
echo 3. Monitor logs: gcloud run logs read %SERVICE_NAME% --region %REGION% --limit 50
echo.

pause




