FROM node:26.8.2-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run typecheck && npm test && npm run build

FROM node:26.8.2-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/data ./data

USER node
EXPOSE 3100
CMD ["node", "dist/server.js"]
