FROM node:18

WORKDIR /action/workspace

COPY ./ ./

RUN npm install
RUN npm run build
RUN npm run asd

CMD [ "node" , "./lib/index.js"]
