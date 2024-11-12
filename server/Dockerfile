FROM node:16

WORKDIR /server

COPY package*.json ./

COPY . .

COPY ./key.pem /etc/ssl/key.pem
COPY ./cert.pem /etc/ssl/cert.pem

# EXPOSE 3001
EXPOSE 443

RUN npm install

CMD ["npm", "run", "start"]