import JSZip from 'jszip';
import * as pdfjs from 'pdfjs-dist';
import { BookChapter } from '../types';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    // CDN worker as reliable fallback for sandboxed iframes
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch {
    // Fallback if version not accessible
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  }
}

export interface ParsedBookResult {
  title: string;
  author: string;
  genre?: string;
  coverUrl?: string;
  totalPages: number;
  fileType: 'pdf' | 'epub' | 'fb2' | 'text';
  content?: string;
  chapters?: BookChapter[];
  fileBlob: Blob;
  fileName: string;
}

/**
 * Clean up title from filename if empty
 */
function cleanFileName(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

/**
 * Universal Book Parser for EPUB, FB2, PDF, TXT
 */
export const bookParserService = {
  /**
   * Main entry point: parses file and extracts metadata, cover, and content
   */
  async parseBookFile(file: File): Promise<ParsedBookResult> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (ext === 'fb2' || file.name.toLowerCase().endsWith('.fb2.zip')) {
      return await this.parseFB2(file);
    } else if (ext === 'epub') {
      return await this.parseEPUB(file);
    } else if (ext === 'pdf') {
      return await this.parsePDF(file);
    } else {
      return await this.parseText(file);
    }
  },

  /**
   * 1. FB2 (FictionBook 2.0) XML Parser
   */
  async parseFB2(file: File): Promise<ParsedBookResult> {
    let xmlText = '';
    
    // Handle .fb2.zip
    if (file.name.toLowerCase().endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const fb2File = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.fb2'));
      if (fb2File) {
        xmlText = await fb2File.async('string');
      } else {
        throw new Error('No .fb2 file found inside ZIP archive');
      }
    } else {
      xmlText = await file.text();
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    // Title info
    const titleInfo = doc.querySelector('title-info');
    let title = titleInfo?.querySelector('book-title')?.textContent?.trim() || cleanFileName(file.name);
    
    // Author
    let author = 'Unknown';
    const authorEl = titleInfo?.querySelector('author');
    if (authorEl) {
      const first = authorEl.querySelector('first-name')?.textContent?.trim() || '';
      const middle = authorEl.querySelector('middle-name')?.textContent?.trim() || '';
      const last = authorEl.querySelector('last-name')?.textContent?.trim() || '';
      const full = [first, middle, last].filter(Boolean).join(' ');
      if (full) author = full;
    }

    // Genre
    const genre = titleInfo?.querySelector('genre')?.textContent?.trim() || 'Fiction';

    // Cover extraction from <coverpage> and <binary>
    let coverUrl: string | undefined = undefined;
    try {
      const coverImageEl = titleInfo?.querySelector('coverpage image');
      let coverId = '';
      if (coverImageEl) {
        coverId = (
          coverImageEl.getAttribute('l:href') ||
          coverImageEl.getAttribute('xlink:href') ||
          coverImageEl.getAttribute('href') ||
          ''
        ).replace(/^#/, '');
      }

      let binaryEl: Element | null = null;
      if (coverId) {
        binaryEl = doc.getElementById(coverId) || doc.querySelector(`binary[id="${coverId}"]`);
      }
      if (!binaryEl) {
        // Fallback: pick first binary image
        binaryEl = doc.querySelector('binary');
      }

      if (binaryEl && binaryEl.textContent) {
        const contentType = binaryEl.getAttribute('content-type') || 'image/jpeg';
        const base64Data = binaryEl.textContent.replace(/\s+/g, '');
        coverUrl = `data:${contentType};base64,${base64Data}`;
      }
    } catch (e) {
      console.warn('Could not extract FB2 cover image:', e);
    }

    // Parse Body into chapters
    const chapters: BookChapter[] = [];
    const bodies = doc.querySelectorAll('body');
    const mainBody = bodies[0];

    if (mainBody) {
      const sections = mainBody.querySelectorAll(':scope > section');
      if (sections.length > 0) {
        sections.forEach((sec, idx) => {
          const secTitleEl = sec.querySelector(':scope > title');
          const secTitle = secTitleEl?.textContent?.replace(/\s+/g, ' ').trim() || `Глава ${idx + 1}`;
          
          // Gather paragraphs
          const pElements = sec.querySelectorAll('p, subtitle, empty-line');
          let htmlContent = '';
          pElements.forEach((p) => {
            if (p.tagName.toLowerCase() === 'empty-line') {
              htmlContent += '<br/><br/>';
            } else if (p.tagName.toLowerCase() === 'subtitle') {
              htmlContent += `<h3 class="font-bold my-4 text-base opacity-90">${p.textContent || ''}</h3>`;
            } else {
              htmlContent += `<p class="my-3 leading-relaxed">${p.innerHTML || p.textContent || ''}</p>`;
            }
          });

          if (!htmlContent) {
            htmlContent = `<p class="my-3 leading-relaxed">${sec.textContent || ''}</p>`;
          }

          chapters.push({
            id: `fb2-ch-${idx + 1}`,
            title: secTitle,
            content: htmlContent,
          });
        });
      } else {
        // No sections, take raw paragraphs
        const ps = mainBody.querySelectorAll('p');
        let htmlContent = '';
        ps.forEach((p) => {
          htmlContent += `<p class="my-3 leading-relaxed">${p.innerHTML || p.textContent || ''}</p>`;
        });
        chapters.push({
          id: 'fb2-ch-1',
          title: title,
          content: htmlContent || mainBody.textContent || '',
        });
      }
    }

    // Calculate approximate pages (average 1600 characters per page)
    let totalChars = 0;
    chapters.forEach((c) => (totalChars += c.content.length));
    const totalPages = Math.max(1, Math.round(totalChars / 1600));

    return {
      title,
      author,
      genre,
      coverUrl,
      totalPages,
      fileType: 'fb2',
      chapters,
      content: chapters.map((c) => `## ${c.title}\n\n${c.content}`).join('\n\n'),
      fileBlob: file,
      fileName: file.name,
    };
  },

  /**
   * 2. EPUB Parser (using JSZip)
   */
  async parseEPUB(file: File): Promise<ParsedBookResult> {
    const zip = await JSZip.loadAsync(file);

    // Read container.xml to locate root .opf
    const containerXml = await zip.file('META-INF/container.xml')?.async('string');
    if (!containerXml) {
      throw new Error('Invalid EPUB: META-INF/container.xml missing');
    }

    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'text/xml');
    const rootfilePath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
    if (!rootfilePath) {
      throw new Error('Invalid EPUB: OPF rootfile path not found');
    }

    const opfDir = rootfilePath.includes('/') ? rootfilePath.substring(0, rootfilePath.lastIndexOf('/') + 1) : '';
    const opfXml = await zip.file(rootfilePath)?.async('string');
    if (!opfXml) {
      throw new Error(`Invalid EPUB: Rootfile ${rootfilePath} could not be read`);
    }

    const opfDoc = parser.parseFromString(opfXml, 'text/xml');

    // Title & Author
    const title = opfDoc.querySelector('metadata dc\\:title, metadata title')?.textContent?.trim() || cleanFileName(file.name);
    const author = opfDoc.querySelector('metadata dc\\:creator, metadata creator')?.textContent?.trim() || 'Unknown';
    const genre = opfDoc.querySelector('metadata dc\\:subject, metadata subject')?.textContent?.trim() || 'E-Book';

    // Manifest items
    const manifestItems: Record<string, { href: string; mediaType: string; properties?: string }> = {};
    opfDoc.querySelectorAll('manifest > item').forEach((item) => {
      const id = item.getAttribute('id') || '';
      const href = item.getAttribute('href') || '';
      const mediaType = item.getAttribute('media-type') || '';
      const properties = item.getAttribute('properties') || '';
      if (id && href) {
        manifestItems[id] = { href, mediaType, properties };
      }
    });

    // Cover Image Extraction
    let coverUrl: string | undefined = undefined;
    try {
      // 1. Look for property="cover-image"
      let coverItemId = Object.keys(manifestItems).find(
        (id) => manifestItems[id].properties?.includes('cover-image')
      );

      // 2. Look for <meta name="cover" content="id">
      if (!coverItemId) {
        const metaCover = opfDoc.querySelector('meta[name="cover"]');
        if (metaCover) {
          coverItemId = metaCover.getAttribute('content') || undefined;
        }
      }

      // 3. Look for id containing 'cover' and image media-type
      if (!coverItemId) {
        coverItemId = Object.keys(manifestItems).find(
          (id) =>
            id.toLowerCase().includes('cover') &&
            manifestItems[id].mediaType.startsWith('image/')
        );
      }

      if (coverItemId && manifestItems[coverItemId]) {
        const imagePath = opfDir + manifestItems[coverItemId].href;
        const imageFile = zip.file(imagePath) || zip.file(manifestItems[coverItemId].href);
        if (imageFile) {
          const imageBase64 = await imageFile.async('base64');
          const mediaType = manifestItems[coverItemId].mediaType || 'image/jpeg';
          coverUrl = `data:${mediaType};base64,${imageBase64}`;
        }
      }
    } catch (e) {
      console.warn('Could not extract EPUB cover image:', e);
    }

    // Spine & Chapters
    const chapters: BookChapter[] = [];
    const spineItemRefs = opfDoc.querySelectorAll('spine > itemref');
    let chapterIndex = 1;

    for (const itemRef of Array.from(spineItemRefs)) {
      const idref = itemRef.getAttribute('idref');
      if (!idref || !manifestItems[idref]) continue;

      const itemInfo = manifestItems[idref];
      const chapterPath = opfDir + itemInfo.href;
      const chapterFile = zip.file(chapterPath) || zip.file(itemInfo.href);

      if (chapterFile) {
        const rawHtml = await chapterFile.async('string');
        const chapterDoc = parser.parseFromString(rawHtml, 'text/html');

        // Extract title
        let chapterTitle =
          chapterDoc.querySelector('h1, h2, h3, title')?.textContent?.trim() ||
          `Глава ${chapterIndex}`;
        if (chapterTitle.length > 60) {
          chapterTitle = `Глава ${chapterIndex}`;
        }

        // Clean content
        const bodyContent = chapterDoc.body ? chapterDoc.body.innerHTML : rawHtml;

        // Clean out scripts
        const cleanedHtml = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        if (cleanedHtml.trim().length > 50) {
          chapters.push({
            id: `epub-ch-${chapterIndex}`,
            title: chapterTitle,
            content: cleanedHtml,
          });
          chapterIndex++;
        }
      }
    }

    let totalChars = 0;
    chapters.forEach((c) => (totalChars += c.content.length));
    const totalPages = Math.max(1, Math.round(totalChars / 1600));

    return {
      title,
      author,
      genre,
      coverUrl,
      totalPages: totalPages || 50,
      fileType: 'epub',
      chapters,
      content: chapters.map((c) => c.content).join('\n\n'),
      fileBlob: file,
      fileName: file.name,
    };
  },

  /**
   * 3. PDF Parser (using pdfjs-dist)
   */
  async parsePDF(file: File): Promise<ParsedBookResult> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    } as any);

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages || 1;

    // Extract metadata
    let title = cleanFileName(file.name);
    let author = 'Unknown';

    try {
      const meta = await pdf.getMetadata();
      if (meta?.info) {
        const info = meta.info as any;
        if (info.Title && typeof info.Title === 'string' && info.Title.trim().length > 1) {
          title = info.Title.trim();
        }
        if (info.Author && typeof info.Author === 'string' && info.Author.trim().length > 1) {
          author = info.Author.trim();
        }
      }
    } catch (e) {
      console.warn('PDF metadata read error:', e);
    }

    // Render Page 1 to canvas for genuine cover image
    let coverUrl: string | undefined = undefined;
    try {
      const page1 = await pdf.getPage(1);
      const viewport = page1.getViewport({ scale: 1.0 });

      // Create offscreen canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const targetWidth = 320;
        const scale = targetWidth / viewport.width;
        const scaledViewport = page1.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await (page1.render as any)({
          canvasContext: ctx,
          viewport: scaledViewport,
          canvas,
        }).promise;

        coverUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      console.warn('PDF cover generation error:', e);
    }

    return {
      title,
      author,
      genre: 'PDF Document',
      coverUrl,
      totalPages,
      fileType: 'pdf',
      fileBlob: file,
      fileName: file.name,
    };
  },

  /**
   * 4. Plain Text & Markdown Parser
   */
  async parseText(file: File): Promise<ParsedBookResult> {
    const text = await file.text();
    const title = cleanFileName(file.name);
    
    // Split into chapters by headings or chunks of 2500 words
    const rawChapters = text.split(/\n(?=(?:#+\s|Глава\s|Chapter\s))/i);
    const chapters: BookChapter[] = [];

    if (rawChapters.length > 1) {
      rawChapters.forEach((chunk, idx) => {
        const lines = chunk.trim().split('\n');
        const firstLine = lines[0].replace(/^#+\s*/, '').trim();
        const chTitle = firstLine.length < 50 ? firstLine : `Глава ${idx + 1}`;
        chapters.push({
          id: `txt-ch-${idx + 1}`,
          title: chTitle,
          content: chunk,
        });
      });
    } else {
      chapters.push({
        id: 'txt-ch-1',
        title,
        content: text,
      });
    }

    const totalPages = Math.max(1, Math.round(text.length / 1600));

    return {
      title,
      author: 'Author',
      genre: 'Notes & Books',
      totalPages,
      fileType: 'text',
      chapters,
      content: text,
      fileBlob: file,
      fileName: file.name,
    };
  },
};
