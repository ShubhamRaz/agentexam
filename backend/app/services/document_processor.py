import os
import re
import fitz  # PyMuPDF
import docx
from typing import Optional

class OCREngine:
    def extract_text_from_image(self, file_path: str) -> str:
        # Stub for OCR engine as per requirements.
        # Can integrate pytesseract here later.
        return ""

class DocumentProcessor:
    def __init__(self, ocr_engine: Optional[OCREngine] = None):
        self.ocr_engine = ocr_engine or OCREngine()
        
    def extract_text(self, file_path: str, file_type: str) -> str:
        text = ""
        if file_type == "pdf":
            text = self._extract_pdf(file_path)
        elif file_type in ["docx", "doc"]:
            text = self._extract_docx(file_path)
        else:
            raise ValueError(f"Unsupported file type for extraction: {file_type}")
            
        return self._clean_text(text)
        
    def _extract_pdf(self, file_path: str) -> str:
        text = ""
        try:
            with fitz.open(file_path) as doc:
                for page in doc:
                    page_text = page.get_text()
                    if page_text:
                        text += page_text + "\n"
                        
            # If text is extremely short or empty, it might be a scanned PDF.
            if len(text.strip()) < 50:
                # Fallback to OCR stub
                text = self.ocr_engine.extract_text_from_image(file_path)
                
        except Exception as e:
            raise RuntimeError(f"PDF extraction failed: {str(e)}")
            
        return text

    def _extract_docx(self, file_path: str) -> str:
        text = ""
        try:
            doc = docx.Document(file_path)
            # Extract paragraphs
            for p in doc.paragraphs:
                if p.text.strip():
                    text += p.text + "\n"
                    
            # Extract tables
            for table in doc.tables:
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_data:
                        text += " | ".join(row_data) + "\n"
        except Exception as e:
            raise RuntimeError(f"DOCX extraction failed: {str(e)}")
            
        return text
        
    def _clean_text(self, text: str) -> str:
        # Normalize newlines
        text = re.sub(r'\r\n', '\n', text)
        # Remove multiple consecutive blank lines
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Replace multiple spaces with a single space
        text = re.sub(r'[ \t]{2,}', ' ', text)
        return text.strip()
