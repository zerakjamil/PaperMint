import { applyTemplatePreset } from '@/features/template/templateLibrary'
import { newId } from '@/lib/utils/id'
import type {
  ExamProject,
  FillBlankBlock,
  ImageQuestionBlock,
  MCQBlock,
  TrueFalseBlock,
} from '@/types/exam'

const createMcq = (
  prompt: string,
  options: string[],
  marks: number,
  correctIndex?: number,
): MCQBlock => ({
  id: newId(),
  type: 'mcq',
  prompt,
  options,
  marks,
  correctIndex,
})

const createFillBlank = (
  prompt: string,
  answers: string[],
  marks: number,
): FillBlankBlock => ({
  id: newId(),
  type: 'fill_blank',
  prompt,
  answers,
  marks,
})

const createTrueFalse = (
  prompt: string,
  marks: number,
  answer?: boolean,
): TrueFalseBlock => ({
  id: newId(),
  type: 'true_false',
  prompt,
  marks,
  answer,
})

const createImageQuestion = (
  prompt: string,
  assetId: string,
  marks?: number,
  caption?: string,
): ImageQuestionBlock => ({
  id: newId(),
  type: 'image_question',
  prompt,
  assetId,
  marks,
  caption,
  layout: 'top',
  size: 'large',
})

export const createShaqlawaLinuxGuiProject = (): ExamProject => {
  const now = new Date().toISOString()
  const q4AssetId = newId()

  const baseProject: ExamProject = {
    id: newId(),
    version: 1,
    projectVersion: 1,
    versionHistory: [],
    settings: {
      templatePresetId: 'shaqlawa_linux_gui',
      targetTotalMarks: 60,
      numberingMode: 'global',
    },
    templateFields: [],
    sections: [
      {
        id: newId(),
        title: 'Q1/ Choose the right answer:',
        instructions: '(20 marks)',
        items: [
          createMcq(
            '......... It acts as a bridge between user and computer',
            ['Operating System', 'CPU', 'Program', 'None of them'],
            2,
            0,
          ),
          createMcq(
            '..........: Controls input/output devices',
            ['Device Management', 'Program Management', 'Security', 'File Management'],
            2,
            0,
          ),
          createMcq(
            'Why we use Linux?',
            ['Costless', 'Stable', 'a & b', 'None of them'],
            2,
            2,
          ),
          createMcq(
            '...........is a freely distributable, cross-platform operating system based on Unix',
            ['Linux', 'MacOS', 'Android', 'None of them'],
            2,
            0,
          ),
          createMcq(
            '.........: Mobile OS based on Linux',
            ['Android', 'Windows', 'MacOS', 'Linux'],
            2,
            0,
          ),
          createMcq(
            '...............Stores personal user file',
            ['/usr Directory', '/home Directory', '/var Directory', 'None of them'],
            2,
            1,
          ),
          createMcq(
            'File permissions exist to:',
            [
              'Protect user data',
              'lowering security',
              'deletion of system files',
              'None of them',
            ],
            2,
            0,
          ),
          createMcq(
            '......Defines how data is stored and organized',
            ['File System', 'File Permissions', 'Home', 'None of them'],
            2,
            0,
          ),
          createMcq(
            '........The creator of the file',
            ['Group', 'User (Owner)', 'Others', 'None of them'],
            2,
            1,
          ),
          createMcq(
            'Ownership categories',
            ['User (Owner)', 'Group', 'Others', 'All of them'],
            2,
            3,
          ),
        ],
      },
      {
        id: newId(),
        title: 'Q2/ Match the sentences to the right words:',
        instructions:
          '(12 marks)\nChoices: a) Read (r)  b) Write (w)  c) Execute (x)  d) User (Owner)  e) Group  f) Others',
        items: [
          createFillBlank('1. Modify, delete, or rename files', ['b) Write (w)'], 2),
          createFillBlank('2. Run a file as a program or access a directory', ['c) Execute (x)'], 2),
          createFillBlank('3. View file content or list directory files', ['a) Read (r)'], 2),
          createFillBlank('4. A set of users sharing access', ['e) Group'], 2),
          createFillBlank('5. The creator of the file', ['d) User (Owner)'], 2),
          createFillBlank('6. All remaining users on the system', ['f) Others'], 2),
        ],
      },
      {
        id: newId(),
        title: 'Q3/ Write True or False:',
        instructions: '(20 marks)',
        items: [
          createTrueFalse('Without an OS, a computer cannot function', 2, true),
          createTrueFalse('CLI: Harder for beginners; requires memorizing commands', 2, true),
          createTrueFalse(
            'Linux is a multiprogramming system meaning multiple applications can run at the same time',
            2,
            true,
          ),
          createTrueFalse('The Linux is an opensource operating system', 2, true),
          createTrueFalse('GUI: Text-based interface where users type commands', 2, false),
          createTrueFalse(
            'The user interface is either a command line interface (CLI), a graphical user interface (GUI).',
            2,
            true,
          ),
          createTrueFalse('Hidden Files in Linux: File names start with a comma(,)', 2, false),
          createTrueFalse('Root Directory (/): Top-level directory in Linux', 2, true),
          createTrueFalse('Linux uses a single root directory (/).', 2, true),
          createTrueFalse('Group: A set of users sharing access', 2, true),
        ],
      },
      {
        id: newId(),
        title: 'Q4/ match words to the blanks area under the image',
        instructions:
          '(8 marks)\na) System users (background services)\nb) Standard users\nc) Administrator (root or sudo user)\nd) Guest or limited users',
        items: [
          createImageQuestion(
            'Write the matching letter under each blank below the image.',
            q4AssetId,
            4,
            '(   )    (   )    (   )    (   )',
          ),
          createFillBlank(
            'Final answer order (left to right, comma-separated)',
            ['c, b, d, a'],
            4,
          ),
        ],
      },
    ],
    assets: {
      [q4AssetId]: {
        id: q4AssetId,
        kind: 'image',
        path: '/templates/linux-gui-q4.png',
      },
    },
    createdAt: now,
    updatedAt: now,
  }

  return applyTemplatePreset(baseProject, 'shaqlawa_linux_gui')
}
