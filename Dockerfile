FROM node:18

WORKDIR /action/workspace

COPY ./ ./

RUN npm install
RUN npm run build

CMD [ "node" , "/action/workspace/lib/index.js"]
