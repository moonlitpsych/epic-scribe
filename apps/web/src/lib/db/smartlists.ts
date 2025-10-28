/**
 * SmartList Database Service
 *
 * Handles all SmartList CRUD operations with Supabase.
 * Migrates from file-based storage to persistent database.
 */

import { supabase } from '../supabase';
import { SmartList, NewSmartList, UpdateSmartList } from '../database.types';

export interface SmartListOption {
  value: string;
  order: number;
  is_default?: boolean;
}

export interface SmartListWithOptions extends SmartList {
  options: SmartListOption[];
}

/**
 * Get all active SmartLists
 */
export async function getAllSmartLists(): Promise<SmartListWithOptions[]> {
  const { data, error } = await supabase
    .from('smartlists')
    .select('*')
    .eq('active', true)
    .order('group_name', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching SmartLists:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single SmartList by identifier
 */
export async function getSmartListByIdentifier(identifier: string): Promise<SmartListWithOptions | null> {
  const { data, error } = await supabase
    .from('smartlists')
    .select('*')
    .eq('identifier', identifier)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore 'no rows returned' error
    console.error('Error fetching SmartList:', error);
    throw error;
  }

  return data;
}

/**
 * Get a single SmartList by Epic ID
 */
export async function getSmartListByEpicId(epicId: string): Promise<SmartListWithOptions | null> {
  const { data, error } = await supabase
    .from('smartlists')
    .select('*')
    .eq('epic_id', epicId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching SmartList:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new SmartList
 */
export async function createSmartList(smartList: NewSmartList): Promise<SmartList> {
  const { data, error } = await supabase
    .from('smartlists')
    .insert(smartList)
    .select()
    .single();

  if (error) {
    console.error('Error creating SmartList:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing SmartList
 */
export async function updateSmartList(id: string, updates: UpdateSmartList): Promise<SmartList> {
  const { data, error } = await supabase
    .from('smartlists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating SmartList:', error);
    throw error;
  }

  return data;
}

/**
 * Delete (soft delete) a SmartList
 */
export async function deleteSmartList(id: string): Promise<void> {
  const { error } = await supabase
    .from('smartlists')
    .update({ active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting SmartList:', error);
    throw error;
  }
}

/**
 * Track SmartList value usage
 */
export async function trackSmartListUsage(
  smartlistId: string,
  selectedValue: string,
  context?: string,
  encounterId?: string
): Promise<void> {
  const { error } = await supabase
    .from('smartlist_values')
    .insert({
      smartlist_id: smartlistId,
      selected_value: selectedValue,
      context,
      encounter_id: encounterId,
    });

  if (error) {
    console.error('Error tracking SmartList usage:', error);
    // Don't throw - this is non-critical tracking
  }
}

/**
 * Migrate SmartLists from JSON file to database (one-time operation)
 */
export async function migrateSmartListsFromJSON(jsonSmartLists: Record<string, any>): Promise<void> {
  const smartListsToInsert: NewSmartList[] = [];

  for (const [key, value] of Object.entries(jsonSmartLists)) {
    // Check if already exists
    const existing = await getSmartListByIdentifier(value.identifier);
    if (existing) {
      console.log(`SmartList ${value.identifier} already exists, skipping`);
      continue;
    }

    smartListsToInsert.push({
      identifier: value.identifier,
      epic_id: value.epicId,
      display_name: value.displayName,
      group_name: value.group || null,
      options: value.options || [],
      metadata: {
        importedFrom: 'smartlists-catalog.json',
        importedAt: new Date().toISOString(),
      },
      active: true,
    });
  }

  if (smartListsToInsert.length > 0) {
    const { error } = await supabase
      .from('smartlists')
      .insert(smartListsToInsert);

    if (error) {
      console.error('Error migrating SmartLists:', error);
      throw error;
    }

    console.log(`Successfully migrated ${smartListsToInsert.length} SmartLists to database`);
  } else {
    console.log('No new SmartLists to migrate');
  }
}

/**
 * Get SmartLists grouped by category
 */
export async function getSmartListsByGroup(): Promise<Record<string, SmartListWithOptions[]>> {
  const allSmartLists = await getAllSmartLists();

  const grouped: Record<string, SmartListWithOptions[]> = {};

  for (const smartList of allSmartLists) {
    const group = smartList.group_name || 'Other';
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(smartList);
  }

  return grouped;
}