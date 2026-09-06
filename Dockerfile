# Uniiku SEM/SEO MCP
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY config ./config
COPY src ./src
RUN npm install
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV WRITE_ENABLED=false
ENV CONTRACT_PATH=/app/config/sem-seo.contract.yaml
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
RUN npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/config ./config
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
