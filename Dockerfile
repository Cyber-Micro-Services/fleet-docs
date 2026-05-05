# Used for production

FROM node:20.19-alpine3.23 as node

WORKDIR /usr/src/app

COPY package.json .

COPY package-lock.json .

RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_API_URL="https://fleet-docs.cybermicroservices.com/api"

RUN npm run build

CMD ["npm", "run", "start"]