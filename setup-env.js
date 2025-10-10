#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Cashflow Tracker Environment Setup\n');

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setupEnvironment() {
  try {
    const envPath = path.join(__dirname, '.env');
    
    // Check if .env already exists
    if (fs.existsSync(envPath)) {
      console.log('⚠️  .env file already exists!');
      const overwrite = await askQuestion('Do you want to overwrite it? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    }

    console.log('\n📋 Please provide your Supabase credentials:');
    console.log('   Get these from: https://supabase.com/dashboard/project/your-project/settings/api\n');

    const supabaseUrl = await askQuestion('Supabase URL (https://your-project.supabase.co): ');
    const supabaseKey = await askQuestion('Supabase Anon Key: ');
    
    console.log('\n🤖 Optional: OpenRouter API Key for AI features');
    const openrouterKey = await askQuestion('OpenRouter API Key (press Enter to skip): ');

    // Validate inputs
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase URL and Anon Key are required!');
      rl.close();
      return;
    }

    if (!supabaseUrl.includes('supabase.co')) {
      console.log('⚠️  Warning: URL doesn\'t look like a Supabase URL');
    }

    // Create .env content
    const envContent = `# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=${supabaseUrl}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${supabaseKey}

# OpenRouter API for AI features (optional)
${openrouterKey ? `EXPO_PUBLIC_OPENROUTER_API_KEY=${openrouterKey}` : '# EXPO_PUBLIC_OPENROUTER_API_KEY=your-key-here'}

# Generated on ${new Date().toISOString()}
`;

    // Write .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Environment file created successfully!');
    console.log('📁 Created: .env');
    console.log('\n🔄 Next steps:');
    console.log('   1. Restart your Expo development server');
    console.log('   2. Test the connection in Settings > Supabase Connection Test');
    console.log('   3. If connection fails, check the troubleshooting guide in docs/SUPABASE_SETUP.md');

  } catch (error) {
    console.error('❌ Error setting up environment:', error.message);
  } finally {
    rl.close();
  }
}

setupEnvironment();
