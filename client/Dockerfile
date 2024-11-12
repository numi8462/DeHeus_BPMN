# 1
FROM node:16 AS build

WORKDIR /client

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# 2
FROM nginx:alpine

COPY --from=build /client/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]