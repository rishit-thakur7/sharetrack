
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/location-sharing';

console.log('Testing connection to:', MONGODB_URI);

async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
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
