export function pill(label, tone = 'accent') {
  return `<span class="pill pill-${tone}">${label}</span>`;
}

export function card(item, label, action) {
  return `
    <article class="card">
      <div class="card-head">
        <span class="card-title">${item.title}</span>
        ${pill(label, 'neutral')}
      </div>
      <p>${item.summary}</p>
      <div class="card-meta">${pill(item.owner, 'info')}</div>
      <div class="pills">${(item.tags || []).map(tag => pill(tag)).join('')}</div>
      ${action ? `
        <div class="card-actions">
          <button
            class="ghost"
            type="button"
            data-card-action="${action.type}"
            data-card-intent-type="${action.intentType || ''}"
            data-card-prompt="${action.prompt || ''}"
            data-card-title="${item.title}"
          >${action.label}</button>
        </div>
      ` : ''}
    </article>
  `;
}

export function activityItem(item) {
  return `
    <article class="activity-item">
      <div class="card-head">
        <span class="card-title">${item.label}</span>
        ${pill(item.tone || 'info', item.tone || 'info')}
      </div>
      <p>${item.summary}</p>
    </article>
  `;
}

export function messageItem(message, active, toneLabel) {
  return `
    <div class="message-head">
      <span class="message-title">${message.title}</span>
      ${pill(toneLabel, message.status === 'blocked' ? 'warning' : message.status === 'running' ? 'info' : 'accent')}
    </div>
    <p>${message.text}</p>
    <div class="message-meta">
      ${pill(message.owner, 'neutral')}
      ${(message.meta || []).map(tag => pill(tag)).join('')}
      ${pill(message.timestamp, 'info')}
    </div>
  `;
}

export function settingCard(setting) {
  return `
    <article class="setting-card">
      <span class="meta-label">${setting.title}</span>
      <p>${setting.description}</p>
      <div class="toggle-row">
        ${pill(setting.value, 'accent')}
        <button class="toggle active" type="button">Ready for runtime binding</button>
      </div>
    </article>
  `;
}
