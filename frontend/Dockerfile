FROM node:22-alpine

WORKDIR /app

COPY package.json .

COPY . .

RUN yarn install

EXPOSE 5173

CMD ["yarn", "dev"]