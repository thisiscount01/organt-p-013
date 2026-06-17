/**
 * 한국 청년 정책 AI 매칭 서비스 — 프론트엔드
 * public/app.js
 *
 * API 규격:
 *   GET  /api/stats
 *       → { total:number, categories:{ 카테고리명:수 } }
 *   GET  /api/policies/all
 *       → Policy[]
 *   GET  /api/policies?age&region&income&employment
 *       → Policy[] (score 포함, 매칭 정렬)
 *   POST /api/chat   body:{ message:string }
 *       → { reply:string, policies:Policy[] }
 *
 * HTML id 의존성 (index.html 기준):
 *   #policy-count, #search-form, #age, #region, #income, #employment
 *   #category-section, #category-tabs, #results-section, #results-title
 *   #results-count, #sort-select, #policy-cards, #empty-state, #empty-reset-btn
 *   #chat-toggle, #chat-panel, #chat-close, #chat-messages
 *   #chat-input, #chat-send, #chat-suggestions .suggestion-chip
 *   #loading-overlay, #header-chat-btn, #footer-chat-link
 *   #hamburger, #mobile-nav, #reset-btn
 */

'use strict';

/* ─── 전역 상태 ──────────────────────────────────────────────── */
let allPolicies      = [];   // /api/policies/all 전체 캐시
let currentPolicies  = [];   // 현재 검색 결과 (필터 전)
let filteredPolicies = [];   // 카테고리/정렬 적용 후
let activeCategory   = '전체';
let currentSort      = 'score';
let recentSearches   = [];
let currentCalcPolicy = null;

/* ─── 진입점 ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  loadRecentSearches();

  await Promise.all([
    loadStats(),
    loadAllPolicies(),
  ]);

  initSearchForm();
  initChat();
  initSortSelect();
  initHamburger();
  initEmptyReset();
  initFooterLinks();
  initCalculatorModal();
});

/* ─── 통계 배너 ───────────────────────────────────────────────── */
async function loadStats() {
  try {
    const res  = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();
    const el   = document.getElementById('policy-count');
    if (el) el.textContent = Number(data.total ?? 0).toLocaleString();
  } catch (e) {
    console.error('[stats]', e);
  }
}

/* ─── 전체 정책 로드 → 카테고리 탭 ─────────────────────────────── */
async function loadAllPolicies() {
  try {
    const res  = await fetch('/api/policies/all');
    if (!res.ok) return;
    const data = await res.json();
    // 서버 실제 응답: { total, policies: [...] }
    allPolicies = Array.isArray(data) ? data : (data.policies ?? []);

    const seen = new Set();
    const cats = ['전체'];
    allPolicies.forEach(p => {
      if (p.category && !seen.has(p.category)) {
        seen.add(p.category);
        cats.push(p.category);
      }
    });
    buildCategoryTabs(cats);
  } catch (e) {
    console.error('[all-policies]', e);
  }
}

/* ─── 카테고리 탭 ─────────────────────────────────────────────── */
function buildCategoryTabs(categories) {
  const container = document.getElementById('category-tabs');
  if (!container) return;

  container.innerHTML = '';

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-tab' + (cat === activeCategory ? ' active' : '');
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(cat === activeCategory));

    btn.addEventListener('click', () => {
      container.querySelectorAll('.category-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeCategory = cat;

      if (currentPolicies.length > 0) applyFilterSort();
    });

    container.appendChild(btn);
  });
}

/* ─── 필터 + 정렬 적용 후 카드 렌더 ─────────────────────────────── */
function applyFilterSort() {
  // 카테고리 필터
  filteredPolicies = activeCategory === '전체'
    ? [...currentPolicies]
    : currentPolicies.filter(p => p.category === activeCategory);

  // 정렬
  if (currentSort === 'score') {
    filteredPolicies.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } else if (currentSort === 'amount') {
    filteredPolicies.sort((a, b) => extractAmount(b) - extractAmount(a));
  } else if (currentSort === 'deadline') {
    filteredPolicies.sort((a, b) => compareDeadline(a.deadline, b.deadline));
  }

  renderPolicyCards(filteredPolicies);

  const countEl = document.getElementById('results-count');
  if (countEl) countEl.textContent = filteredPolicies.length;
}

/* 금액 문자열에서 숫자 추출 (정렬용) */
function extractAmount(p) {
  const raw = String(p.support_amount || '');
  const m   = raw.match(/[\d,]+/);
  if (!m) return 0;
  const n = parseInt(m[0].replace(/,/g, ''), 10);
  if (raw.includes('억')) return n * 100_000_000;
  if (raw.includes('만')) return n * 10_000;
  return n;
}

/* 마감일 비교 (상시·미정 → 마지막) */
function compareDeadline(a, b) {
  const NONE = '9999-99-99';
  const normalize = d => {
    if (!d || d === '상시' || d === '상시 모집') return NONE;
    return d;
  };
  return normalize(a).localeCompare(normalize(b));
}

/* ─── 검색 폼 ─────────────────────────────────────────────────── */
function initSearchForm() {
  const form     = document.getElementById('search-form');
  const resetBtn = document.getElementById('reset-btn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await doSearch();
  });

  // 초기화 버튼 (CSS reset 기본 동작 + UI 초기화)
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activeCategory = '전체';
      currentPolicies  = [];
      filteredPolicies = [];

      // 카테고리 탭 '전체'로 초기화
      const tabs = document.getElementById('category-tabs');
      if (tabs) {
        tabs.querySelectorAll('.category-tab').forEach(b => {
          const isAll = b.dataset.category === '전체';
          b.classList.toggle('active', isAll);
          b.setAttribute('aria-selected', String(isAll));
        });
      }

      // 섹션 숨김
      const catSec = document.getElementById('category-section');
      const resSec = document.getElementById('results-section');
      if (catSec) catSec.hidden = true;
      if (resSec) resSec.hidden = true;
    });
  }
}

async function doSearch() {
  const age        = document.getElementById('age')?.value.trim()  ?? '';
  const region     = document.getElementById('region')?.value       ?? '';
  const income     = document.getElementById('income')?.value       ?? '';
  const employment = document.getElementById('employment')?.value   ?? '';

  // 버튼 로딩 상태
  const searchBtn = document.getElementById('search-btn');
  setButtonLoading(searchBtn, true);
  setOverlayLoading(true);

  // 최근 검색 저장
  saveRecentSearch({ age, region, income, employment });

  try {
    const params = new URLSearchParams();
    if (age)        params.set('age',        age);
    if (region)     params.set('region',     region);
    if (income)     params.set('income',     income);
    if (employment) params.set('employment', employment);

    const res = await fetch(`/api/policies?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    // 서버 실제 응답: { total, policies: [...] }
    const results = Array.isArray(data) ? data : (data.policies ?? []);
    currentPolicies = results;

    renderPolicies(results, { age, region });

    // 결과 영역으로 부드러운 스크롤
    document.getElementById('results-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error('[search]', err);
    showError('정책 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  } finally {
    setButtonLoading(searchBtn, false);
    setOverlayLoading(false);
  }
}

/* 검색 버튼 로딩 토글 (.btn-text / .btn-loading 스팬) */
function setButtonLoading(btn, on) {
  if (!btn) return;
  const textSpan    = btn.querySelector('.btn-text');
  const loadingSpan = btn.querySelector('.btn-loading');
  btn.disabled = on;
  if (textSpan)    textSpan.hidden    = on;
  if (loadingSpan) loadingSpan.hidden = !on;
}

/* 전체 화면 로딩 오버레이 (#loading-overlay) */
function setOverlayLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.hidden = !show;
}

/* 에러 카드 표시 */
function showError(msg) {
  const container = document.getElementById('policy-cards');
  if (container) {
    container.innerHTML = `
      <div class="error-message" role="alert">
        <span class="error-icon" aria-hidden="true">⚠️</span>
        <p>${esc(msg)}</p>
        <button class="btn-primary btn-retry" type="button"
                onclick="location.reload()">새로고침</button>
      </div>
    `;
  }
  const sec = document.getElementById('results-section');
  if (sec) sec.hidden = false;
}

/* ─── 정책 목록 렌더링 (외부 진입점) ─────────────────────────────── */
/**
 * @param {object[]} policies
 * @param {{ age?:string, region?:string }} ctx
 */
function renderPolicies(policies, ctx = {}) {
  // 섹션 표시
  const catSection = document.getElementById('category-section');
  if (catSection) catSection.hidden = false;

  const resultsSection = document.getElementById('results-section');
  if (resultsSection) resultsSection.hidden = false;

  // 결과 제목 갱신
  const titleEl = document.getElementById('results-title');
  if (titleEl) {
    const parts = [
      ctx.region || '',
      ctx.age    ? ctx.age + '세' : '',
    ].filter(Boolean);
    titleEl.textContent = parts.length
      ? `${parts.join(' ')} 맞춤 청년 정책`
      : 'AI 추천 청년 정책';
    // 뒤의 '0건' <span>이 이미 HTML에 포함 — textContent는 h2 텍스트 노드만 교체
    // results-count span은 applyFilterSort 에서 채움
  }

  // '전체' 탭을 기본 선택
  activeCategory = '전체';
  const tabs = document.getElementById('category-tabs');
  if (tabs) {
    tabs.querySelectorAll('.category-tab').forEach(b => {
      const isAll = b.dataset.category === '전체';
      b.classList.toggle('active', isAll);
      b.setAttribute('aria-selected', String(isAll));
    });
  }

  applyFilterSort();
}

/* ─── 카드 그리드 렌더 ─────────────────────────────────────────── */
function renderPolicyCards(policies) {
  const container  = document.getElementById('policy-cards');
  const emptyState = document.getElementById('empty-state');
  const countEl    = document.getElementById('results-count');

  if (!container) return;
  container.innerHTML = '';

  if (policies.length === 0) {
    if (emptyState) emptyState.hidden = false;
    if (countEl)    countEl.textContent = '0';
    return;
  }

  if (emptyState) emptyState.hidden = true;
  if (countEl)    countEl.textContent = policies.length;

  const frag = document.createDocumentFragment();
  policies.forEach((p, idx) => frag.appendChild(createPolicyCard(p, idx)));
  container.appendChild(frag);
}

/* ─── 정책 카드 DOM 생성 ────────────────────────────────────────── */
const FINANCIAL_KW = ['금융', '저축', '적금', '계좌', '대출', '전세', '청약'];

function createPolicyCard(p, index) {
  const article = document.createElement('article');
  article.className = 'policy-card';
  article.setAttribute('role', 'listitem');
  article.dataset.category = p.category ?? '';
  article.dataset.id       = String(p.id ?? '');
  article.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;

  const scorePercent = Math.min(100, ((p.score ?? 10) / 20) * 100);
  const isFinancial  = FINANCIAL_KW.some(k =>
    (p.category ?? '').includes(k) || (p.tags ?? []).some(t => t.includes(k))
  );

  article.innerHTML = `
    <div class="card-header-row">
      <span class="card-category" data-category="${esc(p.category)}">${esc(p.category)}</span>
      ${p.score != null ? `<span class="card-score">${Math.round(p.score)}점 매칭</span>` : ''}
    </div>

    <h3 class="card-name">${esc(p.name)}</h3>
    <p class="card-summary">${esc(p.summary)}</p>
    <div class="card-amount">${esc(p.support_amount || '지원 금액 문의')}</div>

    <div class="score-bar" title="AI 매칭 점수 ${Math.round(scorePercent)}%"
         role="progressbar" aria-valuenow="${Math.round(scorePercent)}"
         aria-valuemin="0" aria-valuemax="100">
      <div class="score-fill" style="width:${scorePercent}%"></div>
    </div>

    <div class="card-tags">
      ${(p.tags ?? []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
    </div>

    ${buildEligibilityHtml(p.eligibility)}

    <div class="card-footer">
      <span class="card-deadline">
        <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
        </svg>
        신청 기한: ${esc(p.deadline ?? '상시 모집')}
      </span>

      <div class="card-actions">
        ${isFinancial
          ? `<button class="btn-calculator" type="button" data-id="${esc(String(p.id))}"
               aria-label="${esc(p.name)} 혜택 계산하기">💰 계산기</button>`
          : ''}
        ${p.url
          ? `<a class="card-link" href="${esc(p.url)}"
               target="_blank" rel="noopener noreferrer">자세히 보기 →</a>`
          : ''}
      </div>
    </div>

    ${p.contact ? `<div class="card-contact">📞 문의: ${esc(p.contact)}</div>` : ''}
  `;

  // 계산기 버튼
  article.querySelector('.btn-calculator')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openCalculator(allPolicies.find(ap => String(ap.id) === String(p.id)) ?? p);
  });

  return article;
}

/* 자격 조건 <details> 블록 */
function buildEligibilityHtml(eli) {
  if (!eli) return '';
  const items = [];
  if (eli.age_min != null || eli.age_max != null)
    items.push(`나이: ${eli.age_min ?? 0}세 ~ ${eli.age_max ?? 39}세`);
  if (eli.regions?.length)
    items.push(`지역: ${eli.regions.join(', ')}`);
  else
    items.push('지역: 전국');
  if (eli.income_percentile)
    items.push(`기준 중위소득 ${eli.income_percentile}% 이하`);
  if (eli.employment_status)
    items.push(eli.employment_status);
  if (!items.length) return '';

  return `
    <details class="card-eligibility">
      <summary>자격 조건 보기</summary>
      <ul class="eligibility-list">
        ${items.map(i => `<li>${esc(i)}</li>`).join('')}
      </ul>
    </details>
  `;
}

/* ─── 정렬 셀렉트 ───────────────────────────────────────────────── */
function initSortSelect() {
  const sel = document.getElementById('sort-select');
  if (!sel) return;
  sel.addEventListener('change', () => {
    currentSort = sel.value;
    if (currentPolicies.length > 0) applyFilterSort();
  });
}

/* ─── 빈 상태 "전체 정책 보기" ────────────────────────────────────── */
function initEmptyReset() {
  const btn = document.getElementById('empty-reset-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    // 조건 비우고 전체 검색
    ['age', 'region', 'income', 'employment'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    await doSearch();
  });
}

/* ─── 모바일 햄버거 ─────────────────────────────────────────────── */
function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    const open = mobileNav.hidden;
    mobileNav.hidden = !open;
    hamburger.setAttribute('aria-expanded', String(open));
  });

  // 모바일 내비게이션 링크 클릭 시 닫기
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileNav.hidden = true;
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ─── 푸터·헤더 보조 링크 ──────────────────────────────────────── */
function initFooterLinks() {
  // 헤더 "AI 상담" 버튼
  document.getElementById('header-chat-btn')?.addEventListener('click', openChatPanel);

  // 푸터 "AI 상담" 링크
  document.getElementById('footer-chat-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    openChatPanel();
    document.getElementById('chat-panel')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function openChatPanel() {
  const panel = document.getElementById('chat-panel');
  const toggle = document.getElementById('chat-toggle');
  if (!panel) return;
  panel.hidden = false;
  toggle?.setAttribute('aria-expanded', 'true');
  document.getElementById('chat-input')?.focus();
}

/* ─── 채팅 ──────────────────────────────────────────────────────── */
function initChat() {
  const toggle  = document.getElementById('chat-toggle');
  const closeBtn = document.getElementById('chat-close');
  const panel   = document.getElementById('chat-panel');
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  if (!toggle || !panel) return;

  /* 토글 열기/닫기 */
  toggle.addEventListener('click', () => {
    const opening = panel.hidden;
    panel.hidden  = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    if (opening) input?.focus();
  });

  /* 닫기 버튼 */
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  /* 초기 봇 인사 */
  appendBotMessage(
    '안녕하세요! 청년 정책 AI 도우미입니다 🙋\n' +
    '나이·지역·취업 상태를 말씀해 주시면 맞춤 정책을 찾아드릴게요.\n\n' +
    '💬 예시:\n' +
    '• "서울 26살 미취업인데 뭐 받을 수 있어?"\n' +
    '• "경기 29살 취업 준비 중 월세 지원 알려줘"\n' +
    '• "부산 24살 대학생 청년도약계좌 자격 돼?"'
  );

  /* 전송 */
  sendBtn?.addEventListener('click', sendChat);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });

  /* 빠른 질문 칩 */
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!input) return;
      input.value = chip.textContent.trim();
      input.focus();
      openChatPanel();
      sendChat();
    });
  });
}

function appendUserMessage(text) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;

  const div = document.createElement('div');
  div.className = 'chat-message user';
  div.innerHTML = `
    <div class="chat-bubble user-bubble">
      <p class="bubble-text">${esc(text).replace(/\n/g, '<br>')}</p>
      <time class="bubble-time">${fmtTime()}</time>
    </div>
  `;
  messages.appendChild(div);
  scrollChatBottom();
}

function appendBotMessage(text, policies) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;

  /* 미니 정책 카드 목록 */
  const policiesHtml = (policies?.length)
    ? `<div class="mini-policy-list">
        ${policies.slice(0, 5).map(p => `
          <div class="mini-policy-card">
            <span class="mini-category">${esc(p.category)}</span>
            <strong class="mini-name">${esc(p.name)}</strong>
            ${p.support_amount
              ? `<p class="mini-amount">${esc(p.support_amount)}</p>`
              : ''}
            ${p.deadline
              ? `<p class="mini-deadline">기한: ${esc(p.deadline)}</p>`
              : ''}
            ${p.url
              ? `<a class="mini-link" href="${esc(p.url)}" target="_blank"
                   rel="noopener noreferrer">신청 바로가기 →</a>`
              : ''}
          </div>
        `).join('')}
      </div>`
    : '';

  const div = document.createElement('div');
  div.className = 'chat-message bot';
  div.innerHTML = `
    <span class="bot-avatar" aria-hidden="true">🤖</span>
    <div class="chat-bubble bot-bubble">
      <p class="bubble-text">${esc(text).replace(/\n/g, '<br>')}</p>
      ${policiesHtml}
      <time class="bubble-time">${fmtTime()}</time>
    </div>
  `;
  messages.appendChild(div);
  scrollChatBottom();
}

function appendTypingIndicator() {
  const messages = document.getElementById('chat-messages');
  if (!messages) return null;

  const div = document.createElement('div');
  div.id        = 'chat-typing';
  div.className = 'chat-message bot';
  div.setAttribute('aria-label', 'AI가 응답을 생성하고 있습니다');
  div.innerHTML = `
    <span class="bot-avatar" aria-hidden="true">🤖</span>
    <div class="chat-bubble bot-bubble">
      <div class="typing-dots" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  messages.appendChild(div);
  scrollChatBottom();
  return div;
}

async function sendChat() {
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  if (!input) return;

  const msg = input.value.trim();
  if (!msg) return;

  input.value    = '';
  input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  appendUserMessage(msg);
  const typingEl = appendTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: msg }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    typingEl?.remove();
    appendBotMessage(
      data.reply ?? '관련 정책을 찾지 못했습니다.',
      data.policies
    );

    /* 채팅 응답 정책 → 카드로 이동 CTA */
    if (data.policies?.length > 0) {
      const ctaWrap = document.createElement('div');
      ctaWrap.className = 'chat-results-cta';

      const ctaBtn = document.createElement('button');
      ctaBtn.type      = 'button';
      ctaBtn.className = 'btn-show-in-cards';
      ctaBtn.textContent = `🔍 카드로 전체 보기 (${data.policies.length}건)`;
      ctaBtn.addEventListener('click', () => {
        currentPolicies = data.policies;
        renderPolicies(data.policies, {});
        document.getElementById('results-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        ctaWrap.remove();
      });

      ctaWrap.appendChild(ctaBtn);
      document.getElementById('chat-messages')?.appendChild(ctaWrap);
      scrollChatBottom();
    }

  } catch (err) {
    typingEl?.remove();
    appendBotMessage(
      '죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. 🙏'
    );
    console.error('[chat]', err);
  } finally {
    input.disabled    = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
}

function scrollChatBottom() {
  const m = document.getElementById('chat-messages');
  if (m) m.scrollTop = m.scrollHeight;
}

function fmtTime() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/* ─── 혜택 계산기 모달 ──────────────────────────────────────────── */
function initCalculatorModal() {
  if (document.getElementById('calculator-modal')) return;

  const modal = document.createElement('div');
  modal.id        = 'calculator-modal';
  modal.className = 'modal-overlay';
  modal.hidden    = true;
  modal.setAttribute('role',            'dialog');
  modal.setAttribute('aria-modal',      'true');
  modal.setAttribute('aria-labelledby', 'calc-modal-title');

  modal.innerHTML = `
    <div class="modal-content calculator-content" role="document">
      <button class="modal-close" id="calc-close" type="button"
              aria-label="계산기 닫기">✕</button>

      <h2 class="calc-title" id="calc-modal-title">💰 혜택 계산기</h2>
      <p class="calc-policy-name" id="calc-policy-name"></p>

      <div class="calc-form">
        <div class="calc-field">
          <label for="calc-monthly">월 납입액 (원)</label>
          <input type="number" id="calc-monthly" class="calc-input"
                 placeholder="예: 500000" min="1" max="9999999" step="10000">
        </div>
        <div class="calc-field">
          <label for="calc-period">납입 기간 (개월)</label>
          <input type="number" id="calc-period" class="calc-input"
                 placeholder="예: 24" min="1" max="120" value="24">
        </div>
        <button class="btn-calc-run" id="calc-run-btn" type="button">계산하기</button>
      </div>

      <div class="calc-result" id="calc-result" hidden>
        <h3 class="result-label">예상 수령액 내역</h3>
        <ul class="result-breakdown" id="calc-breakdown"></ul>
        <div class="result-total" id="calc-total"></div>
        <p class="calc-disclaimer">
          ※ 실제 혜택은 가입 조건·소득 수준·정책 변경에 따라 달라질 수 있습니다.
          반드시 해당 기관에 확인하세요.
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('calc-close')
    ?.addEventListener('click', closeCalculator);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCalculator();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeCalculator();
  });

  document.getElementById('calc-run-btn')
    ?.addEventListener('click', runCalculation);

  document.getElementById('calc-monthly')
    ?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runCalculation();
    });
}

function openCalculator(policy) {
  const modal = document.getElementById('calculator-modal');
  if (!modal) return;

  currentCalcPolicy = policy;

  const nameEl = document.getElementById('calc-policy-name');
  if (nameEl) nameEl.textContent = policy.name ?? '';

  /* 정책별 기본 납입 기간 — calc_params 우선, 없으면 이름 기반 */
  const periodInput = document.getElementById('calc-period');
  if (periodInput) {
    const fromParams = policy.calc_params?.period_months;
    if (fromParams) {
      periodInput.value = fromParams;
    } else {
      const PERIOD_MAP = {
        '청년희망적금':    24,
        '청년도약계좌':    60,
        '청년내일저축계좌': 36,
        '내일저축계좌':    36,
        '주택청약':        60,
        '내일채움공제':    24,
      };
      const entry = Object.entries(PERIOD_MAP)
        .find(([k]) => (policy.name ?? '').includes(k));
      periodInput.value = entry ? entry[1] : 24;
    }
  }

  /* 월 납입액 입력 초기화 + calc_params 힌트 */
  const monthlyInput = document.getElementById('calc-monthly');
  if (monthlyInput) {
    monthlyInput.value = '';
    monthlyInput.placeholder = policy.calc_params?.monthly_self
      ? `예: ${policy.calc_params.monthly_self.toLocaleString()}`
      : '예: 500000';
  }

  /* 결과 초기화 */
  const resultEl = document.getElementById('calc-result');
  if (resultEl) resultEl.hidden = true;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  monthlyInput?.focus();
}

function closeCalculator() {
  const modal = document.getElementById('calculator-modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
  currentCalcPolicy = null;
}

function runCalculation() {
  const monthlyInput = document.getElementById('calc-monthly');
  const periodInput  = document.getElementById('calc-period');

  const monthly = parseInt(monthlyInput?.value ?? '0', 10);
  const period  = parseInt(periodInput?.value  ?? '24', 10);

  if (!monthly || monthly <= 0) {
    monthlyInput?.focus();
    return;
  }
  if (!period || period <= 0) {
    periodInput?.focus();
    return;
  }

  const result = calculateBenefit(currentCalcPolicy ?? {}, monthly, period);

  const breakdownEl = document.getElementById('calc-breakdown');
  const totalEl     = document.getElementById('calc-total');
  const resultEl    = document.getElementById('calc-result');

  if (breakdownEl) {
    breakdownEl.innerHTML = result.breakdown.map(r => `
      <li class="breakdown-item">
        <span class="breakdown-label">${esc(r.label)}</span>
        <span class="breakdown-value">${fmtKRW(r.value)}</span>
      </li>
    `).join('');
  }

  if (totalEl) {
    totalEl.innerHTML = `
      <span class="total-label">총 예상 수령액</span>
      <strong class="total-value">${fmtKRW(result.total)}</strong>
      ${result.govBonus > 0
        ? `<small class="total-sub">(정부 지원 ${fmtKRW(result.govBonus)} 포함)</small>`
        : ''}
    `;
  }

  if (resultEl) resultEl.hidden = false;
  resultEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 정책별 혜택 계산
 *   calc_params 가 있으면 우선 활용, 없으면 이름 기반 룰 적용
 * @param {{ name?:string, calc_type?:string, calc_params?:object }} policy
 * @param {number} monthly   사용자 입력 월 납입액 (원)
 * @param {number} period    사용자 입력 납입 기간 (개월)
 * @returns {{ breakdown:{label:string,value:number}[], total:number, govBonus:number }}
 */
function calculateBenefit(policy, monthly, period) {
  const name      = policy.name      ?? '';
  const calcType  = policy.calc_type ?? null;
  const cp        = policy.calc_params ?? {};
  const principal = monthly * period;

  let breakdown = [];
  let govBonus  = 0;

  /* ── calc_type = 'compound' (내일채움공제) ── */
  if (calcType === 'compound' && cp.total_govt) {
    const govMonthly = cp.monthly_govt ?? 0;
    govBonus         = govMonthly * period;
    breakdown = [
      { label: '본인 납입 원금',        value: principal          },
      { label: '기업·정부 매칭 (추정)', value: govBonus           },
      { label: '총 적립금',             value: principal + govBonus },
    ];
    const total = principal + govBonus;
    return { breakdown, total, govBonus };
  }

  /* ── calc_type = 'savings' 또는 이름 기반 ── */
  if (name.includes('청년희망적금')) {
    const interest = Math.round(principal * 0.05 * (period / 24));
    govBonus       = Math.round(Math.min(monthly, 500_000) * period * 0.036);
    breakdown = [
      { label: '납입 원금',         value: principal },
      { label: '이자 (연 5%)',      value: interest  },
      { label: '저축장려금 (정부)', value: govBonus  },
    ];

  } else if (name.includes('청년도약계좌')) {
    const govRate  = monthly <= 400_000 ? 0.06 : monthly <= 600_000 ? 0.04 : 0.03;
    const interest = Math.round(principal * 0.06 * (period / 60));
    govBonus       = Math.round(monthly * Math.min(period, 60) * govRate);
    breakdown = [
      { label: '납입 원금',    value: principal },
      { label: '이자 (연 6%)', value: interest  },
      { label: '정부 기여금',  value: govBonus  },
    ];

  } else if (name.includes('청년내일저축계좌') || name.includes('내일저축계좌')) {
    /* calc_params: monthly_govt = 300000 */
    const govMonthly = cp.monthly_govt ?? 300_000;
    govBonus         = govMonthly * period;
    const interest   = Math.round(principal * 0.02 * (period / 12));
    breakdown = [
      { label: '납입 원금',             value: principal  },
      { label: '이자 (연 2%)',          value: interest   },
      { label: `정부 매칭 (월 ${(govMonthly/10000).toFixed(0)}만)`, value: govBonus },
    ];

  } else if (name.includes('주택드림청약') || name.includes('청약')) {
    /* calc_params: interest_rate */
    const rate     = (cp.interest_rate ?? 2.1) / 100;
    const interest = Math.round(principal * rate * (period / 12));
    breakdown = [
      { label: '납입 원금',                    value: principal },
      { label: `이자 (연 ${(rate*100).toFixed(1)}%)`, value: interest },
    ];

  } else if (name.includes('대출') || name.includes('전세') || name.includes('버팀목')) {
    govBonus = Math.round(principal * 0.035 * (period / 12));
    breakdown = [
      { label: '대출 원금',                value: principal },
      { label: '이자 절감 효과 (연 3.5%)', value: govBonus  },
    ];

  } else {
    /* 기본 단리 2% */
    const interest = Math.round(principal * 0.02 * (period / 12));
    breakdown = [
      { label: '납입 원금',    value: principal },
      { label: '이자 (연 2%)', value: interest  },
    ];
  }

  const total = breakdown.reduce((s, b) => s + b.value, 0);
  return { breakdown, total, govBonus };
}

/** 금액 한국어 포맷 */
function fmtKRW(amount) {
  const n = Math.round(amount);
  if (n >= 100_000_000) {
    const v = n / 100_000_000;
    return `${v % 1 === 0 ? v : v.toFixed(1)}억원`;
  }
  if (n >= 10_000) {
    const man  = Math.floor(n / 10_000);
    const rest = n % 10_000;
    return rest
      ? `${man}만 ${rest.toLocaleString()}원`
      : `${man}만원`;
  }
  return `${n.toLocaleString()}원`;
}

/* ─── HTML 이스케이프 ───────────────────────────────────────────── */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/* ─── 최근 검색 (localStorage) ────────────────────────────────── */
function saveRecentSearch(s) {
  const prev    = readRecentSearches();
  const deduped = prev.filter(r =>
    !(r.age === s.age && r.region === s.region &&
      r.income === s.income && r.employment === s.employment)
  );
  deduped.unshift(s);
  recentSearches = deduped.slice(0, 3);
  try {
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  } catch { /* 쿠키 차단 환경 무시 */ }
  renderRecentSearches();
}

function loadRecentSearches() {
  recentSearches = readRecentSearches();
  renderRecentSearches();
}

function readRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem('recentSearches') ?? '[]');
  } catch {
    return [];
  }
}

function renderRecentSearches() {
  const container = document.getElementById('recent-searches');
  if (!container) return; // HTML에 없으면 skip

  if (!recentSearches.length) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.innerHTML = `
    <p class="recent-label">최근 검색</p>
    ${recentSearches.map((s, i) => {
      const label = [
        s.region,
        s.age ? s.age + '세' : '',
        s.employment || '',
        s.income && s.income !== '999' ? '소득 ' + s.income + '%' : '',
      ].filter(Boolean).join(' · ');
      return `<button class="recent-search-item" type="button" data-idx="${i}">
        ${esc(label)}
      </button>`;
    }).join('')}
  `;

  container.querySelectorAll('.recent-search-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = recentSearches[parseInt(btn.dataset.idx, 10)];
      if (!s) return;
      const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v ?? '';
      };
      set('age',        s.age);
      set('region',     s.region);
      set('income',     s.income);
      set('employment', s.employment);
      document.getElementById('search-form')?.requestSubmit();
    });
  });
}
