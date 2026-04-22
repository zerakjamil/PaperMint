import type { TemplateField, QuestionBlock } from '@/types/exam'
import type { AssetMap } from '@/types/exam'

import { LeftSidebar } from '@/components/editor/LeftSidebar'
import { RightPropertiesPanel } from '@/components/editor/RightPropertiesPanel'
import { InsertQuestionDialog } from '@/components/dialogs/InsertQuestionDialog'
import { PaperPreview } from '@/components/preview/PaperPreview'

type Props = {
  templateFields: TemplateField[]
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
  onSelectBlock: (blockId: string) => void
  onRequestInsert: (index: number) => void
  onCloseInsertDialog: () => void
  onInsertType: (
    type: 'mcq' | 'true_false' | 'fill_blank' | 'essay' | 'image_question',
    insertionIndex: number,
  ) => void
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
  items,
  assets,
  selectedBlock,
  selectedBlockId,
  dialogOpen,
  insertionIndex,
  onTemplateFieldAdd,
  onTemplateFieldUpdate,
  onTemplateFieldRemove,
  onSelectBlock,
  onRequestInsert,
  onCloseInsertDialog,
  onInsertType,
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
      items={items}
      selectedBlockId={selectedBlockId}
      onTemplateFieldAdd={onTemplateFieldAdd}
      onTemplateFieldUpdate={onTemplateFieldUpdate}
      onTemplateFieldRemove={onTemplateFieldRemove}
      onSelectBlock={onSelectBlock}
    />

    <PaperPreview
      templateFields={templateFields}
      items={items}
      assets={assets}
      selectedBlockId={selectedBlockId}
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
      onClose={onCloseInsertDialog}
      onSelect={onInsertType}
    />
  </main>
)
