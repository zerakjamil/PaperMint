import { newId } from '@/lib/utils/id'
import type { ExamProject, TemplateField, TemplatePresetId } from '@/types/exam'

type TemplateEntry = {
  label: string
  value: string
  locked?: boolean
  displayMode?: TemplateField['displayMode']
  style?: TemplateField['style']
}

type TemplatePreset = {
  id: TemplatePresetId
  name: string
  description: string
  rules: {
    enforcedHeaderDisplayMode: 'label_value' | 'value_only'
    enforcedFooterDisplayMode: 'label_value' | 'value_only'
    enforcedHeaderStyle: NonNullable<TemplateField['style']>
    enforcedFooterStyle: NonNullable<TemplateField['style']>
  }
  header: TemplateEntry[]
  footer: TemplateEntry[]
}

const presets: TemplatePreset[] = [
  {
    id: 'default_university',
    name: 'Default University',
    description: 'Classic university paper with left details, centered logo, and right metadata.',
    rules: {
      enforcedHeaderDisplayMode: 'value_only',
      enforcedFooterDisplayMode: 'value_only',
      enforcedHeaderStyle: {
        alignment: 'left',
        bold: true,
        fontFamily: 'Times New Roman',
        fontSizePt: 10,
      },
      enforcedFooterStyle: {
        alignment: 'center',
        fontFamily: 'Times New Roman',
        fontSizePt: 10,
      },
    },
    header: [
      {
        label: 'Institution Block',
        value:
          'Ministry of Higher Education and Scientific\nResearch Erbil Polytechnic University Technical\nCollege of Computer and Informatics Engineering\nDepartment: ISE\n\nClass: 1 Semester: 1st Semester Subject: Computer                           Academic Year 2024 - 2025 Final Exam\nEssentials Time: 120 min Date: DD/MM/YYYY\nCode: COE103',
        style: { alignment: 'left', bold: true, fontSizePt: 10 },
      },
      {
        label: 'Institution Logo',
        value: '-',
        displayMode: 'value_only',
        style: { alignment: 'right', bold: false, fontSizePt: 10 },
      },
    ],
    footer: [
      { label: 'Footer Blessing', value: 'Best of Luck', style: { alignment: 'center', bold: true, fontSizePt: 10 } },
      { label: 'Signature Left', value: 'Lecturer: ____________________', style: { alignment: 'right', bold: true, fontSizePt: 10 } },
      { label: 'Signature Right', value: 'Examiner: ____________________', style: { alignment: 'left', bold: true, fontSizePt: 10 } },
    ],
  },
  {
    id: 'engineering_midterm',
    name: 'Engineering Midterm',
    description: 'Engineering drawing layout with prominent logo and signature footer.',
    rules: {
      enforcedHeaderDisplayMode: 'value_only',
      enforcedFooterDisplayMode: 'value_only',
      enforcedHeaderStyle: {
        alignment: 'left',
        bold: true,
        fontFamily: 'Times New Roman',
        fontSizePt: 10,
      },
      enforcedFooterStyle: {
        alignment: 'center',
        fontFamily: 'Times New Roman',
        fontSizePt: 10,
      },
    },
    header: [
      {
        label: 'Institution Block',
        value:
          'Ministry of Higher Education & Scientific Research\nErbil Polytechnic University\nErbil Technical Engineering College\nInformation System Engineering Dept.',
        style: { alignment: 'left', bold: true, fontSizePt: 10 },
      },
      {
        label: 'Institution Logo',
        value: '',
        displayMode: 'value_only',
        style: { alignment: 'center', bold: false, fontSizePt: 10 },
      },
      {
        label: 'Class Metadata',
        value:
          'Class: 1st Semester\nSubject: Engineering Drawing\nTime: 120 Minutes\nDate: 04/01/2024\nCode: END105',
        style: { alignment: 'right', bold: true, fontSizePt: 10 },
      },
      {
        label: 'Exam Session Banner',
        value: '2023 - 2024\nFinal Exam\nFirst Attempt',
        style: { alignment: 'center', bold: true, fontSizePt: 11 },
      },
    ],
    footer: [
      { label: 'Footer Blessing', value: 'Best of Luck', style: { alignment: 'center', bold: true, fontSizePt: 16 } },
      { label: 'Signature Left', value: 'Lecturer: ____________________', style: { alignment: 'left', bold: true, fontSizePt: 10 } },
      { label: 'Signature Right', value: 'Examiner: ____________________', style: { alignment: 'right', bold: true, fontSizePt: 10 } },
    ],
  },
  {
    id: 'medical_final',
    name: 'Medical Final',
    description: 'Clean final-exam shell with grouped header metadata and large footer signatures.',
    rules: {
      enforcedHeaderDisplayMode: 'value_only',
      enforcedFooterDisplayMode: 'value_only',
      enforcedHeaderStyle: {
        alignment: 'left',
        bold: true,
        fontFamily: 'Times New Roman',
        fontSizePt: 10,
      },
      enforcedFooterStyle: {
        alignment: 'center',
        fontFamily: 'Times New Roman',
        fontSizePt: 10,
      },
    },
    header: [
      {
        label: 'Institution Block',
        value:
          'Ministry of Higher Education\nErbil Polytechnic University\nTechnical College of Computer and Informatics Engineering\nDepartment: ISE',
        style: { alignment: 'left', bold: true, fontSizePt: 10 },
      },
      {
        label: 'Institution Logo',
        value: '',
        displayMode: 'value_only',
        style: { alignment: 'center', bold: false, fontSizePt: 10 },
      },
      {
        label: 'Class Metadata',
        value:
          'Class: 1\nSemester: 1\nSubject: Engineering Drawing\nCode: END105\nTime: 120 Minutes\nDate: 22/01/2025',
        style: { alignment: 'right', bold: true, fontSizePt: 10 },
      },
      {
        label: 'Exam Session Banner',
        value: 'Academic Year 2024 - 2025\nFinal Exam / First Attempt',
        style: { alignment: 'center', bold: true, fontSizePt: 11 },
      },
    ],
    footer: [
      { label: 'Footer Blessing', value: 'Good luck', style: { alignment: 'center', bold: true, fontSizePt: 13 } },
      { label: 'Signature Left', value: 'Asst. Prof.: ____________________', style: { alignment: 'left', bold: true, fontSizePt: 10 } },
      { label: 'Signature Right', value: 'Examiner: ____________________', style: { alignment: 'right', bold: true, fontSizePt: 10 } },
    ],
  },
  {
    id: 'shaqlawa_linux_gui',
    name: 'Shaqlawa Linux (GUI)',
    description:
      'Linux (GUI) first-round exam template with Kurdish cover sheet, fixed metadata, and editable question content.',
    rules: {
      enforcedHeaderDisplayMode: 'value_only',
      enforcedFooterDisplayMode: 'value_only',
      enforcedHeaderStyle: {
        alignment: 'right',
        bold: true,
        fontFamily: 'Times New Roman',
        fontSizePt: 11,
      },
      enforcedFooterStyle: {
        alignment: 'right',
        fontFamily: 'Times New Roman',
        fontSizePt: 10,
      },
    },
    header: [
      {
        label: 'Top Strip Left',
        value: 'بابەت/ Linux (GUI) / قۆناغ / سێیەمی کۆمپیوتەر',
        style: { alignment: 'left', bold: false, fontSizePt: 12 },
      },
      {
        label: 'Top Strip Right',
        value: 'سیریال قوتابی //',
        style: { alignment: 'right', bold: false, fontSizePt: 12 },
      },
      {
        label: 'Institution Logo',
        value: '/templates/shaqlawa-logo.png',
        displayMode: 'value_only',
        style: { alignment: 'center', bold: false, fontSizePt: 10 },
      },
      {
        label: 'Cover Page Image',
        value: '/templates/linux-gui-cover.png',
        displayMode: 'value_only',
        style: { alignment: 'center', bold: false, fontSizePt: 10 },
      },
      {
        label: 'Institution Name (Kurdish)',
        value:
          'پەیمانگەى شەقاڵوەى ناحكومى\nبۆ زانستەكانى (كۆمپیوتەر / كارگێرى / ژمێریارى)',
        style: { alignment: 'right', bold: true, fontSizePt: 12 },
      },
      {
        label: 'Institution Name (English)',
        value: 'Shaqlawa private Institute',
        style: { alignment: 'right', bold: true, fontSizePt: 12 },
      },
      {
        label: 'Course Metadata',
        value:
          'بابەت/ Linux (GUI)\nبەشی / کۆمپیوتەر\nقۆناغ/ سێیەم\nكات/ 1:30 كاتژێر',
        style: { alignment: 'right', bold: false, fontSizePt: 11 },
      },
      {
        label: 'Session Banner',
        value: 'تاقی كردنهوهكانی كۆتایــــی ساڵ\n2025-2026\nخوولی یهكهم',
        style: { alignment: 'center', bold: true, fontSizePt: 14 },
      },
      {
        label: 'Cover Left Metadata',
        value: 'بەش/\nقۆناغی/\nهۆبە /',
        style: { alignment: 'right', bold: false, fontSizePt: 12 },
      },
      {
        label: 'Student Serial Label',
        value: 'سیریال\nقوتابی',
        style: { alignment: 'center', bold: true, fontSizePt: 12 },
      },
    ],
    footer: [
      {
        label: 'Cover Instructions',
        value:
          '* بە پێنوسى دار (رصاص) دەبێ وەاڵمى پرسیارەکان بدرێتەوە بەجاف وەاڵم دانەوە بە گزى هەژمار دەکرێت.\n* قوتابى لەهەر بابەتێک گزى بکات لە هەموو بابەتەکان بە کەوتوو هەژمار دەکرێت.\n* دانانى هەر تێبینەیەکى وهێمایەک دوور لەبابەتە کە لە ناو پەراوى پرسیارەکان بەگزى هەژماردەکرێت.\n* سیریالی قوتابی دەبێت لەهەموو پەرەكان بنووسرێت.',
        style: { alignment: 'right', bold: false, fontSizePt: 10 },
      },
      {
        label: 'Footer Blessing',
        value: 'بەهیوای سەركەوتن',
        style: { alignment: 'center', bold: true, fontSizePt: 14 },
      },
      {
        label: 'Lecturer Signature',
        value: 'مامۆستای بابەت\nایالف ناظم انور',
        style: { alignment: 'right', bold: false, fontSizePt: 12 },
      },
    ],
  },
]

const toField = (
  section: 'header' | 'footer',
  entry: TemplateEntry,
  preset: TemplatePreset,
): TemplateField => ({
  id: newId(),
  label: entry.label,
  value: entry.value,
  section,
  locked: entry.locked ?? false,
  formatLocked: true,
  displayMode:
    entry.displayMode ??
    (section === 'header'
      ? preset.rules.enforcedHeaderDisplayMode
      : preset.rules.enforcedFooterDisplayMode),
  style:
    entry.style
      ? { ...(section === 'header' ? preset.rules.enforcedHeaderStyle : preset.rules.enforcedFooterStyle), ...entry.style }
      : section === 'header'
        ? { ...preset.rules.enforcedHeaderStyle }
        : { ...preset.rules.enforcedFooterStyle },
})

export const templatePresets = presets

export const getTemplatePreset = (presetId: TemplatePresetId) =>
  presets.find((preset) => preset.id === presetId) ?? presets[0]

export const applyTemplatePreset = (
  project: ExamProject,
  presetId: TemplatePresetId,
): ExamProject => {
  const preset = getTemplatePreset(presetId)

  return {
    ...project,
    settings: {
      ...project.settings,
      templatePresetId: preset.id,
    },
    templateFields: [
      ...preset.header.map((entry) => toField('header', entry, preset)),
      ...preset.footer.map((entry) => toField('footer', entry, preset)),
    ],
  }
}
