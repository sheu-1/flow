// Simple Node.js script to test Supabase connection
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://seuisiltnncoauyzrvsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNldWlzaWx0bm5jb2F1eXpydnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NzIxMTgsImV4cCI6MjA3NTM0ODExOH0.mgR9dFT9vb9BSbYzazdBYgKJ9_57vrRzibpHZox9R-Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🧪 Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('transactions').select('count').limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      
      if (error.message.includes('relation "public.transactions" does not exist')) {
        console.log('💡 Solution: Run the database migration script in Supabase SQL Editor');
        console.log('   1. Go to https://seuisiltnncoauyzrvsn.supabase.co');
        console.log('   2. Open SQL Editor');
        console.log('   3. Copy and paste the entire supabase_clean_install.sql file');
        console.log('   4. Click Run');
      }
      
      return false;
    }
    
    console.log('✅ Database connection successful!');
    return true;
    
  } catch (err) {
    console.error('❌ Network error:', err.message);
    console.log('💡 Check your internet connection and Supabase project status');
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('🎉 Your database is ready to use!');
  } else {
    console.log('🔧 Please fix the issues above and try again');
  }
  process.exit(success ? 0 : 1);
});
