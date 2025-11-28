# 🚀 Backend Server Start Guide

## Quick Start

```bash
cd backend
npm start
```

## Server Details

- **Port:** 5000 (default)
- **API URL:** http://192.168.29.204:5000/api
- **Socket URL:** http://192.168.29.204:5000
- **Health Check:** http://192.168.29.204:5000/health

## Check if Server is Running

### Windows:
```powershell
netstat -ano | findstr :5000
```

### Test Health Endpoint:
```bash
curl http://localhost:5000/health
```

## Common Issues

### 1. Port Already in Use
**Solution:**
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### 2. Database Connection Error
**Solution:**
- Check `.env` file has correct `DATABASE_URL`
- Make sure PostgreSQL is running
- Verify database credentials

### 3. Missing Dependencies
**Solution:**
```bash
cd backend
npm install
```

## Expected Output

When server starts successfully, you should see:
```
✅ PostgreSQL (Prisma) Connected
✅ Database connection verified
🚀 Server running on port 5000
📱 API URL: http://192.168.29.204:5000/api
🔌 Socket URL: http://192.168.29.204:5000
💚 Health check: http://192.168.29.204:5000/health
```

## Running in Background

To run in background (Windows):
```powershell
Start-Process node -ArgumentList "server.js" -WindowStyle Hidden
```

Or use a new terminal window and keep it open.



