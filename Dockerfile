FROM node:18-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Make sure we have the CSV file
RUN ls -la

# Default port exposure
EXPOSE 8080

CMD ["node", "server.js"]
