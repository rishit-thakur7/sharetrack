const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');


const envPath = path.join(__dirname, '.env');
console.log('Looking for .env at:', envPath);


if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('File content:');
  console.log(envContent);
  
  const lines = envContent.split('\n');
  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
      console.log('Set environment variable:', key.trim(), '=', value.trim());
    }
  });
} else {
  console.log('❌ .env file not found!');
}

console.log('PORT from env:', process.env.PORT);
console.log('MONGODB_URI from env:', process.env.MONGODB_URI);

async function testConnection() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/location-sharing';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
