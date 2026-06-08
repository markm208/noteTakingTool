#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: lecture-notes <input.md> <output.html>');
  console.error('');
  console.error('Example:');
  console.error('  cd path/to/dir/with/markdown/notes');
  console.error('  lecture-notes IntroToInheritance.md ./output/IntroToInheritance.html');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];

// Resolve paths relative to current working directory
const inputPath = path.resolve(process.cwd(), inputFile);
const outputPath = path.resolve(process.cwd(), outputFile);
const inputDir = path.dirname(inputPath);

// Check if input file exists
if (!fs.existsSync(inputPath)) {
  console.error(`Error: Input file not found: ${inputPath}`);
  process.exit(1);
}

// Read the markdown file
const markdown = fs.readFileSync(inputPath, 'utf-8');

// Extract title from first H1 or filename
function extractTitle(md, filename) {
  const match = md.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  return path.basename(filename, '.md');
}

const title = extractTitle(markdown, inputFile);

// Generate a stable page ID from the title
function generatePageId(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const pageId = generatePageId(title);

// Convert local image paths to base64
function embedImage(src) {
  // Skip URLs (http, https, data URIs)
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }

  // Resolve relative to input file directory
  const imagePath = path.resolve(inputDir, src);

  if (!fs.existsSync(imagePath)) {
    console.warn(`Warning: Image not found: ${imagePath}`);
    return src;
  }

  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };

  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');

  console.log(`  Embedded: ${src}`);
  return `data:${mimeType};base64,${base64}`;
}

// Configure marked with syntax highlighting
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

// Custom renderer to add section IDs and handle images
let sectionCounter = 0;

const renderer = {
  paragraph(text) {
    const id = `section-${sectionCounter++}`;
    return `<p data-section-id="${id}">${text}</p>\n<div class="note-anchor" data-for="${id}"></div>\n`;
  },

  heading(text, level) {
    const id = `section-${sectionCounter++}`;
    return `<h${level} data-section-id="${id}">${text}</h${level}>\n<div class="note-anchor" data-for="${id}"></div>\n`;
  },

  code(code, language) {
    const id = `section-${sectionCounter++}`;
    const lang = language || 'plaintext';
    const highlighted = hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang }).value
      : code;
    return `<pre data-section-id="${id}"><code class="hljs language-${lang}">${highlighted}</code></pre>\n<div class="note-anchor" data-for="${id}"></div>\n`;
  },

  list(body, ordered) {
    const id = `section-${sectionCounter++}`;
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag} data-section-id="${id}">${body}</${tag}>\n<div class="note-anchor" data-for="${id}"></div>\n`;
  },

  blockquote(quote) {
    const id = `section-${sectionCounter++}`;
    return `<blockquote data-section-id="${id}">${quote}</blockquote>\n<div class="note-anchor" data-for="${id}"></div>\n`;
  },

  image(href, title, text) {
    const embeddedSrc = embedImage(href);
    const titleAttr = title ? ` title="${title}"` : '';
    return `<img src="${embeddedSrc}" alt="${text}"${titleAttr}>`;
  }
};

marked.use({ renderer });

// Convert markdown to HTML
console.log(`Converting: ${inputFile}`);
const contentHtml = marked.parse(markdown);

// Generate the full HTML page
const html = generateHtmlPage(title, pageId, contentHtml);

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the output file
fs.writeFileSync(outputPath, html);
console.log(`Output: ${outputPath}`);

function generateHtmlPage(title, pageId, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        ${getStyles()}
    </style>
</head>
<body>
    <div class="warning-banner">
        <strong>Note:</strong> Your notes are stored locally in this browser only.
        They are not visible to your instructor and will be lost if you clear browser data.
        Use the export button to save a permanent copy.
    </div>

    <div class="toolbar">
        <button class="toolbar-btn" id="expand-all-btn" title="Expand all notes">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
            </svg>
            Expand All
        </button>
        <button class="toolbar-btn" id="collapse-all-btn" title="Collapse all notes">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 15l-6-6-6 6"/>
            </svg>
            Collapse All
        </button>
        <button class="toolbar-btn" id="export-md-btn" title="Export as Markdown">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export MD
        </button>
        <button class="toolbar-btn" id="print-btn" title="Print / Save as PDF">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
        </button>
    </div>

    <main class="content">
        ${content}
    </main>

    <script>
        ${getScript(pageId)}
    </script>
</body>
</html>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getStyles() {
  return `
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1.5rem;
            color: #333;
        }

        .warning-banner {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 0.75rem 1rem;
            margin-bottom: 1.5rem;
            border-radius: 0 6px 6px 0;
            font-size: 0.85rem;
        }

        .toolbar {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }

        .toolbar-btn {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 0.75rem;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            color: #333;
            transition: background 0.2s, border-color 0.2s;
        }

        .toolbar-btn:hover {
            background: #e9ecef;
            border-color: #adb5bd;
        }

        h1 {
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
            color: #1a1a1a;
            border-bottom: 2px solid #e63946;
            padding-bottom: 0.25rem;
        }

        h2 {
            font-size: 1.35rem;
            margin-top: 2rem;
            margin-bottom: 0.75rem;
            color: #1a1a1a;
            border-bottom: 2px solid #e63946;
            padding-bottom: 0.25rem;
        }

        h3 {
            font-size: 1.15rem;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            color: #2a9d8f;
        }

        h4, h5, h6 {
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
            color: #333;
        }

        p {
            margin-bottom: 1rem;
        }

        ul, ol {
            margin-bottom: 1rem;
            padding-left: 1.5rem;
        }

        li {
            margin-bottom: 0.35rem;
        }

        blockquote {
            background: #f8f9fa;
            border-left: 4px solid #2a9d8f;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 0 6px 6px 0;
        }

        blockquote p:last-child {
            margin-bottom: 0;
        }

        code {
            background: #e9ecef;
            padding: 0.15rem 0.4rem;
            border-radius: 3px;
            font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
            font-size: 0.9em;
        }

        pre {
            background: #f8f9fa;
            border-left: 4px solid #e63946;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 0 6px 6px 0;
            overflow-x: auto;
        }

        pre code {
            background: none;
            padding: 0;
            font-size: 0.85rem;
            line-height: 1.5;
        }

        img {
            max-width: 100%;
            height: auto;
            margin: 1rem 0;
            border-radius: 6px;
        }

        a {
            color: #e63946;
        }

        a:hover {
            color: #c1121f;
        }

        hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 2rem 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 0.5rem;
            text-align: left;
        }

        th {
            background: #f8f9fa;
        }

        /* Note anchor and editor styles */
        .note-anchor {
            margin-bottom: 0.5rem;
        }

        .add-note-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.25rem 0.5rem;
            background: transparent;
            border: 1px dashed #ccc;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.75rem;
            color: #888;
            transition: all 0.2s;
        }

        .add-note-btn:hover {
            background: #f8f9fa;
            border-color: #2a9d8f;
            color: #2a9d8f;
        }

        .note-container {
            background: #e8f4f8;
            border-left: 4px solid #457b9d;
            padding: 0.75rem 1rem;
            margin: 0.5rem 0 1rem 0;
            border-radius: 0 6px 6px 0;
        }

        .note-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .note-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #457b9d;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .note-actions {
            display: flex;
            gap: 0.5rem;
        }

        .note-actions button {
            padding: 0.2rem 0.5rem;
            font-size: 0.75rem;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .note-actions button:hover {
            background: #f0f0f0;
        }

        .note-actions .delete-btn:hover {
            background: #fee;
            border-color: #e63946;
            color: #e63946;
        }

        .note-editor {
            width: 100%;
            min-height: 100px;
            padding: 0.5rem;
            font-family: inherit;
            font-size: 0.9rem;
            border: 1px solid #ccc;
            border-radius: 4px;
            resize: vertical;
            margin-bottom: 0.5rem;
        }

        .note-editor:focus {
            outline: none;
            border-color: #457b9d;
        }

        .note-content {
            font-size: 0.9rem;
        }

        .note-content p:last-child {
            margin-bottom: 0;
        }

        .note-meta {
            font-size: 0.7rem;
            color: #888;
            margin-top: 0.5rem;
        }

        .collapsed .note-content,
        .collapsed .note-meta {
            display: none;
        }

        .collapsed .note-header {
            margin-bottom: 0;
        }

        .expand-indicator {
            cursor: pointer;
            user-select: none;
        }

        /* highlight.js theme overrides for light theme */
        .hljs {
            background: transparent !important;
        }

        .hljs-keyword { color: #d73a49; }
        .hljs-string { color: #032f62; }
        .hljs-number { color: #005cc5; }
        .hljs-comment { color: #6a737d; }
        .hljs-function { color: #6f42c1; }
        .hljs-class { color: #6f42c1; }
        .hljs-built_in { color: #005cc5; }
        .hljs-literal { color: #005cc5; }
        .hljs-type { color: #d73a49; }
        .hljs-attr { color: #005cc5; }
        .hljs-title { color: #6f42c1; }
        .hljs-params { color: #24292e; }
        .hljs-meta { color: #6a737d; }

        /* Print styles */
        @media print {
            .warning-banner,
            .toolbar,
            .add-note-btn,
            .note-actions {
                display: none !important;
            }

            .note-container {
                break-inside: avoid;
            }

            .collapsed .note-content,
            .collapsed .note-meta {
                display: block !important;
            }

            body {
                max-width: none;
                padding: 0;
            }
        }
    `;
}

function getScript(pageId) {
  return `
        (function() {
            const PAGE_ID = '${pageId}';
            const STORAGE_KEY = 'lecture-notes:' + PAGE_ID;

            // Simple markdown parser for notes
            function parseMarkdown(text) {
                if (!text) return '';
                return text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
                    .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
                    .replace(/\`(.+?)\`/g, '<code>$1</code>')
                    .replace(/\\n/g, '<br>');
            }

            // Storage functions
            function getNotes() {
                try {
                    const data = localStorage.getItem(STORAGE_KEY);
                    return data ? JSON.parse(data) : {};
                } catch (e) {
                    console.error('Error reading notes:', e);
                    return {};
                }
            }

            function saveNote(sectionId, text) {
                const notes = getNotes();
                if (text.trim()) {
                    notes[sectionId] = {
                        text: text,
                        timestamp: notes[sectionId]?.timestamp || Date.now(),
                        lastEdited: Date.now()
                    };
                } else {
                    delete notes[sectionId];
                }
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
                } catch (e) {
                    alert('Unable to save note. Local storage may be full.');
                }
            }

            function deleteNote(sectionId) {
                const notes = getNotes();
                delete notes[sectionId];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
            }

            function formatDate(timestamp) {
                return new Date(timestamp).toLocaleString();
            }

            // Render functions
            function renderAddButton(anchor, sectionId) {
                anchor.innerHTML = \`
                    <button class="add-note-btn" data-section="\${sectionId}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Add note
                    </button>
                \`;
            }

            function renderNoteEditor(anchor, sectionId, existingText = '') {
                anchor.innerHTML = \`
                    <div class="note-container">
                        <div class="note-header">
                            <span class="note-label">My Note</span>
                            <div class="note-actions">
                                <button class="save-btn">Save</button>
                                <button class="cancel-btn">Cancel</button>
                            </div>
                        </div>
                        <textarea class="note-editor" placeholder="Write your note here... (Markdown supported: **bold**, *italic*, \\\`code\\\`)">\${existingText}</textarea>
                    </div>
                \`;

                const textarea = anchor.querySelector('.note-editor');
                const saveBtn = anchor.querySelector('.save-btn');
                const cancelBtn = anchor.querySelector('.cancel-btn');

                textarea.focus();

                saveBtn.addEventListener('click', () => {
                    saveNote(sectionId, textarea.value);
                    if (textarea.value.trim()) {
                        renderSavedNote(anchor, sectionId, textarea.value);
                    } else {
                        renderAddButton(anchor, sectionId);
                    }
                });

                cancelBtn.addEventListener('click', () => {
                    const notes = getNotes();
                    if (notes[sectionId]) {
                        renderSavedNote(anchor, sectionId, notes[sectionId].text);
                    } else {
                        renderAddButton(anchor, sectionId);
                    }
                });

                textarea.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        saveBtn.click();
                    } else if (e.key === 'Escape') {
                        cancelBtn.click();
                    }
                });
            }

            function renderSavedNote(anchor, sectionId, text, collapsed = false) {
                const notes = getNotes();
                const noteData = notes[sectionId];
                const lastEdited = noteData?.lastEdited ? formatDate(noteData.lastEdited) : '';

                anchor.innerHTML = \`
                    <div class="note-container \${collapsed ? 'collapsed' : ''}">
                        <div class="note-header">
                            <span class="note-label expand-indicator">\${collapsed ? '&#9654;' : '&#9660;'} My Note</span>
                            <div class="note-actions">
                                <button class="edit-btn">Edit</button>
                                <button class="delete-btn">Delete</button>
                            </div>
                        </div>
                        <div class="note-content">\${parseMarkdown(text)}</div>
                        \${lastEdited ? '<div class="note-meta">Last edited: ' + lastEdited + '</div>' : ''}
                    </div>
                \`;

                const container = anchor.querySelector('.note-container');
                const expandIndicator = anchor.querySelector('.expand-indicator');
                const editBtn = anchor.querySelector('.edit-btn');
                const deleteBtn = anchor.querySelector('.delete-btn');

                expandIndicator.addEventListener('click', () => {
                    container.classList.toggle('collapsed');
                    expandIndicator.innerHTML = container.classList.contains('collapsed')
                        ? '&#9654; My Note'
                        : '&#9660; My Note';
                });

                editBtn.addEventListener('click', () => {
                    renderNoteEditor(anchor, sectionId, text);
                });

                deleteBtn.addEventListener('click', () => {
                    if (confirm('Delete this note?')) {
                        deleteNote(sectionId);
                        renderAddButton(anchor, sectionId);
                    }
                });
            }

            // Initialize all note anchors
            function init() {
                const notes = getNotes();
                const anchors = document.querySelectorAll('.note-anchor');

                anchors.forEach(anchor => {
                    const sectionId = anchor.dataset.for;
                    if (notes[sectionId]) {
                        renderSavedNote(anchor, sectionId, notes[sectionId].text, true);
                    } else {
                        renderAddButton(anchor, sectionId);
                    }

                    anchor.addEventListener('click', (e) => {
                        if (e.target.classList.contains('add-note-btn') || e.target.closest('.add-note-btn')) {
                            renderNoteEditor(anchor, sectionId);
                        }
                    });
                });
            }

            // Toolbar functions
            document.getElementById('expand-all-btn').addEventListener('click', () => {
                document.querySelectorAll('.note-container.collapsed').forEach(container => {
                    container.classList.remove('collapsed');
                    const indicator = container.querySelector('.expand-indicator');
                    if (indicator) {
                        indicator.innerHTML = '&#9660; My Note';
                    }
                });
            });

            document.getElementById('collapse-all-btn').addEventListener('click', () => {
                document.querySelectorAll('.note-container:not(.collapsed)').forEach(container => {
                    container.classList.add('collapsed');
                    const indicator = container.querySelector('.expand-indicator');
                    if (indicator) {
                        indicator.innerHTML = '&#9654; My Note';
                    }
                });
            });

            document.getElementById('export-md-btn').addEventListener('click', () => {
                const notes = getNotes();
                let markdown = '# ${escapeHtml(title)}\\n\\n';
                markdown += '*Exported with student notes*\\n\\n---\\n\\n';

                const contentEl = document.querySelector('.content');
                const elements = contentEl.querySelectorAll('[data-section-id]');

                elements.forEach(el => {
                    const sectionId = el.dataset.sectionId;

                    // Get original content as text
                    if (el.tagName === 'H1') {
                        markdown += '# ' + el.textContent + '\\n\\n';
                    } else if (el.tagName === 'H2') {
                        markdown += '## ' + el.textContent + '\\n\\n';
                    } else if (el.tagName === 'H3') {
                        markdown += '### ' + el.textContent + '\\n\\n';
                    } else if (el.tagName === 'P') {
                        markdown += el.textContent + '\\n\\n';
                    } else if (el.tagName === 'PRE') {
                        const code = el.querySelector('code');
                        const lang = code?.className.match(/language-(\\w+)/)?.[1] || '';
                        markdown += '\\\`\\\`\\\`' + lang + '\\n' + el.textContent + '\\n\\\`\\\`\\\`\\n\\n';
                    } else if (el.tagName === 'UL' || el.tagName === 'OL') {
                        const items = el.querySelectorAll('li');
                        items.forEach((li, i) => {
                            const prefix = el.tagName === 'OL' ? (i + 1) + '. ' : '- ';
                            markdown += prefix + li.textContent + '\\n';
                        });
                        markdown += '\\n';
                    } else if (el.tagName === 'BLOCKQUOTE') {
                        markdown += '> ' + el.textContent.replace(/\\n/g, '\\n> ') + '\\n\\n';
                    }

                    // Add note if exists
                    if (notes[sectionId]) {
                        markdown += '> **My Note:** ' + notes[sectionId].text.replace(/\\n/g, '\\n> ') + '\\n\\n';
                    }
                });

                // Download
                const blob = new Blob([markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '${pageId}-with-notes.md';
                a.click();
                URL.revokeObjectURL(url);
            });

            document.getElementById('print-btn').addEventListener('click', () => {
                // Expand all notes before printing
                document.querySelectorAll('.note-container.collapsed').forEach(container => {
                    container.classList.remove('collapsed');
                });
                window.print();
            });

            // Run initialization
            init();
        })();
    `;
}
