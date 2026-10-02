FROM ubuntu:22.04

# Gerekli sistem kütüphanelerini kur (Python, GCC, Curl vb.)
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    gcc \
    libm-dev \
    && rm -rf /var/lib/apt/lists/*

# Node.js 18.x sürümünü kur
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get update && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

# SymPy kurulumu
RUN pip3 install sympy

# Uygulama kodlarını kopyala
WORKDIR /app
COPY . /app

# Linux için C motorunu derle (solver.exe yerine Linux executable 'solver' oluşur)
RUN gcc src/main.c src/parser.c src/cJSON.c -o solver -lm

# Sunucunun çalışacağı portu aç
EXPOSE 3000

# Uygulamayı başlat
CMD ["node", "server.js"]
