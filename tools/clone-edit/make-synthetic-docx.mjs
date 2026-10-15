// Generates a teacher-like exam DOCX for validating the clone-and-edit
// pipeline plumbing (tools/clone-edit/run.sh). This is NOT gate evidence —
// it only proves the harness runs end to end before real papers arrive.
//
// Usage: node tools/clone-edit/make-synthetic-docx.mjs <out.docx>

import { writeFileSync } from 'node:fs'

import {
  AlignmentType,
  Document,
  Footer,
  Header,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'

const out = process.argv[2]
if (!out) {
  console.error('usage: node tools/clone-edit/make-synthetic-docx.mjs <out.docx>')
  process.exit(2)
}

const line = (text, options = {}) =>
  new Paragraph({
    alignment: options.align,
    children: [
      new TextRun({
        text,
        bold: options.bold,
        size: options.size ?? 24,
        font: options.font,
      }),
    ],
  })

const document = new Document({
  sections: [
    {
      headers: {
        default: new Header({
          children: [
            line('Shaqlawa Technical Institute — Computer Department', {
              align: AlignmentType.CENTER,
              bold: true,
            }),
            line('Course: {{course_name}}    Date: {{exam_date}}    Duration: {{duration}}', {
              align: AlignmentType.CENTER,
            }),
            line('Student Name: ____________    Class: ____________    Attempt: ____________'),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            line('Total marks: {{total_marks}}    Examiner: {{examiner}}    Page __ of __', {
              align: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children: [
        line('Answer all questions. Each question carries the marks shown.', { bold: true }),
        line(''),
        line('1. Explain the Linux boot process from power-on to login prompt. (5 marks)'),
        line('2. Which command lists all files including hidden ones? (2 marks)'),
        line('A) ls -l'),
        line('B) ls -a'),
        line('C) dir'),
        line('D) list'),
        line(''),
        line('3. True or False: the root user always has UID 0. (1 mark)'),
        line('4. Fill in the blank: the Linux kernel image is usually stored in ____. (2 marks)'),
        line(''),
        line('5. Write a short note on file permissions (rwx) with an example. (5 marks)'),
      ],
    },
  ],
})

const buffer = await Packer.toBuffer(document)
writeFileSync(out, buffer)
console.log(`wrote ${out} (${buffer.length} bytes)`)
