import io
import logging

logger = logging.getLogger(__name__)

def parse_resume_bytes(file_bytes: bytes, content_type: str) -> str:
    """
    Extracts plain text from a resume (PDF or DOCX).
    Returns the extracted text, or an empty string on failure.
    """
    try:
        if content_type == "application/pdf":
            from pypdf import PdfReader
            pdf = PdfReader(io.BytesIO(file_bytes))
            text = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
            
            extracted = " ".join(text).strip()
            # Constrain extreme length to avoid overwhelming the embedding limit
            return extracted[:4000]

        elif content_type in [
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]:
            from docx import Document
            doc = Document(io.BytesIO(file_bytes))
            text = [para.text for para in doc.paragraphs if para.text]
            extracted = " ".join(text).strip()
            return extracted[:4000]

        else:
            logger.warning(f"Unsupported resume content type: {content_type}")
            return ""

    except Exception as exc:
        logger.error(f"Error parsing resume: {exc}", exc_info=True)
        return ""
