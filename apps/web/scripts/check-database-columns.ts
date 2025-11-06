#!/usr/bin/env tsx

/**
 * Script to check if the note saving columns exist in the database
 * Run with: tsx scripts/check-database-columns.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDatabaseColumns() {
  console.log('Checking database columns for note saving functionality...\n');

  try {
    // Try to query the generated_notes table with the new columns
    const { data, error } = await supabase
      .from('generated_notes')
      .select('id, generated_content, final_note_content, is_final, finalized_at, finalized_by')
      .limit(1);

    if (error) {
      console.error('❌ Error querying generated_notes table:');
      console.error(error);

      if (error.message.includes('column') && (
        error.message.includes('generated_content') ||
        error.message.includes('final_note_content') ||
        error.message.includes('is_final')
      )) {
        console.log('\n⚠️  The required columns for note saving do not exist!');
        console.log('📋 Please run the following migration in Supabase Dashboard:');
        console.log('   supabase/migrations/010_add_note_content_fields.sql');
        return false;
      }
    } else {
      console.log('✅ All required columns exist in generated_notes table');
      console.log('   - generated_content');
      console.log('   - final_note_content');
      console.log('   - is_final');
      console.log('   - finalized_at');
      console.log('   - finalized_by');

      // Check if there are any saved notes
      const { count } = await supabase
        .from('generated_notes')
        .select('*', { count: 'exact', head: true })
        .eq('is_final', true);

      console.log(`\n📊 Found ${count || 0} finalized notes in the database`);
      return true;
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

checkDatabaseColumns();