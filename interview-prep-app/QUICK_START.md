# 🎯 InterviewPrep AI - Quick Start

## What You've Got
A complete, production-ready AI-powered interview preparation platform built with:
- **Frontend**: React + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express + MongoDB
- **AI**: Google Gemini API
- **Auth**: JWT-based authentication

## 🚀 Get Started in 5 Minutes

### 1. Prerequisites
- Install Node.js (v14+): https://nodejs.org/
- Install MongoDB: https://www.mongodb.com/try/download/community
  OR use MongoDB Atlas (free cloud): https://www.mongodb.com/cloud/atlas
- Get Gemini API Key: https://makersuite.google.com/app/apikey

### 2. Install

```bash
# Backend
cd server
npm install
cp .env.example .env
# Edit .env and add your API keys

# Frontend  
cd ../client
npm install
```

### 3. Configure .env

Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/interview-prep
JWT_SECRET=your_secret_key_make_it_long_and_random
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Run

**Terminal 1** (if using local MongoDB):
```bash
mongod
```

**Terminal 2** - Backend:
```bash
cd server
npm run dev
```

**Terminal 3** - Frontend:
```bash
cd client
npm start
```

### 5. Use the App

1. Open: http://localhost:3000
2. Click "Login / Sign Up"
3. Create account
4. Click "Add New" to create job profile
5. Fill in your target role and skills
6. Click on the card to generate AI questions!

## 📁 Project Structure

```
interview-prep-app/
├── client/          # React frontend
├── server/          # Node.js backend
├── README.md        # Full documentation
├── SETUP_GUIDE.md   # Detailed setup
└── FEATURES.md      # Complete feature list
```

## 📚 Documentation

- **README.md** - Full documentation with API endpoints
- **SETUP_GUIDE.md** - Step-by-step setup with troubleshooting
- **FEATURES.md** - Complete feature checklist

## 🎨 Key Features

✅ JWT Authentication (Login/Signup)
✅ Create unlimited job profiles
✅ AI-generated interview questions (10 per profile)
✅ Detailed explanations with code examples
✅ Pin important questions
✅ Modern, responsive UI
✅ Smooth animations
✅ Production-ready code

## 🔑 Demo Data (Optional)

Want to see it in action with sample data?

```bash
cd server
node seed.js
```

Login with:
- Email: demo@interviewprep.com
- Password: demo123

## 🐛 Common Issues

**MongoDB not connecting?**
- Make sure mongod is running
- Check your MONGODB_URI

**AI questions not generating?**
- Verify Gemini API key is correct
- Check API quota/limits

**Port already in use?**
- Change PORT in server/.env

## 🚀 Deploy to Production

**Backend** (Railway/Render):
1. Push to GitHub
2. Connect to Railway/Render
3. Add environment variables
4. Deploy

**Frontend** (Vercel):
1. Build: `npm run build`
2. Deploy build folder
3. Set API URL env variable

## 💡 Tips

- Be specific with topics for better AI questions
- Use the regenerate button to get different questions
- Pin questions you want to review later
- Create separate profiles for different roles

## 📞 Need Help?

Check these files:
1. SETUP_GUIDE.md - Detailed installation help
2. README.md - Full API documentation
3. Console logs - Error details

---

**You're all set! Start preparing for your dream job! 🎯**
