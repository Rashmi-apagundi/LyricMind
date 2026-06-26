/* ======================================================
   LYRICMIND AI — MEMORY VAULT MODULE
   ====================================================== */

import { saveState } from './db.js';
import { showToast } from './app.js';
import { api } from './api.js';

let currentView = 'gallery';

export function initMemoryVault(state) {
  renderGallery(state);
  renderTimeline(state);
  setupVaultTabs(state);
  setupAddButton(state);
  setupSearch(state);
}

/* ── Tab Switching ── */
function setupVaultTabs(state) {
  const tabs = document.querySelectorAll('.vault-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      currentView = view;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const gallery = document.getElementById('vault-gallery');
      const timeline = document.getElementById('vault-timeline');

      if (view === 'gallery') {
        gallery.classList.remove('hidden');
        timeline.classList.add('hidden');
      } else {
        gallery.classList.add('hidden');
        timeline.classList.remove('hidden');
      }
    });
  });
}

/* ── Gallery View ── */
function renderGallery(state) {
  const container = document.getElementById('vault-gallery');
  if (!container) return;

  if (!state.diary || state.diary.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
        <div style="font-size: 3rem; margin-bottom: 16px;">💎</div>
        <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Your Memory Vault is empty</div>
        <div style="font-size: 0.9rem;">Click "New Memory" to save your first milestone, breakthrough, or meaningful moment.</div>
      </div>
    `;
    return;
  }

  const cards = state.diary.map(d => {
    const photoArea = d.photo
      ? `<div class="memory-card__photo" style="background-image: url('${d.photo}')"></div>`
      : `<div class="memory-card__photo memory-card__photo--empty"><span class="memory-card__emoji">${d.emoji}</span></div>`;

    return `
      <div class="memory-card" data-id="${d.id}">
        ${photoArea}
        <div class="memory-card__body">
          <div class="memory-card__meta">
            <span class="memory-card__date">${d.date}</span>
            ${d.mood ? `<span class="memory-card__mood">${d.mood}</span>` : ''}
          </div>
          <h3 class="memory-card__title">${d.title}</h3>
          <p class="memory-card__text">${d.text}</p>
        </div>
        <button class="memory-card__star ${d.favorite ? 'active' : ''}" data-id="${d.id}" title="Favorite">
          ${d.favorite ? '★' : '☆'}
        </button>
      </div>
    `;
  }).join('');

  container.innerHTML = cards;

  // Bind star toggles
  container.querySelectorAll('.memory-card__star').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      await toggleFavorite(id, state);
      renderGallery(state);
    });
  });
}

/* ── Timeline View ── */
function renderTimeline(state) {
  const container = document.getElementById('vault-timeline');
  if (!container) return;

  if (!state.diary || state.diary.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
        <div style="font-size: 3rem; margin-bottom: 16px;">📅</div>
        <div style="font-size: 1rem;">No memories to show in timeline yet.</div>
      </div>
    `;
    return;
  }

  // Group entries by year
  const grouped = {};
  state.diary.forEach(d => {
    const year = d.dateRaw ? new Date(d.dateRaw).getFullYear() : new Date().getFullYear();
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(d);
  });

  // Sort years descending
  const sortedYears = Object.keys(grouped).sort((a, b) => b - a);

  container.innerHTML = sortedYears.map(year => `
    <div class="timeline-year">
      <h3 class="timeline-year__heading">${year}</h3>
      <div class="timeline-year__entries">
        ${grouped[year].map(d => `
          <div class="timeline-entry">
            <div class="timeline-entry__dot"></div>
            <div class="timeline-entry__content">
              <span class="timeline-entry__emoji">${d.emoji}</span>
              <div class="timeline-entry__info">
                <div class="timeline-entry__title">${d.title}</div>
                <div class="timeline-entry__date">${d.date}</div>
                <p class="timeline-entry__text">${d.text}</p>
              </div>
              ${d.mood ? `<span class="timeline-entry__mood">${d.mood}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/* ── Add Memory Button ── */
function setupAddButton(state) {
  const addBtn = document.getElementById('vault-add-btn');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => {
    openMemoryForm(state);
  });
}

/* ── Memory Form ── */
function openMemoryForm(state) {
  const overlay = document.getElementById('diary-form-overlay');
  overlay.classList.add('open');

  const titleInput = document.getElementById('diary-input-title');
  const textInput = document.getElementById('diary-input-text');
  const photoInput = document.getElementById('diary-input-photo');
  const photoPreview = document.getElementById('diary-photo-preview');
  const moodBtns = document.querySelectorAll('.mood-tag-btn');
  const cancelBtn = document.getElementById('diary-cancel-btn');
  const saveBtn = document.getElementById('diary-save-btn');

  titleInput.value = '';
  textInput.value = '';
  if (photoInput) photoInput.value = '';
  if (photoPreview) {
    photoPreview.style.backgroundImage = '';
    photoPreview.classList.remove('has-photo');
  }
  moodBtns.forEach(b => b.classList.remove('active'));

  let selectedMood = '';
  let selectedPhoto = null;

  // Mood tag selection
  moodBtns.forEach(btn => {
    const handleMoodClick = () => {
      moodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMood = btn.dataset.mood;
    };
    btn.addEventListener('click', handleMoodClick);
  });

  // Photo upload
  if (photoInput) {
    const handlePhoto = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Cap at 500KB to protect localStorage
      if (file.size > 500 * 1024) {
        showToast('⚠️', 'Photo must be under 500KB');
        photoInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        selectedPhoto = event.target.result;
        if (photoPreview) {
          photoPreview.style.backgroundImage = `url('${selectedPhoto}')`;
          photoPreview.classList.add('has-photo');
        }
      };
      reader.readAsDataURL(file);
    };
    photoInput.addEventListener('change', handlePhoto);
  }

  const handleCancel = () => {
    overlay.classList.remove('open');
    cleanup();
  };

  const handleSave = async () => {
    const title = titleInput.value.trim();
    const text = textInput.value.trim();
    if (!title || !text) {
      showToast('✏️', 'Please add a title and description');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const emojis = ['🌟', '💡', '🎉', '🏔️', '💪', '🌈', '🎯', '✨', '🏆', '📸'];
    const selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    try {
      const entry = await api.saveMemory({
        title,
        text,
        emoji: selectedEmoji,
        mood: selectedMood || null,
        photo: selectedPhoto
      });

      state.diary.unshift(entry);
      saveState(state);
      overlay.classList.remove('open');
      renderGallery(state);
      renderTimeline(state);
      showToast('💎', 'Memory saved to your vault');
      cleanup();
    } catch (err) {
      showToast('⚠️', 'Failed to save memory');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Memory';
    }
  };

  function cleanup() {
    cancelBtn.removeEventListener('click', handleCancel);
    saveBtn.removeEventListener('click', handleSave);
  }

  cancelBtn.addEventListener('click', handleCancel);
  saveBtn.addEventListener('click', handleSave);
}

/* ── Toggle Favorite ── */
async function toggleFavorite(id, state) {
  try {
    const res = await api.toggleMemoryFavorite(id);
    const entry = state.diary.find(d => d.id === id);
    if (entry) {
      entry.favorite = res.favorite;
      saveState(state);
    }
  } catch (err) {
    showToast('⚠️', 'Failed to toggle favorite');
  }
}


/* ── Search Memories (RAG) ── */
function setupSearch(state) {
  const searchInput = document.getElementById('vault-search-input');
  const searchBtn = document.getElementById('vault-search-btn');
  const searchResult = document.getElementById('vault-search-result');
  const searchResultText = document.getElementById('vault-search-result-text');

  if (!searchBtn || !searchInput) return;

  // Clone to remove previous listener if re-initialized
  const newBtn = searchBtn.cloneNode(true);
  searchBtn.parentNode.replaceChild(newBtn, searchBtn);

  newBtn.addEventListener('click', async () => {
    const q = searchInput.value.trim();
    if (!q) {
      searchResult.classList.add('hidden');
      return;
    }

    newBtn.textContent = 'Searching...';
    newBtn.disabled = true;

    try {
      const data = await api.searchMemories(q);
      searchResultText.textContent = data.response;
      searchResult.classList.remove('hidden');

      // Highlight matched cards in UI
      if (data.results && data.results.length > 0) {
        const matchedIds = new Set(data.results.map(r => r.id));
        const cards = document.querySelectorAll('.memory-card');
        
        cards.forEach(card => {
          const id = card.dataset.id;
          if (matchedIds.has(id)) {
            card.style.border = '2px solid var(--primary-orange)';
            card.style.transform = 'scale(1.02)';
            card.style.opacity = '1';
          } else {
            card.style.border = '';
            card.style.transform = '';
            card.style.opacity = '0.4';
          }
        });
      } else {
        const cards = document.querySelectorAll('.memory-card');
        cards.forEach(card => {
          card.style.border = '';
          card.style.transform = '';
          card.style.opacity = '0.4';
        });
      }
    } catch (err) {
      showToast('⚠️', 'Search failed');
    } finally {
      newBtn.textContent = 'Ask Vault';
      newBtn.disabled = false;
    }
  });

  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() === '') {
      searchResult.classList.add('hidden');
      const cards = document.querySelectorAll('.memory-card');
      cards.forEach(card => {
        card.style.border = '';
        card.style.transform = '';
        card.style.opacity = '';
      });
    }
  });
}

/* ── Navigate to Memory Vault (called from profile dropdown) ── */
export function navigateToVault(state) {
  const pages = document.querySelectorAll('#app-shell .page');
  pages.forEach(p => {
    p.classList.remove('active');
    p.style.animation = 'none';
  });

  const targetPage = document.getElementById('page-memory-vault');
  if (targetPage) {
    void targetPage.offsetWidth;
    targetPage.style.animation = '';
    targetPage.classList.add('active');
  }

  // Remove active from navbar tabs
  document.querySelectorAll('.navbar__tab').forEach(t => t.classList.remove('active'));

  if (state) {
    initMemoryVault(state);
  }
}
