export function renderPsychologyCard(title: string, bodyHtml: string, span: 6 | 12 = 6): string {
  const spanClass = span === 12 ? 'agent-card-span12' : 'agent-card-span6';
  return `
    <section class="agent-card ${spanClass} agent-card-compact">
      <h3>${title}</h3>
      ${bodyHtml || '<div class="agent-inline-muted">—</div>'}
    </section>
  `;
}

export function renderPsychologySection(cardsHtml: string, showDetails: boolean): string {
  const detailsLabel = showDetails ? 'Hide details' : 'Show details';
  return `
    <section class="psychology-grid-wrap agent-card-span12 ${showDetails ? 'psychology-details-on' : ''}">
      <div class="psychology-grid-header">
        <button type="button" class="pill pill-muted agent-card-toggle ${showDetails ? 'active' : ''}" data-psychology-details-toggle="1">${detailsLabel}</button>
      </div>
      <div class="agent-grid agent-grid-tight">
        ${cardsHtml || '<div class="agent-inline-muted">—</div>'}
      </div>
    </section>
  `;
}
