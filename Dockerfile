FROM node:18-alpine

# Alpine Linux üzerinde gerekli kütüphaneleri (Python, C derleyici) kur
# apk kullandığı için apt-get 100 hatasını tamamen aşar.
RUN apk update && apk add --no-cache \
    python3 \
    py3-pip \
    gcc \
    musl-dev

# SymPy kurulumu
RUN pip3 install --no-cache-dir sympy --break-system-packages || pip3 install --no-cache-dir sympy

# Uygulama kodlarını kopyala
WORKDIR /app
COPY . /app

# Linux (Alpine) için C motorunu derle
RUN gcc src/main.c src/parser.c src/cJSON.c -o solver -lm

# Sunucunun çalışacağı port
EXPOSE 3000

# Uygulamayı başlat
CMD ["node", "server.js"]
