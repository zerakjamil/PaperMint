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
          'Ministry of Higher Education and Scientific Research\nErbil Polytechnic University\nTechnical College of Computer and Informatics Engineering\nDepartment: ISE',
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
          'Class: 1\nSemester: 1st Semester\nSubject: Computer Essentials\nTime: 120 min\nDate: DD/MM/YYYY\nCode: COE103',
        style: { alignment: 'right', bold: true, fontSizePt: 10 },
      },
      {
        label: 'Exam Session Banner',
        value: 'Academic Year 2024 - 2025\nFinal Exam',
        style: { alignment: 'center', bold: true, fontSizePt: 11 },
      },
    ],
    footer: [
      { label: 'Footer Blessing', value: 'Best of Luck', style: { alignment: 'center', bold: true, fontSizePt: 13 } },
      { label: 'Signature Left', value: 'Lecturer: ____________________', style: { alignment: 'left', bold: true, fontSizePt: 10 } },
      { label: 'Signature Right', value: 'Examiner: ____________________', style: { alignment: 'right', bold: true, fontSizePt: 10 } },
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
