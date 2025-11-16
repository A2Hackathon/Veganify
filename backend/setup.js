// setup.js - Quick setup script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌱 Sprout Backend Setup\n');

// Check if .env already exists
const envPath = path.join(__dirname, '.env');

// Get inputs from command line arguments
const args = process.argv.slice(2);
let mongoUri = args.find(arg => arg.startsWith('MONGO_URI='))?.split('=')[1]?.replace(/^["']|["']$/g, '');
let geminiKey = args.find(arg => arg.startsWith('GEMINI_API_KEY='))?.split('=')[1]?.replace(/^["']|["']$/g, '');
let port = args.find(arg => arg.startsWith('PORT='))?.split('=')[1]?.replace(/^["']|["']$/g, '') || '4000';

// If .env exists and no arguments provided, ask to overwrite
if (fs.existsSync(envPath) && (!mongoUri && !geminiKey)) {
  console.log('⚠️  .env file already exists!');
  console.log('   To recreate it, run: node setup.js MONGO_URI="..." GEMINI_API_KEY="..."\n');
  process.exit(0);
}

// If both values provided, create .env file
if (mongoUri && geminiKey) {
  const envContent = `# MongoDB Connection String
MONGO_URI=${mongoUri}

# Google Gemini API Key
GEMINI_API_KEY=${geminiKey}

# Server Port
PORT=${port}
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file with your API keys!');
  console.log('   MongoDB URI: ' + (mongoUri.length > 50 ? mongoUri.substring(0, 50) + '...' : mongoUri));
  console.log('   Gemini API Key: ' + (geminiKey.length > 20 ? geminiKey.substring(0, 20) + '...' : geminiKey));
  console.log('   Port: ' + port);
  console.log('\n🚀 Ready to start! Run: npm start\n');
} else {
  // Create template if values not provided
  console.log('📝 Creating .env template file...');
  console.log('   Usage: node setup.js MONGO_URI="your_uri" GEMINI_API_KEY="your_key"\n');
  
  const template = `# MongoDB Connection String
# Get this from MongoDB Atlas: https://www.mongodb.com/cloud/atlas
# Format: mongodb+srv://username:password@cluster.mongodb.net/sprout?retryWrites=true&w=majority
MONGO_URI=your_mongodb_connection_string_here

# Google Gemini API Key
# Get this from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Server Port (optional, defaults to 4000)
PORT=4000
`;

  fs.writeFileSync(envPath, template);
  console.log('✅ Created .env template file!');
  console.log('   Next steps:');
  console.log('   1. Edit .env and add your MongoDB URI');
  console.log('   2. Edit .env and add your Gemini API Key');
  console.log('   3. Run: npm start\n');
  console.log('   OR run: node setup.js MONGO_URI="..." GEMINI_API_KEY="..."\n');
}

