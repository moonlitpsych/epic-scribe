/**
 * Script to Add Staffing Config to HMHI RCC Intake Template
 *
 * This script updates the HMHI Downtown RCC Intake template with inline staffing config.
 *
 * Prerequisites:
 * 1. Run migration 005_add_staffing_config.sql in Supabase dashboard:
 *    ALTER TABLE templates ADD COLUMN IF NOT EXISTS staffing_config JSONB;
 *
 * 2. Make sure .env file has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local file (in apps/web directory)
const envPath = join(__dirname, '../.env.local');
console.log('📂 Loading environment from:', envPath);
config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('Make sure .env file exists and contains these variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔑 Connected to Supabase');

async function updateHMHITemplate() {
  console.log('\n📝 Updating HMHI Downtown RCC Intake template with staffing config...');

  // Find the HMHI RCC Intake template
  const { data: template, error: fetchError } = await supabase
    .from('templates')
    .select('*')
    .eq('setting', 'HMHI Downtown RCC')
    .eq('visit_type', 'Intake')
    .eq('active', true)
    .single();

  if (fetchError) {
    console.error('❌ Failed to find HMHI RCC Intake template:', fetchError);
    return false;
  }

  if (!template) {
    console.error('❌ HMHI RCC Intake template not found');
    return false;
  }

  console.log(`✓ Found template: ${template.name} (ID: ${template.id})`);

  // Define the staffing config
  const staffingConfig = {
    mode: 'inline',
    visitTypes: ['Intake'],
    markers: [
      'supervising doctor',
      'staff this',
      'talk with my attending',
      'discuss with my supervisor',
      'go talk with'
    ],
    weight: 'heavy'
  };

  console.log('\n📋 Staffing config to be added:');
  console.log(JSON.stringify(staffingConfig, null, 2));

  // Update the template
  const { error: updateError } = await supabase
    .from('templates')
    .update({
      staffing_config: staffingConfig,
      version: template.version + 1
    })
    .eq('id', template.id);

  if (updateError) {
    console.error('\n❌ Failed to update template:', updateError);
    console.error('\nIf you see "column does not exist", run this SQL in Supabase dashboard:');
    console.error('ALTER TABLE templates ADD COLUMN IF NOT EXISTS staffing_config JSONB;');
    return false;
  }

  console.log('\n✅ Successfully added staffing config to HMHI RCC Intake template');
  return true;
}

async function main() {
  console.log('🚀 Starting staffing config update...\n');

  try {
    const success = await updateHMHITemplate();

    if (success) {
      console.log('\n✅ Update completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Test note generation with HMHI RCC Intake');
      console.log('2. Verify staffing conversation detection works');
      console.log('3. Check that Plan section uses attending recommendations');
    } else {
      console.log('\n⚠️  Update failed - see errors above');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();
