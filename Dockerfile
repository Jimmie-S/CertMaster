FROM node:20-alpine
WORKDIR /app

# Install production deps first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev

# App source (frontend + server)
COPY . .

ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
