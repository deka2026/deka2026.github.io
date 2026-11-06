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
    '.card .ans{margin:6px 0;line-height:1.6}.card table{border-collapse:collapse;margin:6px 0;font-size:13px}.card th,.card td{border:1px solid #e6e1d3;padding:3px 7px;text-align:left;vertical-align:top}' +
    '.card{align-self:flex-start;max-width:92%;border:1px solid #c9b86b;background:#fffbe8;border-radius:12px;padding:10px 14px;line-height:1.55}.card.r-send,.card.r-perm,.card.r-delete{border-color:#c0392b;background:#fff3f0}.card h4{margin:0 0 6px;font-size:14px}.card .pv{font-size:13px;background:#fff;border:1px solid #e6e1d3;border-radius:8px;padding:6px 10px;margin:6px 0;white-space:pre-wrap}.card .btns{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}.card .opt{border:1px solid #2c5842;background:#fff;color:#2c5842;border-radius:16px;padding:4px 12px;cursor:pointer;font-size:13px}.card .opt:hover{background:#edf2e5}.card input[type=password]{border:1px solid #d9d2c0;border-radius:8px;padding:6px 8px;font-size:14px}.card .edl{display:block;font-size:12px;color:#6b6450;margin:6px 0 2px}.card .edt{box-sizing:border-box;width:100%;border:1px solid #d9d2c0;border-radius:8px;padding:6px 8px;font-size:14px;font-family:inherit;line-height:1.5}.card a{color:#2c5842}' +
    '@media(max-width:640px){.logo span{display:none}.who{display:none}.b.lbl{display:none}}' +
    // ── 11-04 화면 개편(개선안 13·M6): 모드 셋 — bar(위 띠) · inline(내 페이지 넓은 상담창) · fab(오른쪽 아래 「상담」 단추 + 아래 판)
    '.fabbtn,.scrim,.shead,.mic{display:none}' +
    ':host([data-mode=inline]),:host([data-mode=fab]){position:static;z-index:auto}' +
    ':host([data-mode=inline]) .logo,:host([data-mode=inline]) .who,:host([data-mode=inline]) #bTog,:host([data-mode=inline]) #bDoc,:host([data-mode=fab]) .logo,:host([data-mode=fab]) .who,:host([data-mode=fab]) #bTog,:host([data-mode=fab]) #bDoc{display:none}' +
    ':host([data-mode=inline]) .bar,:host([data-mode=fab]) .bar{height:auto;background:transparent;color:inherit;box-shadow:none;padding:0;flex-wrap:wrap;gap:8px}' +
    ':host([data-mode=inline]) .q,:host([data-mode=fab]) .q{height:52px;border:1.5px solid #4a6741;background:#fff;color:#1c2621;border-radius:12px;font-size:16px;padding:0 14px;order:3}' +
    ':host([data-mode=inline]) .q::placeholder,:host([data-mode=fab]) .q::placeholder{color:#8a8f84}:host([data-mode=inline]) .q:focus,:host([data-mode=fab]) .q:focus{background:#fff;outline:3px solid #b47d14;outline-offset:1px}' +
    ':host([data-mode=inline]) .b,:host([data-mode=fab]) .b{height:52px;min-width:52px;border:1px solid #d9d2c0;background:#fff;color:#2c5842;border-radius:12px;padding:0 14px;font-size:15px;display:inline-flex;align-items:center;gap:4px}' +
    ':host([data-mode=inline]) .b:hover,:host([data-mode=fab]) .b:hover{background:#edf2e5}' +
    ':host([data-mode=inline]) #bUp,:host([data-mode=fab]) #bUp{order:1}:host([data-mode=inline]) .mic,:host([data-mode=fab]) .mic{display:inline-flex;order:2;color:#6b7280}' +
    ':host([data-mode=inline]) #send,:host([data-mode=fab]) #send{order:4;background:#2c5842;color:#fff;border-color:#2c5842;font-weight:600;padding:0 22px}' +
    ':host([data-mode=inline]) .panel{box-shadow:none;border:1px solid #e6e1d3;border-radius:12px;margin-top:10px;max-height:360px}:host([data-mode=inline]) .inner{max-width:none;padding:10px 12px}' +
    ':host([data-mode=fab]) .q{flex:1 1 100%;order:0}:host([data-mode=fab]) #send{margin-left:auto}' +
    '.fabbtn{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(var(--skai-bottom,16px) + env(safe-area-inset-bottom));z-index:150;height:56px;min-width:56px;padding:0 20px;border-radius:28px;border:none;background:#0d3b2c;color:#faf6ec;font-size:16px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.28);cursor:pointer;font-family:inherit;align-items:center;gap:6px}' +
    '.fabbtn:focus-visible,.shead button:focus-visible{outline:3px solid #b47d14;outline-offset:2px}' +
    ':host([data-mode=fab]) .fabbtn,:host([data-mode=inline][data-fabshow]) .fabbtn{display:inline-flex}:host([data-mode=fab][data-open]) .fabbtn{display:none}' +
    ':host([data-mode=fab]) .wrap{display:none}' +
    ':host([data-mode=fab][data-open]) .scrim{display:block;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:2147480999}' +
    ':host([data-mode=fab][data-open]) .wrap{display:flex;flex-direction:column;position:fixed;left:0;right:0;bottom:0;height:88dvh;max-height:88dvh;z-index:2147481000;background:#fff;border-radius:16px 16px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.25);padding:0 0 calc(12px + env(safe-area-inset-bottom))}' +
    ':host([data-mode=fab][data-open]) .shead{display:flex;align-items:center;gap:8px;padding:6px 10px 6px 16px;border-bottom:1px solid #e6e1d3}.shead h2{margin:0;font-size:17px;flex:1;color:#0d3b2c}.shead button{height:44px;min-width:44px;border:1px solid #d9d2c0;background:#fff;border-radius:22px;padding:0 14px;font-size:15px;cursor:pointer;font-family:inherit;color:#2c5842}' +
    ':host([data-mode=fab][data-open]) .panel{display:block;order:1;flex:1;max-height:none;box-shadow:none;border:none;overflow:auto}:host([data-mode=fab][data-open]) .bar{order:2;padding:10px 12px 0;border-top:1px solid #e6e1d3}' +
    ':host([data-mode=fab]) .tab{min-height:44px}' +
    '@media(max-width:760px){:host([data-mode=inline]) .q{flex:1 1 100%;order:0}:host([data-mode=inline]) #send{margin-left:auto}:host([data-mode=inline]) .panel{max-height:50dvh}}' +
    // 휴대폰 한 줄: [올리기][말하기·준비 중] … [보내기] — 390px 에서 꺾이지 않게 단추 안쪽 여백·글자를 줄인다
    '@media(max-width:760px){:host([data-mode=inline]) .b,:host([data-mode=fab]) .b{padding:0 11px;font-size:14px}:host([data-mode=inline]) #send,:host([data-mode=fab]) #send{padding:0 18px}:host([data-mode=inline]) .mic,:host([data-mode=fab]) .mic{font-size:12.5px;padding:0 9px}}' +
    '@media(prefers-reduced-motion:no-preference){:host([data-mode=fab][data-open]) .wrap{animation:up .22s ease-out}@keyframes up{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}}' +
    '</style>' +
    '<button class="fabbtn" id="fab" type="button" aria-haspopup="dialog" aria-controls="wrap">💬 상담</button>' +
    '<div class="scrim" id="scrim"></div>' +
    '<div class="wrap" id="wrap" aria-labelledby="shT">' +
    '<div class="shead"><h2 id="shT">상담창</h2><button type="button" id="shX">✕ 닫기</button></div>' +
    '<div class="bar">' +
    '<div class="logo" id="logo">🤖 <b>사교원 AI</b><span> 도우미</span></div>' +
    '<input class="q" id="q" placeholder="이 화면에 대해 물어보세요 — 파일·이미지를 올리고 문서도 만듭니다" autocomplete="off">' +
    '<button class="b" id="send" title="보내기">보내기</button>' +
    '<button class="b lbl" id="bUp" title="파일·이미지 올리기">📎 <span class="ul">업로드</span></button>' +
    '<button class="b lbl" id="bDoc" title="문서 작성">📝 문서</button>' +
    '<button class="b" id="bTog" title="열기/닫기">▾</button>' +
    '<span class="who" id="who"></span>' +
    '<input type="file" id="file" style="display:none" multiple>' +
    '<button class="b mic" id="bMic" type="button" aria-disabled="true" title="음성 입력은 준비 중입니다">🎤 말하기 · 준비 중</button>' +
    '</div>' +
    '<div class="panel" id="panel"><div class="inner">' +
    '<div class="tabs"><button class="tab on" data-t="chat">대화</button><button class="tab" data-t="doc">문서 작성</button><button class="tab" data-t="list">내 대화</button><span class="sp"></span><span class="note" id="note"></span><button class="tab" id="bNew">새 대화</button></div>' +
    '<div id="vChat"><div class="files" id="files"></div><div class="msgs" id="msgs"></div></div>' +
    '<div id="vDoc" style="display:none"><div class="note">어떤 문서를 만들지 적어 주세요. 올린 파일과 지금까지의 대화를 근거로 마크다운 초안을 쓰고, 한글(hwpx)로 내려받을 수 있습니다. 서식은 사교원 집 규칙(첫 줄 들여쓰기·굵게는 제목만·쪽번호)으로 맞춥니다.</div>' +
    '<div class="row"><textarea class="ta" id="ask" placeholder="예: 올린 공고문을 바탕으로 사업 신청서 초안을 써 줘 (목적·내용·추진일정·예산 절 포함)"></textarea><button class="pb" id="bDraft">초안 쓰기</button></div>' +
    '<div id="draftBox"></div></div>' +
    '<div id="vList" style="display:none"><div class="list" id="list"></div></div>' +
    '</div></div></div>';
  document.documentElement.appendChild(host);
  var $ = function (id) { return root.getElementById(id); };

  // 본문을 44px 내리고, 맨 위에 고정된 머리띠는 그만큼 밀어 준다
  function pushPage() {
    var b = document.body; if (!b || host.getAttribute('data-mode') !== 'bar') return;   // 11-04: 위 띠일 때만
    var mt = parseFloat(getComputedStyle(b).marginTop) || 0;
    if (!b.getAttribute('data-skai-pushed')) { b.setAttribute('data-skai-mt0', b.style.marginTop || ''); b.style.marginTop = (mt + H) + 'px'; b.setAttribute('data-skai-pushed', '1'); }
    Array.prototype.forEach.call(document.querySelectorAll('header, nav, [role=banner], .topbar, .top-bar, .navbar, .site-header'), function (el) {
      try {
        var cs = getComputedStyle(el);
        if ((cs.position === 'fixed' || cs.position === 'sticky') && (parseFloat(cs.top) || 0) === 0 && !el.getAttribute('data-skai-top')) {
          el.setAttribute('data-skai-top0', el.style.top || ''); el.style.top = H + 'px'; el.setAttribute('data-skai-top', '1');
        }
      } catch (e) {}
    });
  }
  function unpushPage() {   // 11-04: 내 페이지 상담창·휴대폰 단추로 바뀌면 내린 것을 되돌린다
    var b = document.body; if (!b) return;
    if (b.getAttribute('data-skai-pushed')) { b.style.marginTop = b.getAttribute('data-skai-mt0') || ''; b.removeAttribute('data-skai-pushed'); b.removeAttribute('data-skai-mt0'); }
    Array.prototype.forEach.call(document.querySelectorAll('[data-skai-top][data-skai-top0]'), function (el) { el.style.top = el.getAttribute('data-skai-top0') || ''; el.removeAttribute('data-skai-top'); el.removeAttribute('data-skai-top0'); });   // 앱이 일부러 단 표식(data-skai-top 만 있는 것)은 그대로
  }
  // ── 모드 정하기: 폭 760px 이하는 fab, 그 위는 bar. 앱이 <html data-skai-mode="bar"> 로 고정할 수 있고, 첫 화면은 skai.mode('inline', 자리)로 바꾼다
  var MQ = window.matchMedia ? window.matchMedia('(max-width:760px)') : null;
  var want = window.__skaiMode || { m: 'auto', el: null };
  var PH = { bar: '이 화면에 대해 물어보세요 — 파일·이미지를 올리고 문서도 만듭니다', wide: '무엇을 도와드릴까요? 예: 결재함 보여 줘', small: '무엇이든 물어보세요' };
  function autoMode() { var a = document.documentElement.getAttribute('data-skai-mode'); return (a === 'bar' || a === 'fab') ? a : (MQ && MQ.matches ? 'fab' : 'bar'); }
  function applyMode() {
    var m = (want.m === 'inline' && want.el) ? 'inline' : ((want.m === 'bar' || want.m === 'fab') ? want.m : autoMode());
    if (m === 'inline') { if (host.parentNode !== want.el) want.el.appendChild(host); }
    else if (host.parentNode !== document.documentElement) document.documentElement.appendChild(host);
    host.setAttribute('data-mode', m);
    if (m !== 'fab') setSheet(false, true);
    if (m !== 'inline') host.removeAttribute('data-fabshow');
    if (m === 'bar') pushPage(); else unpushPage();
    $('q').placeholder = m === 'bar' ? PH.bar : (m === 'inline' && !(MQ && MQ.matches) ? PH.wide : PH.small);
  }
  function setSheet(v, quiet) {   // 휴대폰 아래 판 열고 닫기(대화상자 — 포커스는 판 안에서만, 닫으면 「상담」 단추로)
    var on = !!v && host.getAttribute('data-mode') === 'fab';
    var was = host.hasAttribute('data-open');
    if (on) { host.setAttribute('data-open', ''); $('wrap').setAttribute('role', 'dialog'); $('wrap').setAttribute('aria-modal', 'true'); try { document.documentElement.style.overflow = 'hidden'; } catch (e) {} }
    else { host.removeAttribute('data-open'); $('wrap').removeAttribute('role'); $('wrap').removeAttribute('aria-modal'); if (was) try { document.documentElement.style.overflow = ''; } catch (e) {} }
    $('fab').setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on && !was) setTimeout(function () { try { $('q').focus(); } catch (e) {} }, 30);
    if (!on && was && !quiet) try { $('fab').focus(); } catch (e) {}
  }
  if (MQ) { try { MQ.addEventListener('change', applyMode); } catch (e) { try { MQ.addListener(applyMode); } catch (e2) {} } }
  applyMode();
  if (!document.body) document.addEventListener('DOMContentLoaded', pushPage);
  setTimeout(pushPage, 800);

  // ── 상태 ──
  function setWho() {
    var m = state.me || {};
    if (m.user) $('who').innerHTML = esc(m.user.name || m.user.email || m.user.username) + ' · ' + esc(m.user.role_ko || '') + ' · ' + (m.used || 0) + '/' + m.limit;
    else $('who').innerHTML = '<a href="' + API + '/#login">로그인</a>하면 업로드·문서작성 · 안내 ' + (m.used || 0) + '/' + (m.limit || 10);
  }
  api('/api/ai/dock/me').then(function (r) { state.me = r.ok ? r : {}; setWho(); });

  function open(v) { state.open = v; $('panel').classList.toggle('open', v); $('bTog').textContent = v ? '▴' : '▾'; if (host.getAttribute('data-mode') === 'fab') setSheet(v); }
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
  // 11-01 개선안 2: 딕셔너리 결과도 보이게 — 답(answer·markdown·text)은 글로, 나머지 값은 「이름 | 값」 표로, 안의 목록은 표로
  var HIDE = { ok: 1, status: 1, error: 1, route: 1, backend: 1, request_id: 1, reload: 1, user_id: 1, jwt: 1, token: 1, access_token: 1, secret: 1, password: 1 };
  var LBL = {};   // 11-01 알파언니 🟠4: 서버가 준 칸 이름 한국어(labels) — 표 머리에 영문 키 대신
  function lbl(k) { return LBL[k] || k; }
  function dictOf(data) {
    if (!data || Array.isArray(data) || typeof data !== 'object') return '';
    var out = '';
    var ans = ['answer', 'markdown', 'text', 'summary', 'message'].map(function (k) { return data[k]; }).filter(function (v) { return typeof v === 'string' && v.trim(); })[0];
    if (ans) out += '<div class="ans">' + md(ans) + '</div>';
    var rows = [];
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      if (HIDE[k] || ['answer', 'markdown', 'text', 'summary', 'message', 'items'].indexOf(k) >= 0 || v == null || v === '') return;
      if (Array.isArray(v)) { if (v.length && typeof v[0] === 'object') out += tableOf(v); else if (v.length) rows.push([lbl(k), v.slice(0, 20).join(', ')]); return; }
      if (typeof v === 'object') { rows.push([lbl(k), Object.keys(v).filter(function (x) { return !HIDE[x]; }).slice(0, 6).map(function (x) { var y = v[x]; return lbl(x) + ': ' + (y != null && typeof y === 'object' ? '…' : y); }).join(' · ')]); return; }
      rows.push([lbl(k), typeof v === 'boolean' ? (v ? '예' : '아니오') : String(v)]);
    });
    if (rows.length) out += '<table>' + rows.slice(0, 16).map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
    return out;
  }
  function tableOf(data) {
    var rows = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null);
    if (!rows && data && typeof data === 'object') return dictOf(data);
    if (!rows || !rows.length || typeof rows[0] !== 'object') return (data && !Array.isArray(data) && typeof data === 'object') ? dictOf(data) : '';
    var keys = Object.keys(rows[0]).filter(function (k) { return !HIDE[k]; }).slice(0, 8);
    return '<table><tr>' + keys.map(function (k) { return '<th>' + esc(lbl(k)) + '</th>'; }).join('') + '</tr>' +
      rows.slice(0, 30).map(function (r) { return '<tr>' + keys.map(function (k) { var v = r[k]; return '<td>' + esc(v != null && typeof v === 'object' ? JSON.stringify(v) : v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' +
      (rows.length > 30 ? '<div class="note">' + rows.length + '건 중 30건만 표시</div>' : '');
  }
  function card(cls, html) { var d = document.createElement('div'); d.className = 'card ' + cls; d.innerHTML = html; $('msgs').appendChild(d); $('panel').scrollTop = $('panel').scrollHeight; return d; }
  // 11-01 알파언니 🟠7: 「/#…」 은 첫 화면 주소 — 하위 앱(gw·work·hr·talk…)에 붙은 상담창에서는 sakyowon.co.kr 로
  function hubUrl(u) { u = String(u || ''); return (u.charAt(0) === '/' && u.charAt(1) !== '/' && /\.sakyowon\.co\.kr$/.test(location.hostname) && location.hostname !== 'www.sakyowon.co.kr') ? API + u : u; }
  function screenLink(r) { return r.screen ? ' <a href="' + esc(hubUrl(r.screen)) + '" target="_blank">화면으로 열기 ↗</a>' : ''; }
  function showResult(r) {
    if (r.open) {   // 화면 열기 도구(AX 🟠12): 링크를 보여 주고 바로 연다
      var to = hubUrl(r.open);
      card('r-read', '<h4>➡️ ' + esc(r.text || '') + '</h4><div class="btns"><a class="opt" href="' + esc(to) + '">지금 열기</a></div>');
      setTimeout(function () { try { location.href = to; } catch (e) {} }, 700);
      return;
    }
    LBL = r.labels || {};
    var c = card('r-read', '<h4>' + (r.ok === false ? '⚠️ ' : '✅ ') + esc(r.name || '') + '</h4><div>' + esc(r.text || '') + screenLink(r) + '</div>' + tableOf(r.data) +
      (r.undo ? '<div class="btns"><button class="opt" data-undo="' + r.log_id + '">' + (r.tool === 'routine.create' ? '이 루틴 지우기' : '되돌리기') + '</button></div>' : ''));
    var b = c.querySelector('[data-undo]');
    if (b) b.addEventListener('click', function () { b.disabled = true; api('/api/ai/exec/undo/' + b.getAttribute('data-undo'), { method: 'POST' }).then(function (u) { addMsg(u.ok ? 'ai' : 'err', esc(u.text || '')); }); });
  }
  function runPlan(r, c) {
    var btns = c.querySelector('.btns'); btns.innerHTML = '<span class="note">실행 중…</span>';
    var edits = {};   // 11-04 개선안 6·17: 카드 안에서 고친 제목·본문
    Array.prototype.forEach.call(c.querySelectorAll('[data-edit]'), function (e) { edits[e.getAttribute('data-edit')] = e.value; });
    api('/api/ai/exec/run', { method: 'POST', body: { plan_id: r.plan_id, edits: edits } }).then(function (x) {
      if (x.error === 'fix_card') {   // 11-04 알파언니 🟠3·4: 빈 칸·남은 빈칸 — 실행하지 않았다, 카드를 그대로 두고 고치게
        addMsg('err', esc(x.text || '카드를 확인해 주세요.'));
        r.edit = (r.edit || []).map(function (f) { return Object.assign({}, f, { value: edits[f.name] != null ? edits[f.name] : f.value }); });
        showConfirm(r, c); return;
      }
      if (x.error === 'reauth_required') { btns.innerHTML = '<span class="note">재인증이 필요합니다.</span>'; showConfirm(Object.assign({}, r, { need_reauth: true }), c); return; }
      if (!x.name && !x.kind) { c.remove(); addMsg('err', esc(x.text || '실행하지 못했습니다. 다시 말씀해 주세요.')); return; }   // 🟠4: 카드 만료·이미 실행 등은 문장으로
      c.remove(); showResult(x);
      if (x.reload) setTimeout(function () { try { location.reload(); } catch (e) {} }, 900);   // 대시보드·사이드바를 바꾼 뒤 새 설정으로
    });
  }
  function showConfirm(r, old) {
    var ed = (r.edit || []).filter(function (f) { return f && f.name; });
    var body = ed.length ? '<div class="pv">' + esc(r.fixed || '') + '</div>' + ed.map(function (f) {
        var id = 'ed_' + esc(r.plan_id) + '_' + esc(f.name);
        return '<label class="edl" for="' + id + '">' + esc(f.label || f.name) + '</label>' + (f.multi
          ? '<textarea class="edt" id="' + id + '" data-edit="' + esc(f.name) + '" rows="6">' + esc(f.value || '') + '</textarea>'
          : '<input class="edt" id="' + id + '" data-edit="' + esc(f.name) + '" value="' + esc(f.value || '') + '">');
      }).join('') + (r.drafted ? '<div class="note">✍️ 본문은 AI 초안입니다. 읽어 보고 고친 뒤 보내세요.</div>' : '')
      : '<div class="pv">' + esc(r.preview) + '</div>';
    var html = '<h4>' + esc(r.risk_ko) + ' · ' + esc(r.name) + '</h4>' + body + (r.note ? '<div class="note"' + (r.irreversible ? ' style="color:#a8321f;font-weight:600"' : '') + '>' + esc(r.note) + '</div>' : '') +
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
  function plan(q, wait, toolHint, given) {
    var pb = { thread_id: state.thread, message: q, tool: toolHint || null }; if (given) pb.fields = given;
    return api('/api/ai/exec/plan', { method: 'POST', body: pb }).then(function (r) {
      if (r.thread_id) setThread(r.thread_id);   // 11-04 개선안 18: 실행 지시도 「내 대화」에 남는다
      if (r.error === 'ax_locked' && !state.lockNoted && state.me && state.me.user) {     // 개선안 27: 개편 잠금 중 로그인 회원에게 한 번 알리고 보통 대화로(비회원 안내 대화는 그대로)
        state.lockNoted = true;
        addMsg('ai', '🔒 ' + esc(r.message || '사이트 개편 작업 중이라 지시 실행(출근 찍기·파일·발송 등)은 잠시 쉬고 있습니다.') + ' 지금은 보통 질문으로 답합니다.');
      }
      if (!r.ok || r.kind === 'none') return false;           // 도구 아님 → 보통 질문으로
      wait.remove(); state.pending = null;
      if (r.kind === 'result') { showResult(r); return true; }
      if (r.kind === 'confirm') { showConfirm(r); return true; }
      if (r.kind === 'choose') {   // 11-04 개선안 15·17: 빠진 것을 단추로 고른다
        var cc = card('r-read', '<div>' + esc(r.text) + '</div><div class="btns">' + (r.options || []).map(function (o, i) { return '<button class="opt" data-i="' + i + '">' + esc(o.label) + '</button>'; }).join('') + '<button class="opt" data-x="1">취소</button></div>');
        Array.prototype.forEach.call(cc.querySelectorAll('[data-i]'), function (b) { b.addEventListener('click', function () {
          var o = r.options[+b.getAttribute('data-i')]; cc.remove(); addMsg('user', esc(o.label));
          var g = Object.assign({}, r.fields || {}); g[r.field] = o.value;
          var w = addMsg('ai', '확인 중…'); plan(q, w, r.tool, g).then(function (ok) { if (!ok) { w.className = 'm err'; w.textContent = '이어서 처리하지 못했습니다. 다시 말씀해 주세요.'; } });
        }); });
        cc.querySelector('[data-x]').addEventListener('click', function () { cc.remove(); addMsg('ai', '취소했습니다.'); });
        return true;
      }
      if (r.kind === 'geo') {   // 11-04 개선안 7: 휴대폰이면 위치를 붙이고, PC 면 근태 화면으로
        var phone = window.matchMedia && window.matchMedia('(pointer: coarse)').matches && navigator.geolocation;
        var pcCard = function (why) { card('r-read', '<div>📍 ' + esc(why) + '</div><div class="btns"><a class="opt" href="' + esc(r.screen || 'https://work.sakyowon.co.kr/') + '" target="_blank">근태 화면 열기 ↗</a></div>'); };
        if (!phone) { pcCard('PC에서는 위치를 알 수 없어 상담창으로 찍을 수 없습니다. 휴대폰 상담창이나 근태 화면에서 찍어 주세요.'); return true; }
        var gw = addMsg('ai', '📍 휴대폰 위치를 확인하고 있습니다… (위치 허용을 눌러 주세요)');
        navigator.geolocation.getCurrentPosition(function (pos) {
          var g = Object.assign({}, r.fields || {}, { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: Math.round(pos.coords.accuracy || 0) });
          plan(q, gw, r.tool, g).then(function (ok) { if (!ok) { gw.className = 'm err'; gw.textContent = '처리하지 못했습니다. 근태 화면에서 찍어 주세요.'; } });
        }, function () { gw.remove(); pcCard('위치를 받지 못했습니다(위치 허용이 꺼져 있거나 신호가 약합니다). 근태 화면에서 찍어 주세요.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        return true;
      }
      if (r.kind === 'need') { state.pending = { tool: r.tool, prev: q }; addMsg('ai', esc(r.text)); return true; }
      if (r.kind === 'locked') {
        var lc = card('r-read', '<div>🔒 ' + esc(r.text) + '</div><div class="btns"><a class="opt" href="' + API + '/#/map">둘러보기에서 보기</a>' + (r.can_request ? '<button class="opt" data-req="1">권한 요청 보내기</button>' : '') + '</div>');
        var rb = lc.querySelector('[data-req]');
        if (rb) rb.addEventListener('click', function () { rb.disabled = true; var w = addMsg('ai', '요청 중…'); plan((r.need || '').replace(/^perm:/, '').split('|')[0] + ' 권한 요청', w, 'perm.request').then(function (ok) { if (!ok) { w.className = 'm err'; w.textContent = '요청을 보내지 못했습니다.'; } }); });
        return true;
      }
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
          openThread(el.getAttribute('data-id'));
        });
      });
    });
  }

  function openThread(id) {
    return api('/api/ai/dock/threads/' + encodeURIComponent(id)).then(function (r) {
      if (!r.ok) return; setThread(r.thread.id); $('msgs').innerHTML = ''; state.files = [];
      r.items.forEach(function (m) { if (m.role === 'file') { state.files.push({ name: m.meta.name, chars: m.meta.chars }); addMsg('file', '📎 ' + esc(m.meta.name) + ' (' + m.meta.chars + '자)'); } else addMsg(m.role === 'user' ? 'user' : 'ai', m.role === 'user' ? esc(m.content) : md(m.content)); });
      renderFiles(); tab('chat');
    });
  }
  // 다른 화면(개인페이지·둘러보기)이 「이렇게 말해 보세요」 예시를 넣을 때 쓴다 (AX 2단계)
  window.skai = { say: function (t, go) { try { $('q').value = String(t || ''); if (go || host.getAttribute('data-mode') !== 'inline') { open(true); tab('chat'); } if (go) send(); else $('q').focus(); } catch (e) {} },
                  open: function () { open(true); tab('chat'); },
                  // 11-04 화면 개편: 모드 바꾸기(첫 화면이 부른다) · 내 대화 열기 · 넓은 상담창이 화면 밖이면 떠 있는 단추
                  mode: function (m, el) { want = { m: m || 'auto', el: el || null }; applyMode(); },
                  openThread: function (id) { return openThread(id); },
                  fabShow: function (on) { if (host.getAttribute('data-mode') === 'inline') { if (on) host.setAttribute('data-fabshow', ''); else host.removeAttribute('data-fabshow'); } } };
  $('fab').addEventListener('click', function () {
    if (host.getAttribute('data-mode') === 'inline') { try { host.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { host.scrollIntoView(); } setTimeout(function () { $('q').focus(); }, 250); return; }
    setSheet(true); if ($('msgs').children.length) open(true);
  });
  $('scrim').addEventListener('click', function () { open(false); });
  $('shX').addEventListener('click', function () { open(false); });
  $('bMic').addEventListener('click', function () { open(true); tab('chat'); addMsg('ai', '🎤 말하기(음성 입력)는 준비 중입니다. 지금은 글로 적어 주세요.'); });
  root.addEventListener('keydown', function (e) {   // 판이 열려 있으면 Esc 로 닫고, Tab 은 판 안에서만 돈다(그림자 안이라 root.activeElement 로 본다)
    if (!host.hasAttribute('data-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); open(false); return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call($('wrap').querySelectorAll('button,input,textarea,select,a[href],[tabindex]'), function (x) { return !x.disabled && x.offsetParent !== null && x.getAttribute('tabindex') !== '-1'; });
    if (!f.length) return; var a = root.activeElement, i = f.indexOf(a);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  });
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
  document.addEventListener('drop', function (e) { if (e.defaultPrevented) return; if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); upload(e.dataTransfer.files); } });
  // ── 11-06 이사장 지시: 「참여」 메뉴를 빼고, 모든 페이지 하단에 「문의하기」·「이용자 제안」 단추만 ──
  function footInit() {
    if (document.getElementById('skFoot') || !document.body) return;
    try { if (window.self !== window.top) return; } catch (e) { return; }   // 끼움 화면(iframe) 안에선 그리지 않는다 — 바깥 페이지 하단에 한 번만
    var fh = document.createElement('div'); fh.id = 'skFoot';
    var fr = fh.attachShadow({ mode: 'open' });
    fr.innerHTML = '<style>' +
      ':host{all:initial;display:block;font-family:"Pretendard","Noto Sans KR",system-ui,sans-serif}' +
      '.f{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;padding:14px 16px calc(14px + var(--skai-bottom,0px));border-top:1px solid #e6e1d3;background:#faf6ec}' +
      '.f a,.f button{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 18px;border-radius:22px;border:1px solid #2c5842;background:#fff;color:#2c5842;font-size:15px;font-family:inherit;text-decoration:none;cursor:pointer}' +
      '@media(max-width:760px){.f{padding-bottom:calc(var(--skai-bottom,16px) + 80px)}}' +   /* 휴대폰: 오른쪽 아래 「💬 상담」 단추(56px)가 가리지 않게 그 위로 */
      '.f a:hover,.f button:hover{background:#edf2e5}.f a:focus-visible,.f button:focus-visible,.d button:focus-visible,.d textarea:focus-visible,.d input:focus-visible{outline:3px solid #b47d14;outline-offset:2px}' +
      '.bk{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:2147483600;align-items:center;justify-content:center;padding:16px}.bk.on{display:flex}' +
      '.d{background:#fff;border-radius:14px;max-width:480px;width:100%;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.25);color:#1c2621}' +
      '.d h2{margin:0 0 6px;font-size:18px;color:#0d3b2c}.d p{margin:0 0 10px;font-size:13px;color:#6b7280;line-height:1.5}' +
      '.d label{display:block;font-size:13px;margin:8px 0 4px}.d textarea,.d input{box-sizing:border-box;width:100%;border:1px solid #d9d2c0;border-radius:8px;padding:9px;font-size:15px;font-family:inherit}.d textarea{min-height:120px}' +
      '.d .r{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}.d .r button{min-height:44px;padding:0 18px;border-radius:10px;border:1px solid #2c5842;background:#fff;color:#2c5842;font-size:15px;cursor:pointer;font-family:inherit}' +
      '.d .r .go{background:#2c5842;color:#fff}.d .r .go:disabled{opacity:.5}.d .msg{font-size:13px;margin-top:8px;min-height:1em}.d .msg.err{color:#8a2a2a}.d .msg.ok{color:#2c5842}' +
      '</style>' +
      '<nav class="f" aria-label="문의와 제안"><a id="fQ" href="https://home.sakyowon.co.kr/#/contact" target="_blank" rel="noopener">✉️ 문의하기</a><button type="button" id="fS">💡 이용자 제안</button></nav>' +
      '<div class="bk" id="fBk"><div class="d" role="dialog" aria-modal="true" aria-labelledby="fT">' +
      '<h2 id="fT">이용자 제안</h2><p>사이트·서비스를 쓰면서 불편했던 점이나 바랐던 점을 적어 주세요. 사교원 운영진이 읽고 개선합니다. 지금 보고 있는 화면 주소가 함께 전달됩니다.</p>' +
      '<label for="fM">제안 내용</label><textarea id="fM" maxlength="3000" placeholder="예: 휴대폰에서 입찰정보 글씨가 작아요"></textarea>' +
      '<label for="fC">답을 받을 연락처(선택)</label><input id="fC" maxlength="200" placeholder="이메일 또는 전화">' +
      '<div class="msg" id="fR" role="status"></div><div class="r"><button type="button" id="fX">닫기</button><button type="button" class="go" id="fGo">보내기</button></div></div></div>';
    document.body.appendChild(fh);
    var g = function (id) { return fr.getElementById(id); }, last = null;
    function show(v) { g('fBk').classList.toggle('on', v); if (v) { last = document.activeElement; g('fR').textContent = ''; g('fR').className = 'msg'; setTimeout(function () { g('fM').focus(); }, 30); } else if (last && last.focus) { g('fS').focus(); } }
    g('fS').addEventListener('click', function () { show(true); });
    g('fX').addEventListener('click', function () { show(false); });
    g('fBk').addEventListener('click', function (e) { if (e.target === g('fBk')) show(false); });
    fr.addEventListener('keydown', function (e) {   // 알파언니 🟡: 창이 열려 있으면 Esc 로 닫고, Tab 은 창 안에서만 돈다
      if (!g('fBk').classList.contains('on')) return;
      if (e.key === 'Escape') { e.preventDefault(); show(false); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(g('fBk').querySelectorAll('button,textarea,input'), function (x) { return !x.disabled; });
      var a = fr.activeElement, i = f.indexOf(a);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && g('fBk').classList.contains('on')) { e.preventDefault(); show(false); } });
    g('fGo').addEventListener('click', function () {
      var m = g('fM').value.trim();
      if (m.length < 5) { g('fR').className = 'msg err'; g('fR').textContent = '제안 내용을 5자 이상 적어 주세요.'; return; }
      g('fGo').disabled = true; g('fR').className = 'msg'; g('fR').textContent = '보내는 중…';
      api('/api/ai/dock/suggest', { method: 'POST', body: { message: m, contact: g('fC').value.trim(), page: (location.origin + location.pathname + (location.hash || '').slice(0, 80)).slice(0, 500) } }).then(function (r) {
        g('fGo').disabled = false;
        if (r && r.ok) { g('fM').value = ''; g('fC').value = ''; g('fR').className = 'msg ok'; g('fR').textContent = '고맙습니다. 제안이 접수됐습니다.'; }
        else { g('fR').className = 'msg err'; g('fR').textContent = (r && r.text) || '보내지 못했습니다. 잠시 뒤 다시 해 주세요.'; }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', footInit); else footInit();
  window.skAiDock = { open: function () { open(true); $('q').focus(); }, ask: function (q) { $('q').value = q; send(); } };
})();
