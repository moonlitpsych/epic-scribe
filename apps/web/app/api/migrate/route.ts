/**
 * One-time migration endpoint to load existing data into Supabase
 *
 * This endpoint migrates:
 * 1. SmartLists from smartlists-catalog.json
 * 2. Templates from in-memory service
 *
 * Run this once after setting up Supabase by visiting:
 * http://localhost:3002/api/migrate
 */

import { NextRequest, NextResponse } from 'next/server';
import { migrateSmartListsFromJSON } from '@/lib/db/smartlists';
import { migrateTemplatesFromMemory } from '@/lib/db/templates';
import { templateService } from '@epic-scribe/note-service/src/templates/template-service';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const results = {
      smartlists: { success: false, count: 0, error: null as string | null },
      templates: { success: false, count: 0, error: null as string | null }
    };

    // Migrate SmartLists
    try {
      const catalogPath = path.join(process.cwd(), 'configs', 'smartlists-catalog.json');
      const catalogData = await fs.readFile(catalogPath, 'utf-8');
      const catalog = JSON.parse(catalogData);

      if (catalog.smartLists) {
        await migrateSmartListsFromJSON(catalog.smartLists);
        results.smartlists.success = true;
        results.smartlists.count = Object.keys(catalog.smartLists).length;
      }
    } catch (error) {
      console.error('Error migrating SmartLists:', error);
      results.smartlists.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Migrate Templates
    try {
      const allTemplates = templateService.listTemplates();
      const templatesObj: Record<string, any> = {};

      allTemplates.forEach((template: any) => {
        templatesObj[template.templateId] = {
          ...template,
          setting: template.setting,
          visitType: template.visitType
        };
      });

      await migrateTemplatesFromMemory(templatesObj);
      results.templates.success = true;
      results.templates.count = Object.keys(templatesObj).length;
    } catch (error) {
      console.error('Error migrating templates:', error);
      results.templates.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Return migration results
    return NextResponse.json({
      message: 'Migration completed',
      results,
      nextSteps: [
        'Check the Supabase dashboard to verify data',
        'Test the /templates page to ensure persistence',
        'Test the /smartlists page to ensure persistence',
        'Generate a note to verify everything works end-to-end'
      ]
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}