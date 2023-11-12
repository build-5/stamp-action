FROM node:18

WORKDIR /action/workspace

COPY ./ ./

RUN npm install
RUN npm run build
RUN ls -la
RUN ls -la /github/workspace

