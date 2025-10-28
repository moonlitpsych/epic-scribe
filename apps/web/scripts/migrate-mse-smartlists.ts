#!/usr/bin/env tsx
/**
 * MSE SmartLists Migration Script
 *
 * Migrates Mental Status Examination SmartLists from mse-smartlists.json
 * into the Supabase database for durable storage.
 *
 * Usage: pnpm migrate:mse
 */

// CRITICAL: Load environment variables FIRST, before ANY other imports
// This must happen before supabase.ts is loaded
import dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load .env.local from the web app directory
const envPath = resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

interface MSESmartList {
  identifier: string;
  epicId: string;
  displayName: string;
  group: string;
  options: Array<{
    value: string;
    order: number;
    is_default?: boolean;
  }>;
}

async function main() {
  console.log('🚀 Starting MSE SmartLists migration...\n');
  console.log(`📂 Loading environment from: ${envPath}`);
  console.log(`🔑 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'loaded ✅' : 'missing ❌'}`);
  console.log(`🔑 Supabase Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'loaded ✅' : 'missing ❌'}\n`);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Error: Supabase environment variables not found in .env.local');
    console.error('Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
    process.exit(1);
  }

  // Dynamic import AFTER env vars are loaded
  const { migrateSmartListsFromJSON } = await import('../src/lib/db/smartlists');

  // Read the MSE SmartLists JSON file from project root
  const rootDir = resolve(__dirname, '../../../');
  const jsonPath = resolve(rootDir, 'mse-smartlists.json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Error: mse-smartlists.json not found at ${jsonPath}`);
    process.exit(1);
  }

  console.log(`📖 Reading SmartLists from: ${jsonPath}`);
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const mseSmartLists: MSESmartList[] = JSON.parse(jsonContent);

  console.log(`📊 Found ${mseSmartLists.length} MSE SmartLists to migrate:\n`);

  // Display summary
  mseSmartLists.forEach((sl, idx) => {
    console.log(`   ${idx + 1}. ${sl.displayName} (${sl.epicId}) - ${sl.options.length} options`);
  });

  // Convert array format to keyed object format for migrateSmartListsFromJSON
  const smartListsObject: Record<string, any> = {};
  mseSmartLists.forEach((sl) => {
    smartListsObject[sl.identifier] = {
      identifier: sl.identifier,
      epicId: sl.epicId,
      displayName: sl.displayName,
      group: sl.group,
      options: sl.options,
    };
  });

  console.log('\n💾 Migrating to Supabase database...');

  try {
    await migrateSmartListsFromJSON(smartListsObject);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Visit http://localhost:3002/smartlists to verify');
    console.log('   2. Test SmartList modals in template editor');
    console.log('   3. Confirm all MSE options load correctly\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the migration
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
