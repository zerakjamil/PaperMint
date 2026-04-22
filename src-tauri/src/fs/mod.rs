use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use roxmltree::{Document, Node};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Cursor, Read};
use thiserror::Error;
use zip::ZipArchive;

const MAX_DOCX_BYTES: usize = 25 * 1024 * 1024;
const MAX_ZIP_ENTRIES: usize = 4_000;
const MAX_XML_CHARS: usize = 4_000_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocxImportResult {
	pub headers: Vec<ImportedBlock>,
	pub footers: Vec<ImportedBlock>,
	pub body: Vec<ImportedBlock>,
	pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedBlock {
	pub source: String,
	pub text: String,
	pub alignment: Option<String>,
	pub segments: Vec<StyledSegment>,
	pub images: Vec<ImportedImage>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StyledSegment {
	pub text: String,
	pub bold: bool,
	pub italics: bool,
	pub underline: bool,
	pub font_size_pt: Option<u32>,
	pub font_family: Option<String>,
	pub color_hex: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedImage {
	pub source_path: String,
	pub mime: String,
	pub data_url: String,
	pub alt_text: Option<String>,
}

#[derive(Debug, Error)]
pub enum DocxImportError {
	#[error("Invalid DOCX content (base64 decode failed).")]
	InvalidBase64,
	#[error("DOCX file too large. Maximum allowed size is 25 MB.")]
	FileTooLarge,
	#[error("Invalid DOCX archive.")]
	InvalidArchive,
	#[error("DOCX archive contains too many entries.")]
	TooManyEntries,
	#[error("Missing required DOCX part: {0}")]
	MissingPart(String),
	#[error("Invalid UTF-8 in DOCX part: {0}")]
	InvalidUtf8(String),
	#[error("XML too large in DOCX part: {0}")]
	XmlTooLarge(String),
	#[error("XML parse failed in DOCX part: {0}")]
	XmlParse(String),
}

pub fn import_docx_template_from_base64(docx_base64: &str) -> Result<DocxImportResult, DocxImportError> {
	let payload = match docx_base64.split_once(',') {
		Some((_, value)) => value.trim(),
		None => docx_base64.trim(),
	};

	let bytes = STANDARD
		.decode(payload)
		.map_err(|_| DocxImportError::InvalidBase64)?;

	if bytes.len() > MAX_DOCX_BYTES {
		return Err(DocxImportError::FileTooLarge);
	}

	import_docx_template_from_bytes(&bytes)
}

fn import_docx_template_from_bytes(bytes: &[u8]) -> Result<DocxImportResult, DocxImportError> {
	let entries = read_zip_entries(bytes)?;
	let media = read_media_entries(&entries);

	let document_path = "word/document.xml";
	let document_xml = read_xml_part(&entries, document_path)?;
	let document_rels_path = rels_path_for_part(document_path);
	let document_rels = match entries.get(&document_rels_path) {
		Some(_) => parse_relationships(&read_xml_part(&entries, &document_rels_path)?, document_path)?,
		None => HashMap::new(),
	};

	let mut warnings = Vec::new();

	let mut header_paths = entries
		.keys()
		.filter(|path| path.starts_with("word/header") && path.ends_with(".xml"))
		.cloned()
		.collect::<Vec<_>>();
	header_paths.sort();

	let mut footer_paths = entries
		.keys()
		.filter(|path| path.starts_with("word/footer") && path.ends_with(".xml"))
		.cloned()
		.collect::<Vec<_>>();
	footer_paths.sort();

	let mut headers = Vec::new();
	for path in header_paths {
		let xml = read_xml_part(&entries, &path)?;
		let rels = read_part_relationships(&entries, &path)?;
		headers.extend(parse_part_blocks(
			&xml,
			&path,
			&rels,
			&media,
			&mut warnings,
		)?);
	}

	let mut footers = Vec::new();
	for path in footer_paths {
		let xml = read_xml_part(&entries, &path)?;
		let rels = read_part_relationships(&entries, &path)?;
		footers.extend(parse_part_blocks(
			&xml,
			&path,
			&rels,
			&media,
			&mut warnings,
		)?);
	}

	let body = parse_part_blocks(
		&document_xml,
		document_path,
		&document_rels,
		&media,
		&mut warnings,
	)?;

	if headers.is_empty() {
		warnings.push("No header content detected in DOCX template.".to_string());
	}
	if footers.is_empty() {
		warnings.push("No footer content detected in DOCX template.".to_string());
	}

	Ok(DocxImportResult {
		headers,
		footers,
		body,
		warnings,
	})
}

fn read_zip_entries(bytes: &[u8]) -> Result<HashMap<String, Vec<u8>>, DocxImportError> {
	let mut archive = ZipArchive::new(Cursor::new(bytes)).map_err(|_| DocxImportError::InvalidArchive)?;
	if archive.len() > MAX_ZIP_ENTRIES {
		return Err(DocxImportError::TooManyEntries);
	}

	let mut entries = HashMap::new();
	for index in 0..archive.len() {
		let mut file = archive
			.by_index(index)
			.map_err(|_| DocxImportError::InvalidArchive)?;

		if file.is_dir() {
			continue;
		}

		let normalized = normalize_path(file.name());
		if normalized.is_empty() {
			continue;
		}

		let mut content = Vec::new();
		file.read_to_end(&mut content)
			.map_err(|_| DocxImportError::InvalidArchive)?;
		entries.insert(normalized, content);
	}

	Ok(entries)
}

fn read_media_entries(entries: &HashMap<String, Vec<u8>>) -> HashMap<String, Vec<u8>> {
	entries
		.iter()
		.filter(|(path, _)| path.starts_with("word/media/"))
		.map(|(path, bytes)| (path.clone(), bytes.clone()))
		.collect()
}

fn read_xml_part(entries: &HashMap<String, Vec<u8>>, path: &str) -> Result<String, DocxImportError> {
	let bytes = entries
		.get(path)
		.ok_or_else(|| DocxImportError::MissingPart(path.to_string()))?;

	let xml = String::from_utf8(bytes.clone())
		.map_err(|_| DocxImportError::InvalidUtf8(path.to_string()))?;

	if xml.chars().count() > MAX_XML_CHARS {
		return Err(DocxImportError::XmlTooLarge(path.to_string()));
	}

	Ok(xml)
}

fn read_part_relationships(
	entries: &HashMap<String, Vec<u8>>,
	source_part: &str,
) -> Result<HashMap<String, String>, DocxImportError> {
	let rels_path = rels_path_for_part(source_part);
	match entries.get(&rels_path) {
		Some(_) => {
			let rels_xml = read_xml_part(entries, &rels_path)?;
			parse_relationships(&rels_xml, source_part)
		}
		None => Ok(HashMap::new()),
	}
}

fn parse_relationships(xml: &str, source_part: &str) -> Result<HashMap<String, String>, DocxImportError> {
	let doc = Document::parse(xml)
		.map_err(|_| DocxImportError::XmlParse(source_part.to_string()))?;

	let mut rels = HashMap::new();
	for relationship in doc
		.descendants()
		.filter(|node| node.is_element() && node.tag_name().name() == "Relationship")
	{
		let id = match get_attr(relationship, "Id") {
			Some(value) => value,
			None => continue,
		};

		let target = match get_attr(relationship, "Target") {
			Some(value) => value,
			None => continue,
		};

		let target_mode = get_attr(relationship, "TargetMode")
			.map(|value| value.to_ascii_lowercase())
			.unwrap_or_default();
		if target_mode == "external" {
			continue;
		}

		rels.insert(id.to_string(), resolve_target_path(source_part, target));
	}

	Ok(rels)
}

fn parse_part_blocks(
	xml: &str,
	source_part: &str,
	rels: &HashMap<String, String>,
	media: &HashMap<String, Vec<u8>>,
	warnings: &mut Vec<String>,
) -> Result<Vec<ImportedBlock>, DocxImportError> {
	let doc = Document::parse(xml)
		.map_err(|_| DocxImportError::XmlParse(source_part.to_string()))?;

	let mut blocks = Vec::new();

	for paragraph in doc
		.descendants()
		.filter(|node| node.is_element() && node.tag_name().name() == "p")
	{
		let alignment = paragraph_alignment(paragraph);
		let mut segments = Vec::new();
		let mut images = Vec::new();

		for run in paragraph
			.children()
			.filter(|node| node.is_element() && node.tag_name().name() == "r")
		{
			let style = parse_run_style(run);
			let text = run
				.descendants()
				.filter(|node| node.is_element() && node.tag_name().name() == "t")
				.filter_map(|node| node.text())
				.collect::<String>();

			if !text.trim().is_empty() {
				segments.push(StyledSegment {
					text,
					bold: style.bold,
					italics: style.italics,
					underline: style.underline,
					font_size_pt: style.font_size_pt,
					font_family: style.font_family,
					color_hex: style.color_hex,
				});
			}

			let alt_text = run
				.descendants()
				.find(|node| node.is_element() && node.tag_name().name() == "docPr")
				.and_then(|node| {
					get_attr(node, "descr")
						.or_else(|| get_attr(node, "title"))
						.or_else(|| get_attr(node, "name"))
				})
				.map(ToString::to_string);

			for blip in run
				.descendants()
				.filter(|node| node.is_element() && node.tag_name().name() == "blip")
			{
				let rid = match get_attr(blip, "embed") {
					Some(value) => value,
					None => continue,
				};

				let Some(target_path) = rels.get(rid) else {
					warnings.push(format!(
						"Missing relationship target for image id {} in {}",
						rid, source_part
					));
					continue;
				};

				let Some(image_bytes) = media.get(target_path) else {
					warnings.push(format!(
						"Referenced media {} not found for {}",
						target_path, source_part
					));
					continue;
				};

				let mime = mime_for_path(target_path).to_string();
				let data_url = format!("data:{};base64,{}", mime, STANDARD.encode(image_bytes));

				images.push(ImportedImage {
					source_path: target_path.clone(),
					mime,
					data_url,
					alt_text: alt_text.clone(),
				});
			}
		}

		let text = segments
			.iter()
			.map(|segment| segment.text.as_str())
			.collect::<String>()
			.trim()
			.to_string();

		if text.is_empty() && images.is_empty() {
			continue;
		}

		blocks.push(ImportedBlock {
			source: source_part.to_string(),
			text,
			alignment,
			segments,
			images,
		});
	}

	Ok(blocks)
}

fn paragraph_alignment(paragraph: Node<'_, '_>) -> Option<String> {
	paragraph
		.children()
		.find(|node| node.is_element() && node.tag_name().name() == "pPr")
		.and_then(|ppr| {
			ppr.children()
				.find(|node| node.is_element() && node.tag_name().name() == "jc")
		})
		.and_then(|jc| get_attr(jc, "val"))
		.map(normalize_alignment)
}

fn normalize_alignment(raw: &str) -> String {
	let lowered = raw.to_ascii_lowercase();
	match lowered.as_str() {
		"left" | "right" | "center" | "both" | "justify" => lowered,
		_ => "left".to_string(),
	}
}

#[derive(Default)]
struct RunStyle {
	bold: bool,
	italics: bool,
	underline: bool,
	font_size_pt: Option<u32>,
	font_family: Option<String>,
	color_hex: Option<String>,
}

fn parse_run_style(run: Node<'_, '_>) -> RunStyle {
	let mut style = RunStyle::default();

	let Some(run_props) = run
		.children()
		.find(|node| node.is_element() && node.tag_name().name() == "rPr")
	else {
		return style;
	};

	style.bold = property_enabled(run_props, "b");
	style.italics = property_enabled(run_props, "i");

	if let Some(underline) = run_props
		.children()
		.find(|node| node.is_element() && node.tag_name().name() == "u")
	{
		style.underline = get_attr(underline, "val")
			.map(|value| !matches!(value, "none" | "0" | "false"))
			.unwrap_or(true);
	}

	if let Some(size) = run_props
		.children()
		.find(|node| node.is_element() && node.tag_name().name() == "sz")
		.and_then(|node| get_attr(node, "val"))
	{
		style.font_size_pt = size.parse::<u32>().ok().map(|half_points| half_points / 2);
	}

	if let Some(fonts) = run_props
		.children()
		.find(|node| node.is_element() && node.tag_name().name() == "rFonts")
	{
		style.font_family = get_attr(fonts, "ascii")
			.or_else(|| get_attr(fonts, "hAnsi"))
			.or_else(|| get_attr(fonts, "cs"))
			.or_else(|| get_attr(fonts, "eastAsia"))
			.map(ToString::to_string);
	}

	if let Some(color) = run_props
		.children()
		.find(|node| node.is_element() && node.tag_name().name() == "color")
		.and_then(|node| get_attr(node, "val"))
	{
		if color != "auto" {
			style.color_hex = Some(color.to_string());
		}
	}

	style
}

fn property_enabled(run_props: Node<'_, '_>, property_name: &str) -> bool {
	let Some(node) = run_props
		.children()
		.find(|child| child.is_element() && child.tag_name().name() == property_name)
	else {
		return false;
	};

	get_attr(node, "val")
		.map(|value| !matches!(value, "0" | "false" | "off" | "none"))
		.unwrap_or(true)
}

fn get_attr<'a>(node: Node<'a, 'a>, key: &str) -> Option<&'a str> {
	node.attributes()
		.find(|attribute| attribute.name() == key)
		.map(|attribute| attribute.value())
}

fn rels_path_for_part(part_path: &str) -> String {
	match part_path.rsplit_once('/') {
		Some((dir, file)) => format!("{}/_rels/{}.rels", dir, file),
		None => format!("_rels/{}.rels", part_path),
	}
}

fn resolve_target_path(source_part: &str, target: &str) -> String {
	if target.starts_with('/') {
		return normalize_path(target.trim_start_matches('/'));
	}

	let base_dir = source_part.rsplit_once('/').map(|(dir, _)| dir).unwrap_or("");
	let combined = if base_dir.is_empty() {
		target.to_string()
	} else {
		format!("{}/{}", base_dir, target)
	};

	normalize_path(&combined)
}

fn normalize_path(path: &str) -> String {
	let mut parts: Vec<&str> = Vec::new();
	let normalized = path.replace('\\', "/");

	for segment in normalized.split('/') {
		if segment.is_empty() || segment == "." {
			continue;
		}

		if segment == ".." {
			parts.pop();
			continue;
		}

		parts.push(segment);
	}

	parts.join("/")
}

fn mime_for_path(path: &str) -> &'static str {
	match path.rsplit('.').next().map(|ext| ext.to_ascii_lowercase()) {
		Some(ext) if ext == "png" => "image/png",
		Some(ext) if ext == "jpg" || ext == "jpeg" => "image/jpeg",
		Some(ext) if ext == "gif" => "image/gif",
		Some(ext) if ext == "webp" => "image/webp",
		Some(ext) if ext == "bmp" => "image/bmp",
		Some(ext) if ext == "svg" => "image/svg+xml",
		Some(ext) if ext == "tif" || ext == "tiff" => "image/tiff",
		_ => "application/octet-stream",
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::io::{Cursor, Write};
	use zip::write::SimpleFileOptions;
	use zip::{CompressionMethod, ZipWriter};

	fn create_test_docx() -> Vec<u8> {
		let cursor = Cursor::new(Vec::new());
		let mut writer = ZipWriter::new(cursor);
		let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

		let document_xml = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
	<w:p>
	  <w:r><w:t>1. Explain diffusion process.</w:t></w:r>
	</w:p>
	<w:sectPr>
	  <w:headerReference w:type="default" r:id="rIdHeader1"/>
	  <w:footerReference w:type="default" r:id="rIdFooter1"/>
	</w:sectPr>
  </w:body>
</w:document>"#;

		let document_rels = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>"#;

		let header_xml = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:p>
	<w:pPr><w:jc w:val="center"/></w:pPr>
	<w:r>
	  <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
	  <w:t>Course: {{course_name}}</w:t>
	</w:r>
  </w:p>
  <w:p>
	<w:r>
	  <wp:docPr id="1" name="Logo" descr="School Logo"/>
	  <w:drawing>
		<a:blip r:embed="rIdLogo"/>
	  </w:drawing>
	</w:r>
  </w:p>
</w:hdr>"#;

		let header_rels = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>
</Relationships>"#;

		let footer_xml = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
	<w:r><w:t>Generated by {{teacher_name}}</w:t></w:r>
  </w:p>
</w:ftr>"#;

		writer.start_file("word/document.xml", options).unwrap();
		writer.write_all(document_xml.as_bytes()).unwrap();
		writer
			.start_file("word/_rels/document.xml.rels", options)
			.unwrap();
		writer.write_all(document_rels.as_bytes()).unwrap();

		writer.start_file("word/header1.xml", options).unwrap();
		writer.write_all(header_xml.as_bytes()).unwrap();
		writer
			.start_file("word/_rels/header1.xml.rels", options)
			.unwrap();
		writer.write_all(header_rels.as_bytes()).unwrap();

		writer.start_file("word/footer1.xml", options).unwrap();
		writer.write_all(footer_xml.as_bytes()).unwrap();

		writer.start_file("word/media/logo.png", options).unwrap();
		writer
			.write_all(&[137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
			.unwrap();

		writer.start_file("[Content_Types].xml", options).unwrap();
		writer.write_all(b"<Types></Types>").unwrap();

		writer.finish().unwrap().into_inner()
	}

	#[test]
	fn imports_header_footer_body_with_images() {
		let docx = create_test_docx();
		let encoded = STANDARD.encode(docx);

		let parsed = import_docx_template_from_base64(&encoded).unwrap();

		assert!(parsed
			.headers
			.iter()
			.any(|block| block.text.contains("Course: {{course_name}}")));
		assert!(parsed
			.headers
			.iter()
			.any(|block| !block.images.is_empty()));
		assert!(parsed
			.footers
			.iter()
			.any(|block| block.text.contains("Generated by {{teacher_name}}")));
		assert!(parsed
			.body
			.iter()
			.any(|block| block.text.contains("1. Explain diffusion process.")));
		assert!(parsed
			.headers
			.iter()
			.any(|block| block.alignment.as_deref() == Some("center")));
	}

	#[test]
	fn rejects_invalid_base64() {
		let error = import_docx_template_from_base64("not-valid-base64").unwrap_err();
		assert!(matches!(error, DocxImportError::InvalidBase64));
	}
}
