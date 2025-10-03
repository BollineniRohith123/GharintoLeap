# Gharinto Leap - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Start the Backend Server

```bash
cd backend
node server-sqlite.js
```

You should see:
```
🚀 SQLite Development Server running on http://localhost:4000
📝 Available endpoints:
  🔐 Authentication:
    POST /auth/login
    POST /auth/register
  👥 User Management:
    GET  /users/profile
  ❤️  Health:
    GET  /health
    GET  /health/db

✨ Frontend should connect to: http://localhost:4000
💾 Database: SQLite (gharinto_dev.db)
```

### Step 2: Start the Frontend Server

Open a new terminal:

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v6.3.6  ready in 634 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 3: Login to the Application

1. Open your browser to: **http://localhost:5173**
2. Navigate to the login page
3. Use any of these test accounts:

## 🔐 Test Accounts

### Admin Account (Recommended for Testing)
- **Email:** admin@gharinto.com
- **Password:** admin123
- **Access:** 13 permissions, 7 menus
- **Can do:** Manage users, projects, leads, view analytics

### Super Admin Account (Full Access)
- **Email:** superadmin@gharinto.com
- **Password:** superadmin123
- **Access:** 17 permissions, 10 menus
- **Can do:** Everything including system settings

### Project Manager Account
- **Email:** pm@gharinto.com
- **Password:** pm123
- **Access:** 4 permissions, 4 menus
- **Can do:** Manage projects, view leads and analytics

### Interior Designer Account
- **Email:** designer@gharinto.com
- **Password:** designer123
- **Access:** 4 permissions, 4 menus
- **Can do:** Work on projects, view materials, communicate

### Customer Account
- **Email:** customer@gharinto.com
- **Password:** customer123
- **Access:** 1 permission, 3 menus
- **Can do:** View own projects, communicate

### Vendor Account
- **Email:** vendor@gharinto.com
- **Password:** vendor123
- **Access:** 3 permissions, 4 menus
- **Can do:** Manage materials, view finances

## 🧪 Verify Everything Works

Run the comprehensive test suite:

```bash
node test-authentication.cjs
```

Expected output:
```
✅ Passed: 16/16
❌ Failed: 0/16
📈 Success Rate: 100%

🎉 ALL TESTS PASSED! Authentication system is working correctly.
```

## 📋 What You Can Test

### 1. Login Flow
- Try logging in with different accounts
- Verify you get redirected to the dashboard
- Check that the user menu shows correct information

### 2. Role-Based Access
- Login as different users
- Notice how the navigation menu changes based on role
- Super Admin sees all menus
- Customer sees limited menus

### 3. Authentication Security
- Try accessing protected pages without logging in
- Verify you get redirected to login
- Try using an invalid token
- Verify proper error handling

### 4. Profile Management
- After login, check your profile
- Verify roles and permissions are displayed
- Check that menus are correctly assigned

## 🛠️ Troubleshooting

### Backend won't start
```bash
# Make sure you're in the backend directory
cd backend

# Check if dependencies are installed
npm install

# Try starting again
node server-sqlite.js
```

### Frontend won't start
```bash
# Make sure you're in the frontend directory
cd frontend

# Check if dependencies are installed
npm install

# Try starting again
npm run dev
```

### Login not working
1. Check that backend is running on port 4000
2. Check browser console for errors
3. Verify CORS is not blocking requests
4. Try running the test suite to verify backend is working

### Database issues
```bash
# Reset and recreate the database
node password-reset.js
node setup-sqlite-tables.cjs

# Restart the backend server
cd backend
node server-sqlite.js
```

## 📊 API Testing with cURL

### Test Login
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gharinto.com","password":"admin123"}'
```

### Test Profile (replace TOKEN with actual token from login)
```bash
curl -X GET http://localhost:4000/users/profile \
  -H "Authorization: Bearer TOKEN"
```

### Test Health Check
```bash
curl http://localhost:4000/health
```

## 🎯 Key Features Working

✅ User Authentication (Login/Logout)
✅ JWT Token Generation and Validation
✅ Role-Based Access Control (RBAC)
✅ Permission Management
✅ Menu-Based Navigation Control
✅ Password Hashing (bcrypt)
✅ CORS Configuration
✅ Error Handling
✅ Profile Management
✅ Multiple User Roles

## 📁 Important Files

### Backend
- `backend/server-sqlite.js` - Main server file (SQLite)
- `gharinto_dev.db` - SQLite database file
- `password-reset.js` - Create test users
- `setup-sqlite-tables.cjs` - Setup RBAC tables

### Frontend
- `frontend/lib/api-client.ts` - API client
- `frontend/contexts/AuthContext.tsx` - Auth state management
- `frontend/pages/auth/LoginPage.tsx` - Login page

### Testing
- `test-authentication.cjs` - Comprehensive test suite

### Documentation
- `AUTHENTICATION_FIX_REPORT.md` - Detailed fix report
- `QUICK_START_GUIDE.md` - This guide

## 🚀 Production Deployment

For production deployment:

1. **Set up PostgreSQL:**
   ```bash
   # Install PostgreSQL
   # Create database: gharinto_dev
   # Run migrations from backend/db/migrations/
   ```

2. **Switch to production server:**
   ```bash
   cd backend
   npm start  # Uses server.js with PostgreSQL
   ```

3. **Configure environment variables:**
   ```bash
   export JWT_SECRET="your-secure-secret-key"
   export DB_HOST="your-db-host"
   export DB_PASSWORD="your-db-password"
   ```

4. **Build frontend:**
   ```bash
   cd frontend
   npm run build
   ```

## 💡 Tips

- Use **admin@gharinto.com** for general testing
- Use **superadmin@gharinto.com** to test all features
- Each role has different permissions - test them all!
- Check browser console for detailed error messages
- Backend logs show all API requests and errors

## 🆘 Need Help?

1. Check `AUTHENTICATION_FIX_REPORT.md` for detailed information
2. Run `node test-authentication.cjs` to verify backend
3. Check browser console for frontend errors
4. Check backend terminal for server errors
5. Verify both servers are running on correct ports

## ✨ You're All Set!

The authentication system is fully functional and ready to use. Enjoy building with Gharinto Leap! 🎉

