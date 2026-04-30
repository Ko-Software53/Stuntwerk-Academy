import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEdgeFunction() {
  console.log('Invoking delete-user edge function...');
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: {
      userId: '11111111-1111-1111-1111-111111111111'
    },
    headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  console.log('Result:', { data });
  if (error) {
    console.error('Error details:', error);
    if (error.context && typeof error.context.text === 'function') {
        const text = await error.context.text();
        console.error('Error body:', text);
    }
  }
}

testEdgeFunction();
