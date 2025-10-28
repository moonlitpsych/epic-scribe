import { SmartList, SmartListOption } from '@epic-scribe/types';
import fs from 'fs/promises';
import path from 'path';

export interface SmartListValue {
  smartListId: string;
  epicId: string;
  selectedValue: string;
  selectedAt: Date;
  context?: string;
}

export class SmartListService {
  private configPath: string;
  private valuePath: string;
  private smartLists: Map<string, SmartList> = new Map();
  private values: Map<string, SmartListValue[]> = new Map();

  constructor(
    configPath: string = path.join(process.cwd(), 'configs', 'smartlists-catalog.json'),
    valuePath: string = path.join(process.cwd(), 'data', 'smartlist-values.json')
  ) {
    this.configPath = configPath;
    this.valuePath = valuePath;
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    await this.loadValues();
  }

  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const catalog = JSON.parse(data);

      // Helper function to add a SmartList
      const addSmartList = (key: string, list: any) => {
        if (list && list.epicId && list.options) {
          const smartList = {
            identifier: list.identifier || key,
            epicId: list.epicId,
            displayName: list.displayName || list.identifier || key,
            group: list.group,
            options: list.options,
          };
          // Use epicId as the key for lookups (it's guaranteed unique)
          // Store by both epicId and identifier for backwards compatibility
          this.smartLists.set(smartList.epicId, smartList);
          if (smartList.identifier) {
            this.smartLists.set(smartList.identifier, smartList);
          }
        }
      };

      // Load SmartLists from the nested .smartLists object
      let nestedCount = 0;
      if (catalog.smartLists) {
        Object.entries(catalog.smartLists).forEach(([key, list]: [string, any]) => {
          addSmartList(key, list);
          nestedCount++;
        });
      }
      console.log(`[SmartListService] Loaded ${nestedCount} SmartLists from catalog.smartLists`);

      // Load SmartLists from top-level keys (backward compatibility)
      let topLevelCount = 0;
      const topLevelKeys: string[] = [];
      Object.entries(catalog).forEach(([key, value]: [string, any]) => {
        // Skip the 'smartLists' key itself and any non-SmartList entries
        if (key !== 'smartLists' && key !== 'groups' && value && typeof value === 'object' && value.epicId && value.options) {
          addSmartList(key, value);
          topLevelCount++;
          topLevelKeys.push(key);
        }
      });
      console.log(`[SmartListService] Loaded ${topLevelCount} SmartLists from top-level:`, topLevelKeys.slice(0, 5));
      console.log(`[SmartListService] Total loaded: ${this.smartLists.size} SmartLists`);
    } catch (error) {
      console.error('Error loading SmartList config:', error);
      throw error;
    }
  }

  private async loadValues(): Promise<void> {
    try {
      const data = await fs.readFile(this.valuePath, 'utf-8');
      const values = JSON.parse(data);

      Object.entries(values).forEach(([key, vals]: [string, any]) => {
        this.values.set(key, vals.map((v: any) => ({
          ...v,
          selectedAt: new Date(v.selectedAt),
        })));
      });

      console.log(`Loaded values for ${this.values.size} SmartLists`);
    } catch (error) {
      // File might not exist yet
      console.log('No existing SmartList values found, starting fresh');
    }
  }

  async saveConfig(smartLists: Record<string, SmartList>): Promise<void> {
    // Update in-memory cache
    this.smartLists.clear();
    Object.entries(smartLists).forEach(([key, list]) => {
      this.smartLists.set(key, list);
    });

    // Save to file
    const catalog = {
      smartLists: smartLists,
      groups: await this.getGroups(),
    };

    await fs.writeFile(this.configPath, JSON.stringify(catalog, null, 2));
  }

  async saveValues(): Promise<void> {
    const values: Record<string, SmartListValue[]> = {};
    this.values.forEach((vals, key) => {
      values[key] = vals;
    });

    const dir = path.dirname(this.valuePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.valuePath, JSON.stringify(values, null, 2));
  }

  getSmartList(identifier: string): SmartList | undefined {
    return this.smartLists.get(identifier);
  }

  getSmartListByEpicId(epicId: string): SmartList | undefined {
    // Now that we store by epicId as a key, we can do direct lookup
    console.log(`[SmartListService] Looking up epicId: "${epicId}"`);
    const result = this.smartLists.get(epicId);
    if (!result) {
      // Debug: show sample keys to understand format
      const sampleKeys = Array.from(this.smartLists.keys()).slice(0, 10);
      console.log(`[SmartListService] Not found. Sample keys:`, sampleKeys);
    } else {
      console.log(`[SmartListService] Found:`, result.displayName);
    }
    return result;
  }

  getAllSmartLists(): SmartList[] {
    // Deduplicate by epicId since we store each SmartList twice (by epicId and identifier)
    const seen = new Set<string>();
    const results: SmartList[] = [];
    for (const list of this.smartLists.values()) {
      if (!seen.has(list.epicId)) {
        seen.add(list.epicId);
        results.push(list);
      }
    }
    return results;
  }

  getSmartListsByGroup(group: string): SmartList[] {
    // Deduplicate by epicId since we store each SmartList twice
    const seen = new Set<string>();
    const results: SmartList[] = [];
    for (const list of this.smartLists.values()) {
      if (list.group === group && !seen.has(list.epicId)) {
        seen.add(list.epicId);
        results.push(list);
      }
    }
    return results;
  }

  private async getGroups(): Promise<Record<string, any>> {
    const groups: Record<string, any> = {};
    const groupMap = new Map<string, string[]>();

    // Group SmartLists by their group property
    this.smartLists.forEach((list, key) => {
      if (list.group) {
        if (!groupMap.has(list.group)) {
          groupMap.set(list.group, []);
        }
        groupMap.get(list.group)!.push(key);
      }
    });

    // Create group objects
    groupMap.forEach((smartListIds, groupName) => {
      groups[groupName.replace(/\s+/g, '_')] = {
        name: groupName,
        description: `${groupName} components`,
        smartLists: smartListIds,
      };
    });

    return groups;
  }

  // Value management
  async recordValue(
    smartListId: string,
    selectedValue: string,
    context?: string
  ): Promise<SmartListValue> {
    const smartList = this.getSmartList(smartListId);
    if (!smartList) {
      throw new Error(`SmartList ${smartListId} not found`);
    }

    // Validate the value is in the allowed options
    const validOption = smartList.options.find(opt => opt.value === selectedValue);
    if (!validOption) {
      throw new Error(
        `Invalid value "${selectedValue}" for SmartList ${smartListId}. ` +
        `Allowed values: ${smartList.options.map(o => o.value).join(', ')}`
      );
    }

    const value: SmartListValue = {
      smartListId,
      epicId: smartList.epicId,
      selectedValue,
      selectedAt: new Date(),
      context,
    };

    if (!this.values.has(smartListId)) {
      this.values.set(smartListId, []);
    }
    this.values.get(smartListId)!.push(value);

    await this.saveValues();
    return value;
  }

  getRecentValues(smartListId: string, limit: number = 10): SmartListValue[] {
    const values = this.values.get(smartListId) || [];
    return values
      .sort((a, b) => b.selectedAt.getTime() - a.selectedAt.getTime())
      .slice(0, limit);
  }

  getMostCommonValue(smartListId: string): string | undefined {
    const values = this.values.get(smartListId) || [];
    if (values.length === 0) return undefined;

    const counts = new Map<string, number>();
    values.forEach(v => {
      counts.set(v.selectedValue, (counts.get(v.selectedValue) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommon: string | undefined;
    counts.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    });

    return mostCommon;
  }

  getDefaultValue(smartListId: string): string | undefined {
    const smartList = this.getSmartList(smartListId);
    if (!smartList) return undefined;

    const defaultOption = smartList.options.find(opt => opt.is_default);
    return defaultOption?.value;
  }

  // Export for LLM prompt expansion
  exportForPrompt(smartListId: string): string {
    const smartList = this.getSmartList(smartListId);
    if (!smartList) {
      console.log(`[SmartListService] exportForPrompt: SmartList '${smartListId}' not found`);
      return '';
    }

    const defaultValue = this.getDefaultValue(smartListId);
    const mostCommon = this.getMostCommonValue(smartListId);

    let prompt = `SmartList: ${smartList.displayName} (Epic ID: ${smartList.epicId})\n`;
    prompt += `Template placeholder: {${smartList.displayName}:${smartList.epicId}}\n`;
    prompt += `Allowed values (output ONLY the value text, NOT the {placeholder} format):\n`;

    smartList.options.forEach(opt => {
      let annotation = '';
      if (opt.is_default) annotation = ' [DEFAULT]';
      if (opt.value === mostCommon) annotation += ' [MOST COMMON]';
      prompt += `  - "${opt.value}"${annotation}\n`;
    });

    prompt += `\nWhen you see {${smartList.displayName}:${smartList.epicId}} in the template:\n`;
    prompt += `  → Select the appropriate value based on the transcript\n`;
    prompt += `  → Output ONLY the value text (e.g., "${smartList.options[0].value}")\n`;
    prompt += `  → Do NOT include the {Display:EpicID} wrapper in your output\n`;
    if (defaultValue) {
      prompt += `  → If unsure, prefer "${defaultValue}"\n`;
    }

    return prompt;
  }

  // Bulk export all SmartLists for a template
  exportAllForPrompt(smartListIds: string[]): string {
    console.log(`[SmartListService] exportAllForPrompt called with: ${smartListIds.join(', ')}`);
    const sections = smartListIds.map(id => this.exportForPrompt(id)).filter(s => s);

    console.log(`[SmartListService] Generated ${sections.length}/${smartListIds.length} SmartList definition sections`);

    if (sections.length === 0) return '';

    let prompt = '=== SMARTLIST DEFINITIONS ===\n\n';
    prompt += 'The following SmartLists appear in the template. ';
    prompt += 'Select appropriate values based on the transcript content.\n\n';
    prompt += sections.join('\n---\n\n');
    prompt += '\n=== END SMARTLIST DEFINITIONS ===\n';

    return prompt;
  }

  // Validate a generated note's SmartList selections
  validateSelections(noteContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const smartListPattern = /\{([^:}]+):(\d+)::\s*"([^"]+)"\}/g;
    let match;

    while ((match = smartListPattern.exec(noteContent)) !== null) {
      const [full, displayName, epicId, selectedValue] = match;

      // Find the SmartList by Epic ID
      const smartList = this.getSmartListByEpicId(epicId);
      if (!smartList) {
        errors.push(`Unknown SmartList with Epic ID ${epicId}`);
        continue;
      }

      // Validate the selected value
      const validOption = smartList.options.find(opt => opt.value === selectedValue);
      if (!validOption) {
        errors.push(
          `Invalid value "${selectedValue}" for SmartList ${displayName}. ` +
          `Allowed: ${smartList.options.map(o => `"${o.value}"`).join(', ')}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Import/Export functionality
  async exportToCSV(): Promise<string> {
    let csv = 'identifier,epicId,displayName,group,option_value,option_order,is_default\n';

    this.smartLists.forEach(list => {
      list.options.forEach(opt => {
        csv += `"${list.identifier}","${list.epicId}","${list.displayName}","${list.group || ''}",`;
        csv += `"${opt.value}",${opt.order},${opt.is_default || false}\n`;
      });
    });

    return csv;
  }

  async importFromCSV(csvContent: string): Promise<void> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('Invalid CSV format');
    }

    const newSmartLists: Record<string, SmartList> = {};

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].match(/(".*?"|[^,]+)/g) || [];
      if (parts.length < 7) continue;

      const identifier = parts[0].replace(/"/g, '');
      const epicId = parts[1].replace(/"/g, '');
      const displayName = parts[2].replace(/"/g, '');
      const group = parts[3].replace(/"/g, '');
      const optionValue = parts[4].replace(/"/g, '');
      const optionOrder = parseInt(parts[5]);
      const isDefault = parts[6] === 'true';

      if (!newSmartLists[identifier]) {
        newSmartLists[identifier] = {
          identifier,
          epicId,
          displayName,
          group: group || undefined,
          options: [],
        };
      }

      newSmartLists[identifier].options.push({
        value: optionValue,
        order: optionOrder,
        is_default: isDefault,
      });
    }

    // Sort options by order
    Object.values(newSmartLists).forEach(list => {
      list.options.sort((a, b) => a.order - b.order);
    });

    await this.saveConfig(newSmartLists);
  }
}

// Singleton instance
let serviceInstance: SmartListService | null = null;

export async function getSmartListService(): Promise<SmartListService> {
  if (!serviceInstance) {
    serviceInstance = new SmartListService();
    await serviceInstance.initialize();
  }
  return serviceInstance;
}