FROM node:23-alpine

WORKDIR /app

COPY package*.json ./

RUN apk update && apk add --no-cache \
      chromium \
      nss \
      freetype \
      freetype-dev \
      harfbuzz \
      ca-certificates \
      ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "start"]