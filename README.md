# Lounge Restaurant Comments Processing System

Bu proje, Lounge Restoran için gerçek zamanlı yorum işleme ve sentiment analizi sistemi içerir.

## 🏗️ Sistem Bileşenleri

### 1. Producer (Yorum Üretici)

- Kafka'ya yorum verileri gönderir
- Farklı uzunluklarda rastgele yorumlar üretir
- Değişken sıklıkta veri gönderimi (100ms - 10 saniye)

### 2. gRPC Sentiment Analysis Service

- Yorum metinlerinin duygu analizini yapar
- Rate limiting (100 istek/saniye)
- Rastgele drop mekanizması (%1)
- Metin uzunluğuna bağlı gecikme

### 3. Consumer (Yorum İşleyici)

- Kafka'dan yorumları okur
- gRPC servisi ile sentiment analizi yapar
- Redis cache kullanır
- PostgreSQL'e kaydeder
- İşlenmiş verileri Kafka'ya gönderir

### 4. REST API Service

- İşlenmiş yorumları sunar
- Filtreleme ve sayfalama
- Sentiment istatistikleri
- Son 24 saat yorumları

## 🚀 Kurulum ve Çalıştırma

### Docker ile (Önerilen)

```bash
# Tüm servisleri başlat
docker-compose up -d

# Sadece altyapı servislerini başlat
docker-compose up -d zookeeper kafka postgres redis

# Geliştirme modunda çalıştır
npm run dev:producer
npm run dev:consumer
npm run dev:grpc
npm run dev:api
```

### Manuel Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Veritabanını hazırla
npx prisma migrate dev
npx prisma generate

# Servisleri başlat
npm run start:producer
npm run start:consumer
npm run start:grpc
npm run start:api
```

## 📊 REST API Endpoints

### Health Check

```http
GET /health
```

### Yorumları Listele

```http
GET /comments
GET /comments?category=positive
GET /comments?limit=10&offset=0
GET /comments?search=lezzetli
```

### Tekil Yorum

```http
GET /comments/{commentId}
```

### Sentiment İstatistikleri

```http
GET /comments/stats/sentiment
```

### Son Yorumlar (24 Saat)

```http
GET /comments/recent
GET /comments/recent?limit=5
```

## 🔧 Konfigürasyon

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lounge_db

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# gRPC
GRPC_HOST=localhost
GRPC_PORT=50051

# API
API_PORT=3000
```

## 📁 Proje Yapısı

```
src/
├── producer/          # Yorum üretici
├── consumer/          # Yorum işleyici
├── grpc-service/      # Sentiment analizi servisi
├── rest-api/          # REST API servisi
└── shared/            # Ortak bileşenler

prisma/
├── schema.prisma      # Veritabanı şeması
└── migrations/        # Migration dosyaları

docker/
├── Dockerfile.api     # API servisi Dockerfile
├── Dockerfile.grpc    # gRPC servisi Dockerfile
├── Dockerfile.producer # Producer Dockerfile
└── Dockerfile.consumer # Consumer Dockerfile
```

## 🧪 Test

```bash
# Yorum kontrol scripti
node scripts/check-comments.js

# API test
curl http://localhost:3000/health
curl http://localhost:3000/comments
```

## 📈 Monitoring

- **Kafka Topics**: `raw-comments`, `processed-comments`
- **Database**: PostgreSQL (comments tablosu)
- **Cache**: Redis (sentiment cache)
- **API**: Express.js REST API
- **gRPC**: Sentiment Analysis Service

## 🔄 Veri Akışı

1. **Producer** → Kafka (`raw-comments`)
2. **Consumer** ← Kafka (`raw-comments`)
3. **Consumer** → gRPC Service (sentiment analizi)
4. **Consumer** → Redis (cache)
5. **Consumer** → PostgreSQL (kaydet)
6. **Consumer** → Kafka (`processed-comments`)
7. **REST API** ← PostgreSQL (sorgula)

## 🛠️ Geliştirme

```bash
# TypeScript derleme
npm run build

# Geliştirme modu
npm run dev:producer
npm run dev:consumer
npm run dev:grpc
npm run dev:api

# Test
npm test
```
