# Export Notes

## PDF

- Uses `jsPDF`.
- Renders metadata header, ordered questions, answer spaces, and footer.
- Adds simple page breaks when vertical space is exhausted.

## DOCX

- Uses `docx` package.
- Builds document from model, not HTML scraping.
- Supports metadata region, deterministic numbering, and image embedding from data URLs.

## Fidelity Strategy

The app prioritizes stable academic formatting over pixel-perfect UI style parity.
