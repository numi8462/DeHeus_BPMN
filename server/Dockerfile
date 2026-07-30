FROM node:16

WORKDIR /server

COPY package*.json ./

COPY . .

# EXPOSE 3001
EXPOSE 443

RUN npm install

CMD ["npm", "run", "start"]