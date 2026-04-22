import { createBlock } from '@/features/questions/blockFactory'
import { newId } from '@/lib/utils/id'
import type { ExamProject } from '@/types/exam'

export const createDefaultProject = (): ExamProject => {
  const now = new Date().toISOString()

  return {
    id: newId(),
    version: 1,
    templateFields: [
      { id: newId(), label: 'Ministry / Heading', value: 'Ministry of Higher Education', section: 'header' },
      { id: newId(), label: 'University', value: 'University Name', section: 'header' },
      { id: newId(), label: 'College / Department', value: 'College Name - Department Name', section: 'header' },
      { id: newId(), label: 'Exam Info', value: 'Final Examination - Subject Name', section: 'header' },
      { id: newId(), label: 'Academic Year', value: '2025-2026', section: 'header' },
      { id: newId(), label: 'Stage / Semester', value: 'Stage 1 / Semester 1', section: 'header' },
      { id: newId(), label: 'Date / Duration', value: 'DD/MM/YYYY / 2 hours', section: 'header' },
      { id: newId(), label: 'Code', value: '', section: 'header' },
      { id: newId(), label: 'Lecturer Left', value: 'Lecturer 1', section: 'footer' },
      { id: newId(), label: 'Lecturer Right', value: 'Lecturer 2', section: 'footer' },
      { id: newId(), label: 'Footer Note', value: 'Read all questions carefully before answering.', section: 'footer' },
    ],
    sections: [
      {
        id: newId(),
        title: 'Section A',
        instructions: 'Answer all questions in this section.',
        items: [createBlock('essay')],
      },
    ],
    assets: {},
    createdAt: now,
    updatedAt: now,
  }
}
