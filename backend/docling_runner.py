import sys
import json
from docling.document_converter import DocumentConverter

# Takes a PDF url and uses Docling to parse the pdf
def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        return

    pdf_path = sys.argv[1]
    conv = DocumentConverter()
    result = conv.convert(pdf_path)
    doc = result.document

    # Convert result to JSON string
    markdown_text = doc.export_to_element_tree()

    # Ensure UTF-8 output so Node can read it
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps({"success": True, "markdown": markdown_text}, ensure_ascii=False))

if __name__ == "__main__":
    main()
