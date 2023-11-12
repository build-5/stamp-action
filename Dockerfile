FROM node:18

WORKDIR /action/workspace

COPY ./ ./

RUN npm install
RUN npm run build
RUN ls -la ./lib

CMD [ "node" , "./lib/index.js"]
