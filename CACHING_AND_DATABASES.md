# Caching and Multi-Database Support

## Overview

The crypto paper trading app now supports:
1. **Enhanced Caching System** - Configurable caching with multiple strategies (Memory, Redis, File-based)
2. **Multi-Database Support** - Use SQLite, PostgreSQL, or MySQL as your database

These features help you:
- Reduce API calls to CoinGecko (respect rate limits)
- Scale your application with production-ready databases
- Improve performance with intelligent caching
- Choose the database that fits your needs

---

## 🗄️ Multi-Database Support

### Supported Databases

1. **SQLite** (Default)
   - Zero configuration
   - Perfect for development and small deployments
   - No additional installation required

2. **PostgreSQL**
   - Production-ready
   - Advanced features and scalability
   - Supports high concurrency

3. **MySQL/MariaDB**
   - Widely supported
   - Excellent performance
   - Easy to find hosting

### Configuration

Set the database type in your `.env` file:

```env
# SQLite Configuration (Default)
DB_TYPE=sqlite
DB_PATH=./crypto_trading.db

# PostgreSQL Configuration
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crypto_trading
DB_USER=postgres
DB_PASSWORD=yourpassword

# MySQL Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crypto_trading
DB_USER=root
DB_PASSWORD=yourpassword
```

### Database Setup

#### PostgreSQL Setup

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE crypto_trading;
CREATE USER crypto_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE crypto_trading TO crypto_user;
\q

# Install Node.js driver
npm install pg
```

#### MySQL Setup

```bash
# Install MySQL (Ubuntu/Debian)
sudo apt-get install mysql-server

# Create database
mysql -u root -p
CREATE DATABASE crypto_trading;
CREATE USER 'crypto_user'@'localhost' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON crypto_trading.* TO 'crypto_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Install Node.js driver
npm install mysql2
```

### Migration Tool

If you're switching from SQLite to PostgreSQL or MySQL, use the migration script:

```bash
# Migrate from SQLite to PostgreSQL
npm run migrate -- --from sqlite --to postgresql

# Migrate from SQLite to MySQL
npm run migrate -- --from sqlite --to mysql
```

**Important**: Update your `.env` file with the new database credentials before running migration.

---

## ⚡ Enhanced Caching System

### Cache Strategies

#### 1. Memory Cache (Default)
- In-memory caching using JavaScript Map
- Fast and simple
- Data lost on server restart
- Best for: Development, single-server deployments

```env
CACHE_STRATEGY=memory
```

#### 2. Redis Cache
- Persistent, shared cache across multiple servers
- Fastest performance
- Requires Redis server
- Best for: Production, multi-server deployments

```env
CACHE_STRATEGY=redis
REDIS_URL=redis://localhost:6379
```

#### 3. File-based Cache
- Persistent cache using local filesystem
- No external dependencies
- Slower than memory/Redis
- Best for: Single-server with persistence needs

```env
CACHE_STRATEGY=file
```

### Cache Configuration

Configure cache TTL (Time To Live) for different data types:

```env
# Cache TTL in seconds
CACHE_CRYPTO_PRICES_TTL=60        # Crypto prices (1 minute)
CACHE_EXCHANGE_RATES_TTL=300      # Exchange rates (5 minutes)
CACHE_TOP_CRYPTOS_TTL=120         # Top cryptos list (2 minutes)
CACHE_SEARCH_TTL=600              # Search results (10 minutes)
```

### Redis Setup

```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis

# Test Redis
redis-cli ping
# Should return: PONG

# Install Node.js driver
npm install redis
```

### Cache Benefits

1. **Reduced API Calls**
   - CoinGecko free tier: 10-50 calls/minute
   - Caching prevents hitting rate limits
   - Faster response times

2. **Better Performance**
   - Cached data served instantly
   - Reduces external API latency
   - Improves user experience

3. **Cost Savings**
   - Fewer API calls = lower costs
   - Can handle more users
   - Efficient resource usage

### Cache Monitoring

The cache system includes automatic cleanup for expired entries:

- Memory cache: Cleans up on access
- File cache: Periodic cleanup of old files
- Redis: Automatic TTL expiration

---

## 🚀 Quick Start Examples

### Example 1: Development Setup (SQLite + Memory Cache)

```env
# .env
PORT=3001
DB_TYPE=sqlite
DB_PATH=./crypto_trading.db
CACHE_STRATEGY=memory
```

```bash
npm install
npm start
```

### Example 2: Production Setup (PostgreSQL + Redis)

```env
# .env
PORT=3001
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crypto_trading
DB_USER=crypto_user
DB_PASSWORD=securepassword

CACHE_STRATEGY=redis
REDIS_URL=redis://localhost:6379

CACHE_CRYPTO_PRICES_TTL=60
CACHE_EXCHANGE_RATES_TTL=300
```

```bash
# Install optional dependencies
npm install pg redis

# Start application
npm start
```

### Example 3: Cloud Deployment (MySQL + Redis Cloud)

```env
# .env
PORT=3001
DB_TYPE=mysql
DB_HOST=mysql.example.com
DB_PORT=3306
DB_NAME=crypto_trading
DB_USER=cloud_user
DB_PASSWORD=cloudpassword

CACHE_STRATEGY=redis
REDIS_URL=redis://redis.example.com:6379

JWT_SECRET=your_production_secret_key
```

---

## 📊 Database Schema

All database types use the same schema:

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email
- `password` - Hashed password (bcrypt)
- `balance` - Legacy cash balance
- `preferred_currency` - User's preferred currency
- `created_at` - Registration timestamp

### Balances Table (Multi-currency)
- `id` - Primary key
- `user_id` - Foreign key to users
- `currency` - Currency code (usd, eur, etc.)
- `amount` - Balance amount
- Unique constraint: (user_id, currency)

### Portfolio Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `symbol` - Crypto symbol (BTC, ETH, etc.)
- `coin_id` - CoinGecko coin ID
- `name` - Cryptocurrency name
- `amount` - Amount held
- `average_buy_price` - Average purchase price
- `currency` - Purchase currency
- Unique constraint: (user_id, symbol, currency)

### Transactions Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `symbol` - Crypto symbol
- `coin_id` - CoinGecko coin ID
- `name` - Cryptocurrency name
- `type` - Transaction type (buy/sell/deposit/exchange)
- `amount` - Amount traded
- `price` - Price at trade time
- `total` - Total transaction value
- `currency` - Transaction currency
- `from_currency` - For exchange transactions
- `to_currency` - For exchange transactions
- `exchange_rate` - For exchange transactions
- `created_at` - Transaction timestamp

---

## 🔧 Troubleshooting

### Database Connection Issues

**PostgreSQL Connection Refused**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U crypto_user -d crypto_trading -h localhost
```

**MySQL Access Denied**
```bash
# Reset MySQL password
sudo mysql
ALTER USER 'crypto_user'@'localhost' IDENTIFIED BY 'newpassword';
FLUSH PRIVILEGES;
```

### Cache Issues

**Redis Connection Failed**
```bash
# Check if Redis is running
sudo systemctl status redis

# Test connection
redis-cli ping
```

**File Cache Permission Denied**
```bash
# Check .cache directory permissions
ls -la .cache
chmod 755 .cache
```

### Migration Issues

**Migration Script Fails**
- Ensure target database is running and accessible
- Check credentials in .env file
- Verify database user has CREATE TABLE privileges
- Make sure target database is empty or use fresh database

### Performance Issues

**Slow API Responses**
- Check cache strategy is configured correctly
- Verify Redis is running (if using Redis cache)
- Increase cache TTL values
- Check CoinGecko API rate limits

---

## 🔐 Security Best Practices

1. **Database Credentials**
   - Never commit `.env` file
   - Use strong passwords
   - Restrict database user privileges
   - Use SSL/TLS for production databases

2. **Cache Security**
   - Protect Redis with password (requirepass)
   - Use Redis AUTH in production
   - Don't cache sensitive user data
   - Clear cache on security updates

3. **Production Deployment**
   - Use environment variables for secrets
   - Enable database connection pooling
   - Set up database backups
   - Monitor cache hit rates
   - Use read replicas for scaling

---

## 📈 Performance Tuning

### Database Optimization

**PostgreSQL**
```sql
-- Create indexes for better performance
CREATE INDEX idx_portfolio_user ON portfolio(user_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_balances_user ON balances(user_id);
```

**MySQL**
```sql
-- Already includes indexes in table creation
-- Monitor query performance
SHOW PROCESSLIST;
```

### Cache Optimization

```env
# Aggressive caching (lower API calls)
CACHE_CRYPTO_PRICES_TTL=300      # 5 minutes
CACHE_EXCHANGE_RATES_TTL=600     # 10 minutes
CACHE_TOP_CRYPTOS_TTL=300        # 5 minutes

# Real-time caching (more API calls, fresher data)
CACHE_CRYPTO_PRICES_TTL=30       # 30 seconds
CACHE_EXCHANGE_RATES_TTL=60      # 1 minute
CACHE_TOP_CRYPTOS_TTL=60         # 1 minute
```

---

## 🚢 Deployment Recommendations

### Development
- **Database**: SQLite
- **Cache**: Memory
- **Why**: Zero configuration, fast setup

### Small Production (< 100 users)
- **Database**: SQLite or PostgreSQL
- **Cache**: File or Redis
- **Why**: Simple, cost-effective

### Medium Production (100-10k users)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Why**: Better scalability, shared cache

### Large Production (10k+ users)
- **Database**: PostgreSQL with read replicas
- **Cache**: Redis cluster
- **Why**: High availability, horizontal scaling

---

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Redis Documentation](https://redis.io/documentation)
- [CoinGecko API](https://www.coingecko.com/api/documentation)

---

## 🆘 Getting Help

If you encounter issues:

1. Check this documentation
2. Review `.env.example` for correct configuration
3. Check server logs for error messages
4. Verify database/cache services are running
5. Test database connection separately
6. Open a GitHub issue with details

---

**Happy Trading!** 📈💰
