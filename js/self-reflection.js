/* ======================================================
   LYRICMIND AI — SELF-REFLECTION CHAT
   RAG-powered floating AI assistant
   ====================================================== */

import { api } from './api.js';

/* ── State ── */
let isOpen = false;
let isLoading = false;
let chatHistory = [];

/* ── Suggestion prompts ── */
const SUGGESTIONS = [
  'Why am I feeling like this today?',
  'What makes me productive?',
  'What usually causes my stress?',
  'What habits are helping me grow?',
  'How have I changed recently?'
];

/* ── Initialize ── */
export function initSelfReflection() {
  const fab = document.getElementById('sr-fab');
  const panel = document.getElementById('sr-panel');
  const closeBtn = document.getElementById('sr-close');
  const input = document.getElementById('sr-input');
  const sendBtn = document.getElementById('sr-send');
  const chips = document.querySelectorAll('.sr-chip');

  if (!fab || !panel) return;

  // Toggle panel
  fab.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('sr-panel--open', isOpen);
    fab.classList.toggle('sr-fab--active', isOpen);

    if (isOpen) {
      // Focus input when opened
      setTimeout(() => input.focus(), 350);
    }
  });

  // Close panel
  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.classList.remove('sr-panel--open');
    fab.classList.remove('sr-fab--active');
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
      panel.classList.remove('sr-panel--open');
      fab.classList.remove('sr-fab--active');
    }
  });

  // Send on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Send button click
  sendBtn.addEventListener('click', handleSend);

  // Suggestion chip clicks
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const question = chip.textContent.trim();
      input.value = question;
      handleSend();
    });
  });
}

/* ── Send message ── */
async function handleSend() {
  const input = document.getElementById('sr-input');
  const question = input.value.trim();

  if (!question || isLoading) return;

  input.value = '';
  isLoading = true;

  // Hide suggestions after first message
  const suggestionsEl = document.getElementById('sr-suggestions');
  if (suggestionsEl) suggestionsEl.style.display = 'none';

  // Add user message bubble
  appendMessage('user', question);

  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    const result = await api.askSelfReflection(question);

    // Remove typing indicator
    removeTypingIndicator(typingId);

    // Add AI message bubble
    appendMessage('ai', result.answer, result.sources);

    // Store in session history
    chatHistory.push({ role: 'user', text: question });
    chatHistory.push({ role: 'ai', text: result.answer });
  } catch (err) {
    removeTypingIndicator(typingId);
    appendMessage('ai', "I'm having trouble reflecting right now. Please try again in a moment.");
  }

  isLoading = false;
}

/* ── Append message bubble ── */
function appendMessage(role, text, sources) {
  const messagesEl = document.getElementById('sr-messages');

  const bubble = document.createElement('div');
  bubble.className = `sr-bubble sr-bubble--${role}`;

  if (role === 'ai') {
    const avatar = document.createElement('div');
    avatar.className = 'sr-bubble__avatar';
    avatar.textContent = '🧠';
    bubble.appendChild(avatar);
  }

  const content = document.createElement('div');
  content.className = 'sr-bubble__content';

  const textEl = document.createElement('p');
  textEl.className = 'sr-bubble__text';
  textEl.textContent = text;
  content.appendChild(textEl);

  // Show source tags for AI messages
  if (role === 'ai' && sources && sources.length > 0) {
    const sourcesEl = document.createElement('div');
    sourcesEl.className = 'sr-bubble__sources';

    // Deduplicate source types
    const uniqueSources = [...new Set(sources.map(s => s.source))];
    uniqueSources.slice(0, 3).forEach(src => {
      const tag = document.createElement('span');
      tag.className = 'sr-source-tag';
      tag.textContent = src;
      sourcesEl.appendChild(tag);
    });

    content.appendChild(sourcesEl);
  }

  bubble.appendChild(content);
  messagesEl.appendChild(bubble);

  // Scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* ── Typing indicator ── */
function showTypingIndicator() {
  const messagesEl = document.getElementById('sr-messages');
  const id = 'sr-typing-' + Date.now();

  const typing = document.createElement('div');
  typing.className = 'sr-bubble sr-bubble--ai sr-typing';
  typing.id = id;

  const avatar = document.createElement('div');
  avatar.className = 'sr-bubble__avatar';
  avatar.textContent = '🧠';
  typing.appendChild(avatar);

  const dots = document.createElement('div');
  dots.className = 'sr-typing-dots';
  dots.innerHTML = '<span></span><span></span><span></span>';
  typing.appendChild(dots);

  messagesEl.appendChild(typing);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
