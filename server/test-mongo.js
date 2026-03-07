const mongoose = require('mongoose');

require('dotenv').config();

console.log('MONGODB_URI:', process.env.MONGODB_URI);

async function testConnection() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }
    
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
