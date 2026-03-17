import { S, setState } from '../state.js';
import { h } from '../ui.js';
import { saveKey } from '../storage.js';

export function renderLoading() {
  return h('div', { class: 'center' }, h('div', { class: 'spinner' }));
}

export function renderApiModal() {
  const wrap = h('div', { class: 'center', style: { minHeight: '100vh', background: '#080b12' } });
  const card = h('div', { class: 'card', style: { maxWidth: '420px', padding: '32px', width: '100%' } });
  const inp = h('input', {
    class: 'input', type: 'password', placeholder: 'sk-ant-api03-…', value: S.tempApiKey,
    style: { marginBottom: '8px' },
    onInput: e => setState({ tempApiKey: e.target.value }, true),
    onKeydown: e => { if (e.key === 'Enter' && S.tempApiKey.trim()) saveKey(S.tempApiKey).then(() => setState({ showApiModal: false })); },
  });
  setTimeout(() => inp.focus(), 50);
  card.append(
    h('h2', { style: { fontSize: '20px', fontWeight: '700', marginBottom: '8px' } }, '🔑 API Key Required'),
    h('p', { style: { color: '#6b748a', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' } },
      'All AI features need your Anthropic API key. Get one free at ',
      h('a', { href: 'https://console.anthropic.com', target: '_blank', style: { color: '#4f8ef7' } }, 'console.anthropic.com'), '.'
    ),
    inp,
    h('p', { style: { fontSize: '11px', color: '#6b748a', marginBottom: '20px', lineHeight: '1.5' } }, 'Stored locally in this browser only.'),
    h('div', { class: 'flex gap-10' },
      h('button', { class: 'btn-secondary', onClick: () => setState({ showApiModal: false }) }, 'Cancel'),
      h('button', { class: 'btn-primary', style: { flex: '1', opacity: S.tempApiKey.trim() ? '1' : '0.5' }, disabled: !S.tempApiKey.trim(),
        onClick: async () => { await saveKey(S.tempApiKey); setState({ tempApiKey: '', showApiModal: false }); }
      }, 'Save & Continue →')
    )
  );
  wrap.append(card);
  return wrap;
}

export function renderGenerating() {
  const card = h('div', { style: { textAlign: 'center', padding: '40px', maxWidth: '380px' } });
  if (S.genError) {
    card.append(
      h('div', { style: { fontSize: '40px', marginBottom: '16px' } }, '⚠️'),
      h('h2', { style: { fontSize: '22px', fontWeight: '700', marginBottom: '10px' } }, 'Something went wrong'),
      h('p', { style: { color: '#f06a6a', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' } }, S.genError),
      h('button', { class: 'btn-primary', onClick: () => setState({ genError: '', view: 'home' }) }, '← Try Again')
    );
  } else {
    card.append(
      h('div', { class: 'gen-spinner' }),
      h('h2', { style: { fontSize: '22px', fontWeight: '700', marginBottom: '10px' } }, 'Building your study plan'),
      h('p', { style: { color: '#4f8ef7', fontSize: '15px', marginBottom: '6px' } }, S.genStatus),
      h('p', { style: { color: '#6b748a', fontSize: '13px' } }, 'This takes about 20–30 seconds…')
    );
  }
  return h('div', { class: 'center' }, card);
}
