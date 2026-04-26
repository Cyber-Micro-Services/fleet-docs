# Used for production

FROM node:20.19-alpine3.23 as node

WORKDIR /usr/src/app

COPY package.json .

COPY package-lock.json .

RUN npm ci

COPY . .

RUN npm run build

CMD ["npm", "run", "start"]