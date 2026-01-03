export function renderCognitiveTabButton(active: boolean): string {
  return `<button type="button" class="agent-tab-btn ${active ? 'active' : ''}" data-agent-tab="cognitive">Cognitive</button>`;
}

export function renderCognitiveTabPanel(active: boolean, contentHtml: string): string {
  return `
    <div class="agent-tab-panel ${active ? 'active' : ''}" data-agent-tab-panel="cognitive">
      <div class="agent-grid agent-grid-tight">
        ${contentHtml}
      </div>
    </div>
  `;
}
