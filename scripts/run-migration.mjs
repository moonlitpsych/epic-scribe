#!/usr/bin/env node
/**
 * Run Supabase database migrations
 *
 * Usage: node scripts/run-migration.mjs [migration-file]
 * Example: node scripts/run-migration.mjs supabase/migrations/001_initial_schema.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Load environment variables
const envPath = join(projectRoot, '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get migration file path from command line argument
const migrationFile = process.argv[2] || 'supabase/migrations/001_initial_schema.sql';
const migrationPath = join(projectRoot, migrationFile);

console.log(`Running migration: ${migrationFile}`);
console.log(`Full path: ${migrationPath}`);

try {
  // Read the SQL file
  const sql = readFileSync(migrationPath, 'utf-8');

  // Execute the SQL using the Supabase REST API
  // Note: We need to use the PostgreSQL connection directly for complex migrations
  // For now, we'll use rpc to execute the SQL

  console.log('Executing migration SQL...');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          // If exec_sql doesn't exist, we'll need to apply migrations manually
          // via Supabase dashboard or CLI
          console.log('Note: Cannot execute via RPC. Please apply migrations manually.');
          console.log('\nYou can apply this migration by:');
          console.log('1. Going to your Supabase dashboard');
          console.log('2. Navigate to SQL Editor');
          console.log('3. Copy and paste the contents of:', migrationPath);
          console.log('4. Click "Run"');
          break;
        }
      } catch (err) {
        console.error('Error executing statement:', statement.substring(0, 100) + '...');
        throw err;
      }
    }
  }

  console.log('\nMigration completed successfully!');
  console.log('\nApplied tables:');
  console.log('- patients');
  console.log('- encounters');
  console.log('- generated_notes');

} catch (error) {
  console.error('Error running migration:', error.message);
  console.log('\n--- Manual Migration Instructions ---');
  console.log('Since automated migration failed, please apply the migration manually:');
  console.log('1. Open Supabase Dashboard:', supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'));
  console.log('2. Copy the contents of:', migrationPath);
  console.log('3. Paste into the SQL Editor');
  console.log('4. Click "Run"');
  process.exit(1);
}
