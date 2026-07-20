FROM node:20-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/src ./src
COPY backend/data ./data
COPY backend/skills ./skills
COPY frontend ./frontend
EXPOSE 3001
CMD ["node", "src/server.js"]
