import pytest
from app.services.extractor import StructureExtractor
from app.services.document_processor import DocumentProcessor

def test_structure_extractor_syllabus():
    extractor = StructureExtractor()
    text = """
    UNIT I: Data Structures
    Arrays, Linked Lists, Stacks, Queues
    UNIT II: Algorithms
    Sorting; Searching; Graphs
    """
    result = extractor.extract(text, "SYLLABUS")
    assert "units" in result
    assert len(result["units"]) == 2
    
    assert result["units"][0]["name"] == "Unit I: Data Structures"
    assert "Arrays" in result["units"][0]["topics"]
    
    assert result["units"][1]["name"] == "Unit II: Algorithms"
    assert "Sorting" in result["units"][1]["topics"]

def test_structure_extractor_pyq():
    extractor = StructureExtractor()
    text = """
    Q1. Explain Linked List [5]
    Q2. What is an array? (10 Marks)
    """
    result = extractor.extract(text, "PYQ")
    assert "questions" in result
    assert len(result["questions"]) == 2
    
    assert result["questions"][0]["q_no"] == "1"
    assert "Explain Linked List" in result["questions"][0]["text"]
    assert result["questions"][0]["marks"] == 5
    
    assert result["questions"][1]["q_no"] == "2"
    assert "What is an array" in result["questions"][1]["text"]
    assert result["questions"][1]["marks"] == 10

def test_document_processor_clean():
    processor = DocumentProcessor()
    text = "This   is \r\n a text \n\n\n\n with     spaces."
    cleaned = processor._clean_text(text)
    assert cleaned == "This is \n a text \n\n with spaces."

def test_document_processor_txt(tmp_path):
    processor = DocumentProcessor()
    file_p = tmp_path / "test.txt"
    file_p.write_text("Hello World! This is a test file for document processor.", encoding="utf-8")
    extracted = processor.extract_text(str(file_p), "txt")
    assert "Hello World!" in extracted
    assert "document processor" in extracted

def test_ocr_engine_fallback():
    from app.services.document_processor import OCREngine
    ocr = OCREngine()
    # Should not raise an unhandled exception on nonexistent or mock file
    res = ocr.extract_text_from_image("nonexistent.png")
    assert isinstance(res, str)
