// 최소 서비스워커 — 설치 요건 충족용. 캐시하지 않고 항상 네트워크를 그대로 사용한다.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () {});
