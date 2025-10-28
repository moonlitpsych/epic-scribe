import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTemplates,
  getTemplateBySettingAndVisitType,
  createTemplate,
  updateTemplate,
  updateTemplateSection,
  migrateTemplatesFromMemory
} from '@/lib/db/templates';

// Fallback to in-memory service if database is not available
import { templateService } from '@epic-scribe/note-service/src/templates/template-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const setting = searchParams.get('setting');
    const visitType = searchParams.get('visitType');

    // Try database first
    try {
      if (setting && visitType) {
        const template = await getTemplateBySettingAndVisitType(setting, visitType);
        if (!template) {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        return NextResponse.json(template);
      }

      const allTemplates = await getAllTemplates();
      return NextResponse.json(allTemplates);
    } catch (dbError) {
      console.log('Database not available, falling back to in-memory service:', dbError);

      // Fallback to in-memory service
      if (setting && visitType) {
        const template = templateService.getTemplate(setting, visitType);
        if (!template) {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        return NextResponse.json(template);
      }

      const allTemplates = templateService.listTemplates();
      return NextResponse.json(allTemplates);
    }
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { templateId, sectionName, content, editReason } = await request.json();

    // Try database first
    try {
      // Get template ID from database
      const templates = await getAllTemplates();
      const template = templates.find(t => t.template_id === templateId);

      if (!template) {
        // Template not in database - throw to trigger fallback
        throw new Error(`Template ${templateId} not found in database`);
      }

      const updatedTemplate = await updateTemplateSection(
        template.id,
        sectionName,
        content,
        editReason
      );

      return NextResponse.json(updatedTemplate);
    } catch (dbError) {
      console.log('Database not available or template not in DB, falling back to in-memory service:', dbError);

      // Fallback to in-memory service
      const updated = templateService.updateSection(templateId, sectionName, content);
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
      }

      const template = templateService.getTemplateById(templateId);
      return NextResponse.json(template);
    }
  } catch (error) {
    console.error('Error updating template section:', error);
    return NextResponse.json(
      { error: 'Failed to update template section' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'migrate': {
        // Migrate all in-memory templates to database
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
        return NextResponse.json({ success: true, migrated: Object.keys(templatesObj).length });
      }

      case 'create': {
        const template = await createTemplate(data);
        return NextResponse.json(template);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing template action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    );
  }
}