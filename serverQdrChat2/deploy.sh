#!/bin/bash

# 🚀 Quick Deploy Script for serverQdrChat2
# Usage: ./deploy.sh

set -e  # Exit on error

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 설정
PROJECT_ID="aijob-abf44"
REGION="asia-northeast3"
SERVICE_NAME="aijob-server"
REPO_NAME="aijob-repo"

echo -e "${BLUE}🚀 Starting deployment to Google Cloud Run...${NC}\n"

# 1. 현재 프로젝트 확인
echo -e "${YELLOW}📋 Step 1: Checking Google Cloud project...${NC}"
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✓ Project set to: $PROJECT_ID${NC}\n"

# 2. Artifact Registry 레포지토리 확인/생성
echo -e "${YELLOW}📦 Step 2: Checking Artifact Registry...${NC}"
if ! gcloud artifacts repositories describe $REPO_NAME --location=$REGION &>/dev/null; then
    echo -e "${BLUE}Creating Artifact Registry repository...${NC}"
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="AI Job Backend Repository"
    echo -e "${GREEN}✓ Repository created${NC}\n"
else
    echo -e "${GREEN}✓ Repository already exists${NC}\n"
fi

# 3. Docker 인증 설정
echo -e "${YELLOW}🔐 Step 3: Configuring Docker authentication...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev
echo -e "${GREEN}✓ Docker authentication configured${NC}\n"

# 4. Docker 이미지 빌드
echo -e "${YELLOW}🏗️  Step 4: Building Docker image...${NC}"
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"
docker build -t $IMAGE_TAG .
echo -e "${GREEN}✓ Docker image built successfully${NC}\n"

# 5. Docker 이미지 푸시
echo -e "${YELLOW}📤 Step 5: Pushing Docker image to Artifact Registry...${NC}"
docker push $IMAGE_TAG
echo -e "${GREEN}✓ Image pushed successfully${NC}\n"

# 6. Cloud Run 배포
echo -e "${YELLOW}🚀 Step 6: Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_TAG \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --env-vars-file env.yaml \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0

echo -e "${GREEN}✓ Deployment completed!${NC}\n"

# 7. 서비스 URL 출력
echo -e "${YELLOW}🔗 Service URL:${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format 'value(status.url)')
echo -e "${BLUE}$SERVICE_URL${NC}\n"

# 8. Health Check
echo -e "${YELLOW}🏥 Step 7: Running health check...${NC}"
sleep 5  # Wait for service to be ready
HEALTH_RESPONSE=$(curl -s "${SERVICE_URL}/health")
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo -e "${GREEN}✓ Health check passed!${NC}"
    echo -e "${GREEN}Response: $HEALTH_RESPONSE${NC}\n"
else
    echo -e "${RED}⚠️  Health check failed!${NC}"
    echo -e "${RED}Response: $HEALTH_RESPONSE${NC}\n"
fi

# 9. 배포 완료 메시지
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Service URL: ${NC}$SERVICE_URL"
echo -e "${BLUE}Health Check: ${NC}${SERVICE_URL}/health"
echo -e "${BLUE}Region: ${NC}$REGION"
echo -e "${BLUE}Memory: ${NC}2 GiB"
echo -e "${BLUE}CPU: ${NC}2"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 10. 다음 단계 안내
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "1. Update frontend to use: ${BLUE}$SERVICE_URL${NC}"
echo -e "2. Test the API endpoints"
echo -e "3. Monitor logs: ${BLUE}gcloud run logs read $SERVICE_NAME --region $REGION --limit 50${NC}"
echo -e "4. View metrics in Cloud Console: ${BLUE}https://console.cloud.google.com/run${NC}\n"




