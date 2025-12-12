FROM node:18-bullseye-slim

# Install qpdf and Ghostscript (for real PDF compression)
RUN apt-get update && \
    apt-get install -y --no-install-recommends qpdf ghostscript && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "start"]
