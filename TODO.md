# TODO: Fix Vercel Runtime Timeout Error

## Issue Analysis
The GET requests to `/` and `/favicon.ico` are timing out after 300 seconds on Vercel.

## Root Causes Identified
1. The root endpoint `/` in index.js uses a simple callback that might not work well with serverless-http
2. The serverless-http wrapper might have initialization issues with the Express app
3. Missing proper Vercel configuration for function timeouts and rewrites
4. Possible cold start issues with database connections

## Plan

### Step 1: Update vercel.json ✅
- Add proper function configuration with increased timeout
- Add runtime specification (nodejs20.x)
- Ensure proper headers are set

### Step 2: Update src/index.js ✅
- Add async error handling wrapper for serverless handler
- Fix the serverless export to handle async operations properly
- Add health check endpoint
- Add Cache-Control headers for optimization

### Step 3: Update root package.json ✅
- Add build script and engines configuration
- Ensure proper Node.js version requirement

## Completed Files
1. `vercel.json` - Added function config, runtime, and headers
2. `src/index.js` - Fixed async handling, added health endpoint, improved serverless wrapper
3. `package.json` - Added engines and build script

## Next Steps
1. Deploy to Vercel and test the `/` endpoint
2. Monitor logs for any remaining timeout issues
3. Consider adding response timeout handling if needed

