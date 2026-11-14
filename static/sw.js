var CACHE_NAME = "gisele-games-v9";

var PRECACHE_URLS = [
  "/static/css/style.css",
  "/static/css/maze.css",
  "/static/css/guess-words.css",
  "/static/css/operation.css",
  "/static/css/tictactoe.css",
  "/static/css/spot-diff.css",
  "/static/css/diamond-hacher.css",
  "/static/js/maze.js",
  "/static/js/guess-words.js",
  "/static/js/operation.js",
  "/static/js/tictactoe.js",
  "/static/js/spot-diff.js",
  "/static/js/spot-diff-data.js",
  "/static/js/diamond-hacher.js",
  "/static/img/covers/maze_cover.png",
  "/static/img/covers/guess_word_cover.png",
  "/static/img/covers/operation_cover.jpg",
  "/static/img/covers/tictactoe_cover.png",
  "/static/img/covers/spot_diff_cover.png",
  "/static/img/covers/diamond_hacher_cover.jpg",
  "/static/img/diamond_hacher/watching.jpg",
  "/static/img/diamond_hacher/distracted.jpg",
  "/static/img/diamond_hacher/angry.jpg",
  "/static/img/diamond_hacher/caught.jpg",
  "/static/img/ttt_avatars/easy_bunny.png",
  "/static/img/ttt_avatars/medium_fox.png",
  "/static/img/ttt_avatars/hard_dragon.png",
  "/static/img/art/welcome.jpg",
  "/static/img/art/win.jpg",
  "/static/img/art/lose.jpg",
  "/static/img/art/player.png",
  "/static/img/art/treasure.png",
  "/static/img/icon-192.png",
  "/static/img/icon-512.png",
  "/static/img/maze_bg/arctic_glacier.png",
  "/static/img/maze_bg/candy_kingdom.png",
  "/static/img/maze_bg/coral_reef.png",
  "/static/img/maze_bg/desert_pyramid.png",
  "/static/img/maze_bg/enchanted_forest.png",
  "/static/img/maze_bg/haunted_garden.png",
  "/static/img/maze_bg/jungle_temple.png",
  "/static/img/maze_bg/pirate_island.png",
  "/static/img/maze_bg/robot_factory.png",
  "/static/img/maze_bg/sky_castle.png",
  "/static/img/maze_bg/space_station.png",
  "/static/img/maze_bg/volcano_cave.png",
  "/static/img/operation_bg/space_medbay.jpg",
  "/static/img/operation_bg/pirate_infirmary.jpg",
  "/static/img/operation_bg/jungle_clinic.jpg",
  "/static/img/operation_bg/hospital_room.jpg",
  "/static/img/operation_bg/castle_infirmary.jpg",
  "/static/img/operation_bg/submarine_medbay.jpg",
  "/static/img/operation_bg/desert_camp_clinic.jpg",
  "/static/img/operation_bg/arctic_station_clinic.jpg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Cache-first for static assets (css/js/img) so repeat visits and offline play
// are instant; everything else (pages, /api/*) always goes to the network
// since it depends on login state and shouldn't be served stale.
self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  var isStaticAsset = url.pathname.startsWith("/static/");
  if (event.request.method !== "GET" || !isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var networkFetch = fetch(event.request).then(function (resp) {
        if (resp && resp.ok) {
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, resp.clone()); });
        }
        return resp;
      }).catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
