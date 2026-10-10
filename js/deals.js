
(function(){
'use strict';

const STORAGE_KEY = 'nfs-deals-v1';
const DEFAULT_BUDGET = 300;
const STAGES = [
  {id:'considering', label:'Considering'},
  {id:'ordered', label:'Ordered'},
  {id:'at_amazon', label:'At Amazon'},
  {id:'live', label:'Live'},
  {id:'sold_out', label:'Sold out'}
];
const STAGE_ORDER = {considering:0, ordered:1, at_amazon:2, live:3, sold_out:4};
const MILESTONES = [25, 100, 250, 500, 1000];
const MILESTONE_NOTES = {
  25: 'First real profit. The wand noticed.',
  100: 'One hundred earned. Steady hands.',
  250: 'Quarter thousand. Your line is working.',
  500: 'Five hundred in real profit. Keep the craft.',
  1000: 'A thousand paid. The wand is bright.'
};

const CHECK_ITEMS = [
  {id:'in_line', must:true, label:'It’s in my wet-palette or mini-painting line'},
  {id:'auth_dist', must:true, label:'I’m buying from an authorized distributor with invoices'},
  {id:'brand_ok', must:true, label:'The brand allows resellers and I’m not restricted from it'},
  {id:'no_amazon', must:true, label:'Amazon isn’t selling it on the listing'},
  {id:'fits_capital', must:true, label:'My whole test buy fits my capital'},
  {id:'not_hazmat', must:true, label:'Not hazmat, fragile, or oversized (no paint = usually fine)'},
  {id:'steady_rank', must:false, label:'Steady sales rank (not a one-week spike)'},
  {id:'few_sellers', must:false, label:'Few sellers on the listing'},
  {id:'price_stable', must:false, label:'Price looks stable over ~90 days'},
  {id:'afford_test', must:false, label:'I can afford a small test buy without stress'}
];

function seedEntry(b){ return {id:'seed', type:'seed', amount:b, note:'Starting budget from Dad — $'+b, date:'2026-10-08', createdAt:'2026-10-08T12:00:00'}; }
function startCoach(b){ return 'Start small. One wet palette deal that fits your $'+b+'.'; }
function defaultState(b){
  const B = (b===undefined ? DEFAULT_BUDGET : b);
  return {
    budget:B,
    version:1,
    nicheLine: 'My line: Wet palettes · Miniature painting',
    checklist: Object.fromEntries(CHECK_ITEMS.map(c => [c.id, false])),
    thresholds: {goRoi:30, goNet:3, thinkRoi:15, thinkNet:1.5},
    lumos: true,
    deals: [],
    ledger: [
      seedEntry(B)
    ],
    wandLog: [],
    seenMilestones: [],
    isExample: false,
    coach: startCoach(B)
  };
}

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const s = JSON.parse(raw);
    const d = defaultState(typeof s.budget==='number' ? s.budget : DEFAULT_BUDGET);
    return Object.assign(d, s, {
      thresholds: Object.assign({}, d.thresholds, s.thresholds||{}),
      checklist: Object.assign({}, d.checklist, s.checklist||{})
    });
  }catch(e){ return defaultState(); }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = load();

function money(n){
  const x = Number(n)||0;
  return (x<0?'-':'') + '$' + Math.abs(x).toFixed(2);
}
function pct(n){ return (Number(n)||0).toFixed(1) + '%'; }
function uid(){ return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }
function today(){ const d=new Date(); return d.toISOString().slice(0,10); }

function num(id){ const el=document.getElementById(id); return parseFloat(el && el.value) || 0; }
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'), 2600);
}
function setCoach(msg){
  state.coach = msg;
  document.getElementById('coachText').textContent = msg;
  save();
}

/* ---- Math ---- */
function calcUnit(inputs){
  const buy = +inputs.buyCost||0;
  const sell = +inputs.sellPrice||0;
  const refPct = +inputs.referral||0;
  const fba = +inputs.fbaFee||0;
  const inbound = +inputs.inbound||0;
  const prep = +inputs.prep||0;
  const units = Math.max(0, Math.floor(+inputs.units||0));
  const referralAmt = sell * (refPct/100);
  const capitalPer = buy + inbound + prep;
  const net = sell - referralAmt - fba - buy - inbound - prep;
  const roi = capitalPer > 0 ? (net / capitalPer) * 100 : 0;
  const margin = sell > 0 ? (net / sell) * 100 : 0;
  const totalCapital = capitalPer * units;
  const totalProfit = net * units;
  return {buy,sell,refPct,fba,inbound,prep,units,referralAmt,capitalPer,net,roi,margin,totalCapital,totalProfit};
}

function verdictFor(net, roi, th){
  th = th || state.thresholds;
  if(roi >= th.goRoi && net >= th.goNet) return {level:'go', label:'GO', why:'ROI and net both clear the bar.'};
  if(roi >= th.thinkRoi || net >= th.thinkNet) return {level:'think', label:'THINK', why:'Close — tighter costs or a better price might help.'};
  return {level:'pass', label:'PASS', why:'Numbers don’t support a buy right now.'};
}

/* ---- Capital ---- */
function availableCapital(){
  let cap = 0;
  for(const e of state.ledger){
    if(e.type === 'seed' || e.type === 'funds') cap += (+e.amount||0);
  }
  for(const d of state.deals){
    if(STAGE_ORDER[d.stage] >= STAGE_ORDER.ordered){
      const per = (+d.buyCost||0) + (+d.inbound||0) + (+d.prep||0);
      cap -= per * (+d.units||0);
    }
    cap += (+d.actualPayout||0);
  }
  return cap;
}

function realProfitTotal(){
  let p = 0;
  for(const d of state.deals){
    p += dealRealProfit(d);
  }
  return p;
}
function dealRealProfit(d){
  const payout = +d.actualPayout||0;
  // Only count when a payout was recorded (or sold out with explicit payout, even 0)
  if(payout <= 0 && d.stage !== 'sold_out') return 0;
  const sold = +d.unitsSold||0;
  if(sold <= 0 && payout <= 0) return 0;
  const unitsForCost = sold > 0 ? sold : (+d.units||0);
  const cost = ((+d.buyCost||0) + (+d.inbound||0) + (+d.prep||0)) * unitsForCost;
  return payout - cost;
}
function dealRealRoi(d){
  const sold = +d.unitsSold||0;
  if(sold <= 0) return 0;
  const cost = ((+d.buyCost||0) + (+d.inbound||0) + (+d.prep||0)) * sold;
  if(cost <= 0) return 0;
  return (dealRealProfit(d) / cost) * 100;
}

/* ---- Wand glow ---- */
function glowLevel(profit){
  let level = 0;
  for(let i=0;i<MILESTONES.length;i++){
    if(profit >= MILESTONES[i]) level = i+1;
  }
  // dim slightly only for completed (sold out) losing deals — honest, not mid-flight
  const losses = state.deals.filter(d => d.stage === 'sold_out' && dealRealProfit(d) < -0.01);
  if(losses.length && level > 0) level = Math.max(0, level - 1);
  return level;
}
function updateWand(){
  const profit = realProfitTotal();
  const level = glowLevel(profit);
  const btn = document.getElementById('wandBtn');
  btn.className = 'wand-btn glow-' + level + (state.lumos ? '' : ' nox');
  const widen = widenStatus();
  const star = document.getElementById('wandStar');
  const tip = document.getElementById('wandTip');
  if(widen.ready){
    star.setAttribute('opacity','1');
    tip.setAttribute('opacity','0');
  } else {
    star.setAttribute('opacity','0');
    tip.setAttribute('opacity','1');
  }
  // milestones
  for(const m of MILESTONES){
    if(profit >= m && !state.seenMilestones.includes(m)){
      state.seenMilestones.push(m);
      const note = MILESTONE_NOTES[m];
      state.wandLog.unshift({id:uid(), type:'milestone', amount:m, note, at:new Date().toISOString(), profit});
      setCoach(note);
      spark();
    }
  }
  if(widen.ready && !state.seenMilestones.includes('widen')){
    state.seenMilestones.push('widen');
    const note = "You've earned a second line.";
    state.wandLog.unshift({id:uid(), type:'widen', note, at:new Date().toISOString(), profit});
    setCoach(note);
    spark();
  }
  save();
}
function spark(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const btn = document.getElementById('wandBtn');
  btn.classList.remove('sparking');
  void btn.offsetWidth;
  btn.classList.add('sparking');
  setTimeout(()=>btn.classList.remove('sparking'), 800);
}
function logDealLight(deal, profit){
  if(profit > 0.01){
    state.wandLog.unshift({
      id:uid(), type:'profit', dealId:deal.id, product:deal.product,
      amount:profit, note: deal.product + ' paid real profit: ' + money(profit),
      at:new Date().toISOString()
    });
  } else if(profit < -0.01){
    state.wandLog.unshift({
      id:uid(), type:'loss', dealId:deal.id, product:deal.product,
      amount:profit, note: deal.product + ' lost ' + money(Math.abs(profit)) + '. What will you change next time?',
      at:new Date().toISOString()
    });
    setCoach('A miss. Note one thing to try differently — then keep your line.');
  }
}

/* ---- Widen ---- */
function daysBetween(a,b){
  if(!a||!b) return null;
  const ms = new Date(b) - new Date(a);
  return ms / 86400000;
}
function widenStatus(){
  const sold = state.deals.filter(d => d.stage === 'sold_out');
  const cond1 = sold.length >= 3;
  let avgRoi = 0;
  if(sold.length){
    avgRoi = sold.reduce((s,d)=>s+dealRealRoi(d),0) / sold.length;
  }
  const cond2 = sold.length > 0 && avgRoi >= 30;
  let stUnits = 0, stSold = 0, within60 = true;
  for(const d of sold){
    stUnits += (+d.units||0);
    stSold += (+d.unitsSold||0);
    const days = daysBetween(d.orderedAt, d.soldAt);
    if(days == null || days > 60) within60 = false;
  }
  const sellThrough = stUnits > 0 ? (stSold/stUnits)*100 : 0;
  const cond3 = sold.length > 0 && sellThrough >= 80 && within60;
  const last3 = sold.slice().sort((a,b)=>(b.soldAt||'').localeCompare(a.soldAt||'')).slice(0,3);
  const cond4 = last3.length >= 3 && last3.every(d => dealRealProfit(d) >= -0.009);
  return {
    ready: cond1 && cond2 && cond3 && cond4,
    conds: [
      {ok:cond1, text: 'At least 3 deals sold out (' + sold.length + '/3)'},
      {ok:cond2, text: 'Average real ROI ≥ 30% on them (' + (sold.length?avgRoi.toFixed(1):'—') + '%)'},
      {ok:cond3, text: 'Sell-through ≥ 80% within 60 days (' + (sold.length?sellThrough.toFixed(0)+'%':'—') + (within60?'':' · over 60d') + ')'},
      {ok:cond4, text: 'Zero losing deals in the last 3 sold out'}
    ],
    avgRoi, sellThrough, soldCount: sold.length
  };
}

/* ---- Checklist UI ---- */
function mustsOk(){
  return CHECK_ITEMS.filter(c=>c.must).every(c => state.checklist[c.id]);
}
function renderChecklist(){
  const ul = document.getElementById('checkList');
  ul.innerHTML = CHECK_ITEMS.map(c => {
    const on = !!state.checklist[c.id];
    return '<li class="check-item'+(on?' on':'')+'" data-id="'+c.id+'">' +
      '<input type="checkbox" '+(on?'checked':'')+' tabindex="-1">' +
      '<span class="box" aria-hidden="true">'+(on?'✓':'')+'</span>' +
      '<span class="label">'+c.label+(c.must?'<span class="must">must</span>':'')+'</span></li>';
  }).join('');
  document.getElementById('gateNote').classList.toggle('show', !mustsOk());
  document.getElementById('calcGate').classList.toggle('show', !mustsOk());
}
document.getElementById('checkList').addEventListener('click', e => {
  const item = e.target.closest('.check-item');
  if(!item) return;
  const id = item.dataset.id;
  state.checklist[id] = !state.checklist[id];
  save(); renderChecklist();
});
document.getElementById('resetCheckBtn').addEventListener('click', () => {
  state.checklist = Object.fromEntries(CHECK_ITEMS.map(c => [c.id, false]));
  save(); renderChecklist(); toast('Checklist cleared');
});
document.getElementById('toCalcBtn').addEventListener('click', () => {
  if(!mustsOk()){ document.getElementById('gateNote').classList.add('show'); toast('Check the must-haves first'); return; }
  showTab('calculate');
});

/* ---- Calculate UI ---- */
function readCalcInputs(){
  return {
    buyCost: num('buyCost'), sellPrice: num('sellPrice'), referral: num('referral'),
    fbaFee: num('fbaFee'), inbound: num('inbound'), prep: num('prep'), units: num('units')
  };
}
function renderCalc(){
  const r = calcUnit(readCalcInputs());
  const v = verdictFor(r.net, r.roi);
  const box = document.getElementById('mathBox');
  box.innerHTML =
    '<div class="row"><span>Referral fee / unit</span><span>'+money(r.referralAmt)+'</span></div>' +
    '<div class="row"><span>Your capital / unit (buy + ship + prep)</span><span>'+money(r.capitalPer)+'</span></div>' +
    '<div class="row"><span>Net profit / unit</span><span>'+money(r.net)+'</span></div>' +
    '<div class="row"><span>ROI</span><span>'+pct(r.roi)+'</span></div>' +
    '<div class="row"><span>Margin</span><span>'+pct(r.margin)+'</span></div>' +
    '<div class="row total"><span>Total capital for '+r.units+' units</span><span>'+money(r.totalCapital)+'</span></div>' +
    '<div class="row total"><span>Total profit (if all sell)</span><span>'+money(r.totalProfit)+'</span></div>';
  const ver = document.getElementById('verdict');
  ver.className = 'verdict ' + v.level;
  ver.innerHTML = '<div>'+v.label+'</div><div class="why">'+v.why+'</div>';
  const cap = availableCapital();
  const warn = document.getElementById('capWarn');
  warn.classList.toggle('show', r.totalCapital > cap + 0.001);
}
['buyCost','sellPrice','referral','fbaFee','inbound','prep','units'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderCalc);
});
document.getElementById('saveDealBtn').addEventListener('click', () => {
  if(!mustsOk()){ toast('Check Source must-haves first'); showTab('source'); return; }
  const r = calcUnit(readCalcInputs());
  if(r.units < 1 || r.sell <= 0){ toast('Enter sell price and units'); return; }
  const product = (document.getElementById('productName').value || '').trim() || 'Untitled deal';
  const supplier = (document.getElementById('supplierName').value || '').trim() || '—';
  const deal = {
    id: uid(),
    product, supplier,
    buyCost: r.buy, sellPrice: r.sell, referral: r.refPct, fbaFee: r.fba,
    inbound: r.inbound, prep: r.prep, units: r.units,
    unitsSold: 0, actualPayout: 0,
    stage: 'considering',
    orderedAt: '', soldAt: '',
    createdAt: new Date().toISOString(),
    example: !!state.isExample
  };
  state.deals.unshift(deal);
  save();
  setCoach('Saved. Watch it in Track — move the stage as it moves.');
  toast('Deal saved');
  showTab('track');
  renderAll();
});

/* ---- Track ---- */
function stageLabel(id){ const s=STAGES.find(x=>x.id===id); return s?s.label:id; }
function renderDeals(){
  const el = document.getElementById('dealList');
  if(!state.deals.length){
    el.innerHTML = '<div class="empty">No deals yet. Source a wet palette, then Calculate and save.</div>';
    return;
  }
  el.innerHTML = '';
  state.deals.forEach(d => {
    const art = document.createElement('article');
    art.className = 'deal';
    art.dataset.id = d.id;
    const profit = dealRealProfit(d);
    const profitLine = (+d.actualPayout>0 || +d.unitsSold>0)
      ? '<div>Real profit: <strong>'+money(profit)+'</strong></div>' : '';
    art.innerHTML =
      '<div class="deal-head"><h3></h3><span class="stage-pill"></span></div>' +
      '<div class="deal-meta"></div>' +
      '<div class="deal-actions">' +
        '<button type="button" class="btn btn-sm btn-ghost" data-act="edit">Edit</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-act="next">Next stage</button>' +
      '</div>';
    art.querySelector('h3').textContent = d.product;
    art.querySelector('.stage-pill').textContent = stageLabel(d.stage);
    art.querySelector('.deal-meta').innerHTML =
      '<div>Supplier: '+escapeHtml(d.supplier)+'</div>' +
      '<div>'+d.units+' units · buy '+money(d.buyCost)+' · sell '+money(d.sellPrice)+'</div>' +
      '<div>Sold '+((+d.unitsSold)||0)+' · payout '+money(d.actualPayout)+'</div>' +
      profitLine;
    el.appendChild(art);
  });
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
document.getElementById('dealList').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const art = btn.closest('.deal');
  const deal = state.deals.find(d => d.id === art.dataset.id);
  if(!deal) return;
  if(btn.dataset.act === 'edit') openEdit(deal);
  if(btn.dataset.act === 'next'){
    const i = STAGE_ORDER[deal.stage];
    if(i >= 4){ toast('Already sold out'); return; }
    const next = STAGES[i+1].id;
    advanceStage(deal, next);
  }
});
function advanceStage(deal, next){
  const prev = deal.stage;
  deal.stage = next;
  if(next === 'ordered' && !deal.orderedAt) deal.orderedAt = today();
  if(next === 'sold_out' && !deal.soldAt) deal.soldAt = today();
  if(next === 'sold_out' && !(+deal.unitsSold > 0)) deal.unitsSold = deal.units;
  save();
  if(next === 'sold_out'){
    const p = dealRealProfit(deal);
    logDealLight(deal, p);
  }
  renderAll();
  toast('Moved to ' + stageLabel(next));
}
function openEdit(deal){
  document.getElementById('editId').value = deal.id;
  document.getElementById('editProduct').value = deal.product;
  document.getElementById('editSupplier').value = deal.supplier;
  document.getElementById('editStage').value = deal.stage;
  document.getElementById('editUnits').value = deal.units;
  document.getElementById('editUnitsSold').value = deal.unitsSold||0;
  document.getElementById('editBuy').value = deal.buyCost;
  document.getElementById('editSell').value = deal.sellPrice;
  document.getElementById('editInbound').value = deal.inbound||0;
  document.getElementById('editPrep').value = deal.prep||0;
  document.getElementById('editReferral').value = deal.referral||15;
  document.getElementById('editFba').value = deal.fbaFee||0;
  document.getElementById('editPayout').value = deal.actualPayout||0;
  document.getElementById('editOrderedAt').value = deal.orderedAt||'';
  document.getElementById('editSoldAt').value = deal.soldAt||'';
  openOverlay('dealOverlay');
}
document.getElementById('saveEditBtn').addEventListener('click', () => {
  const id = document.getElementById('editId').value;
  const deal = state.deals.find(d => d.id === id);
  if(!deal) return;
  const prevStage = deal.stage;
  const prevPayout = +deal.actualPayout||0;
  deal.product = document.getElementById('editProduct').value.trim() || deal.product;
  deal.supplier = document.getElementById('editSupplier').value.trim() || '—';
  deal.stage = document.getElementById('editStage').value;
  deal.units = Math.max(1, parseInt(document.getElementById('editUnits').value,10)||1);
  deal.unitsSold = Math.max(0, parseInt(document.getElementById('editUnitsSold').value,10)||0);
  deal.buyCost = parseFloat(document.getElementById('editBuy').value)||0;
  deal.sellPrice = parseFloat(document.getElementById('editSell').value)||0;
  deal.inbound = parseFloat(document.getElementById('editInbound').value)||0;
  deal.prep = parseFloat(document.getElementById('editPrep').value)||0;
  deal.referral = parseFloat(document.getElementById('editReferral').value)||0;
  deal.fbaFee = parseFloat(document.getElementById('editFba').value)||0;
  deal.actualPayout = parseFloat(document.getElementById('editPayout').value)||0;
  deal.orderedAt = document.getElementById('editOrderedAt').value;
  deal.soldAt = document.getElementById('editSoldAt').value;
  if(deal.stage === 'ordered' && !deal.orderedAt) deal.orderedAt = today();
  if(deal.stage === 'sold_out' && !deal.soldAt) deal.soldAt = today();
  save();
  const p = dealRealProfit(deal);
  if(deal.stage === 'sold_out' && (prevStage !== 'sold_out' || Math.abs((+deal.actualPayout)-prevPayout)>0.01)){
    logDealLight(deal, p);
  }
  closeOverlay('dealOverlay');
  renderAll();
  toast('Deal updated');
});
document.getElementById('deleteDealBtn').addEventListener('click', () => {
  if(!confirm('Delete this deal?')) return;
  const id = document.getElementById('editId').value;
  state.deals = state.deals.filter(d => d.id !== id);
  save();
  closeOverlay('dealOverlay');
  renderAll();
  toast('Deal deleted');
});

/* ---- Dashboard ---- */
function renderDashboard(){
  const cap = availableCapital();
  const sold = state.deals.filter(d => d.stage === 'sold_out');
  const unitsSold = state.deals.reduce((s,d)=>s+(+d.unitsSold||0),0);
  const actualProfit = realProfitTotal();
  let avgRoi = 0;
  if(sold.length) avgRoi = sold.reduce((s,d)=>s+dealRealRoi(d),0)/sold.length;
  const orderedUnits = state.deals.filter(d => STAGE_ORDER[d.stage] >= STAGE_ORDER.ordered)
    .reduce((s,d)=>s+(+d.units||0),0);
  const sellThrough = orderedUnits > 0 ? (unitsSold/orderedUnits)*100 : 0;
  const completed = sold.length;

  document.getElementById('statGrid').innerHTML =
    '<div class="stat capital"><div class="k">Available capital</div><div class="v">'+money(cap)+'</div></div>' +
    '<div class="stat"><div class="k">Units sold</div><div class="v">'+unitsSold+'</div></div>' +
    '<div class="stat"><div class="k">Actual profit received</div><div class="v">'+money(actualProfit)+'</div></div>' +
    '<div class="stat"><div class="k">Avg ROI (sold out)</div><div class="v">'+(sold.length?pct(avgRoi):'—')+'</div></div>' +
    '<div class="stat"><div class="k">Sell-through</div><div class="v">'+(orderedUnits?sellThrough.toFixed(0)+'%':'—')+'</div></div>' +
    '<div class="stat"><div class="k">Deals completed</div><div class="v">'+completed+'</div></div>';

  const w = widenStatus();
  const box = document.getElementById('widenBox');
  box.className = 'widen' + (w.ready ? ' ready' : '');
  box.innerHTML = '<h3>'+(w.ready ? "Ready to widen — you've earned a second line." : 'Not yet — keep your one line')+'</h3>' +
    '<ul>' + w.conds.map(c => '<li class="'+(c.ok?'ok':'')+'"><span class="mark">'+(c.ok?'✓':'○')+'</span><span>'+c.text+'</span></li>').join('') + '</ul>';

  const led = document.getElementById('ledgerList');
  // Build display entries: ledger + deal spends/payouts as informational? Spec says ledger list shows each entry — the seed and funds. Deal impacts shown in available capital.
  if(!state.ledger.length){
    led.innerHTML = '<div class="empty">No ledger entries.</div>';
  } else {
    led.innerHTML = state.ledger.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(e => {
      return '<div class="ledger-item"><div><div>'+escapeHtml(e.note)+'</div><div class="meta">'+escapeHtml(e.date||'')+'</div></div>' +
        '<div class="amt pos">+'+money(e.amount)+'</div></div>';
    }).join('');
  }
}

/* ---- Funds ---- */
document.getElementById('addFundsBtn').addEventListener('click', () => {
  document.getElementById('fundAmt').value = '';
  document.getElementById('fundNote').value = '';
  document.getElementById('fundDate').value = today();
  openOverlay('fundsOverlay');
});
document.getElementById('saveFundsBtn').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('fundAmt').value)||0;
  const note = (document.getElementById('fundNote').value||'').trim() || 'Added funds';
  const date = document.getElementById('fundDate').value || today();
  if(amount <= 0){ toast('Enter an amount'); return; }
  state.ledger.push({id:uid(), type:'funds', amount, note, date, createdAt:new Date().toISOString()});
  save();
  closeOverlay('fundsOverlay');
  renderAll();
  setCoach('Capital noted. Spend it on a deal that fits — not on a maybe.');
  toast('Funds added to ledger');
});

/* ---- Example data ---- */
function loadExample(){
  // Clearly labeled sample — not real products/suppliers
  state.isExample = true;
  state.checklist = Object.fromEntries(CHECK_ITEMS.map(c => [c.id, true]));
  state.deals = [
    {
      id:'ex1', product:'Example Wet Palette A (example)', supplier:'Example Distributor Co.',
      buyCost:12, sellPrice:34.99, referral:15, fbaFee:5.40, inbound:1.20, prep:0.50,
      units:10, unitsSold:10, actualPayout:245.00,
      stage:'sold_out', orderedAt:'2026-08-01', soldAt:'2026-09-10',
      createdAt:'2026-08-01T12:00:00', example:true
    },
    {
      id:'ex2', product:'Example Wet Palette Kit B (example)', supplier:'Example Distributor Co.',
      buyCost:14, sellPrice:36.99, referral:15, fbaFee:5.80, inbound:1.40, prep:0.60,
      units:8, unitsSold:8, actualPayout:210.00,
      stage:'sold_out', orderedAt:'2026-08-20', soldAt:'2026-09-25',
      createdAt:'2026-08-20T12:00:00', example:true
    },
    {
      id:'ex3', product:'Example Mini Palette C (example)', supplier:'Sample Wholesale LLC',
      buyCost:11, sellPrice:32.99, referral:15, fbaFee:5.20, inbound:1.10, prep:0.40,
      units:12, unitsSold:12, actualPayout:280.00,
      stage:'sold_out', orderedAt:'2026-09-01', soldAt:'2026-10-01',
      createdAt:'2026-09-01T12:00:00', example:true
    },
    {
      id:'ex4', product:'Example Palette Refill D (example)', supplier:'Sample Wholesale LLC',
      buyCost:6, sellPrice:18.99, referral:15, fbaFee:3.80, inbound:0.80, prep:0.30,
      units:15, unitsSold:4, actualPayout:0,
      stage:'live', orderedAt:'2026-09-20', soldAt:'',
      createdAt:'2026-09-20T12:00:00', example:true
    }
  ];
  // Keep seed; add example birthday funds
  const B = state.budget;
  state.ledger = [
    seedEntry(B),
    {id:'exfund', type:'funds', amount:50, note:'Birthday (example)', date:'2026-09-15', createdAt:'2026-09-15T12:00:00'}
  ];
  state.wandLog = [];
  state.seenMilestones = [];
  // Seed wand log from example profits
  state.deals.filter(d=>d.stage==='sold_out').forEach(d => {
    const p = dealRealProfit(d);
    if(p > 0) state.wandLog.push({id:uid(), type:'profit', dealId:d.id, product:d.product, amount:p,
      note: d.product + ' paid real profit: ' + money(p), at:(d.soldAt||'')+'T12:00:00'});
  });
  state.coach = 'Example data loaded. Practice the flow — then clear it.';
  save();
  renderAll();
  // trigger milestones from example profit
  updateWand();
  toast('Example data loaded');
}
function clearExample(){
  state.deals = state.deals.filter(d => !d.example);
  state.ledger = state.ledger.filter(e => e.id !== 'exfund' && e.type !== 'example');
  // if only examples existed, restore clean
  if(state.isExample){
    state.deals = state.deals.filter(d => !d.example);
    state.isExample = false;
    state.wandLog = state.wandLog.filter(l => !String(l.product||'').includes('(example)'));
    state.seenMilestones = [];
    state.checklist = Object.fromEntries(CHECK_ITEMS.map(c => [c.id, false]));
    state.ledger = [
      seedEntry(state.budget)
    ];
    state.coach = startCoach(state.budget);
  }
  state.isExample = false;
  save();
  renderAll();
  toast('Example cleared');
}
document.getElementById('loadExampleBtn').addEventListener('click', loadExample);
document.getElementById('clearExampleBtn').addEventListener('click', clearExample);
document.getElementById('clearExampleBtn2').addEventListener('click', clearExample);
document.getElementById('resetAllBtn').addEventListener('click', () => {
  if(!confirm('Reset all data? Your $'+state.budget+' starting budget will stay.')) return;
  const niche = state.nicheLine;
  const th = state.thresholds;
  const lumos = state.lumos;
  state = defaultState(state.budget);
  state.nicheLine = niche;
  state.thresholds = th;
  state.lumos = lumos;
  save();
  renderAll();
  toast('Reset — budget kept');
});

/* ---- Settings ---- */
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('budgetAmt').value = state.budget;
  document.getElementById('nicheLine').value = state.nicheLine;
  document.getElementById('goRoi').value = state.thresholds.goRoi;
  document.getElementById('goNet').value = state.thresholds.goNet;
  document.getElementById('thinkRoi').value = state.thresholds.thinkRoi;
  document.getElementById('thinkNet').value = state.thresholds.thinkNet;
  document.getElementById('lumosToggle').checked = !!state.lumos;
  openOverlay('settingsOverlay');
});
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const nb = Math.round((parseFloat(document.getElementById('budgetAmt').value)||0)*100)/100;
  if(nb > 0 && nb !== state.budget){
    const oldCoach = startCoach(state.budget);
    state.budget = nb;
    const s = state.ledger.find(e => e.id === 'seed');
    if(s){ s.amount = nb; s.note = 'Starting budget from Dad — $'+nb; } else { state.ledger.unshift(seedEntry(nb)); }
    if(state.coach === oldCoach) state.coach = startCoach(nb);
  }
  state.nicheLine = document.getElementById('nicheLine').value.trim() || state.nicheLine;
  state.thresholds.goRoi = parseFloat(document.getElementById('goRoi').value)||30;
  state.thresholds.goNet = parseFloat(document.getElementById('goNet').value)||3;
  state.thresholds.thinkRoi = parseFloat(document.getElementById('thinkRoi').value)||15;
  state.thresholds.thinkNet = parseFloat(document.getElementById('thinkNet').value)||1.5;
  state.lumos = document.getElementById('lumosToggle').checked;
  save();
  closeOverlay('settingsOverlay');
  renderAll();
  toast('Settings saved');
});

/* ---- Wand log ---- */
document.getElementById('wandBtn').addEventListener('click', () => {
  const log = document.getElementById('wandLog');
  const profit = realProfitTotal();
  let html = '<div class="log-item"><strong>Real profit lighting the tip: '+money(profit)+'</strong><div class="when">Seed and added funds do not glow.</div></div>';
  if(!state.wandLog.length){
    html += '<div class="log-item">No glow yet. Profit you’ve actually been paid will show up here.</div>';
  } else {
    html += state.wandLog.map(l => {
      const when = (l.at||'').slice(0,10);
      return '<div class="log-item"><div>'+escapeHtml(l.note)+'</div><div class="when">'+escapeHtml(when)+'</div></div>';
    }).join('');
  }
  log.innerHTML = html;
  openOverlay('wandOverlay');
});

/* ---- Tabs ---- */
function showTab(name){
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  document.querySelectorAll('#segNav button, #tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  if(name === 'calculate') renderCalc();
}
document.querySelectorAll('#segNav button, #tabbar button').forEach(b => {
  b.addEventListener('click', () => showTab(b.dataset.tab));
});

/* ---- Overlays ---- */
function openOverlay(id){ document.getElementById(id).classList.add('open'); }
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeOverlay(btn.getAttribute('data-close')));
});
document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if(e.target === ov) ov.classList.remove('open'); });
});

/* ---- Render all ---- */
function renderAll(){
  document.getElementById('nicheChip').textContent = state.nicheLine;
  document.getElementById('coachText').textContent = state.coach;
  document.getElementById('exampleBanner').classList.toggle('on', !!state.isExample);
  renderChecklist();
  renderCalc();
  renderDeals();
  renderDashboard();
  updateWand();
}

// Expose for tests / puppeteer
window.NFSDeals = {
  calcUnit, verdictFor, availableCapital, realProfitTotal, dealRealProfit, glowLevel, widenStatus,
  loadExample, clearExample, getState: () => state, defaultState, MILESTONES
};

renderAll();
})();
