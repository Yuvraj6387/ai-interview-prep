# 🎯 InterviewPrep AI - Full-Stack MERN Application

A production-ready AI-powered interview preparation platform built with the MERN stack (MongoDB, Express, React, Node.js) and Google Gemini AI.

## ✨ Features

### 🔐 Authentication
- JWT-based secure authentication
- Login/Signup with email and password
- Profile image support
- Persistent sessions

### 📊 Dashboard
- Modern card-based layout
- Create multiple job profiles
- View and manage interview preparations
- Delete job profiles

### 🤖 AI-Powered Question Generation
- Generate 10 role-specific interview questions using Google Gemini AI
- Questions tailored to:
  - Target role
  - Years of experience
  - Specific topics/technologies

### 📖 Learn More Feature
- AI-generated detailed explanations
- Code examples for technical questions
- Bullet-pointed key concepts
- Sample answers

### 📌 Pin Important Questions
- Pin/unpin questions for quick access
- View all pinned questions
- Organize your preparation

### 🎨 Modern UI/UX
- Professional SaaS-style design
- Smooth animations with Framer Motion
- Responsive design (mobile, tablet, desktop)
- Gradient themes and modern components
- Modal-based interactions

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI library
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Axios** - HTTP client
- **React Icons** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### AI Integration
- **Google Gemini API** - Question generation and explanations

## 📁 Project Structure

```
interview-prep-app/
├── client/                 # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── LoginModal.js
│   │   │   ├── JobCard.js
│   │   │   ├── AddJobModal.js
│   │   │   ├── QuestionCard.js
│   │   │   └── ExplanationPanel.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   └── QuestionsView.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── server/                # Node.js backend
    ├── models/
    │   ├── User.js
    │   ├── JobProfile.js
    │   └── Question.js
    ├── routes/
    │   ├── auth.js
    │   ├── jobProfiles.js
    │   └── questions.js
    ├── middleware/
    │   └── auth.js
    ├── utils/
    │   └── aiService.js
    ├── server.js
    ├── package.json
    └── .env.example
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Groq API Key from your provider

### 1. Clone the Repository
```bash
git clone <repository-url>
cd interview-prep-app
```

## 🔑 Environment Variables

### Server (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/interview-prep
JWT_SECRET=your_super_secret_jwt_key_change_this
GEMINI_API_KEY=your_gemini_api_key_here
```






#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Job Profile Endpoints

#### Get All Profiles
```http
GET /api/profiles
Authorization: Bearer <token>
```

#### Create Profile
```http
POST /api/profiles
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetRole": "Frontend Developer",
  "experience": 3,
  "topics": ["React", "JavaScript", "TypeScript"],
  "description": "Preparing for senior frontend role"
}
```

#### Delete Profile
```http
DELETE /api/profiles/:id
Authorization: Bearer <token>
```

#### Generate Questions
```http
POST /api/profiles/:id/generate-questions
Authorization: Bearer <token>
```

### Question Endpoints

#### Get Questions by Profile
```http
GET /api/questions/profile/:profileId
Authorization: Bearer <token>
```

#### Get Pinned Questions
```http
GET /api/questions/pinned
Authorization: Bearer <token>
```

#### Toggle Pin
```http
PATCH /api/questions/:id/pin
Authorization: Bearer <token>
```

#### Get Explanation
```http
POST /api/questions/:id/explanation
Authorization: Bearer <token>
```

## 🎨 UI Features

### Design System
- **Colors**: Purple-Blue gradient theme
- **Typography**: Outfit (headings), Inter (body)
- **Animations**: Smooth transitions and micro-interactions
- **Components**: Cards, modals, buttons, forms
- **Layout**: Responsive grid system

### Key UI Components
1. **Navbar**: Authentication status, user profile, logout
2. **Dashboard**: Grid of job profile cards
3. **Job Card**: Interactive cards with hover effects
4. **Question Card**: Display with pin and learn more actions
5. **Modals**: Login/Signup, Add Job Profile
6. **Explanation Panel**: Sliding panel with AI-generated content

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Protected API routes
- Input validation
- CORS enabled
- Environment variables for sensitive data

## 🚢 Deployment

### Backend Deployment (Heroku/Railway/Render)
1. Push code to GitHub
2. Connect to deployment service
3. Add environment variables
4. Deploy

### Frontend Deployment (Vercel/Netlify)
1. Build the app: `npm run build`
2. Deploy build folder
3. Set environment variables
4. Configure API URL

### Production Checklist
- [ ] Set strong JWT_SECRET
- [ ] Use MongoDB Atlas for production
- [ ] Enable HTTPS
- [ ] Set up CORS properly
- [ ] Add rate limiting
- [ ] Enable error logging
- [ ] Set up monitoring

## 🧪 Testing

```bash
# Backend tests (if implemented)
cd server
npm test

# Frontend tests
cd client
npm test
```

## 📚 Usage Guide

1. **Sign Up**: Click "Login / Sign Up" and create an account
2. **Create Job Profile**: Click "Add New" and fill in job details
3. **Generate Questions**: Click on a job card to auto-generate questions
4. **Learn More**: Click the book icon to get detailed explanations
5. **Pin Questions**: Click the bookmark icon to save important questions
6. **Regenerate**: Click "Regenerate" to get new questions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Google Gemini AI for question generation
- Tailwind CSS for styling utilities
- Framer Motion for animations
- React Icons for beautiful icons

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ using MERN Stack + AI**
