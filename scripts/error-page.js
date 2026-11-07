
(function () {

  var body = document.body;
  var card = document.getElementById('card');
  var label = document.getElementById('label');
  var title = document.getElementById('title');
  var sub = document.getElementById('sub');
  var btn = document.getElementById('btn');
  var hint = document.getElementById('hint');


  var online = {
    label: '404 / Destination not found',
    title: "Oops, that page isn't<br>in our plan.",
    btn: 'Return home',
    hint: 'psst… poke the card',
    subs: [
      'We couldn’t find a page at this address.',
      'Check the spelling of the link and try again.',
      "If you followed a bookmark, update it after you find the page.",
      'The homepage has a link to the transfer room.',
      "If you meant to join a room, open its invitation link.",
      "You can also start a new room from the homepage."
    ]
  };

  var offline = {
    label: 'No signal / You are offline',
    title: 'Bestie, the wifi<br>left you on read.',
    btn: 'Try again, no cap',
    hint: 'connect to the internet, then we vibe',
    subs: [
      "No internet, no drop. It's giving 2009 dial-up.",
      'Your connection fumbled the bag. Go touch the router.',
      "Not the wifi ghosting us rn. It's so over (temporarily).",
      "Check your data, bestie. We can't send files through vibes alone.",
      'Wifi said "new phone, who dis." Reconnect and we run it back.'
    ]
  };
  var kind = body.getAttribute('data-error-kind');
  if (kind === 'room-expired') online = {label:'Room closed / Time for a new one', title:'This room has<br>said goodbye.', btn:'Create a fresh room', hint:'Your saved files are still yours.', subs:['The invitation expired or the room ended. Start a fresh connection.', 'Old invitations cannot reopen a room. Ask your other device for a new one.']};
  if (kind === 'connection-help') online = {label:'Connection paused / Let’s find a route', title:'Your next screen<br>is a little out of reach.', btn:'Try connecting again', hint:'Try the same Wi-Fi on both devices.', subs:['A direct connection could not be established. No relay is enabled in this build.', 'Return to both pages, check your network and choose Reconnect devices.']};

  var mode = online, idx = 0, timer, fallback = body.hasAttribute('data-offline-fallback');

  function setSub(text) {
    sub.classList.add('out');
    setTimeout(function () { sub.textContent = text; sub.classList.remove('out'); }, 350);
  }
  function rotate() { idx = (idx + 1) % mode.subs.length; setSub(mode.subs[idx]); }

  function apply(isOffline) {
    mode = isOffline ? offline : online; idx = 0;
    document.title = isOffline ? 'No connection — Drop' : kind ? (kind === 'room-expired' ? 'Room ended — Drop' : 'Connection help — Drop') : 'Page not found — Drop';
    body.classList.toggle('offline', isOffline);
    label.textContent = mode.label;
    title.innerHTML = mode.title;
    btn.textContent = mode.btn;
    hint.textContent = mode.hint;
    setSub(mode.subs[0]);
    clearInterval(timer);
    timer = setInterval(rotate, 5000);
  }
  function check() { apply(fallback || !navigator.onLine); }

  btn.addEventListener('click', function (e) {
    if (body.classList.contains('offline')) {
      e.preventDefault();
      if (!navigator.onLine) setSub('Still offline. Reconnect to the internet and we will try this page again.');
      else location.reload();
    }
  });
  card.addEventListener('click', function () {
    card.classList.remove('wiggle'); void card.offsetWidth; card.classList.add('wiggle');
    if (!body.classList.contains('offline')) rotate();
  });
  window.addEventListener('offline', function () { check(); });
  window.addEventListener('online', function () { if (fallback) location.reload(); else check(); });


  check();
  body.setAttribute('data-error-ready','true');
})();
