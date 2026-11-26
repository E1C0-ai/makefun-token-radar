// Token Launch Radar — the page. No fetch, no network: window.RADAR is data.js,
// written by main.ts from the sealed snapshot. The farm plan below is generated
// in the page from each row's own record, with the same rules as lib/model.ts.
(function () {
  'use strict';
  var R = window.RADAR;
  if (!R) { document.body.innerHTML = '<p>data.js did not load.</p>'; return; }
  var M = R.model;
  var rows = R.rows.slice();

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) {
    if (n == null || !isFinite(n)) return '—';
    var a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function moneyFull(n) {
    if (n == null || !isFinite(n)) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function pct(n) {
    if (n == null || !isFinite(n)) return '—';
    var s = (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
    return '<span class="' + (n >= 0 ? 'pos' : 'neg') + '">' + s + '</span>';
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function ageOf(r) { return r.age_days; }

  // ---- the model, in the page, so the sandbox can re-rank ----
  function implied(r, multMode, gw) {
    var mult = multMode === 'flat' ? M.base_multiple : r.base_multiple;
    var growth = clamp(r.change_7d == null ? 0 : r.change_7d, M.growth_floor, M.growth_cap);
    var gMult = 1 + (growth / 100) * gw;
    var age = r.age_days == null ? M.unknown_age_days : r.age_days;
    var mMult = M.maturity_floor + (Math.min(Math.max(age, 0), M.maturity_days) / M.maturity_days) * M.maturity_range;
    return { implied: Math.max(1, Math.round(r.tvl_usd * mult * gMult * mMult)), mult: mult, gMult: gMult, mMult: mMult, growth: growth };
  }

  // ---- farm plan: the same rules as lib/model.ts ----
  function capitalFor(tvl) {
    if (tvl >= 5e9) return 250;
    if (tvl >= 1e9) return 150;
    if (tvl >= 1e8) return 100;
    return 50;
  }
  function holdFor(age) { if (age == null) return 30; if (age < 180) return 60; if (age < 365) return 45; return 30; }
  function actionFor(r, capital, chain) {
    var c = (r.category || '').toLowerCase(), name = r.name;
    if (/lend|cdp|collateral/.test(c)) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (/dex|yield|leveraged farm/.test(c)) return 'Provide $' + capital + ' of liquidity to ' + name + '\'s main pool on ' + chain + ' and keep the position open.';
    if (/bridge/.test(c)) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (/staking|restak/.test(c)) return 'Stake $' + capital + ' of the chain\'s staking asset through ' + name + ' and keep the receipt token.';
    if (/perpetual|derivative/.test(c)) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (/prediction/.test(c)) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (/curator|allocator/.test(c)) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (/stable/.test(c)) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (/rwa/.test(c)) return 'Mint $' + capital + ' of the protocol\'s yield asset on ' + chain + ' and hold it.';
    if (/insurance/.test(c)) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (/chain/.test(c)) return 'Bridge $' + capital + ' of USDC to ' + name + ' and use one app that runs on it.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function farmSteps(r) {
    var chain = r.chains.length ? r.chains[0] : 'its main chain';
    var capital = capitalFor(r.tvl_usd), hold = holdFor(r.age_days);
    var gas = capital >= 150 ? 8 : 4;
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(r, capital, chain), cost: '$' + capital + ' of capital and about $' + gas + ' of gas', time: '15 minutes to set up' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: 'Before you withdraw, open the protocol\'s own points or rewards page and claim only from the link it publishes.', cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ];
  }

  // ---- header / meta ----
  var med = rows.map(function (r) { return r.implied_value_usd; }).sort(function (a, b) { return a - b; });
  var medImp = med[Math.floor(med.length / 2)];
  document.getElementById('meta').textContent =
    'Snapshot ' + R.as_of + ' · ' + R.board_size + ' ranked rows (' + R.watchlist_size + ' watchlist + ' +
    R.early_size + ' early) · median implied value ' + money(medImp) + ' · model ' + R.model_version;
  document.getElementById('liveCount').textContent = '(' + R.live_size + ')';
  document.getElementById('modelVer').textContent = R.model_version;
  document.getElementById('dataSrc').textContent =
    'Source: ' + R.source + '. Snapshot date ' + R.as_of + '. Floor for the early radar: ' +
    moneyFull(R.floor_usd) + ' of TVL. Global median market-cap/TVL of tokenised peers: ' + R.global_multiple.toFixed(3) + '.';
  document.getElementById('howBody').innerHTML =
    '<p class="math">multiple = category median mcap/TVL, shrunk toward the global median<br>' +
    'base = TVL × multiple &nbsp;·&nbsp; growth = clamp(7d change, −60%, +120%)<br>' +
    'growth mult = 1 + growth × ' + M.growth_weight + ' &nbsp;·&nbsp; maturity = 0.6 + min(age, 1095d) / 1095 × 0.4<br>' +
    'implied value = max(1, round(base × growth mult × maturity mult))</p>' +
    '<p>The multiple is the market speaking, not a guess: for each category it is the median ' +
    'market-cap-to-TVL ratio of the tokenised protocols in that category in this same snapshot, ' +
    'shrunk toward the global median (' + R.global_multiple.toFixed(3) + ') with a prior weight of ' +
    M.shrink_prior + ', so a category with one peer cannot swing the board, and clamped to [' +
    M.multiple_floor + ', ' + M.multiple_cap + ']. The flat 0.25 constant is kept in the sandbox for comparison. ' +
    'Growth is the 7-day TVL change, capped so one hot week cannot dominate. Maturity rewards protocols ' +
    'that have survived: a listing younger than three years is discounted toward 0.6. Every row is scored ' +
    'by the same function — no name is ever special-cased.</p>';

  // ---- filters ----
  var cats = [...new Set(rows.map(function (r) { return r.category || 'Unknown'; }))].sort();
  var chains = [...new Set(rows.flatMap(function (r) { return r.chains; }))].sort();
  var catSel = document.getElementById('cat'), chainSel = document.getElementById('chain');
  catSel.innerHTML = '<option value="">All categories</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  chainSel.innerHTML = '<option value="">All chains</option>' + chains.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');

  var state = { q: '', cat: '', chain: '', sort: 'implied', wl: false, multMode: 'cat', gw: 0.5, sel: null };

  function view() {
    var q = state.q.toLowerCase();
    var list = rows.filter(function (r) {
      if (state.wl && !r.watchlist) return false;
      if (state.cat && (r.category || 'Unknown') !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).map(function (r) { var v = implied(r, state.multMode, state.gw); return { r: r, imp: v.implied, mult: v.mult }; });
    if (state.sort === 'implied') list.sort(function (a, b) { return b.imp - a.imp || (a.r.slug < b.r.slug ? -1 : 1); });
    if (state.sort === 'tvl') list.sort(function (a, b) { return b.r.tvl_usd - a.r.tvl_usd; });
    if (state.sort === 'growth') list.sort(function (a, b) { return (b.r.change_7d || -999) - (a.r.change_7d || -999); });
    if (state.sort === 'age') list.sort(function (a, b) { return (a.r.age_days == null ? 1e9 : a.r.age_days) - (b.r.age_days == null ? 1e9 : b.r.age_days); });
    return list;
  }

  function render() {
    var list = view();
    document.getElementById('count').textContent =
      'Showing ' + list.length + ' of ' + rows.length + ' rows' +
      (state.multMode !== 'cat' || state.gw !== 0.5 ? ' · sandbox model active (ranks differ from the saved board)' : '');
    var html = list.map(function (x, i) {
      var r = x.r;
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.sel === r.slug ? ' class="sel"' : '') + '><td>' + (i + 1) + '</td>' +
        '<td><b>' + esc(r.name) + '</b> <span style="color:var(--mut)">' + esc(r.slug) + '</span>' +
        (r.watchlist ? '<span class="badge">WATCHLIST</span>' : '') + '</td>' +
        '<td>' + esc(r.category || '—') + '</td><td>' + esc(r.chains.slice(0, 3).join(', ')) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num"><b>' + money(x.imp) + '</b></td><td class="num">' + x.mult.toFixed(3) + '×</td></tr>';
    }).join('');
    document.getElementById('rows').innerHTML = html || '<tr><td colspan="8">No protocols match these filters.</td></tr>';
  }

  function showDetail(slug) {
    var r = rows.find(function (x) { return x.slug === slug; });
    if (!r) return;
    state.sel = slug;
    var v = implied(r, state.multMode, state.gw);
    var catMult = R.category_multiples[r.category || 'Unknown'];
    var base = Math.round(r.tvl_usd * v.mult);
    var steps = farmSteps(r);
    var ageTxt = r.age_days == null ? 'unknown (listed date missing)' : r.age_days + ' days' +
      (r.listed_at ? ' (listed ' + r.listed_at + ')' : '');
    var el = document.getElementById('detail');
    el.hidden = false;
    el.innerHTML =
      '<h2>' + esc(r.name) + ' <span style="color:var(--mut);font-weight:400">#' + r.rank + ' · ' + esc(r.slug) + '</span></h2>' +
      '<p>' + esc(r.category || '—') + ' · ' + esc(r.chains.join(', ')) + ' · TVL ' + moneyFull(r.tvl_usd) +
      ' · 7d ' + (r.change_7d == null ? '—' : (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') +
      ' · age ' + esc(ageTxt) +
      (r.watchlist ? ' · <span class="badge">WATCHLIST</span>' : '') + '</p>' +
      '<h3>Model breakdown — how the $' + Math.round(v.implied).toLocaleString('en-US') + ' is reached</h3>' +
      '<div class="kv">' +
      '<div><b>Multiple</b>' + v.mult.toFixed(3) + '×' + (catMult ? ' (category median ' + catMult.multiple.toFixed(3) + ' from ' + catMult.n + ' peer' + (catMult.n === 1 ? '' : 's') + ', shrunk to global ' + R.global_multiple.toFixed(3) + ')' : ' (flat house constant)') + '</div>' +
      '<div><b>Base</b>' + moneyFull(r.tvl_usd) + ' × ' + v.mult.toFixed(3) + ' = ' + moneyFull(base) + '</div>' +
      '<div><b>Growth mult</b>' + v.gMult.toFixed(3) + '× (7d ' + v.growth.toFixed(1) + '% clamped)</div>' +
      '<div><b>Maturity mult</b>' + v.mMult.toFixed(3) + '×</div>' +
      '<div><b>Implied value</b>' + moneyFull(v.implied) + '</div>' +
      '</div>' +
      '<h3>Farm plan — six steps</h3><ol>' +
      steps.map(function (s) {
        var cut = s.text + ' <span style="color:var(--mut)">Cost: ' + esc(s.cost) + '. Time: ' + esc(s.time) + '.</span>';
        return '<li>' + cut + '</li>';
      }).join('') + '</ol>' +
      '<p class="hint">Check the protocol on DefiLlama and on its own site before you move funds. An airdrop is never guaranteed.</p>';
    render();
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---- live view ----
  document.getElementById('liveRows').innerHTML = R.live.map(function (p) {
    var ratio = p.mcap_usd && p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(3) + '×' : '—';
    return '<tr><td><b>' + esc(p.name) + '</b> <span style="color:var(--mut)">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td><td>' + esc(p.chains.slice(0, 3).join(', ')) + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd) + '</td>' +
      '<td class="num">' + ratio + '</td><td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // ---- events ----
  document.getElementById('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) showDetail(tr.getAttribute('data-slug'));
  });
  document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
  catSel.addEventListener('change', function (e) { state.cat = e.target.value; render(); });
  chainSel.addEventListener('change', function (e) { state.chain = e.target.value; render(); });
  document.getElementById('sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
  document.getElementById('wlOnly').addEventListener('change', function (e) { state.wl = e.target.checked; render(); });
  document.getElementById('multMode').addEventListener('change', function (e) { state.multMode = e.target.value; if (state.sel) showDetail(state.sel); else render(); });
  document.getElementById('gw').addEventListener('input', function (e) {
    state.gw = parseFloat(e.target.value);
    document.getElementById('gwVal').textContent = state.gw.toFixed(2);
    if (state.sel) showDetail(state.sel); else render();
  });
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      var tab = b.getAttribute('data-tab');
      document.getElementById('tab-board').hidden = tab !== 'board';
      document.getElementById('tab-live').hidden = tab !== 'live';
      document.getElementById('tab-how').hidden = tab !== 'how';
    });
  });

  render();
})();
