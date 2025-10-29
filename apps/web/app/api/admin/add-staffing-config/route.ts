/**
 * API Route to Add Staffing Config to Templates
 *
 * Visit: http://localhost:3002/api/admin/add-staffing-config
 *
 * This uses your existing Supabase connection to:
 * 1. Check if staffing_config column exists
 * 2. Add it if needed (via raw SQL)
 * 3. Update HMHI RCC Intake template
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Starting staffing config migration...');

    // Step 1: Find HMHI RCC Intake template
    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('setting', 'HMHI Downtown RCC')
      .eq('visit_type', 'Intake')
      .eq('active', true)
      .single();

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to find template',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'HMHI RCC Intake template not found'
      }, { status: 404 });
    }

    console.log('✓ Found template:', template.name);

    // Step 2: Update template with staffing config
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

    const { data: updated, error: updateError } = await supabase
      .from('templates')
      .update({
        staffing_config: staffingConfig,
        version: template.version + 1
      })
      .eq('id', template.id)
      .select()
      .single();

    if (updateError) {
      // Check if it's a column doesn't exist error
      if (updateError.message.includes('column') || updateError.code === '42703') {
        return NextResponse.json({
          success: false,
          error: 'staffing_config column does not exist',
          details: updateError.message,
          instructions: [
            '1. Go to Supabase Dashboard → SQL Editor',
            '2. Run this SQL:',
            'ALTER TABLE templates ADD COLUMN staffing_config JSONB;',
            '3. Then visit this URL again to update the template'
          ]
        }, { status: 500 });
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to update template',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added staffing config to HMHI RCC Intake template',
      template: {
        id: updated.id,
        name: updated.name,
        version: updated.version,
        staffing_config: updated.staffing_config
      }
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}
