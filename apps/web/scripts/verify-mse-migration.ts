#!/usr/bin/env tsx
/**
 * Verify MSE SmartLists Migration
 *
 * Checks that all MSE SmartLists were successfully migrated to Supabase
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
const envPath = resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

async function verify() {
  console.log('🔍 Verifying MSE SmartLists migration...\n');

  const { getAllSmartLists, getSmartListsByGroup } = await import('../src/lib/db/smartlists');

  try {
    // Get all SmartLists
    const allSmartLists = await getAllSmartLists();
    console.log(`📊 Total SmartLists in database: ${allSmartLists.length}`);

    // Get MSE SmartLists
    const grouped = await getSmartListsByGroup();
    const mseSmartLists = grouped['Mental Status Examination'] || [];

    console.log(`🧠 MSE SmartLists found: ${mseSmartLists.length}\n`);

    if (mseSmartLists.length > 0) {
      console.log('✅ MSE SmartLists successfully migrated:\n');
      mseSmartLists.forEach((sl, idx) => {
        console.log(`   ${idx + 1}. ${sl.display_name} (${sl.epic_id})`);
        console.log(`      - Identifier: ${sl.identifier}`);
        console.log(`      - Options: ${(sl.options as any[])?.length || 0}`);
        console.log('');
      });
    } else {
      console.log('❌ No MSE SmartLists found in database!');
      console.log('   Please run: pnpm migrate:mse');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

verify();
