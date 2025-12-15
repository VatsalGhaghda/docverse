FROM node:18-bullseye-slim

# Install qpdf and Ghostscript (for real PDF compression)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      qpdf \
      ghostscript \
      poppler-utils \
      tesseract-ocr \
      tesseract-ocr-eng \
      tesseract-ocr-spa \
      tesseract-ocr-fra \
      tesseract-ocr-deu \
      tesseract-ocr-ita \
      tesseract-ocr-por \
      tesseract-ocr-chi-sim \
      tesseract-ocr-jpn \
      tesseract-ocr-kor \
      tesseract-ocr-ara \
      libreoffice \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "start"]
