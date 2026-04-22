use crate::fs::{import_docx_template_from_base64, DocxImportResult};

#[tauri::command]
pub fn import_docx_template(docx_base64: String) -> Result<DocxImportResult, String> {
	import_docx_template_from_base64(&docx_base64).map_err(|error| error.to_string())
}
