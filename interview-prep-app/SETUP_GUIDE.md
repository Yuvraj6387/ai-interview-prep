# 🚀 Quick Setup Guide

## Step-by-Step Installation

### 1️⃣ Install Prerequisites

**Install Node.js**
- Download from: https://nodejs.org/
- Verify: `node --version` (should be v14+)

**Install MongoDB**
- Option A: Local MongoDB from https://www.mongodb.com/try/download/community
- Option B: Use MongoDB Atlas (cloud) from https://www.mongodb.com/cloud/atlas

### 2️⃣ Get Groq API Key

1. Visit your Groq provider dashboard
2. Click "Create API Key"
3. Copy your API key (keep it secret!)

### 3️⃣ Install the Application

**Automatic Setup (Linux/Mac)**
```bash
chmod +x setup.sh
./setup.sh
```

**Manual Setup (All Platforms)**

**Backend:**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
```

**Frontend:**
```bash
cd client
npm install
```

### 4️⃣ Configure Environment Variables

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/interview-prep
JWT_SECRET=your_random_secret_key_here_make_it_long
GROQ_API_KEY=your_groq_api_key_here
```

**Important Notes:**
- For `JWT_SECRET`, use a long random string
- For `GROQ_API_KEY`, paste your Groq API key
- For `MONGODB_URI`:
  - Local: `mongodb://localhost:27017/interview-prep`
  - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/interview-prep`

### 5️⃣ Start the Application

**Terminal 1 - Start MongoDB (if local)**
```bash
mongod
```

**Terminal 2 - Start Backend**
```bash
cd server
npm run dev
```
✅ Server running at http://localhost:5000

**Terminal 3 - Start Frontend**
```bash
cd client
npm start
```
✅ App running at http://localhost:3000

### 6️⃣ Test the Application

1. Open browser: http://localhost:3000
2. Click "Login / Sign Up"
3. Create an account
4. Click "Add New" to create a job profile
5. Fill in the form:
   - Target Role: "Frontend Developer"
   - Experience: 3
   - Topics: "React, JavaScript, CSS"
   - Description: "Preparing for interviews"
6. Click "Create Profile"
7. Click on the card to generate questions
8. Click "Learn More" on any question

## 🐛 Troubleshooting

### MongoDB Connection Error
**Error:** `MongoServerError: connect ECONNREFUSED`

**Solution:**
1. Make sure MongoDB is running: `mongod`
2. Check MONGODB_URI in .env
3. If using Atlas, check your IP whitelist

### Gemini API Error
**Error:** `Failed to generate questions`

**Solution:**
1. Verify your API key is correct in .env
2. Check if you have API quota remaining
3. Try regenerating your API key

### Port Already in Use
**Error:** `Port 5000 is already in use`

**Solution:**
1. Kill the process: `lsof -ti:5000 | xargs kill`
2. Or change PORT in server/.env

### CORS Error
**Error:** `Access to XMLHttpRequest blocked by CORS`

**Solution:**
1. Make sure backend is running on port 5000
2. Check proxy in client/package.json

## 📱 Production Deployment

### Deploy Backend (Railway/Render)
1. Push code to GitHub
2. Connect Railway/Render to your repo
3. Add environment variables in dashboard
4. Deploy

### Deploy Frontend (Vercel/Netlify)
1. Build: `npm run build` in client folder
2. Deploy build folder
3. Add environment variable: `REACT_APP_API_URL=https://your-backend-url.com/api`

## 🎯 Common Use Cases

### Add Multiple Job Profiles
Create profiles for different roles you're preparing for:
- Frontend Developer (React focus)
- Backend Developer (Node.js focus)
- Full Stack Developer (MERN focus)

### Pin Important Questions
- Click the bookmark icon on questions you want to review
- Access all pinned questions from Dashboard

### Get Detailed Explanations
- Click "Learn More" on any question
- Get AI-generated explanations with examples
- Review code snippets for technical questions

## 💡 Tips

1. **Be Specific**: Add detailed topics for better question quality
2. **Regenerate**: Don't like the questions? Hit regenerate!
3. **Pin Key Questions**: Save questions you find most valuable
4. **Regular Practice**: Create new profiles for different interview stages

## 📞 Need Help?

- Check the README.md for full documentation
- Open an issue on GitHub
- Check console logs for error details

---

**Happy Interview Prep! 🎯**
