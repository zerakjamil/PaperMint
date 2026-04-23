import type {
  QuestionBankEntry,
  SnippetEntry,
  SnippetKind,
  TemplateField,
  QuestionBlock,
} from '@/types/exam'
import type { AssetMap } from '@/types/exam'
import type { ValidationWarning } from '@/features/validation/examValidation'

import { LeftSidebar } from '@/components/editor/LeftSidebar'
import { RightPropertiesPanel } from '@/components/editor/RightPropertiesPanel'
import { InsertQuestionDialog } from '@/components/dialogs/InsertQuestionDialog'
import { PaperPreview } from '@/components/preview/PaperPreview'

type Props = {
  templateFields: TemplateField[]
  sections: Array<{ id: string; title?: string; instructions?: string; itemCount: number; totalMarks: number }>
  selectedSectionId: string
  sectionTitle?: string
  sectionInstructions?: string
  questionNumberStart: number
  targetTotalMarks?: number
  paperTotalMarks: number
  numberingMode: 'global' | 'per_section'
  templatePresetId?: 'default_university' | 'engineering_midterm' | 'medical_final'
  validationWarnings: ValidationWarning[]
  highlightedTemplateFieldId?: string | null
  questionBank: QuestionBankEntry[]
  snippets: SnippetEntry[]
  items: QuestionBlock[]
  assets: AssetMap
  selectedBlock: QuestionBlock | null
  selectedBlockId: string | null
  dialogOpen: boolean
  insertionIndex: number
  onTemplateFieldAdd: (section: 'header' | 'footer') => void
  onTemplateFieldUpdate: (
    id: string,
    updates: Partial<
      Pick<TemplateField, 'label' | 'value' | 'displayMode' | 'style'>
    >,
  ) => void
  onTemplateFieldRemove: (id: string) => void
  onReplaceTemplateFields: (
    templateFields: TemplateField[],
    templatePresetId?: 'default_university' | 'engineering_midterm' | 'medical_final',
  ) => void
  onApplyTemplatePreset: (presetId: 'default_university' | 'engineering_midterm' | 'medical_final') => void
  onAddSection: () => void
  onSelectSection: (sectionId: string) => void
  onUpdateSection: (sectionId: string, updates: { title?: string; instructions?: string }) => void
  onDuplicateSection: (sectionId: string) => void
  onDeleteSection: (sectionId: string) => void
  onSetTargetTotalMarks: (value: number | undefined) => void
  onSetNumberingMode: (mode: 'global' | 'per_section') => void
  onSaveBlockToBank: (blockId: string, tags?: string[]) => void
  onSaveSnippet: (payload: {
    kind: SnippetKind
    title: string
    content: string
    tags?: string[]
  }) => void
  onApplySnippetToSection: (snippetId: string, sectionId: string) => void
  onApplySnippetToBlock: (snippetId: string, blockId: string) => void
  onApplySnippetToTemplateField: (snippetId: string, fieldId: string) => void
  onSelectBlock: (blockId: string) => void
  onRequestInsert: (index: number) => void
  onCloseInsertDialog: () => void
  onInsertType: (
    type: 'mcq' | 'true_false' | 'fill_blank' | 'essay' | 'image_question',
    insertionIndex: number,
  ) => void
  onInsertFromBank: (entryId: string, insertionIndex: number) => void
  onPreviewPdf: () => void
  onMoveUp: (blockId: string) => void
  onMoveDown: (blockId: string) => void
  onDuplicate: (blockId: string) => void
  onDelete: (blockId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onUpdateBlock: (blockId: string, updater: (value: QuestionBlock) => QuestionBlock) => void
  onAttachImageFile: (blockId: string, file: File) => Promise<void>
  onCanvasDropImage?: (file: File, atIndex?: number) => Promise<void>
}

export const EditorWorkspace = ({
  templateFields,
  sections,
  selectedSectionId,
  sectionTitle,
  sectionInstructions,
  questionNumberStart,
  targetTotalMarks,
  paperTotalMarks,
  numberingMode,
  templatePresetId,
  validationWarnings,
  highlightedTemplateFieldId,
  questionBank,
  snippets,
  items,
  assets,
  selectedBlock,
  selectedBlockId,
  dialogOpen,
  insertionIndex,
  onTemplateFieldAdd,
  onTemplateFieldUpdate,
  onTemplateFieldRemove,
  onReplaceTemplateFields,
  onApplyTemplatePreset,
  onAddSection,
  onSelectSection,
  onUpdateSection,
  onDuplicateSection,
  onDeleteSection,
  onSetTargetTotalMarks,
  onSetNumberingMode,
  onSaveBlockToBank,
  onSaveSnippet,
  onApplySnippetToSection,
  onApplySnippetToBlock,
  onApplySnippetToTemplateField,
  onSelectBlock,
  onRequestInsert,
  onCloseInsertDialog,
  onInsertType,
  onInsertFromBank,
  onPreviewPdf,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onReorder,
  onUpdateBlock,
  onAttachImageFile,
  onCanvasDropImage,
}: Props) => (
  <main className="grid h-[calc(100vh-73px)] grid-cols-[320px_1fr_320px] bg-slate-100">
    <LeftSidebar
      templateFields={templateFields}
      sections={sections}
      selectedSectionId={selectedSectionId}
      items={items}
      selectedBlockId={selectedBlockId}
      targetTotalMarks={targetTotalMarks}
      paperTotalMarks={paperTotalMarks}
      numberingMode={numberingMode}
      templatePresetId={templatePresetId}
      validationWarnings={validationWarnings}
      highlightedTemplateFieldId={highlightedTemplateFieldId}
      snippets={snippets}
      onTemplateFieldAdd={onTemplateFieldAdd}
      onTemplateFieldUpdate={onTemplateFieldUpdate}
      onTemplateFieldRemove={onTemplateFieldRemove}
      onReplaceTemplateFields={onReplaceTemplateFields}
      onApplyTemplatePreset={onApplyTemplatePreset}
      onAddSection={onAddSection}
      onSelectSection={onSelectSection}
      onUpdateSection={onUpdateSection}
      onDuplicateSection={onDuplicateSection}
      onDeleteSection={onDeleteSection}
      onSetTargetTotalMarks={onSetTargetTotalMarks}
      onSetNumberingMode={onSetNumberingMode}
      onSaveBlockToBank={onSaveBlockToBank}
      onSaveSnippet={onSaveSnippet}
      onApplySnippetToSection={onApplySnippetToSection}
      onApplySnippetToBlock={onApplySnippetToBlock}
      onApplySnippetToTemplateField={onApplySnippetToTemplateField}
      onSelectBlock={onSelectBlock}
    />

    <PaperPreview
      templateFields={templateFields}
      items={items}
      assets={assets}
      selectedBlockId={selectedBlockId}
      sectionTitle={sectionTitle}
      sectionInstructions={sectionInstructions}
      questionNumberStart={questionNumberStart}
      onSelect={onSelectBlock}
      onRequestInsert={onRequestInsert}
      onPreviewPdf={onPreviewPdf}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onReorder={onReorder}
      onAttachImageFile={onAttachImageFile}
      onCanvasDropImage={onCanvasDropImage}
    />

    <RightPropertiesPanel
      block={selectedBlock}
      assets={assets}
      onUpdate={onUpdateBlock}
      onAttachImageFile={onAttachImageFile}
    />

    <InsertQuestionDialog
      open={dialogOpen}
      insertionIndex={insertionIndex}
      questionBank={questionBank}
      onClose={onCloseInsertDialog}
      onSelect={onInsertType}
      onInsertFromBank={onInsertFromBank}
    />
  </main>
)
