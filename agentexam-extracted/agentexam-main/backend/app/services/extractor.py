import re
from typing import Dict, List, Any

class StructureExtractor:
    def __init__(self):
        pass

    def extract(self, text: str, material_type: str) -> Dict[str, Any]:
        """
        Extract structured academic data from text.
        """
        if material_type == "SYLLABUS":
            return self._extract_syllabus(text)
        elif material_type == "PYQ":
            return self._extract_pyq(text)
        else:
            # For NOTES, LAB_MANUAL, OTHER - we don't have strict heuristic parsers yet.
            # Return basic extracted text length or basic paragraphs.
            return {"raw_length": len(text), "type": material_type}

    def _extract_syllabus(self, text: str) -> Dict[str, Any]:
        """
        Heuristically extract Units and Topics from a syllabus text.
        Returns: { "units": [ {"name": "Unit 1", "topics": ["Topic A", "Topic B"]} ] }
        """
        result = {"units": []}
        
        # Split by "Unit " or "Module " or "Chapter "
        # Regex to find unit headers like "UNIT I", "Unit 1:", "Module 1"
        unit_pattern = re.compile(r'^\s*(unit|module|chapter)\s+([ivx0-9]+)[\s:-]*(.*)', re.IGNORECASE | re.MULTILINE)
        
        matches = list(unit_pattern.finditer(text))
        
        if not matches:
            return result
            
        for i in range(len(matches)):
            match = matches[i]
            unit_type = match.group(1).capitalize()
            unit_no = match.group(2).upper()
            unit_title = match.group(3).strip()
            
            unit_name = f"{unit_type} {unit_no}"
            if unit_title:
                unit_name += f": {unit_title}"
                
            start_idx = match.end()
            end_idx = matches[i+1].start() if i + 1 < len(matches) else len(text)
            
            unit_content = text[start_idx:end_idx].strip()
            
            # Simple heuristic for topics: split by comma, semicolon, or newline
            # This is a very basic heuristic since we are not using an LLM.
            raw_topics = re.split(r'[,;\n]', unit_content)
            topics = [t.strip('- \t*') for t in raw_topics if len(t.strip()) > 3 and len(t.strip()) < 100]
            
            result["units"].append({
                "name": unit_name,
                "topics": topics
            })
            
        return result

    def _extract_pyq(self, text: str) -> Dict[str, Any]:
        """
        Heuristically extract Questions from a Previous Year Question paper.
        Returns: { "questions": [ {"q_no": "1", "text": "What is x?", "marks": 5} ] }
        """
        result = {"questions": []}
        
        # Regex to find question numbers like "Q1.", "1)", "1."
        # And optionally marks like "[5]", "(5 Marks)", "5M"
        # We split the text by question start markers
        
        q_pattern = re.compile(r'^\s*(?:q\s*)?([0-9]+)[\.\)]\s*(.*)', re.IGNORECASE | re.MULTILINE)
        matches = list(q_pattern.finditer(text))
        
        for i in range(len(matches)):
            match = matches[i]
            q_no = match.group(1)
            
            start_idx = match.start(2)
            end_idx = matches[i+1].start() if i + 1 < len(matches) else len(text)
            
            q_text_block = text[start_idx:end_idx].strip()
            
            # Try to extract marks from the text block
            marks = None
            marks_match = re.search(r'\[(\d+)\s*(?:marks?|m)?\]|\((\d+)\s*(?:marks?|m)?\)', q_text_block, re.IGNORECASE)
            if marks_match:
                marks = int(marks_match.group(1) or marks_match.group(2))
                # Remove marks from question text
                q_text_block = q_text_block[:marks_match.start()] + q_text_block[marks_match.end():]
                
            result["questions"].append({
                "q_no": str(q_no),
                "text": q_text_block.strip(),
                "marks": marks
            })
            
        return result
