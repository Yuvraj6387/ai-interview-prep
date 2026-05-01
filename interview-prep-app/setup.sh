#!/bin/bash

echo "🎯 InterviewPrep AI - Setup Script"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Setup Server
echo "📦 Setting up Backend..."
cd server
cp .env.example .env
echo "⚠️  Please edit server/.env and add your:"
echo "   - MongoDB URI"
echo "   - JWT Secret"
echo "   - Gemini API Key"
echo ""
npm install
cd ..

# Setup Client
echo "📦 Setting up Frontend..."
cd client
npm install
cd ..

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit server/.env with your credentials"
echo "2. Start MongoDB: mongod"
echo "3. Start backend: cd server && npm run dev"
echo "4. Start frontend: cd client && npm start"
echo ""
echo "🚀 Happy coding!"
