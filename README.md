# Lounge Restaurant Comments Processing System



https://github.com/user-attachments/assets/a3ece756-4e0e-4751-b26a-b08320b68d94




This project is a real-time comment processing and sentiment analysis system for Lounge Restaurant. It collects customer comments, analyzes them, and provides meaningful reports to management.

## How the system works:

- Collects real-time comment data
- Analyzes each comment (positive/negative/neutral)
- Stores results in database
- Provides an API for management access

## System Components

### 1. Producer (Comment Generator)

- Sends comment data to Kafka
- Generates random comments of different lengths
- Variable frequency data transmission (100ms - 10 seconds)

### 2. gRPC Sentiment Analysis Service

- Performs sentiment analysis on comment texts
- Rate limiting: 100 requests per second
- Cache mechanism: Consistent results for same text
- Random drop: 1% probability of rejecting requests
- Text length dependent delay

### 3. Consumer (Comment Processor)

- Reads comments from Kafka
- Performs sentiment analysis with gRPC service
- Uses Redis cache
- Saves to PostgreSQL
- Sends processed data to Kafka

### 4. REST API Service

Web API for management to view comments. I used Express.js.

**Endpoints:**

- `GET /comments` - Lists all comments
- `GET /comments?category=positive` - Only positive comments
- `GET /comments?search=delicious` - Search functionality
- `GET /comments/stats/sentiment` - Shows statistics
- `GET /comments/recent` - Last 24 hours comments

## Setup and Running

### Requirements

- Docker and Docker Compose
- Node.js 18+
- npm

### Step by Step Setup

1. **Clone the project:**

```bash
git clone <repo-url>
cd lounge-restaurant
```

2. **Start infrastructure services:**

```bash
docker-compose up -d zookeeper kafka postgres redis
```

3. **Prepare database:**

```bash
npx prisma migrate deploy
npx prisma generate
```

4. **Start services (in separate terminals):**

```bash

npm run start:grpc


npm run start:api


npm run start:producer


npm run start:consumer
```

### Start All Services with Docker

```bash
# Start all services
docker-compose up -d

# Start only infrastructure services
docker-compose up -d zookeeper kafka postgres redis
```

## API Usage

### Basic Endpoints

**Health Check:**

```bash
curl http://localhost:3000/health
```

**List All Comments:**

```bash
curl http://localhost:3000/comments
```

**Filter Positive Comments:**

```bash
curl http://localhost:3000/comments?category=positive
```

**Search:**

```bash
curl http://localhost:3000/comments?search=delicious
```

**Pagination:**

```bash
curl http://localhost:3000/comments?limit=10&offset=0
```

**Sentiment Statistics:**

```bash
curl http://localhost:3000/comments/stats/sentiment
```

**Last 24 Hours Comments:**

```bash
curl http://localhost:3000/comments/recent
```

## Testing

### Comment Check Script

```bash
node scripts/check-comments.js
```

### API Tests

```bash
# Health check
curl http://localhost:3000/health

# Check comment count
curl -s http://localhost:3000/comments | jq '.data | length'

# Check sentiment distribution
curl -s http://localhost:3000/comments/stats/sentiment
```

## Configuration

### Environment Variables

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/lounge_db"
REDIS_URL="redis://localhost:6379"
KAFKA_BROKERS="localhost:9092"
GRPC_HOST="localhost"
GRPC_PORT=50051
API_PORT=3000
```

### Docker Configuration

All services run in Docker containers:

- **PostgreSQL**: Database
- **Redis**: Cache
- **Kafka**: Messaging system
- **Zookeeper**: Required for Kafka
- **API Service**: REST API
- **gRPC Service**: Sentiment analysis
- **Producer**: Comment generator
- **Consumer**: Comment processor

## System Performance

### Test Results

- **Comment Generation**: Variable frequency between 100ms - 10s
- **Sentiment Analysis**: Average 50-200ms
- **API Response Time**: < 500ms
- **Cache Hit Rate**: ~80%

### Data Distribution

- **Positive**: ~55%
- **Neutral**: ~35%
- **Negative**: ~10%

## Development

### Project Structure

```
src/
├── producer/          # Comment generator
├── consumer/          # Comment processor
├── grpc-service/      # Sentiment analysis
├── rest-api/          # REST API
└── shared/            # Shared components

prisma/
├── schema.prisma      # Database schema
└── migrations/        # Migration files

docker/
├── Dockerfile.api     # API service
├── Dockerfile.grpc    # gRPC service
├── Dockerfile.producer # Producer
└── Dockerfile.consumer # Consumer
```

### Development Commands

```bash
# TypeScript compilation
npm run build

npm run dev:producer
npm run dev:consumer
npm run dev:grpc
npm run dev:api

# Test
npm test
```
