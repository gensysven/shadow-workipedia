export function renderCognitiveSection(rowsHtml: string, showDetails: boolean): string {
  const detailsLabel = showDetails ? 'Hide details' : 'Show details';
  return `
    <section class="agent-card agent-card-span12 ${showDetails ? 'cognitive-details-on' : ''}">
      <div class="agent-card-header">
        <h3>Cognitive</h3>
        <button type="button" class="pill pill-muted agent-card-toggle ${showDetails ? 'active' : ''}" data-cognitive-details-toggle="1">${detailsLabel}</button>
      </div>
      <div class="agent-kv">
        ${rowsHtml || '<div class="agent-inline-muted">—</div>'}
      </div>
    </section>
  `;
}
