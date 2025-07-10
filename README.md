# Stellantis Frontend

## Overview

This is the frontend application for the Stellantis project, built with Next.js and the T3 Stack.

## Prerequisites

*   Node.js
*   A package manager like `npm`.

## Environment Variables

To run this project, you will need to create a `.env.local` file in the root of the directory and add the following environment variables.

**Clerk Authentication**
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="YOUR_CLERK_PUBLISHABLE_KEY"
- CLERK_SECRET_KEY="YOUR_CLERK_SECRET_KEY"

**Clerk Redirects**
- NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
- NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
- NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
- NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/sync-user
- NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/dashboard"
- NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/dashboard"

**Supabase Database**
- NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
- NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
- DATABASE_URL="YOUR_SUPABASE_DATABASE_URL"
- DIRECT_URL="YOUR_SUPABASE_DIRECT_URL"

**Backend API**
- NEXT_PUBLIC_FLASK_API_URL="http://127.0.0.1:4001"


## Getting Started

1.  **Clone the Repository**
    ```
    git clone https://github.com/Haabeel/stellantis-frontend
    cd stellantis-frontend
    ```

2.  **Install Dependencies**
    Use your preferred package manager to install the project dependencies.
    ```
    npm install
    ```

3.  **Run the Development Server**
    Start the local development server.
    ```
    npm run dev
    ```
    Open [http://localhost:4000](http://localhost:4000) with your browser to see the result.

## Deployment

The T3 Stack is designed for easy deployment to modern hosting platforms. The recommended and easiest way to deploy this application is to use **Vercel**.

Check out the official [T3 Stack deployment documentation](https://create.t3.gg/en/deployment/vercel) for a complete guide on deploying with Vercel. Guides for other platforms like Netlify and Docker are also available in the T3 Stack documentation.