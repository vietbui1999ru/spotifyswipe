// Quick test script to verify Supabase connection
// Run with: npx tsx test-supabase.ts

import { supabase } from './src/lib/supabase';

async function testConnection() {
  console.log('Testing Supabase connection...');

  // Test 1: Check if playlists table exists
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure you:');
    console.log('1. Set up environment variables in .env.local');
    console.log('2. Ran the supabase-schema.sql in your Supabase SQL Editor');
  } else {
    console.log('✅ Successfully connected to Supabase!');
    console.log('✅ Playlists table exists');
    console.log(`Found ${data.length} playlist(s)`);
  }
}

testConnection();
