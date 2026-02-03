/**
 * Epic Scribe Clipboard Watcher
 *
 * Menu bar app that monitors the clipboard for Epic notes,
 * parses patient info, and imports them into Epic Scribe.
 */

import { app, clipboard, Tray, Menu, nativeImage, Notification, shell } from 'electron';
import * as path from 'path';
import { EpicNoteParser, ParsedEpicNote } from '@epic-scribe/epic-note-parser';
import { ApiClient } from './api-client';

// Configuration - loaded from environment or defaults
const CONFIG = {
  API_URL: process.env.EPIC_SCRIBE_API_URL || 'http://localhost:3002',
  POLLING_INTERVAL: 500, // Check clipboard every 500ms
  WEB_URL: process.env.EPIC_SCRIBE_WEB_URL || 'http://localhost:3002',
};

class ClipboardWatcher {
  private tray: Tray | null = null;
  private parser: EpicNoteParser;
  private apiClient: ApiClient;
  private lastClipboardContent: string = '';
  private isMonitoring: boolean = true;
  private intervalId: NodeJS.Timeout | null = null;
  private importCount: number = 0;

  constructor() {
    this.parser = new EpicNoteParser();
    this.apiClient = new ApiClient(CONFIG.API_URL);
  }

  async start() {
    // Hide dock icon (menu bar only)
    app.dock?.hide();

    // Create tray icon
    this.createTray();

    // Start clipboard monitoring
    this.startMonitoring();

    // Initialize last clipboard content to avoid importing on startup
    this.lastClipboardContent = clipboard.readText();

    console.log('Epic Scribe Clipboard Watcher started');
    this.showNotification('Clipboard Watcher Started', 'Monitoring for Epic notes...');
  }

  private createTray() {
    // Create a simple tray icon (will be replaced with actual icon)
    const iconPath = path.join(__dirname, '../../assets/tray-icon.png');

    // Create a template image for macOS (16x16 or 22x22)
    let icon: Electron.NativeImage;
    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        // Fallback: create a simple colored icon
        icon = this.createDefaultIcon();
      }
    } catch {
      icon = this.createDefaultIcon();
    }

    // Make it a template image for macOS menu bar
    icon = icon.resize({ width: 16, height: 16 });
    icon.setTemplateImage(true);

    this.tray = new Tray(icon);
    this.tray.setToolTip('Epic Scribe Clipboard Watcher');
    this.updateTrayMenu();
  }

  private createDefaultIcon(): Electron.NativeImage {
    // Create a simple 16x16 icon with a circle
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4); // RGBA

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - size / 2;
        const dy = y - size / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * size + x) * 4;

        if (distance < size / 2 - 1) {
          // Inside circle - coral color (#E89C8A)
          canvas[idx] = 232;     // R
          canvas[idx + 1] = 156; // G
          canvas[idx + 2] = 138; // B
          canvas[idx + 3] = 255; // A
        } else {
          // Outside circle - transparent
          canvas[idx] = 0;
          canvas[idx + 1] = 0;
          canvas[idx + 2] = 0;
          canvas[idx + 3] = 0;
        }
      }
    }

    return nativeImage.createFromBuffer(canvas, { width: size, height: size });
  }

  private updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: this.isMonitoring ? '✓ Monitoring' : '○ Paused',
        enabled: false,
      },
      {
        label: `${this.importCount} notes imported`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: this.isMonitoring ? 'Pause Monitoring' : 'Resume Monitoring',
        click: () => this.toggleMonitoring(),
      },
      { type: 'separator' },
      {
        label: 'Open Epic Scribe',
        click: () => shell.openExternal(CONFIG.WEB_URL),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);

    this.tray?.setContextMenu(contextMenu);
  }

  private toggleMonitoring() {
    this.isMonitoring = !this.isMonitoring;

    if (this.isMonitoring) {
      this.startMonitoring();
      this.showNotification('Monitoring Resumed', 'Watching for Epic notes...');
    } else {
      this.stopMonitoring();
      this.showNotification('Monitoring Paused', 'Click tray icon to resume');
    }

    this.updateTrayMenu();
  }

  private startMonitoring() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.checkClipboard();
    }, CONFIG.POLLING_INTERVAL);
  }

  private stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkClipboard() {
    const currentContent = clipboard.readText();

    // Skip if content hasn't changed or is empty
    if (!currentContent || currentContent === this.lastClipboardContent) {
      return;
    }

    this.lastClipboardContent = currentContent;

    // Check if it's an Epic note
    if (!this.parser.isEpicNote(currentContent)) {
      return; // Not an Epic note, ignore silently
    }

    console.log('Epic note detected in clipboard');

    // Parse the note
    const parsed = this.parser.parse(currentContent);

    if (!parsed.isValid || !parsed.patientFirstName || !parsed.patientLastName) {
      this.showNotification(
        'Epic Note Detected',
        'Could not extract patient info. Please check format.',
        'warning'
      );
      return;
    }

    // Import the note
    await this.importNote(parsed, currentContent);
  }

  private async importNote(parsed: ParsedEpicNote, fullContent: string) {
    try {
      const result = await this.apiClient.importPriorNote({
        noteContent: fullContent,
        patientFirstName: parsed.patientFirstName!,
        patientLastName: parsed.patientLastName!,
        dateOfBirth: parsed.dateOfBirth,
        age: parsed.age,
        setting: parsed.setting,
        providerName: parsed.providerName,
      });

      this.importCount++;
      this.updateTrayMenu();

      const patientName = `${parsed.patientLastName}, ${parsed.patientFirstName}`;

      if (result.priorNote.isDuplicate) {
        this.showNotification(
          'Note Already Imported',
          patientName,
          'info'
        );
      } else if (result.patient.isNewPatient) {
        this.showNotification(
          'Patient Created',
          `${patientName}\nNote imported successfully`,
          'success'
        );
      } else {
        this.showNotification(
          'Note Imported',
          patientName,
          'success'
        );
      }
    } catch (error) {
      console.error('Error importing note:', error);
      this.showNotification(
        'Import Failed',
        'Check network connection',
        'error'
      );
    }
  }

  private showNotification(
    title: string,
    body: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) {
    // Map type to system notification
    const notification = new Notification({
      title,
      body,
      silent: type === 'info',
    });

    notification.show();
  }
}

// App lifecycle
const watcher = new ClipboardWatcher();

app.whenReady().then(() => {
  watcher.start();
});

app.on('window-all-closed', (e: Event) => {
  e.preventDefault(); // Don't quit when windows close
});

app.on('before-quit', () => {
  // Cleanup if needed
});
