export function renderCognitiveSection(rowsHtml: string): string {
  return `
    <section class="agent-card agent-card-span12">
      <h3>Cognitive</h3>
      <div class="agent-kv">
        ${rowsHtml || '<div class="agent-inline-muted">—</div>'}
      </div>
    </section>
  `;
}
