# Use an official Node image
FROM node:18-alpine AS deps

WORKDIR /app

COPY .npmrc ./
COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

# Rebuild for development with live-reload (you can switch to production build if you prefer)
FROM node:18-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
# Copy deps from first stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Expose Next’s default dev port
EXPOSE 3000
CMD ["npm", "run", "dev"]
