/* ======================================================
   LYRICMIND AI — ANALYSIS MODULE (Premium Dashboard)
   ====================================================== */

import { api } from './api.js';

export function initAnalysis(state) {
  renderDailyReflection(state);
  renderWeeklyAnalysis();
  renderPersonalityProfile();
  renderGrowthTrajectory();
  renderCognitiveClusters();
}

/* ── SECTION 1 & 2: Daily AI Reflection & Breakdown & State Rings ── */
async function renderDailyReflection(state) {
  const textEl = document.getElementById('ai-reflection-text');
  const dateEl = document.getElementById('ai-reflection-date');
  const countEl = document.getElementById('ai-reflection-count');
  
  if (textEl) textEl.textContent = "Synthesizing today's insights...";

  try {
    const data = await api.getDailyReflection();
    
    if (textEl) textEl.textContent = data.reflectionText;
    if (dateEl) dateEl.textContent = data.date || new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (countEl) {
      const count = state.journals ? state.journals.length : 0;
      countEl.textContent = `Based on ${count} journal entries`;
    }

    // Daily breakdown
    setText('daily-strength', data.strength);
    setText('daily-strength-desc', data.strengthDesc);
    setText('daily-challenge', data.challenge);
    setText('daily-challenge-desc', data.challengeDesc);
    setText('daily-insight', data.insight);
    setText('daily-action', data.action);

    // Current dominant mood
    const stateLabel = document.getElementById('current-state-label');
    if (stateLabel) stateLabel.textContent = data.currentState;

    // State progress rings
    const container = document.getElementById('state-rings');
    if (container && data.scores) {
      const rings = [
        { label: 'Focus', value: data.scores.focus, color: 'var(--primary-orange)' },
        { label: 'Energy', value: data.scores.energy, color: 'var(--deep-navy)' },
        { label: 'Confidence', value: data.scores.confidence, color: '#22C55E' },
        { label: 'Balance', value: data.scores.emotionalBalance, color: 'var(--soft-charcoal)' }
      ];

      container.innerHTML = rings.map(ring => {
        const circumference = 2 * Math.PI * 34;
        const offset = circumference - (ring.value / 100) * circumference;
        return `
          <div class="progress-ring-item">
            <svg class="progress-ring" viewBox="0 0 80 80">
              <circle class="progress-ring__bg" cx="40" cy="40" r="34" />
              <circle class="progress-ring__fill" cx="40" cy="40" r="34"
                style="stroke: ${ring.color}; stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference}"
                data-target-offset="${offset}" />
            </svg>
            <div class="progress-ring__center">
              <span class="progress-ring__value">${ring.value}</span>
            </div>
            <div class="progress-ring__label">${ring.label}</div>
          </div>
        `;
      }).join('');

      setTimeout(() => {
        container.querySelectorAll('.progress-ring__fill').forEach(circle => {
          circle.style.strokeDashoffset = circle.dataset.targetOffset;
        });
      }, 200);
    }
  } catch (err) {
    console.error(err);
    if (textEl) textEl.textContent = "Failed to load reflection. Write a journal entry to get started.";
  }
}

/* ── SECTION 3: Weekly Analysis ── */
async function renderWeeklyAnalysis() {
  const summaryEl = document.getElementById('weekly-summary-text');
  if (summaryEl) summaryEl.textContent = "Analyzing weekly trends...";

  try {
    const data = await api.getWeeklyReport();

    setText('weekly-mood-trend', data.moodTrend);
    setText('weekly-common-state', data.commonState);
    setText('weekly-biggest-win', data.biggestWin);
    setText('weekly-growth-areas', data.growthAreas.join(', '));
    setText('weekly-summary-text', data.summary);

    // Growth Score Ring (large)
    const ringContainer = document.getElementById('weekly-growth-ring');
    if (ringContainer) {
      const score = data.growthScore;
      const circumference = 2 * Math.PI * 52;
      const offset = circumference - (score / 100) * circumference;

      ringContainer.innerHTML = `
        <svg class="growth-ring-svg" viewBox="0 0 120 120">
          <circle class="growth-ring__bg" cx="60" cy="60" r="52" />
          <circle class="growth-ring__fill" cx="60" cy="60" r="52"
            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference}"
            data-target-offset="${offset}" />
        </svg>
        <div class="growth-ring__center">
          <span class="growth-ring__value">${score}</span>
          <span class="growth-ring__max">/ 100</span>
        </div>
        <div class="growth-ring__label">Growth Score</div>
      `;

      setTimeout(() => {
        const fill = ringContainer.querySelector('.growth-ring__fill');
        if (fill) fill.style.strokeDashoffset = fill.dataset.targetOffset;
      }, 400);
    }

    // Recommendations
    const recList = document.getElementById('weekly-recommendations-list');
    if (recList) {
      recList.innerHTML = data.recommendations.map(r => `
        <div class="recommendation-item">
          <div class="recommendation-item__check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span class="recommendation-item__text">${r}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error(err);
    if (summaryEl) summaryEl.textContent = "Connect Spotify and write a few journals to generate your weekly report.";
  }
}

/* ── SECTION 4: Personality Profile ── */
async function renderPersonalityProfile() {
  try {
    const data = await api.getPersonalityProfile();

    // Strengths as tag pills
    const strengthsEl = document.getElementById('personality-strengths');
    if (strengthsEl) {
      strengthsEl.innerHTML = data.strengths.map(s =>
        `<span class="personality-tag">${s}</span>`
      ).join('');
    }

    // Patterns as tag pills
    const patternsEl = document.getElementById('personality-patterns');
    if (patternsEl) {
      patternsEl.innerHTML = data.patterns.map(p =>
        `<span class="personality-tag personality-tag--navy">${p}</span>`
      ).join('');
    }

    setText('personality-thinking', data.thinkingStyle);
    setText('personality-decisions', data.decisionMaking);
    setText('personality-emotions', data.emotionalTendencies);
    setText('personality-learning', data.learningStyle);
  } catch (err) {
    console.error(err);
  }
}

/* ── SECTION 5: Growth Trajectory ── */
async function renderGrowthTrajectory() {
  try {
    const data = await api.getGrowthTrajectory();

    setText('trajectory-current', data.currentSelf);
    setText('trajectory-desired', data.desiredSelf);

    const fillEl = document.getElementById('trajectory-progress-fill');
    const labelEl = document.getElementById('trajectory-progress-label');
    if (fillEl) {
      setTimeout(() => {
        fillEl.style.width = `${data.overallProgress}%`;
      }, 500);
    }
    if (labelEl) labelEl.textContent = `${data.overallProgress}%`;

    // Improvement areas
    const areasContainer = document.getElementById('trajectory-areas');
    if (areasContainer && data.dimensions) {
      areasContainer.innerHTML = data.dimensions.map(area => `
        <div class="trajectory-area">
          <div class="trajectory-area__header">
            <span class="trajectory-area__name">${area.name}</span>
            <span class="trajectory-area__pct">${area.progress}%</span>
          </div>
          <div class="trajectory-area__bar">
            <div class="trajectory-area__fill" data-target-width="${area.progress}%" style="width: 0%"></div>
          </div>
        </div>
      `).join('');

      // Animate area bars
      setTimeout(() => {
        areasContainer.querySelectorAll('.trajectory-area__fill').forEach(bar => {
          bar.style.width = bar.dataset.targetWidth;
        });
      }, 600);
    }
  } catch (err) {
    console.error(err);
  }
}

/* ── SECTION 6: Cognitive Clusters (Clustering and Chunking) ── */
async function renderCognitiveClusters() {
  const container = document.getElementById('cognitive-clusters-container');
  if (!container) return;

  try {
    const data = await api.getThoughtsClusters();
    if (!data.clusters || data.clusters.length === 0) {
      container.innerHTML = '<p style="color:var(--text-tertiary); grid-column: 1 / -1; text-align: center; padding: 20px 0;">Write multiple journal entries to trigger semantic clustering.</p>';
      return;
    }

    container.innerHTML = data.clusters.map(cluster => `
      <div class="personality-block" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); padding: 20px; border-radius: 12px; transition: transform 0.2s ease, border-color 0.2s ease;">
        <h3 class="personality-block__title" style="font-size: 1.1rem; color: var(--primary-orange); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
          <span>🌌</span> ${cluster.title}
        </h3>
        <p class="personality-block__text" style="font-size: 0.92rem; line-height: 1.6; color: var(--text-secondary); margin-bottom: 15px;">
          ${cluster.description}
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 12px; margin-top: 10px;">
          ${cluster.moodDistribution.map(dist => `
            <span class="personality-tag" style="font-size: 0.78rem; padding: 3px 10px; background: rgba(241, 143, 26, 0.08); color: var(--primary-orange); border-radius: 20px; border: 1px solid rgba(241, 143, 26, 0.15);">
              ${dist.mood}: ${dist.percentage}%
            </span>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p style="color:var(--text-tertiary); grid-column: 1 / -1; text-align: center; padding: 20px 0;">Write multiple journal entries to trigger semantic clustering.</p>';
  }
}

/* ── Helper ── */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '—';
}
