import { SmartListService } from '../smartlist-service';
import path from 'path';
import fs from 'fs/promises';

describe('SmartListService', () => {
  let service: SmartListService;
  const testConfigPath = path.join(__dirname, 'test-smartlists.json');
  const testValuePath = path.join(__dirname, 'test-values.json');

  beforeEach(async () => {
    // Create test config file
    const testConfig = {
      smartLists: {
        mood: {
          identifier: 'Mood',
          epicId: '304120205',
          displayName: 'Mood',
          group: 'Mental Status Exam',
          options: [
            { value: 'Euthymic', order: 1 },
            { value: 'Depressed', order: 2, is_default: true },
            { value: 'Anxious', order: 3 },
            { value: 'Irritable', order: 4 },
          ],
        },
        appearance: {
          identifier: 'Appearance',
          epicId: '304120201',
          displayName: 'Appearance',
          group: 'Mental Status Exam',
          options: [
            { value: 'Well-groomed', order: 1, is_default: true },
            { value: 'Disheveled', order: 2 },
            { value: 'Poor hygiene', order: 3 },
          ],
        },
      },
      groups: {},
    };

    await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

    service = new SmartListService(testConfigPath, testValuePath);
    await service.initialize();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testConfigPath);
      await fs.unlink(testValuePath);
    } catch (error) {
      // Files might not exist
    }
  });

  describe('SmartList retrieval', () => {
    test('should get SmartList by identifier', () => {
      const mood = service.getSmartList('mood');
      expect(mood).toBeDefined();
      expect(mood?.displayName).toBe('Mood');
      expect(mood?.epicId).toBe('304120205');
    });

    test('should get SmartList by Epic ID', () => {
      const mood = service.getSmartListByEpicId('304120205');
      expect(mood).toBeDefined();
      expect(mood?.displayName).toBe('Mood');
    });

    test('should get SmartLists by group', () => {
      const mseList = service.getSmartListsByGroup('Mental Status Exam');
      expect(mseList).toHaveLength(2);
      expect(mseList.map(l => l.displayName)).toContain('Mood');
      expect(mseList.map(l => l.displayName)).toContain('Appearance');
    });

    test('should get all SmartLists', () => {
      const all = service.getAllSmartLists();
      expect(all).toHaveLength(2);
    });
  });

  describe('Value management', () => {
    test('should record valid value', async () => {
      const value = await service.recordValue('mood', 'Anxious', 'Test context');
      expect(value.selectedValue).toBe('Anxious');
      expect(value.epicId).toBe('304120205');
      expect(value.context).toBe('Test context');
    });

    test('should reject invalid value', async () => {
      await expect(
        service.recordValue('mood', 'Invalid', 'Test context')
      ).rejects.toThrow('Invalid value');
    });

    test('should get default value', () => {
      const defaultMood = service.getDefaultValue('mood');
      expect(defaultMood).toBe('Depressed');

      const defaultAppearance = service.getDefaultValue('appearance');
      expect(defaultAppearance).toBe('Well-groomed');
    });

    test('should track most common value', async () => {
      await service.recordValue('mood', 'Anxious');
      await service.recordValue('mood', 'Anxious');
      await service.recordValue('mood', 'Depressed');

      const mostCommon = service.getMostCommonValue('mood');
      expect(mostCommon).toBe('Anxious');
    });
  });

  describe('Prompt expansion', () => {
    test('should export SmartList for prompt', () => {
      const prompt = service.exportForPrompt('mood');

      expect(prompt).toContain('SmartList: Mood (Epic ID: 304120205)');
      expect(prompt).toContain('Euthymic');
      expect(prompt).toContain('Depressed" [DEFAULT]');
      expect(prompt).toContain('Anxious');
      expect(prompt).toContain('Format: {Mood:304120205:: "selected value"}');
    });

    test('should export multiple SmartLists for prompt', () => {
      const prompt = service.exportAllForPrompt(['mood', 'appearance']);

      expect(prompt).toContain('=== SMARTLIST DEFINITIONS ===');
      expect(prompt).toContain('SmartList: Mood');
      expect(prompt).toContain('SmartList: Appearance');
      expect(prompt).toContain('=== END SMARTLIST DEFINITIONS ===');
    });
  });

  describe('Note validation', () => {
    test('should validate correct SmartList selections', () => {
      const noteContent = 'Patient mood: {Mood:304120205:: "Anxious"}';
      const result = service.validateSelections(noteContent);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should catch invalid SmartList value', () => {
      const noteContent = 'Patient mood: {Mood:304120205:: "Invalid"}';
      const result = service.validateSelections(noteContent);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid value "Invalid"');
    });

    test('should catch unknown SmartList', () => {
      const noteContent = 'Unknown: {Unknown:999999:: "Value"}';
      const result = service.validateSelections(noteContent);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unknown SmartList');
    });
  });

  describe('Import/Export', () => {
    test('should export to CSV', async () => {
      const csv = await service.exportToCSV();

      expect(csv).toContain('identifier,epicId,displayName');
      expect(csv).toContain('"Mood","304120205","Mood"');
      expect(csv).toContain('"Euthymic",1,false');
      expect(csv).toContain('"Depressed",2,true');
    });

    test('should import from CSV', async () => {
      const csv = `identifier,epicId,displayName,group,option_value,option_order,is_default
"NewList","999999","New List","Test Group","Option 1",1,true
"NewList","999999","New List","Test Group","Option 2",2,false`;

      await service.importFromCSV(csv);

      const newList = service.getSmartList('NewList');
      expect(newList).toBeDefined();
      expect(newList?.displayName).toBe('New List');
      expect(newList?.options).toHaveLength(2);
      expect(newList?.options[0].is_default).toBe(true);
    });
  });
});