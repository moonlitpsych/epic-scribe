import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSmartLists,
  getSmartListByIdentifier,
  getSmartListByEpicId,
  getSmartListsByGroup
} from '@/lib/db/smartlists';

// Try to use database first, fallback to file-based service if needed
import { getSmartListService } from '@epic-scribe/note-service/src/smartlists/smartlist-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const group = searchParams.get('group');
    const id = searchParams.get('id');
    const epicId = searchParams.get('epicId');

    // Try database first
    try {
      if (id) {
        const smartList = await getSmartListByIdentifier(id);
        if (!smartList) {
          // Not found in database - throw to trigger fallback
          throw new Error('Not found in database, trying file-based');
        }
        return NextResponse.json(smartList);
      }

      if (epicId) {
        const smartList = await getSmartListByEpicId(epicId);
        if (!smartList) {
          // Try fallback to file-based service before returning 404
          throw new Error('Not found in database, trying file-based');
        }
        // Return as array for consistency with file-based service
        return NextResponse.json([smartList]);
      }

      if (group) {
        const grouped = await getSmartListsByGroup();
        const smartLists = grouped[group] || [];
        // If database is empty, fall back to file-based service
        if (smartLists.length === 0) {
          throw new Error('No SmartLists in database, trying file-based');
        }
        return NextResponse.json(smartLists);
      }

      const allSmartLists = await getAllSmartLists();
      // If database is empty, fall back to file-based service
      if (allSmartLists.length === 0) {
        throw new Error('Database empty, falling back to file-based service');
      }
      return NextResponse.json(allSmartLists);
    } catch (dbError) {
      console.log('Database not available, falling back to file-based service:', dbError);

      // Fallback to file-based service
      const service = await getSmartListService();

      if (id) {
        const smartList = service.getSmartList(id);
        if (!smartList) {
          return NextResponse.json({ error: 'SmartList not found' }, { status: 404 });
        }
        return NextResponse.json(smartList);
      }

      if (epicId) {
        const smartList = service.getSmartListByEpicId(epicId);
        if (!smartList) {
          return NextResponse.json({ error: 'SmartList not found' }, { status: 404 });
        }
        // Return as array for consistency
        return NextResponse.json([smartList]);
      }

      if (group) {
        const smartLists = service.getSmartListsByGroup(group);
        return NextResponse.json(smartLists);
      }

      const allSmartLists = service.getAllSmartLists();
      return NextResponse.json(allSmartLists);
    }
  } catch (error) {
    console.error('Error fetching SmartLists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SmartLists' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const smartLists = await request.json();

    // Save to database
    try {
      const { migrateSmartListsFromJSON } = await import('@/lib/db/smartlists');
      await migrateSmartListsFromJSON(smartLists);
      return NextResponse.json({ success: true, storage: 'database' });
    } catch (dbError) {
      console.log('Database save failed, falling back to file-based storage:', dbError);

      // Fallback to file-based service
      const service = await getSmartListService();
      await service.saveConfig(smartLists);
      return NextResponse.json({ success: true, storage: 'file' });
    }
  } catch (error) {
    console.error('Error updating SmartLists:', error);
    return NextResponse.json(
      { error: 'Failed to update SmartLists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = await getSmartListService();
    const { action, ...data } = await request.json();

    switch (action) {
      case 'recordValue': {
        const { smartListId, selectedValue, context } = data;
        const value = await service.recordValue(smartListId, selectedValue, context);
        return NextResponse.json(value);
      }

      case 'exportForPrompt': {
        const { smartListIds } = data;
        const prompt = service.exportAllForPrompt(smartListIds);
        return NextResponse.json({ prompt });
      }

      case 'validateSelections': {
        const { noteContent } = data;
        const result = service.validateSelections(noteContent);
        return NextResponse.json(result);
      }

      case 'exportCSV': {
        const csv = await service.exportToCSV();
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="smartlists.csv"',
          },
        });
      }

      case 'importCSV': {
        const { csvContent } = data;
        await service.importFromCSV(csvContent);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing SmartList action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    );
  }
}