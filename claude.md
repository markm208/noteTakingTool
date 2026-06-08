# Lecture Notes Tool Specification

## Overview

A web-based tool that converts markdown lecture notes into formatted, interactive web pages where students can add their own notes alongside instructor content.

## Background

- Instructor teaches computer science courses
- Prefers not to use PowerPoint/slides
- Wants to project definitions and code during lectures
- Students need access to content for review and as a copy/paste source for projects
- Content will be distributed via a learning management system (LMS)

## Architecture

### Converter Tool (index.html)

A single-page web application that instructors use to generate student-facing HTML files:

- **Markdown Upload**: Select a markdown file to convert
- **Images Folder**: Optionally select a folder containing images referenced in the markdown
- **Preview**: See rendered content with ability to delete sections before generating
- **Base64 Embedding**: All images are embedded as base64 for self-contained output
- **Generate HTML**: Downloads a complete, self-contained HTML file for students

### Generated Student Pages

Self-contained HTML files with:
- All CSS and JavaScript inline
- Embedded images (base64)
- Unique page ID (UUID) for isolated localStorage per lecture
- No external dependencies except highlight.js CDN for syntax highlighting

## Student Features

### Note-Taking
- "Add note" button appears after every content block (paragraphs, lists, code blocks, headings, blockquotes)
- Notes support basic markdown (bold, italic, inline code, line breaks)
- Notes stored in localStorage, keyed by unique page ID + section ID
- Expand/collapse individual notes by clicking the header
- "I need clarification from the instructor" checkbox highlights notes in red

### Floating Toolbar (bottom-right corner)
Compact circular icon buttons:

1. **Table of Contents**: Opens a panel showing all headings (H1, H2, H3) with indentation. Shows green count badge for sections containing notes.

2. **Font Size Controls**: Plus/minus buttons to adjust font size (70% to 250% in 10% increments). Preference saved in localStorage. Code blocks scale proportionally.

3. **Toggle Notes**: Expand/collapse all notes at once. Shows red badge with total note count.

4. **Download HTML**: Exports a static HTML snapshot with all notes rendered inline. Self-contained file for offline viewing.

5. **Print/Save as PDF**: Opens browser print dialog with notes expanded and toolbar hidden.

6. **Info**: Blue button with hover tooltip explaining that notes are stored locally, not visible to instructor, and should be exported for permanent storage.

### Export Options

1. **HTML Snapshot**: Static HTML page containing:
   - All original content with styling
   - Student notes rendered inline (expanded)
   - "Needs clarification" flags visible
   - Export date footer
   - Syntax highlighting preserved
   - Download filename matches source: `{filename}-with-notes.html`

2. **Print/PDF**: Browser print with clean styling, toolbar hidden, all notes expanded

## Styling

- System fonts (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)
- Max-width 800px, centered layout
- Red accent color (#e63946) for headings, links, code block borders
- Teal secondary (#2a9d8f) for H3 headings, blockquotes, note count badges
- Blue (#457b9d) for note containers
- Light backgrounds (#f8f9fa for code blocks, #e8f4f8 for notes)
- Red background (#fee2e2) for notes marked "needs clarification"

## Code Highlighting

- highlight.js with GitHub light theme
- Supports common languages (Java, JavaScript, Python, C++, HTML, CSS, etc.)
- Code blocks scale with font size controls (uses `em` units)

## Technical Details

### Note Storage
- Key format: `lecture-notes:{uuid}`
- Value: `{ sectionId: { text, timestamp, lastEdited, needsClarification } }`
- Each generated HTML file gets a unique UUID to isolate notes between lectures

### Section IDs
- Generated as `section-{counter}` during HTML processing
- IDs are grouped by element type (headings first, then paragraphs, etc.) rather than document order
- Does not affect functionality since each ID is unique

## File Structure
```
noteTakingTool/
├── CLAUDE.md              # This specification
└── index.html             # Web-based converter tool
```

## Hosting

The converter tool (index.html) can be hosted on GitHub Pages for other educators to use.

## Future Considerations

- Text highlighting in lecture content
- Search/filter through notes
- Note templates (Question, Summary, Key Term)
- Bookmarking sections
- Flashcard export for studying
