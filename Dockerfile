# Used for production

FROM node:18.20-alpine3.20 as node

WORKDIR /usr/src/app

COPY package.json .

COPY package-lock.json .

RUN npm ci

COPY . .

RUN npm run build

CMD ["npm", "run", "start"]