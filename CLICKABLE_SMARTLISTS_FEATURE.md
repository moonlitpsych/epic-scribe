# Clickable SmartLists in Template Sections - Feature Documentation

## Overview
SmartLists in the Template Sections view are now clickable and editable directly from the templates page at `localhost:3002/templates`. This feature significantly improves usability by allowing users to view and modify SmartList options without navigating away from the template editor.

## Implementation Date
October 27, 2025

## Feature Description

### User Experience
1. **Browse Template Sections**: When viewing templates at `/templates`, SmartLists appear as purple badges showing their display names (e.g., "Sleep Pattern" instead of just the Epic ID)
2. **Click to View/Edit**: Clicking on any SmartList badge opens a modal with:
   - Display name and Epic ID
   - All available options with their order
   - Default option highlighted
   - Drag-and-drop reordering capability
   - Add/remove options functionality
   - Link to full SmartList editor

### Technical Implementation

#### New Component: SmartListEditModal
**Location**: `/apps/web/src/components/SmartListEditModal.tsx`

**Features**:
- Fetches SmartList data from API (`/api/smartlists?epicId={id}`)
- Supports both read-only and edit modes
- Drag-and-drop reordering using @dnd-kit
- Saves changes back to database via PUT `/api/smartlists`
- Moonlit design system styling (terracotta, navy, cream, tan colors)
- Loading states and error handling
- Graceful fallback for missing SmartLists

#### Updated Component: TemplateEditor
**Location**: `/apps/web/src/components/TemplateEditor.tsx`

**Changes**:
- SmartList badges now render as clickable buttons
- Parse SmartList display names from template content
- State management for modal visibility
- Click handler to open SmartListEditModal
- Hover effects and focus states for accessibility

## Usage Instructions

### For Users
1. Navigate to `http://localhost:3002/templates`
2. Select a Setting and Visit Type to load a template
3. In the Template Sections view, look for purple SmartList badges
4. Click on any SmartList badge to view its options
5. In the modal, you can:
   - View all available options
   - Click "Edit Options" to modify the SmartList
   - Drag options to reorder them
   - Add new options with the "Add Option" button
   - Delete options with the trash icon
   - Set a default option
   - Save changes to persist to the database

### For Developers

#### API Endpoints Used
- `GET /api/smartlists?epicId={id}` - Fetch SmartList by Epic ID
- `PUT /api/smartlists` - Update SmartList configuration

#### Key Functions
```typescript
// In TemplateEditor.tsx
handleSmartListClick(epicId: string, displayName?: string)
handleSmartListSave()

// In SmartListEditModal.tsx
fetchSmartList(epicId: string)
handleSave()
handleDragEnd(event: DragEndEvent)
```

## Database Integration
The feature uses the existing Supabase database structure:
- SmartLists are fetched from the `smartlists` table
- Changes are persisted to the database
- File-based fallback ensures continuity if database is unavailable

## Design System
Follows the Moonlit design system:
- **Terracotta** (#E89C8A): Accent color for actions
- **Navy** (#0A1F3D): Headers and labels
- **Cream** (#F5F1ED): Modal header background
- **Tan** (#C5A882): Primary action buttons
- **Success colors**: Mint green for default options
- **Error colors**: Light coral for error messages

## Benefits
1. **Improved Workflow**: No need to navigate to separate SmartList editor
2. **Contextual Editing**: See how SmartLists are used while editing them
3. **Faster Updates**: Quick edits without leaving the template view
4. **Better Discovery**: Users can explore SmartList options while building templates
5. **Consistent UX**: Uses same modal patterns as QuickAddSmartList

## Known Limitations
1. Modal shows one SmartList at a time
2. Changes don't immediately reflect in the template text (requires page refresh)
3. No bulk editing of multiple SmartLists

## Future Enhancements
1. Real-time template updates when SmartList is saved
2. Bulk operations for multiple SmartLists
3. Usage analytics (show most commonly selected options)
4. SmartList search/filter in the modal
5. Keyboard shortcuts for quick navigation

## Testing Checklist
- [x] SmartList badges are clickable in Template Sections
- [x] Modal opens with correct SmartList data
- [x] Options display in correct order
- [x] Drag-and-drop reordering works
- [x] Add/delete options functionality
- [x] Save persists to database
- [x] Error handling for missing SmartLists
- [x] Loading states display correctly
- [x] Modal closes properly
- [x] Moonlit styling applied throughout

## Related Files
- `/apps/web/src/components/SmartListEditModal.tsx` - New modal component
- `/apps/web/src/components/TemplateEditor.tsx` - Updated with click handlers
- `/apps/web/src/lib/moonlit-theme.ts` - Design system colors
- `/apps/web/app/api/smartlists/route.ts` - API endpoints

## Support
For issues or questions about this feature, please check:
- The SmartList editor at `/smartlists` for full editing capabilities
- The database status in CLAUDE.md for persistence issues
- The console for any API errors when fetching/saving SmartLists