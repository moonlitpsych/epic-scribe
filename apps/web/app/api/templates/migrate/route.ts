import { NextResponse } from 'next/server';
import { getAllTemplates } from '@/lib/db/templates';
import { templateService } from '@epic-scribe/note-service/src/templates/template-service';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    // Check how many templates are in the database
    let dbTemplates;
    try {
      dbTemplates = await getAllTemplates();
    } catch (error) {
      console.error('Error checking database templates:', error);
      dbTemplates = [];
    }

    console.log(`Found ${dbTemplates.length} templates in database`);

    // Get templates from in-memory service
    const memoryTemplates = templateService.listTemplates();
    console.log(`Found ${memoryTemplates.length} templates in memory`);

    if (dbTemplates.length > 0) {
      return NextResponse.json({
        message: 'Templates already exist in database',
        databaseCount: dbTemplates.length,
        memoryCount: memoryTemplates.length,
      });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Migrate each template
    const migrated = [];
    for (const template of memoryTemplates) {
      const templateId = `${template.setting}_${template.visitType}`
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      const { data, error } = await supabaseAdmin
        .from('templates')
        .insert({
          template_id: templateId,
          name: template.name,
          setting: template.setting,
          visit_type: template.visitType,
          version: template.version || 1,
          sections: template.sections,
          smarttools: template.smarttools || null,
          active: true,
          created_by: 'migration',
        })
        .select()
        .single();

      if (error) {
        console.error(`Error migrating template ${templateId}:`, error);
        throw error;
      }

      migrated.push(data);
    }

    return NextResponse.json({
      message: 'Templates migrated successfully',
      migratedCount: migrated.length,
      templates: migrated.map((t) => t.template_id),
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Just check status
    const dbTemplates = await getAllTemplates().catch(() => []);
    const memoryTemplates = templateService.listTemplates();

    return NextResponse.json({
      database: {
        count: dbTemplates.length,
        templates: dbTemplates.map((t) => ({
          id: t.template_id,
          name: t.name,
          setting: t.setting,
          visitType: t.visit_type,
        })),
      },
      memory: {
        count: memoryTemplates.length,
        templates: memoryTemplates.map((t) => ({
          setting: t.setting,
          visitType: t.visitType,
          name: t.name,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
