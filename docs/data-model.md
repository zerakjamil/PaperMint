# Data Model

`ExamProject` is the single source of truth.

- `meta` stores institutional and exam header/footer fields.
- `sections` stores ordered question blocks.
- `assets` stores image references used by image questions.
- `createdAt` and `updatedAt` timestamps are updated centrally in store actions.

Question block union:

1. `mcq`
2. `true_false`
3. `fill_blank`
4. `essay`
5. `image_question`

All exports and preview render directly from this model.
