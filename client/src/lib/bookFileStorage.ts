import { db, BookFileRecord } from './db';

/**
 * Service for managing offline book binary files in Dexie (IndexedDB)
 */
export const bookFileStorage = {
  /**
   * Store a book file in Dexie
   */
  async saveBookFile(
    bookId: string,
    file: File | Blob,
    fileName: string,
    fileType: 'pdf' | 'epub' | 'fb2' | 'text'
  ): Promise<void> {
    try {
      const record: BookFileRecord = {
        bookId,
        fileName,
        fileType,
        fileBlob: file,
        mimeType: file.type || undefined,
        size: file.size,
        updatedAt: new Date().toISOString(),
      };
      await db.bookFiles.put(record);
    } catch (err) {
      console.error('Failed to save book file to Dexie:', err);
      throw err;
    }
  },

  /**
   * Retrieve a book file record from Dexie
   */
  async getBookFile(bookId: string): Promise<BookFileRecord | undefined> {
    try {
      return await db.bookFiles.get(bookId);
    } catch (err) {
      console.error('Failed to get book file from Dexie:', err);
      return undefined;
    }
  },

  /**
   * Create an object URL for reading
   */
  async getBookFileUrl(bookId: string): Promise<string | null> {
    const record = await this.getBookFile(bookId);
    if (!record || !record.fileBlob) return null;
    return URL.createObjectURL(record.fileBlob);
  },

  /**
   * Get file as ArrayBuffer
   */
  async getBookArrayBuffer(bookId: string): Promise<ArrayBuffer | null> {
    const record = await this.getBookFile(bookId);
    if (!record || !record.fileBlob) return null;
    return await record.fileBlob.arrayBuffer();
  },

  /**
   * Delete book file when book is deleted
   */
  async deleteBookFile(bookId: string): Promise<void> {
    try {
      await db.bookFiles.delete(bookId);
    } catch (err) {
      console.warn('Failed to delete book file from Dexie:', err);
    }
  },

  /**
   * Check if book has a local file in Dexie
   */
  async hasBookFile(bookId: string): Promise<boolean> {
    try {
      const count = await db.bookFiles.where('bookId').equals(bookId).count();
      return count > 0;
    } catch {
      return false;
    }
  },
};
