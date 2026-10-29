/* 사교원 AI 대화창(ai-dock) — 모든 화면 상단에 붙는 공통 위젯. 2026-10-13 통합사이트 개편 2단계.
   <script src="https://sakyowon.co.kr/ai-dock.js" defer></script> 한 줄로 어느 사이트에서든 붙는다.
   백엔드는 https://sakyowon.co.kr/api/ai/dock/* (허브 통합 계정 쿠키 sk_session, 같은 도메인 CORS). */
(function () {
  'use strict';
  if (window.__skAiDock) return;
  window.__skAiDock = true;
  var API = 'https://sakyowon.co.kr';
  var H = 44;
  var state = { me: null, thread: null, open: false, tab: 'chat', busy: false, draftMd: '', files: [] };
  try { state.thread = sessionStorage.getItem('skai_thread') || null; } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(path, opts) {
    opts = opts || {};
    var o = { credentials: 'include', method: opts.method || 'GET', headers: {} };
    if (opts.form) { o.body = opts.form; }
    else if (opts.body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
    return fetch(API + path, o).then(function (r) {
      if (opts.blob) return r.ok ? r.blob() : r.json().then(function (j) { throw j; });
      return r.json().catch(function () { return { ok: false, status: r.status }; }).then(function (j) { j.status = r.status; return j; });
    }).catch(function (e) { return { ok: false, error: 'network', message: String(e && e.message || e) }; });
  }
  function pageText() {
    var t = '';
    try {
      var main = document.querySelector('main') || document.body;
      t = (main.innerText || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    } catch (e) {}
    return t.slice(0, 3000);
  }
  function md(s) { // 아주 작은 마크다운 → HTML (제목·굵게·목록·표·줄바꿈)
    var lines = esc(s).split('\n'), out = [], inList = false, inTable = false;
    lines.forEach(function (l) {
      if (/^\|.*\|\s*$/.test(l)) {
        if (/^\|\s*:?-{2,}/.test(l)) return;
        var cells = l.replace(/^\||\|\s*$/g, '').split('|');
        if (!inTable) { out.push('<table>'); inTable = true; out.push('<tr>' + cells.map(function (c) { return '<th>' + c.trim() + '</th>'; }).join('') + '</tr>'); return; }
        out.push('<tr>' + cells.map(function (c) { return '<td>' + c.trim() + '</td>'; }).join('') + '</tr>'); return;
      } else if (inTable) { out.push('</table>'); inTable = false; }
      var m;
      if ((m = l.match(/^(#{1,4})\s+(.*)/))) { if (inList) { out.push('</ul>'); inList = false; } out.push('<h' + (m[1].length + 2) + '>' + m[2] + '</h' + (m[1].length + 2) + '>'); return; }
      if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + m[1] + '</li>'); return; }
      if (inList) { out.push('</ul>'); inList = false; }
      if (!l.trim()) { out.push('<div class="gap"></div>'); return; }
      out.push('<p>' + l + '</p>');
    });
    if (inList) out.push('</ul>'); if (inTable) out.push('</table>');
    return out.join('').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }

  // ── 뼈대 ──
  var host = document.createElement('div');
  host.id = 'sk-ai-dock';
  host.setAttribute('data-nosnippet', '');
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' +
    ':host{all:initial;position:fixed;top:0;left:0;right:0;z-index:2147483000;font-family:"Pretendard Variable",Pretendard,-apple-system,"Malgun Gothic",sans-serif;font-size:14px;color:#1c2621}' +
    '*{box-sizing:border-box}' +
    '.bar{height:' + H + 'px;display:flex;align-items:center;gap:8px;padding:0 10px;background:#0d3b2c;color:#faf6ec;box-shadow:0 1px 4px rgba(0,0,0,.25)}' +
    '.logo{font-weight:700;white-space:nowrap;font-size:13px;letter-spacing:.2px;cursor:pointer}.logo b{color:#f3c969}' +
    '.q{flex:1;min-width:80px;height:30px;border:1px solid rgba(255,255,255,.25);border-radius:15px;background:rgba(255,255,255,.12);color:#fff;padding:0 12px;font-size:14px;outline:none}' +
    '.q::placeholder{color:rgba(255,255,255,.7)}.q:focus{background:rgba(255,255,255,.2)}' +
    '.b{height:30px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;border-radius:15px;padding:0 10px;font-size:13px;cursor:pointer;white-space:nowrap}' +
    '.b:hover{background:rgba(255,255,255,.15)}.b.on{background:#f3c969;color:#0d3b2c;border-color:#f3c969;font-weight:600}' +
    '.who{font-size:12px;opacity:.85;white-space:nowrap}.who a{color:#f3c969;text-decoration:none}' +
    '.panel{display:none;background:#fff;border-bottom:1px solid #d9d2c0;box-shadow:0 8px 24px rgba(0,0,0,.18);max-height:70vh;overflow:auto}' +
    '.panel.open{display:block}.inner{max-width:980px;margin:0 auto;padding:12px 14px}' +
    '.tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center}.tab{border:1px solid #d9d2c0;background:#faf6ec;border-radius:16px;padding:4px 12px;cursor:pointer;font-size:13px}.tab.on{background:#2c5842;color:#fff;border-color:#2c5842}' +
    '.sp{flex:1}.note{font-size:12px;color:#6b7280}' +
    '.msgs{display:flex;flex-direction:column;gap:8px}.m{max-width:92%;padding:8px 12px;border-radius:12px;line-height:1.55;white-space:normal;word-break:break-word}' +
    '.m.user{align-self:flex-end;background:#edf2e5}.m.ai{align-self:flex-start;background:#f6f4ee;border:1px solid #e6e1d3}.m.file{align-self:flex-start;background:#fff7e0;border:1px dashed #e0c070;font-size:13px}.m.err{background:#fdecec;color:#8a2a2a}' +
    '.m p{margin:0 0 6px}.m h3,.m h4,.m h5{margin:8px 0 4px;font-size:14px}.m ul{margin:4px 0 6px 18px;padding:0}.m table{border-collapse:collapse;margin:6px 0;font-size:13px}.m th,.m td{border:1px solid #d9d2c0;padding:3px 7px}.m .gap{height:4px}' +
    '.row{display:flex;gap:8px;margin-top:10px;align-items:flex-start}.ta{flex:1;min-height:60px;border:1px solid #d9d2c0;border-radius:8px;padding:8px;font-size:14px;font-family:inherit}' +
    '.pb{border:none;background:#2c5842;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px}.pb.ghost{background:#fff;color:#2c5842;border:1px solid #2c5842}.pb:disabled{opacity:.5;cursor:default}' +
    '.files{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.chip{font-size:12px;background:#fff7e0;border:1px solid #e0c070;border-radius:12px;padding:2px 9px}' +
    '.draft{border:1px solid #d9d2c0;border-radius:8px;padding:10px 14px;background:#fffdf7;margin-top:8px;line-height:1.6}' +
    '.list{display:flex;flex-direction:column;gap:4px}.li{display:flex;gap:8px;align-items:center;padding:6px 8px;border:1px solid #eee;border-radius:8px;cursor:pointer;font-size:13px}.li:hover{background:#faf6ec}.li .t{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.card{align-self:flex-start;max-width:92%;border:1px solid #c9b86b;background:#fffbe8;border-radius:12px;padding:10px 14px;line-height:1.55}.card.r-send,.card.r-perm,.card.r-delete{border-color:#c0392b;background:#fff3f0}.card h4{margin:0 0 6px;font-size:14px}.card .pv{font-size:13px;background:#fff;border:1px solid #e6e1d3;border-radius:8px;padding:6px 10px;margin:6px 0;white-space:pre-wrap}.card .btns{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}.card .opt{border:1px solid #2c5842;background:#fff;color:#2c5842;border-radius:16px;padding:4px 12px;cursor:pointer;font-size:13px}.card .opt:hover{background:#edf2e5}.card input[type=password]{border:1px solid #d9d2c0;border-radius:8px;padding:6px 8px;font-size:14px}.card a{color:#2c5842}' +
    '@media(max-width:640px){.logo span{display:none}.who{display:none}.b.lbl{display:none}}' +
    '</style>' +
    '<div class="bar">' +
    '<div class="logo" id="logo">🤖 <b>사교원 AI</b><span> 도우미</span></div>' +
    '<input class="q" id="q" placeholder="이 화면에 대해 물어보세요 — 파일·이미지를 올리고 문서도 만듭니다" autocomplete="off">' +
    '<button class="b" id="send" title="보내기">보내기</button>' +
    '<button class="b lbl" id="bUp" title="파일·이미지 올리기">📎 업로드</button>' +
    '<button class="b lbl" id="bDoc" title="문서 작성">📝 문서</button>' +
    '<button class="b" id="bTog" title="열기/닫기">▾</button>' +
    '<span class="who" id="who"></span>' +
    '<input type="file" id="file" style="display:none" multiple>' +
    '</div>' +
    '<div class="panel" id="panel"><div class="inner">' +
    '<div class="tabs"><button class="tab on" data-t="chat">대화</button><button class="tab" data-t="doc">문서 작성</button><button class="tab" data-t="list">내 대화</button><span class="sp"></span><span class="note" id="note"></span><button class="tab" id="bNew">새 대화</button></div>' +
    '<div id="vChat"><div class="files" id="files"></div><div class="msgs" id="msgs"></div></div>' +
    '<div id="vDoc" style="display:none"><div class="note">어떤 문서를 만들지 적어 주세요. 올린 파일과 지금까지의 대화를 근거로 마크다운 초안을 쓰고, 한글(hwpx)로 내려받을 수 있습니다. 서식은 사교원 집 규칙(첫 줄 들여쓰기·굵게는 제목만·쪽번호)으로 맞춥니다.</div>' +
    '<div class="row"><textarea class="ta" id="ask" placeholder="예: 올린 공고문을 바탕으로 사업 신청서 초안을 써 줘 (목적·내용·추진일정·예산 절 포함)"></textarea><button class="pb" id="bDraft">초안 쓰기</button></div>' +
    '<div id="draftBox"></div></div>' +
    '<div id="vList" style="display:none"><div class="list" id="list"></div></div>' +
    '</div></div>';
  document.documentElement.appendChild(host);
  var $ = function (id) { return root.getElementById(id); };

  // 본문을 44px 내리고, 맨 위에 고정된 머리띠는 그만큼 밀어 준다
  function pushPage() {
    var b = document.body; if (!b) return;
    var mt = parseFloat(getComputedStyle(b).marginTop) || 0;
    if (!b.getAttribute('data-skai-pushed')) { b.style.marginTop = (mt + H) + 'px'; b.setAttribute('data-skai-pushed', '1'); }
    Array.prototype.forEach.call(document.querySelectorAll('header, nav, [role=banner], .topbar, .top-bar, .navbar, .site-header'), function (el) {
      try {
        var cs = getComputedStyle(el);
        if ((cs.position === 'fixed' || cs.position === 'sticky') && (parseFloat(cs.top) || 0) === 0 && !el.getAttribute('data-skai-top')) {
          el.style.top = H + 'px'; el.setAttribute('data-skai-top', '1');
        }
      } catch (e) {}
    });
  }
  if (document.body) pushPage(); else document.addEventListener('DOMContentLoaded', pushPage);
  setTimeout(pushPage, 800);

  // ── 상태 ──
  function setWho() {
    var m = state.me || {};
    if (m.user) $('who').innerHTML = esc(m.user.name || m.user.email || m.user.username) + ' · ' + esc(m.user.role_ko || '') + ' · ' + (m.used || 0) + '/' + m.limit;
    else $('who').innerHTML = '<a href="' + API + '/#login">로그인</a>하면 업로드·문서작성 · 안내 ' + (m.used || 0) + '/' + (m.limit || 10);
  }
  api('/api/ai/dock/me').then(function (r) { state.me = r.ok ? r : {}; setWho(); });

  function open(v) { state.open = v; $('panel').classList.toggle('open', v); $('bTog').textContent = v ? '▴' : '▾'; }
  function tab(t) {
    state.tab = t;
    Array.prototype.forEach.call(root.querySelectorAll('.tab[data-t]'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === t); });
    $('vChat').style.display = t === 'chat' ? '' : 'none'; $('vDoc').style.display = t === 'doc' ? '' : 'none'; $('vList').style.display = t === 'list' ? '' : 'none';
    if (t === 'list') loadList();
    open(true);
  }
  function addMsg(cls, html) { var d = document.createElement('div'); d.className = 'm ' + cls; d.innerHTML = html; $('msgs').appendChild(d); $('panel').scrollTop = $('panel').scrollHeight; return d; }
  function setThread(id) { state.thread = id; try { if (id) sessionStorage.setItem('skai_thread', id); else sessionStorage.removeItem('skai_thread'); } catch (e) {} }
  function renderFiles() { $('files').innerHTML = state.files.map(function (f) { return '<span class="chip">📎 ' + esc(f.name) + ' (' + f.chars + '자)</span>'; }).join(''); }

  // ── 상담 실행기(AX 개편 1단계): 지시 한 줄 → 도구 판별 → 읽기는 즉시, 그 밖은 확인 카드 ──
  function tableOf(data) {
    var rows = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null);
    if (!rows || !rows.length || typeof rows[0] !== 'object') return '';
    var keys = Object.keys(rows[0]).slice(0, 8);
    return '<table><tr>' + keys.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr>' +
      rows.slice(0, 30).map(function (r) { return '<tr>' + keys.map(function (k) { var v = r[k]; return '<td>' + esc(v != null && typeof v === 'object' ? JSON.stringify(v) : v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' +
      (rows.length > 30 ? '<div class="note">' + rows.length + '건 중 30건만 표시</div>' : '');
  }
  function card(cls, html) { var d = document.createElement('div'); d.className = 'card ' + cls; d.innerHTML = html; $('msgs').appendChild(d); $('panel').scrollTop = $('panel').scrollHeight; return d; }
  function screenLink(r) { return r.screen ? ' <a href="' + esc(r.screen) + '" target="_blank">화면으로 열기 ↗</a>' : ''; }
  function showResult(r) {
    var c = card('r-read', '<h4>' + (r.ok === false ? '⚠️ ' : '✅ ') + esc(r.name || '') + '</h4><div>' + esc(r.text || '') + screenLink(r) + '</div>' + tableOf(r.data) +
      (r.undo ? '<div class="btns"><button class="opt" data-undo="' + r.log_id + '">되돌리기</button></div>' : ''));
    var b = c.querySelector('[data-undo]');
    if (b) b.addEventListener('click', function () { b.disabled = true; api('/api/ai/exec/undo/' + b.getAttribute('data-undo'), { method: 'POST' }).then(function (u) { addMsg(u.ok ? 'ai' : 'err', esc(u.text || '')); }); });
  }
  function runPlan(r, c) {
    var btns = c.querySelector('.btns'); btns.innerHTML = '<span class="note">실행 중…</span>';
    api('/api/ai/exec/run', { method: 'POST', body: { plan_id: r.plan_id } }).then(function (x) {
      if (x.error === 'reauth_required') { btns.innerHTML = '<span class="note">재인증이 필요합니다.</span>'; showConfirm(Object.assign({}, r, { need_reauth: true }), c); return; }
      c.remove(); showResult(x);
    });
  }
  function showConfirm(r, old) {
    var html = '<h4>' + esc(r.risk_ko) + ' · ' + esc(r.name) + '</h4><div class="pv">' + esc(r.preview) + '</div>' + (r.note ? '<div class="note">' + esc(r.note) + '</div>' : '') +
      (r.need_reauth ? '<div style="margin-top:6px"><span class="note">본인 확인(비밀번호) — 이 칸은 대화 기록에 남지 않습니다</span><br><input type="password" id="pw_' + esc(r.plan_id) + '" autocomplete="current-password"></div>' : '') +
      '<div class="btns"><button class="pb" data-run="1">' + (r.risk === 'send' ? '보내기' : '실행') + '</button><button class="pb ghost" data-cancel="1">취소</button>' + screenLink(r) + '</div>';
    var c = old || card('r-' + r.risk, '');
    c.className = 'card r-' + r.risk; c.innerHTML = html;
    c.querySelector('[data-cancel]').addEventListener('click', function () { c.remove(); addMsg('ai', '취소했습니다.'); });
    c.querySelector('[data-run]').addEventListener('click', function () {
      if (r.need_reauth) {
        var pw = c.querySelector('input[type=password]'); var v = pw ? pw.value : '';
        if (!v) { pw.focus(); return; }
        api('/api/ai/exec/reauth', { method: 'POST', body: { password: v } }).then(function (a) { if (!a.ok) { addMsg('err', '비밀번호가 맞지 않습니다.'); return; } r.need_reauth = false; runPlan(r, c); });
        return;
      }
      runPlan(r, c);
    });
  }
  function plan(q, wait, toolHint) {
    return api('/api/ai/exec/plan', { method: 'POST', body: { thread_id: state.thread, message: q, tool: toolHint || null } }).then(function (r) {
      if (!r.ok || r.kind === 'none') return false;           // 도구 아님 → 보통 질문으로
      wait.remove(); state.pending = null;
      if (r.kind === 'result') { showResult(r); return true; }
      if (r.kind === 'confirm') { showConfirm(r); return true; }
      if (r.kind === 'need') { state.pending = { tool: r.tool, prev: q }; addMsg('ai', esc(r.text)); return true; }
      if (r.kind === 'locked') { card('r-read', '<div>🔒 ' + esc(r.text) + '</div>' + (r.screen ? '<div class="btns"><a class="opt" href="' + API + '/#/map">둘러보기에서 보기</a>' + (r.can_request ? '<a class="opt" href="https://home.sakyowon.co.kr/#/contact">권한 요청 문의</a>' : '') + '</div>' : '')); return true; }
      if (r.kind === 'ask') {
        var c = card('r-read', '<div>' + esc(r.text) + '</div><div class="btns">' + r.options.map(function (o) { return '<button class="opt" data-t="' + esc(o.id) + '">' + esc(o.name) + '</button>'; }).join('') + '<button class="opt" data-t="">그냥 질문이에요</button></div>');
        Array.prototype.forEach.call(c.querySelectorAll('[data-t]'), function (b) { b.addEventListener('click', function () {
          c.remove(); var t = b.getAttribute('data-t'); if (!t) { ask(q); return; }
          var w = addMsg('ai', '확인 중…'); plan(q, w, t).then(function (ok) { if (!ok) { w.remove(); ask(q); } });
        }); });
        return true;
      }
      addMsg(r.kind === 'refused' ? 'err' : 'ai', esc(r.text || '')); return true;
    });
  }
  function ask(q) {
    var wait = addMsg('ai', '생각 중…'); state.busy = true; $('send').disabled = true;
    api('/api/ai/dock/chat', { method: 'POST', body: { thread_id: state.thread, message: q, page: { url: location.href, title: document.title, text: pageText() } } })
      .then(function (r) {
        state.busy = false; $('send').disabled = false;
        if (r.thread_id) setThread(r.thread_id);
        if (r.ok) { wait.innerHTML = md(r.answer); if (state.me) { state.me.used = r.used; state.me.limit = r.limit; setWho(); } }
        else { wait.className = 'm err'; wait.textContent = r.answer || r.message || (r.status === 429 ? '오늘 한도에 닿았습니다.' : '답을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); }
      });
  }
  function send() {
    var q = $('q').value.trim(); if (!q || state.busy) return;
    $('q').value = ''; open(true); tab('chat');
    addMsg('user', esc(q));
    var hint = null, full = q;
    if (state.pending) { hint = state.pending.tool; full = state.pending.prev + ' ' + q; }
    var wait = addMsg('ai', '확인 중…'); state.busy = true; $('send').disabled = true;
    plan(full, wait, hint).then(function (handled) {
      state.busy = false; $('send').disabled = false;
      if (!handled) { wait.remove(); ask(q); }
    });
  }
  function sendOld() {
    var q = $('q').value.trim(); if (!q || state.busy) return;
    $('q').value = ''; open(true); tab('chat');
    addMsg('user', esc(q)); var wait = addMsg('ai', '생각 중…'); state.busy = true; $('send').disabled = true;
    api('/api/ai/dock/chat', { method: 'POST', body: { thread_id: state.thread, message: q, page: { url: location.href, title: document.title, text: pageText() } } })
      .then(function (r) {
        state.busy = false; $('send').disabled = false;
        if (r.thread_id) setThread(r.thread_id);
        if (r.ok) { wait.innerHTML = md(r.answer); if (state.me) { state.me.used = r.used; state.me.limit = r.limit; setWho(); } }
        else { wait.className = 'm err'; wait.textContent = r.answer || r.message || (r.status === 429 ? '오늘 한도에 닿았습니다.' : '답을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); }
      });
  }
  function upload(files) {
    if (!state.me || !state.me.user) { open(true); addMsg('err', '파일·이미지 업로드는 로그인한 뒤 쓸 수 있습니다. <a href="' + API + '/#login">로그인</a>'); return; }
    Array.prototype.forEach.call(files, function (f) {
      open(true); tab('chat');
      var m = addMsg('file', '📎 ' + esc(f.name) + ' 올리는 중… (글자를 읽어 내고 개인정보는 가립니다)');
      var fd = new FormData(); fd.append('file', f); if (state.thread) fd.append('thread_id', state.thread);
      api('/api/ai/dock/upload', { method: 'POST', form: fd }).then(function (r) {
        if (r.thread_id) setThread(r.thread_id);
        if (r.ok) { state.files.push(r); renderFiles(); m.innerHTML = '📎 <b>' + esc(r.name) + '</b> 첨부됨 — ' + r.chars + '자 읽음(' + esc(r.method) + ')' + (r.masked && r.masked.length ? ' · 가린 것: ' + esc(r.masked.join(', ')) : '') + '<br><span class="note">' + esc(r.preview) + '…</span>'; }
        else { m.className = 'm err'; m.textContent = r.message || (r.error === 'too_large' ? '50MB 를 넘습니다.' : r.error === 'unauthorized' ? '로그인이 필요합니다.' : '읽어 내지 못했습니다.'); }
      });
    });
  }
  function draft() {
    var ask = $('ask').value.trim(); if (!ask || state.busy) return;
    if (!state.me || !state.me.user) { $('draftBox').innerHTML = '<div class="m err">문서 작성은 로그인한 뒤 쓸 수 있습니다. <a href="' + API + '/#login">로그인</a></div>'; return; }
    state.busy = true; $('bDraft').disabled = true; $('draftBox').innerHTML = '<div class="note">초안을 쓰는 중입니다… (고성능컴퓨팅 엔진, 30~90초)</div>';
    api('/api/ai/dock/draft', { method: 'POST', body: { thread_id: state.thread, ask: ask, page: { url: location.href, title: document.title } } }).then(function (r) {
      state.busy = false; $('bDraft').disabled = false;
      if (r.thread_id) setThread(r.thread_id);
      if (!r.ok) { $('draftBox').innerHTML = '<div class="m err">' + esc(r.answer || '초안을 받지 못했습니다.') + '</div>'; return; }
      state.draftMd = r.markdown;
      $('draftBox').innerHTML = '<div class="row" style="margin-top:8px"><button class="pb" id="bHwpx">한글(hwpx) 내려받기</button><button class="pb ghost" id="bCopy">마크다운 복사</button><span class="note">수정하려면 아래 글을 고친 뒤 내려받기</span></div>' +
        '<textarea class="ta" id="mdEdit" style="min-height:220px;margin-top:8px"></textarea><div class="draft" id="mdView"></div>';
      $('mdEdit').value = r.markdown; $('mdView').innerHTML = md(r.markdown);
      $('mdEdit').addEventListener('input', function () { state.draftMd = $('mdEdit').value; $('mdView').innerHTML = md(state.draftMd); });
      $('bCopy').addEventListener('click', function () { try { navigator.clipboard.writeText(state.draftMd); } catch (e) {} });
      $('bHwpx').addEventListener('click', function () {
        var title = (state.draftMd.match(/^#\s+(.+)$/m) || [])[1] || '문서';
        $('bHwpx').disabled = true;
        api('/api/ai/dock/hwpx', { method: 'POST', body: { markdown: state.draftMd, title: title }, blob: true }).then(function (b) {
          $('bHwpx').disabled = false;
          if (!(b instanceof Blob)) { alert('한글 변환에 실패했습니다.'); return; }
          var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = title.replace(/[\\/:*?"<>|]/g, '') + '.hwpx'; a.click();
        });
      });
    });
  }
  function loadList() {
    $('list').innerHTML = '<div class="note">불러오는 중…</div>';
    api('/api/ai/dock/threads').then(function (r) {
      if (!r.ok) { $('list').innerHTML = '<div class="note">' + (r.status === 401 ? '로그인하면 대화 기록이 계정에 남아 다른 기기에서도 이어집니다.' : '불러오지 못했습니다.') + '</div>'; return; }
      if (!r.items.length) { $('list').innerHTML = '<div class="note">아직 저장된 대화가 없습니다.</div>'; return; }
      $('list').innerHTML = r.items.map(function (t) { return '<div class="li" data-id="' + esc(t.id) + '"><span class="t">' + esc(t.first || t.title || '(제목 없음)') + '</span><span class="note">' + esc((t.updated_at || '').slice(0, 16).replace('T', ' ')) + '</span><button class="tab del" data-id="' + esc(t.id) + '">삭제</button></div>'; }).join('');
      Array.prototype.forEach.call(root.querySelectorAll('.li'), function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.classList.contains('del')) { e.stopPropagation(); api('/api/ai/dock/threads/' + el.getAttribute('data-id'), { method: 'DELETE' }).then(loadList); return; }
          api('/api/ai/dock/threads/' + el.getAttribute('data-id')).then(function (r) {
            if (!r.ok) return; setThread(r.thread.id); $('msgs').innerHTML = ''; state.files = [];
            r.items.forEach(function (m) { if (m.role === 'file') { state.files.push({ name: m.meta.name, chars: m.meta.chars }); addMsg('file', '📎 ' + esc(m.meta.name) + ' (' + m.meta.chars + '자)'); } else addMsg(m.role === 'user' ? 'user' : 'ai', m.role === 'user' ? esc(m.content) : md(m.content)); });
            renderFiles(); tab('chat');
          });
        });
      });
    });
  }

  // 다른 화면(개인페이지·둘러보기)이 「이렇게 말해 보세요」 예시를 넣을 때 쓴다 (AX 2단계)
  window.skai = { say: function (t, go) { try { $('q').value = String(t || ''); open(true); tab('chat'); if (go) send(); else $('q').focus(); } catch (e) {} },
                  open: function () { open(true); tab('chat'); } };
  $('send').addEventListener('click', send);
  $('q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
  $('q').addEventListener('focus', function () { if ($('msgs').children.length) open(true); });
  $('bUp').addEventListener('click', function () { $('file').click(); });
  $('file').addEventListener('change', function () { upload(this.files); this.value = ''; });
  $('bDoc').addEventListener('click', function () { tab('doc'); });
  $('bTog').addEventListener('click', function () { open(!state.open); });
  $('logo').addEventListener('click', function () { open(!state.open); });
  $('bNew').addEventListener('click', function () { setThread(null); state.files = []; renderFiles(); $('msgs').innerHTML = ''; $('draftBox').innerHTML = ''; tab('chat'); $('q').focus(); });
  Array.prototype.forEach.call(root.querySelectorAll('.tab[data-t]'), function (b) { b.addEventListener('click', function () { tab(b.getAttribute('data-t')); }); });
  document.addEventListener('dragover', function (e) { if (e.dataTransfer && e.dataTransfer.types && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) e.preventDefault(); });
  document.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); upload(e.dataTransfer.files); } });
  window.skAiDock = { open: function () { open(true); $('q').focus(); }, ask: function (q) { $('q').value = q; send(); } };
})();
