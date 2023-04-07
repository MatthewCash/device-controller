FROM node:16-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src src
COPY tsconfig.json .
RUN npx tsc

FROM gcr.io/distroless/nodejs:16
COPY --from=build /app /app
WORKDIR /app

CMD ["--use-openssl-ca", "src/main.js"]
