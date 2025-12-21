# Vercel Deployment Guide

## Overview
This repository is fully configured for Vercel deployment with the frontend located in the `frontend/` directory.

## Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository connected to Vercel

## Deployment Configuration

### 1. Repository Structure
```
windsurf-project-2/
├── frontend/          # Frontend React app
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/           # Backend API (deployed separately on Render)
└── vercel.json       # Vercel configuration
```

### 2. Vercel Settings
In your Vercel project dashboard, configure:

**Build & Development Settings:**
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Install Command**: `npm install`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: `18.x` or higher

### 3. Environment Variables
Add these environment variables in Vercel (Settings → Environment Variables):

**Production & Preview:**
```
VITE_API_BASE_URL=https://dgds-test.onrender.com
```

**Optional (for local development):**
```
VITE_API_BASE_URL_LOCAL=http://localhost:2060
```

### 4. SPA Routing
The `vercel.json` file at the root handles Single Page Application routing:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

This ensures all routes serve the main `index.html` file, allowing React Router to handle navigation.

## Deployment Steps

### First-time Setup
1. Connect your GitHub repository to Vercel
2. Import the project
3. Configure the Root Directory to `frontend`
4. Set environment variables
5. Deploy

### Subsequent Deployments
- Push to `main` branch → Automatic deployment
- Or use Vercel CLI: `vercel --prod`

## Build Process
1. Vercel installs dependencies from `frontend/package.json`
2. Runs `npm run build` which creates `frontend/dist`
3. Serves static files from `dist`
4. API requests go to the Render backend at `VITE_API_BASE_URL`

## Troubleshooting

### 404 Errors on Refresh
- Ensure `vercel.json` exists with the rewrite rule
- Verify Root Directory is set to `frontend`

### API Connection Issues
- Check `VITE_API_BASE_URL` environment variable
- Verify CORS settings on the Render backend include your Vercel domain

### Build Failures
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

## Post-Deployment
1. Visit your Vercel URL
2. Check the API status badge on the landing page
3. Test login/registration functionality
4. Verify all routes work correctly

## Backend Deployment
The backend should be deployed separately on Render with:
- Root Directory: `backend`
- Dockerfile configuration
- Environment variables: `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`
