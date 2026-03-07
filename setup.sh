#!/bin/bash

echo "=========================================="
echo "College Event Management System - Setup"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Setup Backend
echo "📦 Setting up Backend..."
cd backend

if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/college_events
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d
RZP_KEY_ID=
RZP_KEY_SECRET=
OTP_EXPIRE_MINUTES=5
OTP_MAX_ATTEMPTS=5
TICKET_SECRET=your-ticket-qr-secret-key
LOG_LEVEL=info
EOF
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "✅ .env file already exists"
fi

echo "📥 Installing backend dependencies..."
npm install

echo ""
echo "✅ Backend setup complete!"
echo ""

# Setup Frontend
echo "📦 Setting up Frontend..."
cd ../app

if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo "📥 Installing frontend dependencies..."
npm install

echo ""
echo "✅ Frontend setup complete!"
echo ""

# Instructions
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Make sure MongoDB is running:"
echo "   mongod"
echo ""
echo "2. Start the backend server:"
echo "   cd backend && npm start"
echo ""
echo "3. In a new terminal, start the frontend:"
echo "   cd app && npm run dev"
echo ""
echo "4. Open http://localhost:5173 in your browser"
echo ""
echo "5. For testing, create a superadmin account manually in MongoDB"
echo "   or signup and update the role in the database."
echo ""
echo "📧 OTPs will be displayed in the backend terminal for testing."
echo ""
