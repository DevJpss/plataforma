FROM node:20-alpine

RUN apk add --no-cache python3 make g++ ffmpeg

WORKDIR /app

COPY package*.json ./

RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
