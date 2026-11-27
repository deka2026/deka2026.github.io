/* 사교원 공용 「설치」 단추 (2026-11-27 이사장 지시: 아카데미 우측 상단 「설치」 기능을 다른 사이트에도)
   쓰는 법:  <script src="/pwa-install.js" defer data-before="#btnLogin" data-class="btn"></script>
     data-before  이 요소 바로 앞에 단추를 넣는다(없으면 data-into 안 맨 뒤, 그것도 없으면 화면 오른쪽 아래에 띄운다)
     data-into    이 요소 안 맨 뒤에 넣는다
     data-class   단추에 줄 그 사이트의 단추 클래스
   앱처럼 이미 설치해 연 화면(standalone)에서는 단추를 그리지 않는다.
   브라우저가 설치 창을 줄 수 있으면(beforeinstallprompt) 바로 그 창을, 아니면 기기별 「홈 화면에 추가」 안내를 띄운다. */
(function () {
  var me = document.currentScript;
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
  if (standalone || document.getElementById('skpwaBtn')) return;
  var cfg = { before: me && me.getAttribute('data-before'), into: me && me.getAttribute('data-into'), cls: (me && me.getAttribute('data-class')) || '' };
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function () { var b = document.getElementById('skpwaBtn'); if (b) b.style.display = 'none'; });

  var css = '.skpwa-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99990;align-items:center;justify-content:center;font-family:inherit}'
    + '.skpwa-ov.show{display:flex}'
    + '.skpwa-md{background:#fff;color:#1f2a1c;border-radius:14px;padding:26px 22px;max-width:360px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.18);line-height:1.6}'
    + '.skpwa-md h3{font-size:17px;font-weight:800;margin:0 0 6px;color:#1f2a1c}'
    + '.skpwa-md p{font-size:13px;color:#5d6b58;margin:0 0 14px}'
    + '.skpwa-tab{display:flex;margin-bottom:12px;border-radius:8px;overflow:hidden;border:1px solid #d9dfd3}'
    + '.skpwa-tab button{flex:1;padding:9px 6px;font-size:12.5px;font-weight:700;font-family:inherit;border:0;cursor:pointer;background:#f4f5f0;color:#5d6b58;margin:0;border-radius:0;width:auto;min-height:40px}'
    + '.skpwa-tab button.on{background:#2f5a43;color:#fff}'
    + '.skpwa-g{display:none;text-align:left;font-size:13.5px;margin:10px 0 16px;padding-left:20px}'
    + '.skpwa-g.on{display:block}.skpwa-g li{margin:5px 0}'
    + '.skpwa-x{background:#2f5a43;color:#fff;border:0;padding:10px 28px;border-radius:8px;font-size:13.5px;font-weight:700;font-family:inherit;cursor:pointer;min-height:42px;width:auto;margin:0}'
    + '.skpwa-float{position:fixed;right:14px;bottom:14px;z-index:9990;background:#fff;color:#2f5a43;border:1px solid #c9d3c2;border-radius:999px;padding:9px 16px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.12)}'
    + '@media print{#skpwaBtn,.skpwa-ov{display:none!important}}';

  function guide() {
    var ov = document.getElementById('skpwaOv');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'skpwaOv'; ov.className = 'skpwa-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', '홈 화면에 추가하기');
      ov.innerHTML = '<div class="skpwa-md"><h3>홈 화면에 추가하기</h3><p>아래 안내를 따라 하면 앱처럼 바로 열 수 있어요</p>'
        + '<div class="skpwa-tab"><button type="button" data-t="a">안드로이드</button><button type="button" data-t="i">아이폰/아이패드</button><button type="button" data-t="p">PC</button></div>'
        + '<ol class="skpwa-g" data-g="a"><li>Chrome 브라우저에서 이 페이지를 엽니다</li><li>오른쪽 위 <b>⋮</b>(더보기) 메뉴를 누릅니다</li><li><b>「홈 화면에 추가」</b>(또는 「앱 설치」)를 고릅니다</li><li>이름을 확인하고 <b>「추가」</b>를 누릅니다</li></ol>'
        + '<ol class="skpwa-g" data-g="i"><li>Safari 브라우저에서 이 페이지를 엽니다</li><li>아래쪽 <b>공유 단추</b>(□↑)를 누릅니다</li><li><b>「홈 화면에 추가」</b>를 고릅니다</li><li>이름을 확인하고 <b>「추가」</b>를 누릅니다</li></ol>'
        + '<ol class="skpwa-g" data-g="p"><li>Chrome 이나 Edge 브라우저에서 이 페이지를 엽니다</li><li>주소창 오른쪽 <b>설치 아이콘</b>(⊕)을 누릅니다</li><li>아이콘이 없으면 <b>⋮</b> 메뉴 → 「저장 및 공유」 → <b>「바로가기 만들기」</b></li><li><b>「설치」</b>를 누릅니다</li></ol>'
        + '<button type="button" class="skpwa-x">닫기</button></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function (e) {
        var t = e.target;
        if (t === ov || (t.classList && t.classList.contains('skpwa-x'))) { ov.classList.remove('show'); return; }
        if (t.getAttribute && t.getAttribute('data-t')) pick(t.getAttribute('data-t'));
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') ov.classList.remove('show'); });
    }
    var ua = navigator.userAgent || '';
    pick(/iPhone|iPad|iPod/i.test(ua) ? 'i' : /Android/i.test(ua) ? 'a' : 'p');
    ov.classList.add('show');
    function pick(k) {
      var bs = ov.querySelectorAll('.skpwa-tab button'), gs = ov.querySelectorAll('.skpwa-g'), i;
      for (i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-t') === k);
      for (i = 0; i < gs.length; i++) gs[i].classList.toggle('on', gs[i].getAttribute('data-g') === k);
    }
  }
  function click() {
    if (deferred) { var d = deferred; deferred = null; try { d.prompt(); return; } catch (e) {} }
    guide();
  }
  function mount() {
    if (document.getElementById('skpwaBtn')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var b = document.createElement('button'); b.type = 'button'; b.id = 'skpwaBtn'; b.textContent = '설치'; b.title = '홈 화면에 추가해 앱처럼 열기';
    b.addEventListener('click', click);
    var ref = cfg.before && document.querySelector(cfg.before), box = cfg.into && document.querySelector(cfg.into);
    if (ref && ref.parentNode) { b.className = cfg.cls; ref.parentNode.insertBefore(b, ref); }
    else if (box) { b.className = cfg.cls; box.appendChild(b); }
    else { b.className = 'skpwa-float'; document.body.appendChild(b); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
