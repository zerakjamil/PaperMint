import type { ExamProject, QuestionBlock } from '@/types/exam'

export const tinyPngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAACKADAAQAAAABAAAACAAAAACVhHtSAAAADklEQVQYGWNgGAWgEAAAAQgAAZScXDMAAAAASUVORK5CYII='

const FIXTURE_DATE = '2026-04-22T00:00:00.000Z'

const makeEssay = (index: number): QuestionBlock => ({
  id: `essay-${index}`,
  type: 'essay',
  prompt: `Discuss topic ${index} with detailed explanation and examples from syllabus units A to D.`,
  answerLines: 7,
  marks: 5,
})

const makeMcq = (index: number): QuestionBlock => ({
  id: `mcq-${index}`,
  type: 'mcq',
  prompt: `Choose best answer for item ${index}.`,
  options: [
    `Option A for ${index}`,
    `Option B for ${index}`,
    `Option C for ${index}`,
    `Option D for ${index}`,
  ],
  correctIndex: index % 4,
  marks: 1,
})

const makeFillBlank = (index: number): QuestionBlock => ({
  id: `blank-${index}`,
  type: 'fill_blank',
  prompt: `Fill missing terms for definition ${index}: ______ and ______.`,
  answers: [`answer-${index}-1`, `answer-${index}-2`],
  marks: 2,
})

const baseTemplateFields = [
  { id: '1', label: 'Ministry / Heading', value: 'Ministry of Higher Education', section: 'header' as const },
  { id: '2', label: 'University', value: 'Fixture University', section: 'header' as const },
  { id: '3', label: 'College / Department', value: 'College of Engineering - Computer Engineering', section: 'header' as const },
  { id: '4', label: 'Exam Info', value: 'Final Examination - Operating Systems', section: 'header' as const },
  { id: '5', label: 'Academic Year', value: '2025-2026', section: 'header' as const },
  { id: '6', label: 'Stage / Semester', value: 'Stage 3 / Semester 2', section: 'header' as const },
  { id: '7', label: 'Date / Duration', value: '2026-06-10 / 2 hours', section: 'header' as const },
  { id: '8', label: 'Code', value: 'CE-OS-302', section: 'header' as const },
  { id: '9', label: 'Lecturer Left', value: 'Dr. Left', section: 'footer' as const },
  { id: '10', label: 'Lecturer Right', value: 'Dr. Right', section: 'footer' as const },
  { id: '11', label: 'Footer Note', value: 'Answer all questions. Keep handwriting clear.', section: 'footer' as const },
]

export const createAutosaveRecoveryFixture = (): ExamProject => ({
  id: 'fixture-autosave-recovery',
  version: 1,
  templateFields: baseTemplateFields.map(f => f.label === 'Exam Info' ? { ...f, value: 'Recovered Subject' } : f),
  sections: [
    {
      id: 'section-recover',
      title: 'Section A',
      instructions: 'Answer all questions.',
      items: [makeEssay(1), makeMcq(1)],
    },
  ],
  assets: {},
  createdAt: FIXTURE_DATE,
  updatedAt: FIXTURE_DATE,
})

export const createPaginationStressFixture = (): ExamProject => {
  const items: QuestionBlock[] = []

  for (let i = 1; i <= 44; i += 1) {
    if (i % 3 === 0) {
      items.push(makeFillBlank(i))
    } else if (i % 2 === 0) {
      items.push(makeMcq(i))
    } else {
      items.push(makeEssay(i))
    }
  }

  return {
    id: 'fixture-pagination-stress',
    version: 1,
    templateFields: baseTemplateFields.map(f => f.label === 'Exam Info' ? { ...f, value: 'Algorithms and Complexity' } : f),
    sections: [
      {
        id: 'section-long-a',
        title: 'Section A',
        instructions: 'Answer all questions in this section.',
        items: items.slice(0, 24),
      },
      {
        id: 'section-long-b',
        title: 'Section B',
        instructions: 'Continue with remaining questions.',
        items: items.slice(24),
      },
    ],
    assets: {},
    createdAt: FIXTURE_DATE,
    updatedAt: FIXTURE_DATE,
  }
}

export const createLargeImageStressFixture = (): ExamProject => ({
  id: 'fixture-large-image-stress',
  version: 1,
  templateFields: baseTemplateFields.map(f => f.label === 'Exam Info' ? { ...f, value: 'Computer Vision' } : f),
  sections: [
    {
      id: 'section-image',
      title: 'Image Section',
      instructions: 'Inspect figure and answer.',
      items: [
        {
          id: 'img-question-1',
          type: 'image_question',
          prompt:
            'Analyze architecture in image. Explain key components, bottlenecks, and optimization opportunities in detail.',
          caption: 'Figure 1: High resolution network topology capture.',
          assetId: 'asset-large-1',
          layout: 'top',
          size: 'large',
          marks: 12,
        },
        makeEssay(99),
      ],
    },
  ],
  assets: {
    'asset-large-1': {
      id: 'asset-large-1',
      kind: 'image',
      path: tinyPngDataUrl,
      width: 4800,
      height: 3200,
    },
  },
  createdAt: FIXTURE_DATE,
  updatedAt: FIXTURE_DATE,
})
