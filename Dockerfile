FROM node:22-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY server/ .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
