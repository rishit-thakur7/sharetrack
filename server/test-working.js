require('dotenv').config();

console.log('Testing .env file:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI);

const mongoose = require('mongoose');

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
