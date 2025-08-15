import sys
import json
from docling.document_converter import DocumentConverter
import re

# Normalizes markdown by removing empty lines
def normalize_markdown(md_text: str) -> str:
    """
    Normalize markdown text before chunking.
    - Removes extra blank lines
    - Strips leading/trailing whitespace
    - Collapses multiple blank lines to a single blank line
    """
    lines = md_text.splitlines()
    normalized_lines = []

    for line in lines:
        stripped = line.strip()
        # Skip lines that are completely empty
        if not stripped:
            # Only append a blank line if the previous line wasn't blank
            if normalized_lines and normalized_lines[-1] != "":
                normalized_lines.append("")
            continue
        normalized_lines.append(stripped)

    return "\n".join(normalized_lines)


def chunk_markdown(md_text, max_chars=1000):
    """
    Split markdown into chunks by headings, tables, and paragraphs while respecting max_chars per chunk.
    - Consecutive table lines are grouped into one chunk.
    - Headings start a new chunk.
    """
    chunks = []
    current_chunk = ""
    table_buffer = []

    lines = md_text.splitlines()

    for line in lines:
        line_stripped = line.strip()

        if not line_stripped:
            continue

        # Handle table lines
        if line_stripped.startswith("|"):
            table_buffer.append(line_stripped)
            continue
        else:
            # Flush table buffer if table ended
            if table_buffer:
                table_chunk = "\n".join(table_buffer)
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                chunks.append(table_chunk)
                table_buffer = []

        # Start a new chunk at headings
        if re.match(r"^#+ ", line_stripped):
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
        current_chunk += line_stripped + "\n"

        # Split chunk if too long
        if len(current_chunk) >= max_chars:
            chunks.append(current_chunk.strip())
            current_chunk = ""

    # Flush remaining table or chunk
    if table_buffer:
        chunks.append("\n".join(table_buffer))
    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks



def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        return

    pdf_path = sys.argv[1]
    conv = DocumentConverter()
    result = conv.convert(pdf_path)
    doc = result.document

    # Convert result to markdown
    markdown_text = doc.export_to_markdown()
    # Normalize the markdown
    markdown_text = normalize_markdown(markdown_text)

    # Chunk the markdown
    chunks = chunk_markdown(markdown_text, max_chars=1000)

    # Ensure UTF-8 output so Node can read it
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps({"chunks": chunks}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
