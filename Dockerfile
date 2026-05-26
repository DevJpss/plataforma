FROM node:20-alpine

RUN apk add --no-cache python3 make g++ ffmpeg

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm ci --production

COPY . .

RUN cd client && npm ci && npm run build && rm -rf node_modules

EXPOSE 3000

CMD ["npm", "start"]
