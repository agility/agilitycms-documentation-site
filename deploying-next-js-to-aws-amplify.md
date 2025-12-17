# Deploying Next.js to AWS Amplify

This guide covers deploying your Next.js website built with Agility CMS to AWS Amplify Hosting. AWS Amplify supports both Static Site Generation (SSG) and Server-Side Rendering (SSR) for Next.js applications.

## Overview

AWS Amplify Hosting provides a fully managed hosting service for Next.js applications with built-in CI/CD, global CDN, and support for both static and dynamic Next.js features.

### Benefits of Deploying to AWS Amplify

- ✅ **Full Next.js Feature Support** - Supports Static Site Generation (SSG), Server-Side Rendering (SSR), Incremental Static Regeneration (ISR), and React Server Components
- ✅ **Preview Mode** - Full support for Agility CMS preview mode to review draft content before publishing
- ✅ **Automatic Deployments** - Seamless GitHub, GitLab, Bitbucket, and AWS CodeCommit integration
- ✅ **Global CDN** - Built-in CloudFront CDN for fast global performance
- ✅ **Pull Request Previews** - Automatic preview deployments for pull requests
- ✅ **Environment Variables** - Secure management of Agility CMS credentials
- ✅ **Webhooks** - Automatic rebuilds when content is published in Agility CMS
- ✅ **Cost-Effective** - Pay only for what you use with no upfront costs

### Starting Point

Most developers deploying Agility CMS websites to AWS Amplify will be starting from an existing Next.js project:

- **Agility CMS Next.js Starter** - [https://github.com/agility/agilitycms-nextjs-starter](https://github.com/agility/agilitycms-nextjs-starter) - Production-ready starter with App Router, TypeScript, and Tailwind CSS
- **Agility CMS Comprehensive Demo** - [https://github.com/agility/nextjs-demo-site-2025](https://github.com/agility/nextjs-demo-site-2025) - Full-featured demo with AI search, internationalization, and advanced features
- **Your Own Agility Next.js Site** - Existing project already integrated with Agility CMS

These starters already include proper Next.js configuration, Agility CMS integration, and the necessary build scripts. You'll still need to configure your environment variables, but you won't need to set up Next.js from scratch or configure Agility CMS integration manually.

## Prerequisites

Before you begin, ensure you have:

1. **AWS Account** - Sign up at [aws.amazon.com](https://aws.amazon.com) if you don't have one
2. **GitHub/GitLab/Bitbucket Account** - Your Next.js project must be in a Git repository
3. **Agility CMS Instance** - With API credentials (see below if you need to set one up)
4. **Node.js 18.x or later** - For local development and testing

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

You'll need these credentials for both local development and AWS Amplify deployment configuration.

## Deployment Options

AWS Amplify supports two deployment modes for Next.js:

### Option 1: Static Export (SSG Only)

For fully static sites using Static Site Generation only. This is the simplest deployment option but has limitations.

**Supported Features:**
- ✅ Static Site Generation (SSG)
- ✅ Pre-rendered pages at build time
- ✅ Image optimization (Note: For Agility CMS websites, ALL image optimization is handled at the Edge via Agility's CDN)

**Limitations:**
- ❌ No Server-Side Rendering (SSR)
- ❌ No API Routes
- ❌ No Incremental Static Regeneration (ISR)
- ❌ No React Server Components

### Option 2: Managed Next.js Hosting (Recommended)

AWS Amplify's managed Next.js hosting supports all Next.js features including SSR, API routes, and ISR.

**Supported Features:**
- ✅ Static Site Generation (SSG)
- ✅ Server-Side Rendering (SSR)
- ✅ React Server Components
- ✅ API Routes
- ✅ Incremental Static Regeneration (ISR)
- ✅ Image Optimization (Note: For Agility CMS websites, ALL image optimization is handled at the Edge via Agility's CDN, so server-side image optimization is not needed)

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

**Note**: The Agility CMS Next.js starters already include proper Next.js configuration for AWS Amplify deployment, including image optimization settings that work with Agility's Edge CDN.

### Configure Next.js for Amplify (If Using Static Export)

> **Important**: Only follow this step if you're deploying as a fully static site. If you're using managed Next.js hosting (recommended), skip this section.

If you're deploying your Next.js site as a fully static site, you need to make a few changes:

1. **Update the build script** in your `package.json`:
   ```json
   {
     "scripts": {
       "build": "next build && next export"
     }
   }
   ```

2. **Replace `next/image` components** with `AgilityPic` from `@agility/nextjs`:
   ```jsx
   // ❌ Do NOT use next/image
   import Image from 'next/image'
   <Image src={image.url} alt={image.label} width={image.width} height={image.height} />

   // ✅ Use AgilityPic instead (recommended - simplest option)
   import { AgilityPic } from "@agility/nextjs";
   <AgilityPic
     src={image.url}
     alt={image.label}
     width={image.width}
     height={image.height}
   />

   // Alternative: Use AgilityImage if you need next/image features
   import { AgilityImage } from "@agility/nextjs";
   <AgilityImage src={image.url} alt={image.label} width={image.width} height={image.height} />
   ```

   > **Important for Agility CMS**: Use `AgilityPic` from `@agility/nextjs` for all Agility CMS images. AgilityPic is a simple wrapper around the `<picture>` tag that automatically handles optimization and caching at the Edge via Agility's CDN - and it doesn't require JavaScript! This provides better performance than `next/image`.

3. **Update `getStaticPaths` fallback** in `/pages/[...slug].js`:
   ```javascript
   export async function getStaticPaths() {
     return {
       paths: [],
       fallback: false // Changed from 'blocking' or true
     }
   }
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

## Step 2: Connect Your Repository to AWS Amplify

1. **Open AWS Amplify Console**:
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
   - Sign in with your AWS account

2. **Create a New App**:
   - Click **"New app"** → **"Host web app"**
   - Choose your Git provider (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
   - Authorize AWS Amplify to access your Git account (for GitHub, this uses GitHub Apps)

3. **Select Repository and Branch**:
   - Select the repository containing your Next.js project
   - Choose the branch you want to deploy (typically `main` or `master`)
   - Click **"Next"**

## Step 3: Configure Build Settings

AWS Amplify will auto-detect Next.js and configure build settings automatically. Review and confirm:

### Build Settings

- **Build command**: `npm run build` (or `yarn build`)
- **Output directory**: `.next` (for managed Next.js hosting) or `out` (for static export)

### Advanced Build Settings

Click **"Advanced settings"** to configure:

1. **Environment Variables** - Add your Agility CMS credentials:
   ```
   AGILITY_GUID=xxx
   AGILITY_API_FETCH_KEY=xxx
   AGILITY_API_PREVIEW_KEY=xxx
   AGILITY_SECURITY_KEY=xxx
   AGILITY_LOCALES=en-us
   ```

   > **Note**: If you have multiple locales, comma-separate them without spaces (e.g., `en-us,fr-ca`)

2. **Build Image Settings** (if needed):
   - Node.js version: `18.x` or later
   - Build image: Use the default Amplify build image

3. **Caching** (optional):
   - Enable caching for `node_modules` and `.next` directories to speed up builds

### Service Role

- Choose **"Create and use a new service role"** (recommended for first-time setup)
- Or select an existing service role if you have one

Click **"Save and deploy"** to start your first deployment.

## Step 4: Monitor Your Deployment

AWS Amplify will:

1. **Provision** - Set up hosting infrastructure
2. **Build** - Run your build command and create the Next.js application
3. **Deploy** - Deploy your application to the global CDN
4. **Verify** - Run health checks to ensure deployment succeeded

The initial deployment typically takes 3-5 minutes. You can monitor progress in the Amplify console.

Once deployment completes, AWS Amplify will provide you with a default domain:
- Format: `https://<branch-name>.<app-id>.amplifyapp.com`
- Example: `https://main.d1m7bkiki6tdw1.amplifyapp.com`

## Step 5: Set Up Preview Deployments

Preview deployments allow you to preview changes before merging pull requests or publishing content.

### Enable Pull Request Previews

1. In AWS Amplify Console, go to **"App settings"** → **"Previews"**
2. Click **"Enable preview"**
3. **Install the GitHub App** (if using GitHub) - This allows Amplify to create preview deployments automatically
4. Select your branch and click **"Manage"**
5. Enable **"Pull request previews"**

### Configure Preview in Agility CMS

Once AWS Amplify provides preview URLs, configure them in Agility CMS:

1. **Get Preview URL** from AWS Amplify:
   - Go to your app → **"Previews"** tab
   - Copy the preview URL format (e.g., `https://pr-123.<app-id>.amplifyapp.com`)

2. **Set Up Preview Deployment in Agility**:
   - Go to **Settings > Sitemap > Setup Deployment > Custom Deployment**
   - Give your deployment a name (e.g., "AWS Amplify Preview")
   - Enter the Preview URL pattern from AWS Amplify
   - Set it as your **Preview Deployment**

Now, when you create a pull request, AWS Amplify will automatically create a preview deployment, and you can preview your Agility CMS content changes in that preview environment.

## Step 6: Set Up Webhooks for Automatic Rebuilds

You can configure AWS Amplify to automatically rebuild your site when content is published in Agility CMS.

### Create a Webhook in AWS Amplify

1. In AWS Amplify Console, go to **"App settings"** → **"Build settings"**
2. Scroll down to **"Webhooks"** section
3. Click **"Create webhook"**
4. Give your webhook a name (e.g., "Agility CMS Production")
5. Select the branch you want to rebuild (typically `main` or `master`)
6. Click **"Save"** and copy the webhook URL that AWS generates

### Configure Webhook in Agility CMS

1. In Agility CMS, go to **Settings > Webhooks**
2. Click **"Add webhook"**
3. Give your webhook a name (e.g., "AWS Amplify Production")
4. Paste the webhook URL from AWS Amplify

5. **Configure webhook events**:
   - **For Production builds**: Check **"Receive Content Publish Events"** (uncheck "Receive Content Save Events")
   - **For Preview builds**: Uncheck **"Receive Content Publish Events"** and check **"Receive Content Save Events"**

6. Click **"Save"**

7. **Test the webhook** by clicking **"Send test payload"** to verify the connection

Now, whenever you publish content in Agility CMS, AWS Amplify will automatically rebuild and redeploy your site.

## Step 7: Configure Custom Domain (Optional)

AWS Amplify provides a default `amplifyapp.com` domain, but you can connect your own custom domain.

1. In AWS Amplify Console, go to **"App settings"** → **"Domain management"**
2. Click **"Add domain"**
3. Enter your domain name (e.g., `example.com`)
4. Follow the DNS configuration instructions:
   - Add CNAME records to your DNS provider
   - AWS Amplify will provide the exact values to use
5. Wait for DNS propagation (can take up to 48 hours, usually much faster)
6. Once verified, AWS Amplify will automatically provision an SSL certificate via AWS Certificate Manager

## Environment Variables Reference

Here's a complete reference for Agility CMS environment variables needed in AWS Amplify:

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

### Where to Set Environment Variables

Set environment variables in **two places**:

1. **AWS Amplify Console** → **App settings** → **Environment variables**:
   - These are used at **build time** and **runtime**
   - Set all Agility CMS variables here

2. **GitHub Secrets** (if using GitHub Actions or custom build scripts):
   - Go to your repository → **Settings** → **Secrets and variables** → **Actions**
   - Add secrets for CI/CD workflows if needed

## Troubleshooting

### Build Failures

**Issue**: Build fails with "Invalid API Key" or "Instance not found"

**Solution**:
- Verify your `AGILITY_GUID` and API keys are correct in AWS Amplify environment variables
- Ensure there are no extra spaces or quotes around the values
- Test your credentials locally by running `npm run build` with the same environment variables

**Issue**: Build fails with "Cannot find module" errors

**Solution**:
- Ensure `package.json` has all required dependencies
- Check that `node_modules` is not in `.gitignore` (or ensure dependencies are installed during build)
- Verify your Node.js version is 18.x or later in Amplify build settings

**Issue**: Build timeout

**Solution**:
- Enable caching for `node_modules` in Amplify build settings
- Consider using `output: 'standalone'` in `next.config.js` to reduce build size
- Check for large dependencies that might be slowing down the build

### Deployment Issues

**Issue**: Site shows 404 errors for dynamic routes

**Solution**:
- If using static export, ensure all routes are pre-rendered at build time
- If using managed Next.js hosting, verify your routing configuration in `next.config.js`
- Check that `getStaticPaths` returns all necessary paths

**Issue**: Images not loading

**Solution**:
- Verify image URLs from Agility CMS are accessible
- **Use AgilityPic component** instead of `next/image` - AgilityPic handles all image optimization automatically
- For static export, ensure you've replaced `next/image` with `AgilityPic` from `@agility/nextjs` (or `AgilityImage` if you need next/image features)
- Check that `@agility/nextjs` package is installed and AgilityPic is imported correctly

**Issue**: Preview mode not working

**Solution**:
- Verify `AGILITY_API_PREVIEW_KEY` is set correctly in environment variables
- Check that preview URL is configured correctly in Agility CMS
- Ensure your preview deployment URL matches the pattern in Agility CMS settings

### Webhook Issues

**Issue**: Webhooks not triggering rebuilds

**Solution**:
- Verify webhook URL is correct in Agility CMS
- Test the webhook by sending a test payload from Agility CMS
- Check AWS Amplify build logs to see if webhook requests are being received
- Verify webhook event types are configured correctly (Publish events for production, Save events for preview)

## Performance Optimization

### Enable Caching

In AWS Amplify build settings, enable caching for:
- `node_modules` directory
- `.next` directory (if not using standalone output)

This significantly speeds up subsequent builds.

### Use Standalone Output (Optional)

For smaller deployment sizes, enable standalone output in `next.config.js`:

```javascript
module.exports = {
  output: 'standalone',
}
```

This creates a minimal production build with only necessary files.

### Image Optimization

> **⚠️ CRITICAL for Agility CMS**: ALL image optimization for Agility websites is done at the Edge (via Agility's CDN). **Do NOT use `next/image`**. Use the `AgilityPic` component from `@agility/nextjs` instead - it's simpler and doesn't require JavaScript!

**Use AgilityPic - No Configuration Needed:**

```jsx
import { AgilityPic } from "@agility/nextjs";

<AgilityPic
  src={fields.image.url}
  alt={fields.image.label}
  width={768}
  height={512}
/>
```

AgilityPic automatically:
- Optimizes images at the Edge via Agility's CDN
- Serves WebP, AVIF, or other optimized formats based on browser support
- Handles responsive image sizing via `<picture>` tag
- Caches images efficiently
- No JavaScript required - it's a simple wrapper around the `<picture>` tag

**No `next.config.js` image configuration needed** - AgilityPic handles everything automatically.

## Security Best Practices

### Secure Environment Variables

- Never commit environment variables to your Git repository
- Use AWS Amplify's environment variable management (not hardcoded values)
- Rotate API keys regularly in Agility CMS
- Use different API keys for different environments (production, staging, preview)

### Enable HTTPS

AWS Amplify automatically provisions SSL certificates for all domains (including custom domains) via AWS Certificate Manager. Ensure HTTPS is enforced:

1. Go to **App settings** → **Domain management**
2. Verify SSL certificate status shows "Available"
3. HTTPS is automatically enabled for all Amplify deployments

### Webhook Security

- Keep your `AGILITY_SECURITY_KEY` secret and secure
- Use different security keys for different environments
- Verify webhook payloads in your application if implementing custom webhook handlers

## Cost Considerations

AWS Amplify Hosting pricing:

- **Build minutes**: First 1,000 minutes/month are free, then $0.01 per minute
- **Hosting**: Free tier includes 15 GB storage and 100 GB data transfer/month
- **Custom domains**: Free SSL certificates via AWS Certificate Manager
- **Additional data transfer**: $0.15 per GB after free tier

For most small to medium sites, AWS Amplify hosting costs are minimal or free within the free tier limits.

## Additional Resources

- [AWS Amplify Hosting Documentation](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)
- [Next.js Deployment Documentation](https://nextjs.org/docs/app/getting-started/deploying)
- [Agility CMS + Next.js Guide](https://agilitycms.com/docs/nextjs)
- [AWS Amplify Next.js Quickstart](https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/)

## Quick Reference

### Essential Commands

```bash
# Local development
npm run dev

# Build locally (test before deploying)
npm run build

# Start production server locally
npm run start
```

### Key URLs

- **AWS Amplify Console**: https://console.aws.amazon.com/amplify
- **Agility CMS Manager**: https://manager.agilitycms.com
- **Agility CMS API Keys**: https://manager.agilitycms.com/settings/apikeys
- **Agility CMS Webhooks**: https://manager.agilitycms.com/settings/webhooks

---

This guide covers deploying Next.js applications with Agility CMS to AWS Amplify. For platform-specific questions, refer to the [AWS Amplify documentation](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html) or [Agility CMS support](https://agilitycms.com/support).
