# Deploying Next.js to AWS EC2/ECS

This guide covers deploying your Next.js website built with Agility CMS to AWS using Amazon Elastic Container Service (ECS) with either EC2 instances or AWS Fargate. This approach provides full control over your infrastructure and supports all Next.js features including Server-Side Rendering (SSR), API routes, and Incremental Static Regeneration (ISR).

## Overview

AWS ECS is a fully managed container orchestration service that allows you to run Docker containers at scale. You can deploy Next.js applications using either:

- **AWS Fargate** (Recommended) - Serverless compute for containers, no EC2 instances to manage
- **EC2 Launch Type** - More control over underlying infrastructure, requires EC2 instance management

### Benefits of Deploying to AWS ECS

- ✅ **Full Next.js Feature Support** - Supports Static Site Generation (SSG), Server-Side Rendering (SSR), Incremental Static Regeneration (ISR), API routes, and React Server Components
- ✅ **Scalability** - Auto-scaling capabilities to handle traffic spikes
- ✅ **High Availability** - Multi-AZ deployment for fault tolerance
- ✅ **Load Balancing** - Application Load Balancer (ALB) for traffic distribution
- ✅ **Container Orchestration** - Managed container deployment and updates
- ✅ **Cost Control** - Pay only for resources you use
- ✅ **Security** - Integration with AWS IAM, VPC, and security groups

### Starting Point

Most developers deploying Agility CMS websites to AWS ECS will be starting from an existing Next.js project:

- **Agility CMS Next.js Starter** - [https://github.com/agility/agilitycms-nextjs-starter](https://github.com/agility/agilitycms-nextjs-starter) - Production-ready starter with App Router, TypeScript, and Tailwind CSS
- **Agility CMS Comprehensive Demo** - [https://github.com/agility/nextjs-demo-site-2025](https://github.com/agility/nextjs-demo-site-2025) - Full-featured demo with AI search, internationalization, and advanced features
- **Your Own Agility Next.js Site** - Existing project already integrated with Agility CMS

These starters already include proper Next.js configuration, Agility CMS integration, and the necessary build scripts. You'll still need to configure your environment variables and Docker setup.

## Prerequisites

Before you begin, ensure you have:

1. **AWS Account** - Sign up at [aws.amazon.com](https://aws.amazon.com) if you don't have one
2. **AWS CLI** - Installed and configured with appropriate credentials
3. **Docker** - Installed locally for building container images
4. **Agility CMS Instance** - With API credentials (see below if you need to set one up)
5. **Node.js 18.x or later** - For local development and testing
6. **Basic AWS Knowledge** - Familiarity with ECS, ECR, VPC, and IAM concepts

### Get Your Agility CMS Credentials

If you don't already have an Agility CMS instance set up:

1. **Sign up for Agility CMS** - Create a free account at [agilitycms.com](https://agilitycms.com)
2. **Create an Instance** - Create a new instance (you can start with a Blog Starter template)
3. **Get API Keys** - Navigate to **Settings > API Keys** in your Agility CMS dashboard
4. **Copy your credentials**:
   - `GUID` (Instance ID)
   - `Live API Key` (for production)
   - `Preview API Key` (for development/preview)
   - `Security Key` (for webhooks)

You'll need these credentials for both local development and AWS ECS deployment configuration.

## Deployment Architecture

The recommended architecture for deploying Next.js to AWS ECS includes:

```
Internet
   ↓
Application Load Balancer (ALB)
   ↓
ECS Service (Fargate or EC2)
   ↓
Next.js Container (Port 3000)
   ↓
Agility CMS API
```

**Components:**
- **Application Load Balancer (ALB)** - Routes traffic to ECS tasks, handles SSL termination
- **ECS Cluster** - Manages container instances
- **ECS Service** - Maintains desired number of running tasks
- **Task Definition** - Defines container configuration, environment variables, and resources
- **Amazon ECR** - Stores Docker container images
- **VPC** - Isolated network environment for your resources

## Step 1: Prepare Your Next.js Project

### Verify Build Scripts

Ensure your `package.json` has the required scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

**Note**: The Agility CMS Next.js starters already include proper Next.js configuration for containerized deployment.

### Next.js Component Considerations

Before deploying, ensure your Next.js application is compatible with containerized deployment:

1. **Image Component - Use AgilityPic (Required)**:
   > **⚠️ IMPORTANT**: Do NOT use `next/image` for Agility CMS images. Use the `AgilityPic` component from `@agility/nextjs` instead. AgilityPic is a simple wrapper around the standard `<picture>` tag that automatically handles image optimization and caching through Agility's CDN at the Edge - and it doesn't require any JavaScript!

   **Use AgilityPic** (recommended - simplest option):
   ```jsx
   import { AgilityPic } from "@agility/nextjs";

   <AgilityPic
     src={fields.image.url}
     alt={fields.image.label}
     width={fields.image.width || 768}
     height={fields.image.height || 512}
     className="rounded-lg object-cover"
   />
   ```

   **Alternative: AgilityImage** (if you need Next.js Image features):
   ```jsx
   // AgilityImage is a wrapper around next/image - use only if you need next/image features
   import { AgilityImage } from "@agility/nextjs";
   <AgilityImage
     src={fields.image.url}
     alt={fields.image.label}
     width={768}
     height={512}
   />
   ```

   **❌ Do NOT use next/image directly**:
   ```jsx
   // ❌ Avoid - next/image adds unnecessary server-side processing
   import Image from 'next/image';
   <Image src={agilityImage.url} alt={agilityImage.label} />
   ```

2. **Next.js Link Component**:
   - If you're using Next.js 12 or earlier, remove the deprecated `as` prop from `next/link` components
   - Use only the `href` prop (Next.js 13+ removed the `as` prop)
   - Example:
     ```jsx
     // ❌ Old way (Next.js 12 and earlier)
     <Link href="/posts" as="/blog/posts">Posts</Link>

     // ✅ Correct way (all Next.js versions)
     <Link href="/posts">Posts</Link>
     ```

### Image Configuration for Agility CMS

> **⚠️ CRITICAL**: ALL image optimization and caching for Agility websites is handled at the Edge via Agility's CDN. You should **NOT** use `next/image` for Agility CMS images. Instead, use the `AgilityPic` component from `@agility/nextjs` - it's simpler and doesn't require JavaScript!

**Why AgilityPic instead of next/image?**

- ✅ **Simpler**: AgilityPic is a wrapper around the standard `<picture>` tag - no JavaScript required
- ✅ **Edge Optimization**: Leverages Agility's CDN for automatic image optimization at the Edge
- ✅ **Better Performance**: No server-side processing required - images are optimized and cached by Agility's CDN
- ✅ **Automatic Format Selection**: Automatically serves WebP, AVIF, or other optimized formats based on browser support
- ✅ **Responsive Images**: Built-in support for responsive image sizing via `<picture>` tag
- ✅ **No Configuration Needed**: Works out of the box with Agility CMS images

**Using AgilityPic (Recommended - Simplest Option):**

```jsx
import { AgilityPic } from "@agility/nextjs";

// Simple usage
<AgilityPic
  src={fields.image.url}
  alt={fields.image.label}
  width={fields.image.width || 768}
  height={fields.image.height || 512}
/>

// With styling
<AgilityPic
  src={fields.image.url}
  alt={fields.image.label}
  width={768}
  height={512}
  className="rounded-lg object-cover object-center"
/>
```

**Alternative: AgilityImage** (if you need Next.js Image component features):
```jsx
import { AgilityImage } from "@agility/nextjs";
// AgilityImage wraps next/image - use only if you need next/image specific features
<AgilityImage src={fields.image.url} alt={fields.image.label} width={768} height={512} />
```

**No next.config.js image configuration needed** - AgilityPic handles everything automatically through Agility's CDN.

### Configure Next.js for Standalone Output (Recommended)

For optimal container size and performance, enable standalone output:

```javascript
// next.config.js
module.exports = {
  output: 'standalone',
  // ... other config
}
```

This creates a minimal production build with only necessary files, reducing container size and improving startup time.

## Step 2: Create Dockerfile

Create a `Dockerfile` in the root of your Next.js project. Use a multi-stage build for optimal image size:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies based on package manager
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments for Agility CMS (optional, can use env vars instead)
ARG AGILITY_GUID
ARG AGILITY_API_FETCH_KEY
ARG AGILITY_API_PREVIEW_KEY
ARG AGILITY_SECURITY_KEY
ARG AGILITY_LOCALES

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
```

**Key points:**
- Uses Node.js 20 Alpine for smaller image size
- Multi-stage build separates dependencies, build, and runtime
- Creates non-root user for security
- Uses standalone output for minimal production image
- Exposes port 3000 (standard Next.js port)

### Alternative: Simple Dockerfile (If Not Using Standalone)

If you're not using standalone output, use this simpler version:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
```

**Note**: This simpler Dockerfile is easier to understand but produces a larger image. The multi-stage build above is recommended for production deployments.

## Step 3: Create Amazon ECR Repository

Amazon ECR (Elastic Container Registry) stores your Docker images securely.

### Using AWS CLI

1. **Authenticate Docker to ECR**:
   ```bash
   aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com
   ```

2. **Create ECR Repository**:
   ```bash
   aws ecr create-repository \
     --repository-name nextjs-agility-app \
     --region <your-region> \
     --image-scanning-configuration scanOnPush=true \
     --encryption-configuration encryptionType=AES256
   ```

3. **Note the repository URI** - You'll need this for pushing images and task definitions:
   ```
   <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/nextjs-agility-app
   ```

### Using AWS Console

1. Go to **Amazon ECR** in AWS Console
2. Click **"Create repository"**
3. Enter repository name: `nextjs-agility-app`
4. Enable **"Scan on push"** for security scanning
5. Click **"Create repository"**
6. Copy the repository URI

## Step 4: Build and Push Docker Image

### Build the Docker Image

```bash
# Build the image locally
docker build -t nextjs-agility-app:latest .

# Test locally (optional)
docker run -p 3000:3000 \
  -e AGILITY_GUID=<your-guid> \
  -e AGILITY_API_FETCH_KEY=<your-fetch-key> \
  -e AGILITY_API_PREVIEW_KEY=<your-preview-key> \
  -e AGILITY_SECURITY_KEY=<your-security-key> \
  -e AGILITY_LOCALES=en-us \
  nextjs-agility-app:latest
```

### Tag and Push to ECR

```bash
# Tag the image
docker tag nextjs-agility-app:latest \
  <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/nextjs-agility-app:latest

# Push to ECR
docker push <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/nextjs-agility-app:latest
```

## Step 5: Create ECS Cluster

### Option A: AWS Fargate (Recommended)

Fargate is serverless - you don't manage EC2 instances.

1. **Go to Amazon ECS Console**
2. **Click "Clusters"** → **"Create cluster"**
3. **Select "AWS Fargate"** (Networking only)
4. **Enter cluster name**: `nextjs-agility-cluster`
5. **Configure VPC** (or use default)
6. **Click "Create"**

### Option B: EC2 Launch Type

For more control over infrastructure:

1. **Go to Amazon ECS Console**
2. **Click "Clusters"** → **"Create cluster"**
3. **Select "EC2 Linux + Networking"**
4. **Enter cluster name**: `nextjs-agility-cluster`
5. **Configure EC2 instances**:
   - Instance type: `t3.medium` or larger (recommended)
   - Number of instances: 2 (for high availability)
   - Key pair: Select or create a key pair for SSH access
   - VPC: Select or create a VPC
   - Subnets: Select at least 2 subnets in different AZs
6. **Click "Create"**

## Step 6: Create Task Definition

A task definition describes your container configuration.

1. **Go to ECS Console** → **Task Definitions** → **"Create new Task Definition"**

2. **Select launch type**:
   - **Fargate** (recommended) or **EC2**

3. **Configure task definition**:
   - **Task definition family**: `nextjs-agility-task`
   - **Task role**: Create new or select existing (for AWS service access)
   - **Task execution role**: Create new or select existing (for ECR image pull)
   - **Network mode**: `awsvpc` (required for Fargate)
   - **Task size** (Fargate only):
     - CPU: `0.5 vCPU` (minimum) or `1 vCPU` (recommended)
     - Memory: `1 GB` (minimum) or `2 GB` (recommended)

4. **Add container**:
   - **Container name**: `nextjs-app`
   - **Image URI**: `<aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/nextjs-agility-app:latest`
   - **Port mappings**:
     - Container port: `3000`
     - Protocol: `TCP`
   - **Essential**: `Yes`

5. **Environment variables** (under "Environment"):
   ```
   AGILITY_GUID=<your-guid>
   AGILITY_API_FETCH_KEY=<your-fetch-key>
   AGILITY_API_PREVIEW_KEY=<your-preview-key>
   AGILITY_SECURITY_KEY=<your-security-key>
   AGILITY_LOCALES=en-us
   AGILITY_SITEMAP=website
   ```

   > **Note**: For production, consider using AWS Secrets Manager or Systems Manager Parameter Store instead of plain environment variables.

6. **Health check** (optional but recommended):
   - **Command**: `CMD-SHELL,curl -f http://localhost:3000/api/health || exit 1`
   - **Interval**: `30`
   - **Timeout**: `5`
   - **Start period**: `60`
   - **Retries**: `3`

7. **Logging** (optional):
   - **Log driver**: `awslogs`
   - **Log group**: `/ecs/nextjs-agility-app`
   - **Region**: Your region

8. **Click "Create"**

## Step 7: Create Application Load Balancer (ALB)

An ALB distributes traffic across your ECS tasks and handles SSL termination.

### Create Load Balancer

1. **Go to EC2 Console** → **Load Balancers** → **"Create Load Balancer"**
2. **Select "Application Load Balancer"**
3. **Configure**:
   - **Name**: `nextjs-agility-alb`
   - **Scheme**: `Internet-facing`
   - **IP address type**: `IPv4`
   - **VPC**: Select your VPC
   - **Availability Zones**: Select at least 2 AZs with public subnets
   - **Security group**: Create new or select existing
     - Allow inbound: HTTP (80) and HTTPS (443) from `0.0.0.0/0`

4. **Configure security settings**:
   - **Certificate**: Request or import SSL certificate from ACM (for HTTPS)
   - **Security policy**: `ELBSecurityPolicy-TLS-1-2-2017-01`

5. **Configure routing**:
   - **Target group**: Create new target group
     - Name: `nextjs-agility-tg`
     - Target type: `IP` (for Fargate) or `Instance` (for EC2)
     - Protocol: `HTTP`
     - Port: `3000`
     - Health check path: `/api/health` (or `/` if no health endpoint)
   - **Listener**: Port 80 → Target group `nextjs-agility-tg`
   - **Listener**: Port 443 → Target group `nextjs-agility-tg` (if using HTTPS)

6. **Click "Create"**

### Create Health Check Endpoint (Optional but Recommended)

Create a simple health check endpoint in your Next.js app:

```javascript
// pages/api/health.js or app/api/health/route.js
export default function handler(req, res) {
  res.status(200).json({ status: 'ok' });
}

// Or for App Router:
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' });
}
```

## Step 8: Create ECS Service

The ECS service maintains the desired number of running tasks.

1. **Go to your ECS Cluster** → **"Services"** tab → **"Create"**

2. **Configure service**:
   - **Launch type**: `Fargate` or `EC2` (match your task definition)
   - **Task definition**: Select `nextjs-agility-task`
   - **Service name**: `nextjs-agility-service`
   - **Desired tasks**: `2` (for high availability)
   - **Deployment configuration**: `Rolling update`

3. **Configure networking**:
   - **VPC**: Select your VPC
   - **Subnets**: Select at least 2 subnets in different AZs
   - **Security group**: Create new or select existing
     - Allow inbound: Port `3000` from ALB security group
     - Allow outbound: All traffic (for Agility CMS API calls)
   - **Auto-assign public IP**: `Enabled` (if tasks need internet access)

4. **Configure load balancing**:
   - **Load balancer type**: `Application Load Balancer`
   - **Load balancer name**: Select your ALB
   - **Target group**: Select `nextjs-agility-tg`
   - **Container to load balance**: `nextjs-app:3000`

5. **Configure auto-scaling** (optional):
   - **Auto Scaling**: Enable
   - **Min tasks**: `2`
   - **Max tasks**: `10`
   - **Target CPU**: `70%`
   - **Target memory**: `80%`

6. **Click "Create"**

## Step 9: Access Your Application

### Access via Application Load Balancer (Recommended)

1. **Get ALB DNS name** from Load Balancer details in EC2 Console
2. **Access your application**:
   - HTTP: `http://<alb-dns-name>.elb.amazonaws.com`
   - HTTPS: `https://<alb-dns-name>.elb.amazonaws.com` (if SSL configured)

### Access EC2 Instances Directly (EC2 Launch Type Only)

If you're using EC2 launch type and want to access instances directly (useful for testing):

1. **Go to EC2 Console** → **Instances**
2. **Find your running instances** (they'll be part of your ECS cluster)
3. **Click on an instance** to view details
4. **Copy the Public IPv4 DNS** (e.g., `ec2-xx-xx-xx-xx.compute-1.amazonaws.com`)
5. **Access your application**:
   - `http://<public-ipv4-dns>:3000` (Note: Use HTTP, not HTTPS, for direct instance access)
   - If the site doesn't load, try changing the URL from `https` to `http`

**Important**: Direct instance access bypasses the load balancer and should only be used for testing. For production, always use the ALB DNS name.

## Step 10: Configure DNS and SSL

### Point Domain to Load Balancer

1. **Get ALB DNS name** from Load Balancer details
2. **Create CNAME record** in your DNS provider:
   - Name: `www` (or `@` for root domain)
   - Value: `<alb-dns-name>.elb.amazonaws.com`
   - TTL: `300`

### SSL Certificate (If Not Already Configured)

1. **Request certificate in ACM**:
   - Go to **AWS Certificate Manager**
   - Request public certificate
   - Domain: `example.com` and `*.example.com`
   - Validation: DNS or Email

2. **Update ALB listener**:
   - Go to ALB → Listeners → Edit HTTPS listener
   - Select certificate from ACM
   - Save

## Step 11: Set Up CI/CD (Optional)

Automate deployments using GitHub Actions or AWS CodePipeline.

### GitHub Actions Example

Create `.github/workflows/deploy-ecs.yml`:

```yaml
name: Deploy to ECS

on:
  push:
    branches: [ main ]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: nextjs-agility-app
  ECS_SERVICE: nextjs-agility-service
  ECS_CLUSTER: nextjs-agility-cluster
  ECS_TASK_DEFINITION: nextjs-agility-task

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment: production

    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build, tag, and push image to Amazon ECR
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

    - name: Download task definition
      run: |
        aws ecs describe-task-definition \
          --task-definition ${{ env.ECS_TASK_DEFINITION }} \
          --query taskDefinition > task-definition.json

    - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: task-definition.json
        container-name: nextjs-app
        image: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}

    - name: Deploy Amazon ECS task definition
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.task-def.outputs.task-definition }}
        service: ${{ env.ECS_SERVICE }}
        cluster: ${{ env.ECS_CLUSTER }}
        wait-for-service-stability: true
```

## Environment Variables Reference

Here's a complete reference for Agility CMS environment variables needed in ECS:

### Required Variables

```
AGILITY_GUID=xxx
```
Your Agility CMS instance GUID. Found in **Settings > API Keys** in Agility CMS.

```
AGILITY_API_FETCH_KEY=xxx
```
Your Live API Key for fetching published content. Found in **Settings > API Keys** in Agility CMS.

```
AGILITY_API_PREVIEW_KEY=xxx
```
Your Preview API Key for fetching draft content. Found in **Settings > API Keys** in Agility CMS.

```
AGILITY_SECURITY_KEY=xxx
```
Your Security Key for webhook authentication. Found in **Settings > API Keys** in Agility CMS.

```
AGILITY_LOCALES=en-us
```
Comma-separated list of locale codes (without spaces). Examples:
- Single locale: `en-us`
- Multiple locales: `en-us,fr-ca,es-es`

### Optional Variables

```
AGILITY_SITEMAP=website
```
The sitemap reference name if you have multiple sitemaps. Defaults to `website` if not specified.

### Secure Storage Options

For production, consider storing sensitive values in:

1. **AWS Secrets Manager**:
   ```bash
   aws secretsmanager create-secret \
     --name agility-cms-credentials \
     --secret-string '{"GUID":"xxx","API_FETCH_KEY":"xxx","API_PREVIEW_KEY":"xxx","SECURITY_KEY":"xxx"}'
   ```

   Then reference in task definition:
   ```json
   {
     "secrets": [
       {
         "name": "AGILITY_GUID",
         "valueFrom": "arn:aws:secretsmanager:region:account:secret:agility-cms-credentials:GUID::"
       }
     ]
   }
   ```

2. **Systems Manager Parameter Store**:
   ```bash
   aws ssm put-parameter \
     --name /agility/guid \
     --value "xxx" \
     --type "SecureString"
   ```

## Troubleshooting

### Container Issues

**Issue**: Container fails to start

**Solution**:
- Check CloudWatch logs: ECS Service → Logs tab
- Verify environment variables are set correctly
- Ensure port 3000 is exposed and mapped correctly
- Check task definition has sufficient CPU/memory

**Issue**: Health checks failing

**Solution**:
- Verify health check endpoint exists (`/api/health`)
- Check security group allows traffic from ALB
- Ensure container is listening on `0.0.0.0:3000` (not `localhost:3000`)
- Increase health check grace period if container takes time to start

**Issue**: Cannot pull image from ECR

**Solution**:
- Verify task execution role has `AmazonEC2ContainerRegistryReadOnly` policy
- Check ECR repository exists and image is pushed
- Verify image tag matches task definition

### Networking Issues

**Issue**: Cannot access application via ALB

**Solution**:
- Verify ALB security group allows inbound HTTP/HTTPS
- Check ECS service security group allows inbound from ALB security group
- Ensure tasks are running in subnets with internet access (for Fargate)
- Verify target group health checks are passing

**Issue**: Application cannot reach Agility CMS API

**Solution**:
- Ensure ECS task security group allows outbound HTTPS (port 443)
- Verify NAT Gateway exists if using private subnets
- Check VPC route tables are configured correctly

### Performance Issues

**Issue**: Slow response times

**Solution**:
- Increase task CPU/memory allocation
- Enable auto-scaling to handle traffic spikes
- Use CloudFront CDN in front of ALB for static assets
- Enable connection draining on ALB

**Issue**: High costs

**Solution**:
- Use Fargate Spot for non-production workloads (up to 70% savings)
- Right-size task CPU/memory based on actual usage
- Enable auto-scaling to scale down during low traffic
- Use reserved capacity for predictable workloads

## Previews

AWS ECS does not natively support preview deployments like some other platforms. However, you can set up preview environments:

### Option 1: Separate ECS Service for Previews

1. Create a separate ECS service: `nextjs-agility-service-preview`
2. Use preview environment variables (`AGILITY_API_PREVIEW_KEY`)
3. Deploy to a separate ALB or use path-based routing
4. Scale down to 0 tasks when not in use to save costs

### Option 2: Development Mode Container for Staging

For staging/preview environments, you can run a container in development mode that fetches staging content from Agility CMS:

1. **Create a separate task definition** with:
   - Environment variable: `AGILITY_API_PREVIEW_KEY` (for staging content)
   - Command override: `["npm", "run", "dev"]` instead of `["npm", "run", "start"]`
   - This runs your site in development mode and fetches staging/preview content

2. **Deploy to a separate ECS service** or run as a one-off task

3. **Access via ALB** or directly via EC2 instance (for testing)

**Note**: Development mode containers are useful for previewing draft content but consume more resources. Scale them down when not in use.

### Option 3: Use AWS Amplify for Previews

Use AWS Amplify for preview deployments (which supports PR previews) and ECS for production. This provides the best of both worlds - managed previews with Amplify and full control with ECS for production.

### Option 4: Manual Preview Deployments

1. Create a separate task definition with preview environment variables
2. Run tasks manually or via CI/CD for specific branches
3. Access via ALB with path-based routing or separate ALB

## Security Best Practices

### 1. Use IAM Roles

- **Task Role**: For application access to AWS services
- **Task Execution Role**: For ECR image pull and CloudWatch logs
- Follow principle of least privilege

### 2. Secure Environment Variables

- Use AWS Secrets Manager or Parameter Store for sensitive values
- Never commit credentials to Git
- Rotate API keys regularly in Agility CMS

### 3. Network Security

- Use private subnets for ECS tasks when possible
- Restrict security group rules to minimum required
- Use VPC endpoints for AWS service access (reduces internet exposure)

### 4. Container Security

- Use non-root user in Dockerfile (already included in example)
- Regularly update base images
- Scan images with ECR image scanning
- Use minimal base images (Alpine Linux)

### 5. Enable Logging and Monitoring

- Enable CloudWatch Container Insights
- Set up CloudWatch alarms for errors
- Monitor task CPU and memory usage
- Enable VPC Flow Logs for network monitoring

## Cost Optimization

### Fargate Pricing

- **vCPU**: ~$0.04048 per vCPU-hour
- **Memory**: ~$0.004445 per GB-hour
- Example: 1 vCPU, 2 GB = ~$0.05/hour = ~$36/month (if running 24/7)

### Cost-Saving Tips

1. **Use Fargate Spot** (up to 70% savings) for non-production
2. **Right-size resources** based on actual usage
3. **Enable auto-scaling** to scale down during low traffic
4. **Use reserved capacity** for predictable workloads
5. **Monitor costs** with AWS Cost Explorer

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Next.js Deployment Documentation](https://nextjs.org/docs/app/getting-started/deploying)
- [Agility CMS + Next.js Guide](https://agilitycms.com/docs/nextjs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Quick Reference

### Essential Commands

```bash
# Build and push Docker image
docker build -t nextjs-agility-app:latest .
docker tag nextjs-agility-app:latest <ecr-uri>:latest
docker push <ecr-uri>:latest

# Update ECS service (forces new deployment)
aws ecs update-service \
  --cluster nextjs-agility-cluster \
  --service nextjs-agility-service \
  --force-new-deployment

# View running tasks
aws ecs list-tasks --cluster nextjs-agility-cluster

# View logs
aws logs tail /ecs/nextjs-agility-app --follow
```

### Key URLs

- **AWS ECS Console**: https://console.aws.amazon.com/ecs
- **Amazon ECR Console**: https://console.aws.amazon.com/ecr
- **Agility CMS Manager**: https://manager.agilitycms.com
- **Agility CMS API Keys**: https://manager.agilitycms.com/settings/apikeys

---

This guide covers deploying Next.js applications with Agility CMS to AWS ECS. For platform-specific questions, refer to the [AWS ECS documentation](https://docs.aws.amazon.com/ecs/) or [Agility CMS support](https://agilitycms.com/support).
