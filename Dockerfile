FROM node:18-bullseye

# Gerekli sistem kütüphanelerini kur (Python ve GCC)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# SymPy kurulumu (Docker icinde guvenli sekilde)
RUN pip3 install --no-cache-dir sympy --break-system-packages || pip3 install --no-cache-dir sympy

# Uygulama kodlarını kopyala
WORKDIR /app
COPY . /app

# Linux için C motorunu derle
RUN gcc src/main.c src/parser.c src/cJSON.c -o solver -lm

# Sunucunun çalışacağı port
EXPOSE 3000

# Uygulamayı başlat
CMD ["node", "server.js"]
