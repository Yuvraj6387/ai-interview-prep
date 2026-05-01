require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const JobProfile = require('./models/JobProfile');

const sampleData = {
  user: {
    fullName: 'Demo User',
    email: 'demo@interviewprep.com',
    password: 'demo123',
    profileImage: 'https://ui-avatars.com/api/?name=Demo+User&background=667eea&color=fff'
  },
  profiles: [
    {
      targetRole: 'Frontend Developer',
      experience: 3,
      topics: ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Redux'],
      description: 'Preparing for senior frontend developer positions at tech companies'
    },
    {
      targetRole: 'Backend Developer',
      experience: 4,
      topics: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'REST API', 'Microservices'],
      description: 'Focusing on scalable backend architecture and API design'
    },
    {
      targetRole: 'DevOps Engineer',
      experience: 2,
      topics: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Jenkins', 'Terraform'],
      description: 'Learning cloud infrastructure and deployment automation'
    },
    {
      targetRole: 'Full Stack Developer',
      experience: 5,
      topics: ['MERN Stack', 'GraphQL', 'Next.js', 'Testing', 'System Design'],
      description: 'End-to-end application development expertise'
    }
  ]
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({ email: sampleData.user.email });
    
    // Create demo user
    console.log('👤 Creating demo user...');
    const user = new User(sampleData.user);
    await user.save();
    console.log(`✅ Demo user created: ${user.email}`);

    // Create job profiles
    console.log('📊 Creating job profiles...');
    for (const profileData of sampleData.profiles) {
      const profile = new JobProfile({
        ...profileData,
        userId: user._id
      });
      await profile.save();
      console.log(`✅ Created profile: ${profile.targetRole}`);
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log(`   Email: ${sampleData.user.email}`);
    console.log(`   Password: ${sampleData.user.password}`);
    console.log('\n💡 Login with these credentials to see sample data');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
