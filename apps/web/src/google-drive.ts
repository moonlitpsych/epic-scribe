/**
 * Google Drive API Client
 *
 * Searches for and retrieves Google Meet transcripts from Drive.
 * Convention: Transcripts saved in /EpicScribe/YYYY-MM-DD/Patient Name/
 */

import { google } from 'googleapis';
import { Session } from 'next-auth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  parents?: string[];
}

/**
 * Get Google Drive client authenticated with user's access token.
 */
function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.drive({ version: 'v3', auth });
}

/**
 * Search for files in Google Drive by query.
 */
export async function searchFiles(
  session: Session,
  query: string,
  pageSize: number = 50
): Promise<DriveFile[]> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const drive = getDriveClient(session.accessToken);

  try {
    const response = await drive.files.list({
      q: query,
      pageSize,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink, parents)',
      orderBy: 'modifiedTime desc',
    });

    return (response.data.files || []) as DriveFile[];
  } catch (error) {
    console.error('Error searching Drive files:', error);
    throw new Error('Failed to search Drive files');
  }
}

/**
 * Get file content by ID.
 */
export async function getFileContent(
  session: Session,
  fileId: string
): Promise<string> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const drive = getDriveClient(session.accessToken);

  try {
    const response = await drive.files.get({
      fileId,
      alt: 'media',
    }, {
      responseType: 'text',
    });

    return response.data as string;
  } catch (error) {
    console.error('Error getting file content:', error);
    throw new Error('Failed to get file content');
  }
}

/**
 * Search for Google Meet transcripts by date and optional patient name.
 * Looks for common transcript file patterns (.sbv, .vtt, .srt, "transcript", etc.)
 */
export async function findTranscripts(
  session: Session,
  {
    date,
    patientName,
    folderId,
  }: {
    date?: string; // YYYY-MM-DD
    patientName?: string;
    folderId?: string;
  }
): Promise<DriveFile[]> {
  let query = '';

  // Build query based on filters
  const conditions: string[] = [];

  // Look for transcript files
  conditions.push(
    "(name contains 'transcript' or " +
    "name contains '.sbv' or " +
    "name contains '.vtt' or " +
    "name contains '.srt' or " +
    "mimeType = 'text/plain' or " +
    "mimeType = 'text/vtt' or " +
    "mimeType = 'application/x-subrip')"
  );

  // Filter by folder if provided
  if (folderId) {
    conditions.push(`'${folderId}' in parents`);
  }

  // Filter by date if provided
  if (date) {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    conditions.push(`createdTime >= '${startOfDay}'`);
    conditions.push(`createdTime <= '${endOfDay}'`);
  }

  // Filter by patient name in file/folder name
  if (patientName) {
    conditions.push(`(name contains '${patientName}')`);
  }

  // Not trashed
  conditions.push('trashed = false');

  query = conditions.join(' and ');

  return searchFiles(session, query);
}

/**
 * Create a folder in Google Drive.
 */
export async function createFolder(
  session: Session,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFile> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const drive = getDriveClient(session.accessToken);

  try {
    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, mimeType, createdTime, modifiedTime, webViewLink, parents',
    });

    return response.data as DriveFile;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw new Error('Failed to create folder');
  }
}

/**
 * Get or create the EpicScribe root folder.
 */
export async function getOrCreateRootFolder(session: Session): Promise<DriveFile> {
  // Search for existing EpicScribe folder
  const existing = await searchFiles(
    session,
    "name = 'EpicScribe' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );

  if (existing.length > 0) {
    return existing[0];
  }

  // Create if doesn't exist
  return createFolder(session, 'EpicScribe');
}

/**
 * Get or create encounter-specific folder structure:
 * /EpicScribe/YYYY-MM-DD/Patient Name/
 */
export async function getOrCreateEncounterFolder(
  session: Session,
  {
    date,
    patientName,
  }: {
    date: string; // YYYY-MM-DD
    patientName: string;
  }
): Promise<DriveFile> {
  // Get/create root folder
  const rootFolder = await getOrCreateRootFolder(session);

  // Get/create date folder
  const dateFolders = await searchFiles(
    session,
    `name = '${date}' and '${rootFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const dateFolder = dateFolders.length > 0
    ? dateFolders[0]
    : await createFolder(session, date, rootFolder.id);

  // Get/create patient folder
  const patientFolders = await searchFiles(
    session,
    `name = '${patientName}' and '${dateFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const patientFolder = patientFolders.length > 0
    ? patientFolders[0]
    : await createFolder(session, patientName, dateFolder.id);

  return patientFolder;
}
