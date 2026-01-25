// Mobile PWA - "like Al-Aseel" workflow for frozen shop
const $ = (id) => document.getElementById(id);
const fmt = (n) => (isFinite(n) ? Number(n).toFixed(2) : '0.00');
const todayISO = () => new Date().toISOString().slice(0,10);
const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2,8)).toUpperCase();

const KEY = 'HAJ_ABU_YASER_DB_V1';

function defaultDB(){
  return {
    meta:{
      version:1,
      createdAt:new Date().toISOString(),
      nextInvoiceNo: 1,   // global serial
      printMode:'A4'
    },
    items:[], // {id,name,buyPrice,sellPrice,alertKg,stock}
    suppliers:[], // {id,name,phone,balance}
    customers:[], // {id,name,phone,balance}
    purchases:[], // invoices
    sales:[],
    adjustments:[],
    paymentsSup:[], // {id,date,supId,amount,note}
    paymentsCus:[]  // {id,date,cusId,amount,note}
  };
}

let db = loadDB();

function loadDB(){
  const raw = localStorage.getItem(KEY);
  if(!raw){ const d = defaultDB(); localStorage.setItem(KEY, JSON.stringify(d)); return d; }
  try{ return JSON.parse(raw); } catch(e){ const d=defaultDB(); localStorage.setItem(KEY, JSON.stringify(d)); return d; }
}
function saveDB(){
  localStorage.setItem(KEY, JSON.stringify(db));
  renderAll();
}

// PWA SW
(function(){
  const status = $('statusPwa');
  if('serviceWorker' in navigator){
    window.addEventListener('load', async ()=>{
      try{
        await navigator.serviceWorker.register('./sw.js');
        status.textContent = 'Offline جاهز بعد أول فتح.';
      }catch(e){
        status.textContent = 'تعذر تفعيل Offline.';
      }
    });
  }else{
    status.textContent = 'المتصفح لا يدعم Offline.';
  }
})();

// Navigation
document.querySelectorAll('.nav').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    openView(btn.dataset.view);
  });
});

function openView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  $('view-'+name).classList.remove('hidden');
  renderAll();
}
openView('dashboard');

// "More" tiles open internal views
document.querySelectorAll('.tile').forEach(t=>{
  t.addEventListener('click', ()=> openView(t.dataset.open));
});

// Back floating buttons
document.querySelectorAll('[data-back]').forEach(b=>{
  b.addEventListener('click', ()=> openView('more'));
});

// Tabs debts
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const key = t.dataset.tab;
    $('tab-debCust').classList.toggle('hidden', key !== 'debCust');
    $('tab-debSupp').classList.toggle('hidden', key !== 'debSupp');
  });
});

// Helpers
function findById(arr, id){ return arr.find(x=>x.id===id); }
function sum(arr, fn){ return arr.reduce((a,x)=>a + (fn?fn(x):x), 0); }
function setOptions(sel, arr, labelFn){
  sel.innerHTML = '';
  const o0 = document.createElement('option');
  o0.value=''; o0.textContent='— اختر —';
  sel.appendChild(o0);
  for(const x of arr){
    const o = document.createElement('option');
    o.value=x.id; o.textContent=labelFn(x);
    sel.appendChild(o);
  }
}
function updateStock(itemId, delta){
  const it = findById(db.items, itemId);
  if(!it) return;
  it.stock = Number(it.stock||0) + Number(delta||0);
}
function stockOf(itemId){
  const it = findById(db.items, itemId);
  return it ? Number(it.stock||0) : 0;
}
function nextInvoiceNo(){
  const n = Number(db.meta.nextInvoiceNo || 1);
  db.meta.nextInvoiceNo = n + 1;
  return n;
}
function makeTable(headers, rows){
  let html = '<table><thead><tr>';
  for(const h of headers) html += `<th>${h}</th>`;
  html += '</tr></thead><tbody>';
  for(const r of rows){
    html += '<tr>' + r.map(c=>`<td>${c}</td>`).join('') + '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

// Dates defaults
$('purDate').value = todayISO();
$('salDate').value = todayISO();
$('adjDate').value = todayISO();
$('repFrom').value = todayISO();
$('repTo').value = todayISO();

// Items
$('btnAddItem').addEventListener('click', ()=>{
  const name = $('itemName').value.trim();
  const buy = Number($('itemBuy').value||0);
  const sell = Number($('itemSell').value||0);
  const alertKg = Number($('itemAlert').value||0);
  if(!name) return alert('اكتب اسم الصنف');
  if(db.items.some(x=>x.name===name)) return alert('هذا الصنف موجود');
  db.items.push({id:uid(), name, buyPrice:buy, sellPrice:sell, alertKg, stock:0});
  $('itemName').value=''; $('itemBuy').value=''; $('itemSell').value=''; $('itemAlert').value='';
  saveDB();
});

// Suppliers
$('btnAddSupplier').addEventListener('click', ()=>{
  const name = $('supName').value.trim();
  if(!name) return alert('اكتب اسم المورد');
  db.suppliers.push({id:uid(), name, phone:$('supPhone').value.trim(), balance:0});
  $('supName').value=''; $('supPhone').value='';
  saveDB();
});

$('btnPaySupplier').addEventListener('click', ()=>{
  const supId = $('paySupId').value;
  const amount = Number($('paySupAmount').value||0);
  if(!supId || amount<=0) return alert('اختر المورد واكتب مبلغ صحيح');
  const s = findById(db.suppliers, supId); if(!s) return;
  s.balance = Number(s.balance||0) - amount;
  db.paymentsSup.push({id:uid(), date:todayISO(), supId, amount, note:$('paySupNote').value.trim()});
  $('paySupAmount').value=''; $('paySupNote').value='';
  saveDB();
});

// Customers
$('btnAddCustomer').addEventListener('click', ()=>{
  const name = $('cusName').value.trim();
  if(!name) return alert('اكتب اسم الزبون/المُصدّر');
  db.customers.push({id:uid(), name, phone:$('cusPhone').value.trim(), balance:0});
  $('cusName').value=''; $('cusPhone').value='';
  saveDB();
});

$('btnPayCustomer').addEventListener('click', ()=>{
  const cusId = $('payCusId').value;
  const amount = Number($('payCusAmount').value||0);
  if(!cusId || amount<=0) return alert('اختر الزبون واكتب مبلغ صحيح');
  const c = findById(db.customers, cusId); if(!c) return;
  c.balance = Number(c.balance||0) - amount;
  db.paymentsCus.push({id:uid(), date:todayISO(), cusId, amount, note:$('payCusNote').value.trim()});
  $('payCusAmount').value=''; $('payCusNote').value='';
  saveDB();
});

// Purchase invoice lines
let purLines = [];
function renderPurLines(){
  $('purTotal').textContent = fmt(sum(purLines, x=>x.total));
  $('purLines').innerHTML = makeTable(['الصنف','كغم','السعر','المجموع',''], purLines.map(l=>[
    l.name, fmt(l.qty), fmt(l.price), fmt(l.total),
    `<button class="btn danger" onclick="purDel('${l.id}')">حذف</button>`
  ]));
}
window.purDel = (id)=>{ purLines = purLines.filter(x=>x.id!==id); renderPurLines(); };

$('btnPurAddLine').addEventListener('click', ()=>{
  const itemId = $('purItem').value;
  const qty = Number($('purQty').value||0);
  const price = Number($('purPrice').value||0);
  if(!itemId || qty<=0) return alert('اختر صنف واكتب كغم صحيح');
  const it = findById(db.items, itemId);
  purLines.push({id:uid(), itemId, name:it?it.name:'', qty, price, total:qty*price});
  $('purQty').value='';
  renderPurLines();
});

$('purItem').addEventListener('change', ()=>{
  const it = findById(db.items, $('purItem').value);
  $('purPrice').value = it ? (it.buyPrice||0) : '';
});

$('btnSavePurchase').addEventListener('click', ()=>{
  const date = $('purDate').value || todayISO();
  const supId = $('purSupplier').value;
  if(!supId) return alert('اختر المورد');
  if(purLines.length===0) return alert('أضف أصناف');
  const total = sum(purLines, x=>x.total);
  const paid = Number($('purPaid').value||0);
  const remaining = Math.max(0, total - paid);
  const invNo = nextInvoiceNo();

  for(const l of purLines) updateStock(l.itemId, l.qty);

  const s = findById(db.suppliers, supId);
  if(s) s.balance = Number(s.balance||0) + remaining;

  db.purchases.push({id:uid(), invNo, date, partyId:supId, note:$('purNote').value.trim(), total, paid, remaining, lines:purLines.map(x=>({...x}))});
  lastPrintable = {type:'purchase', invNo};
  purLines=[]; $('purPaid').value=''; $('purNote').value=''; renderPurLines();
  saveDB();
  alert(`تم حفظ فاتورة شراء رقم ${invNo}`);
});

// Sale invoice lines
let salLines = [];
function renderSalLines(){
  $('salTotal').textContent = fmt(sum(salLines, x=>x.total));
  $('salLines').innerHTML = makeTable(['الصنف','كغم','السعر','المجموع',''], salLines.map(l=>[
    l.name, fmt(l.qty), fmt(l.price), fmt(l.total),
    `<button class="btn danger" onclick="salDel('${l.id}')">حذف</button>`
  ]));
}
window.salDel = (id)=>{ salLines = salLines.filter(x=>x.id!==id); renderSalLines(); };

$('btnSalAddLine').addEventListener('click', ()=>{
  const itemId = $('salItem').value;
  const qty = Number($('salQty').value||0);
  const price = Number($('salPrice').value||0);
  if(!itemId || qty<=0) return alert('اختر صنف واكتب كغم صحيح');
  const available = stockOf(itemId);
  $('salStockHint').textContent = `المتوفر: ${fmt(available)} كغم`;
  if(qty > available) return alert('لا يمكن البيع أكثر من المتوفر.');

  const it = findById(db.items, itemId);
  salLines.push({id:uid(), itemId, name:it?it.name:'', qty, price, total:qty*price});
  $('salQty').value='';
  renderSalLines();
});

$('salItem').addEventListener('change', ()=>{
  const it = findById(db.items, $('salItem').value);
  $('salPrice').value = it ? (it.sellPrice||0) : '';
  if(it) $('salStockHint').textContent = `المتوفر: ${fmt(it.stock||0)} كغم`; else $('salStockHint').textContent='';
});

$('btnSaveSale').addEventListener('click', ()=>{
  const date = $('salDate').value || todayISO();
  const cusId = $('salCustomer').value;
  if(!cusId) return alert('اختر الزبون/المُصدّر');
  if(salLines.length===0) return alert('أضف أصناف');

  for(const l of salLines){
    if(l.qty > stockOf(l.itemId)) return alert(`مخزون غير كافي للصنف: ${l.name}`);
  }

  const total = sum(salLines, x=>x.total);
  const paid = Number($('salPaid').value||0);
  const remaining = Math.max(0, total - paid);
  const invNo = nextInvoiceNo();

  for(const l of salLines) updateStock(l.itemId, -l.qty);

  const c = findById(db.customers, cusId);
  if(c) c.balance = Number(c.balance||0) + remaining;

  db.sales.push({id:uid(), invNo, date, partyId:cusId, note:$('salNote').value.trim(), total, paid, remaining, lines:salLines.map(x=>({...x}))});
  lastPrintable = {type:'sale', invNo};
  salLines=[]; $('salPaid').value=''; $('salNote').value=''; renderSalLines();
  saveDB();
  alert(`تم حفظ فاتورة بيع رقم ${invNo}`);
});

// Adjustments
$('btnAddAdj').addEventListener('click', ()=>{
  const date = $('adjDate').value || todayISO();
  const itemId = $('adjItem').value;
  const delta = Number($('adjDelta').value||0);
  const reason = $('adjReason').value.trim();
  if(!itemId || !delta) return alert('اختر صنف واكتب التعديل');
  if(delta < 0 && (stockOf(itemId)+delta) < 0){
    if(!confirm('سيصبح المخزون سالب. متابعة؟')) return;
  }
  const it = findById(db.items, itemId);
  updateStock(itemId, delta);
  db.adjustments.push({id:uid(), date, itemId, name:it?it.name:'', delta, reason});
  $('adjDelta').value=''; $('adjReason').value='';
  saveDB();
});

// Stock search / low filter
let lowOnly = false;
$('btnLowOnly').addEventListener('click', ()=>{
  lowOnly = !lowOnly;
  $('btnLowOnly').textContent = lowOnly ? 'عرض الكل' : 'الأقل من الحد';
  renderStock();
});
$('stockSearch').addEventListener('input', ()=> renderStock());

// Debts quick jump
function jumpPayCustomer(id){
  openView('customers');
  $('payCusId').value = id;
  $('payCusAmount').focus();
}
function jumpPaySupplier(id){
  openView('suppliers');
  $('paySupId').value = id;
  $('paySupAmount').focus();
}

// Reports
$('btnRunReports').addEventListener('click', ()=> renderReports());
function inRange(date, from, to){ return date >= from && date <= to; }

function renderReports(){
  const from = $('repFrom').value || '0000-01-01';
  const to = $('repTo').value || '9999-12-31';
  const pur = db.purchases.filter(p=>inRange(p.date, from, to));
  const sal = db.sales.filter(s=>inRange(s.date, from, to));
  const purTotal = sum(pur, x=>x.total);
  const salTotal = sum(sal, x=>x.total);

  // profit approx: (sell line price - item buyPrice) * qty
  let profit = 0;
  for(const s of sal){
    for(const l of s.lines){
      const it = findById(db.items, l.itemId);
      const buy = it ? Number(it.buyPrice||0) : 0;
      profit += (Number(l.price||0) - buy) * Number(l.qty||0);
    }
  }
  $('repPurchases').textContent = fmt(purTotal);
  $('repSales').textContent = fmt(salTotal);
  $('repProfit').textContent = fmt(profit);

  // item movement
  const map = new Map();
  const ensure=(id,name)=>{ if(!map.has(id)) map.set(id,{name,inKg:0,outKg:0}); return map.get(id); };
  for(const p of pur) for(const l of p.lines){ const it=findById(db.items,l.itemId); const e=ensure(l.itemId,it?it.name:l.name); e.inKg+=Number(l.qty||0); }
  for(const s of sal) for(const l of s.lines){ const it=findById(db.items,l.itemId); const e=ensure(l.itemId,it?it.name:l.name); e.outKg+=Number(l.qty||0); }
  const rows = Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  $('repItemsMove').innerHTML = makeTable(['الصنف','دخل','طلع'], rows.map(r=>[r.name, fmt(r.inKg), fmt(r.outKg)]));

  // ops
  const ops = [];
  for(const p of pur){ ops.push({date:p.date,type:'شراء',no:p.invNo,party:(findById(db.suppliers,p.partyId)||{}).name||'—',total:p.total}); }
  for(const s of sal){ ops.push({date:s.date,type:'بيع',no:s.invNo,party:(findById(db.customers,s.partyId)||{}).name||'—',total:s.total}); }
  ops.sort((a,b)=>b.date.localeCompare(a.date));
  $('repOps').innerHTML = makeTable(['التاريخ','النوع','رقم','الطرف','القيمة'], ops.map(o=>[o.date,o.type,o.no,o.party,fmt(o.total)]));
}

// Backup / Import
$('btnBackup').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(db,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup-abu-emad-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
});
$('fileImport').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const text = await file.text();
  try{
    const obj = JSON.parse(text);
    if(!obj || !obj.meta || !obj.items || !obj.purchases || !obj.sales) throw new Error('bad');
    if(!confirm('سيتم استبدال البيانات الحالية. متابعة؟')) return;
    db = obj;
    saveDB();
    alert('تم الاستيراد.');
  }catch(err){
    alert('ملف غير صالح.');
  }finally{ e.target.value=''; }
});

// Settings: print mode, wipe, demo
$('printMode').addEventListener('change', ()=>{
  db.meta.printMode = $('printMode').value;
  saveDB();
});

$('btnWipe').addEventListener('click', ()=>{
  if(!confirm('مسح كل البيانات نهائي؟')) return;
  localStorage.removeItem(KEY);
  db = loadDB();
  saveDB();
});

$('btnSeedDemo').addEventListener('click', ()=>{
  if(!confirm('إضافة بيانات تجريبية؟')) return;
  seedDemo();
  saveDB();
  alert('تمت إضافة بيانات تجريبية.');
});

function seedDemo(){
  db.items = [
    {id:uid(), name:'دجاج', buyPrice:22, sellPrice:25, alertKg:20, stock:0},
    {id:uid(), name:'لحمة', buyPrice:55, sellPrice:62, alertKg:10, stock:0},
    {id:uid(), name:'سمك', buyPrice:35, sellPrice:42, alertKg:15, stock:0}
  ];
  db.suppliers = [
    {id:uid(), name:'مورد 1', phone:'', balance:0},
    {id:uid(), name:'مورد 2', phone:'', balance:0}
  ];
  db.customers = [
    {id:uid(), name:'زبون 1', phone:'', balance:0},
    {id:uid(), name:'مُصدّر 1', phone:'', balance:0}
  ];
  db.purchases = []; db.sales = []; db.adjustments=[]; db.paymentsSup=[]; db.paymentsCus=[];
  db.meta.nextInvoiceNo = 1;
}

// Printing
let lastPrintable = null;

function buildPrintHTML(inv, kind){
  const mode = db.meta.printMode || 'A4';
  const cls = mode === '80' ? 'print-80' : 'print-a4';
  const party = kind==='purchase'
    ? (findById(db.suppliers, inv.partyId)||{}).name || '—'
    : (findById(db.customers, inv.partyId)||{}).name || '—';

  const lines = inv.lines.map(l=>`
    <tr>
      <td>${l.name}</td>
      <td>${fmt(l.qty)}</td>
      <td>${fmt(l.price)}</td>
      <td>${fmt(l.total)}</td>
    </tr>
  `).join('');

  return `
  <div class="${cls}">
    <div class="print-header">
      <div>
        <div class="print-title">محلات الحاج أبو ياسر زعرب وأولاده</div>
        <div class="print-sub">( أبو عماد )</div>
      </div>
      <div class="print-meta">
        <div><strong>${kind==='purchase'?'فاتورة شراء':'فاتورة بيع'}</strong></div>
        <div>رقم: ${inv.invNo}</div>
        <div>تاريخ: ${inv.date}</div>
      </div>
    </div>
    <div class="print-meta">
      <div>الطرف: ${party}</div>
      ${inv.note?`<div>ملاحظة: ${inv.note}</div>`:''}
    </div>
    <div class="print-lines">
      <table>
        <thead><tr><th>الصنف</th><th>كغم</th><th>السعر</th><th>المجموع</th></tr></thead>
        <tbody>${lines}</tbody>
      </table>
    </div>
    <div class="print-total">
      الإجمالي: ${fmt(inv.total)}<br>
      المدفوع: ${fmt(inv.paid)}<br>
      المتبقي: ${fmt(inv.remaining)}
    </div>
  </div>`;
}

function printInvoice(kind, invNo){
  const inv = (kind==='purchase' ? db.purchases : db.sales).find(x=>x.invNo===invNo);
  if(!inv) return alert('لا يوجد فاتورة للطباعة.');
  const area = $('printArea');
  area.innerHTML = buildPrintHTML(inv, kind);
  area.classList.remove('hidden');
  window.print();
  setTimeout(()=>{ area.classList.add('hidden'); }, 400);
}

$('btnPrintPurchase').addEventListener('click', ()=>{
  const invNo = lastPrintable && lastPrintable.type==='purchase' ? lastPrintable.invNo : null;
  if(!invNo) return alert('احفظ فاتورة الشراء أولاً ثم اطبع.');
  printInvoice('purchase', invNo);
});
$('btnPrintSale').addEventListener('click', ()=>{
  const invNo = lastPrintable && lastPrintable.type==='sale' ? lastPrintable.invNo : null;
  if(!invNo) return alert('احفظ فاتورة البيع أولاً ثم اطبع.');
  printInvoice('sale', invNo);
});

// Rendering
function renderItems(){
  $('itemsTable').innerHTML = makeTable(
    ['الصنف','شراء/كغم','بيع/كغم','المخزون','حد','حالة'],
    db.items.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(it=>[
      it.name,
      fmt(it.buyPrice||0),
      fmt(it.sellPrice||0),
      fmt(it.stock||0),
      fmt(it.alertKg||0),
      (Number(it.alertKg||0)>0 && Number(it.stock||0)<=Number(it.alertKg||0)) ? '<span class="badge danger">منخفض</span>' : '<span class="badge">طبيعي</span>'
    ])
  );
}

function renderParties(){
  // suppliers/customers tables
  $('suppliersTable').innerHTML = makeTable(
    ['المورد','جوال','الرصيد'],
    db.suppliers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(s=>[s.name, s.phone||'—', fmt(s.balance||0)])
  );
  $('customersTable').innerHTML = makeTable(
    ['الزبون/المُصدّر','جوال','الرصيد'],
    db.customers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(c=>[c.name, c.phone||'—', fmt(c.balance||0)])
  );

  setOptions($('purSupplier'), db.suppliers, x=>x.name);
  setOptions($('paySupId'), db.suppliers, x=>x.name);

  setOptions($('salCustomer'), db.customers, x=>x.name);
  setOptions($('payCusId'), db.customers, x=>x.name);
}

function renderDropdowns(){
  setOptions($('purItem'), db.items, x=>x.name);
  setOptions($('salItem'), db.items, x=>x.name);
  setOptions($('adjItem'), db.items, x=>x.name);
  // default price if selected
  const pit = findById(db.items, $('purItem').value);
  $('purPrice').value = pit ? (pit.buyPrice||0) : '';
  const sit = findById(db.items, $('salItem').value);
  $('salPrice').value = sit ? (sit.sellPrice||0) : '';
}

function renderStock(){
  const q = ($('stockSearch').value||'').trim();
  let items = db.items.slice();
  if(q) items = items.filter(it=>it.name.includes(q));
  if(lowOnly) items = items.filter(it=>Number(it.alertKg||0)>0 && Number(it.stock||0)<=Number(it.alertKg||0));
  items.sort((a,b)=>a.name.localeCompare(b.name,'ar'));

  $('stockTable').innerHTML = makeTable(
    ['الصنف','الكميّة (كغم)','حالة'],
    items.map(it=>[
      it.name,
      fmt(it.stock||0),
      (Number(it.alertKg||0)>0 && Number(it.stock||0)<=Number(it.alertKg||0)) ? '<span class="badge danger">منخفض</span>' : '<span class="badge">طبيعي</span>'
    ])
  );

  const adj = db.adjustments.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,50)
    .map(a=>[a.date, a.name, (a.delta>=0?'+':'')+fmt(a.delta), a.reason||'—']);
  $('adjTable').innerHTML = makeTable(['التاريخ','الصنف','التعديل','السبب'], adj);
}

function renderDebts(){
  const cust = db.customers.filter(c=>Number(c.balance||0)>0).sort((a,b)=>Number(b.balance||0)-Number(a.balance||0));
  const sup = db.suppliers.filter(s=>Number(s.balance||0)>0).sort((a,b)=>Number(b.balance||0)-Number(a.balance||0));

  $('tab-debCust').innerHTML = makeTable(['الزبون','الدين'], cust.map(c=>[c.name, fmt(c.balance||0)]));
  $('tab-debSupp').innerHTML = makeTable(['المورد','الدين'], sup.map(s=>[s.name, fmt(s.balance||0)]));
}

function renderDashboard(){
  const totalKg = sum(db.items, it=>Number(it.stock||0));
  const custDebt = sum(db.customers, c=>Math.max(0, Number(c.balance||0)));
  const suppDebt = sum(db.suppliers, s=>Math.max(0, Number(s.balance||0)));
  $('dashTotalKg').textContent = fmt(totalKg);
  $('dashCustDebt').textContent = fmt(custDebt);
  $('dashSuppDebt').textContent = fmt(suppDebt);

  // today profit from today's sales
  const td = todayISO();
  let profit = 0;
  for(const s of db.sales.filter(x=>x.date===td)){
    for(const l of s.lines){
      const it = findById(db.items, l.itemId);
      const buy = it ? Number(it.buyPrice||0) : 0;
      profit += (Number(l.price||0) - buy) * Number(l.qty||0);
    }
  }
  $('dashProfitToday').textContent = fmt(profit);

  const low = db.items.filter(it=>Number(it.alertKg||0)>0 && Number(it.stock||0)<=Number(it.alertKg||0))
    .sort((a,b)=>Number(a.stock||0)-Number(b.stock||0))
    .map(it=>[it.name, fmt(it.stock||0), fmt(it.alertKg||0), '<span class="badge danger">منخفض</span>']);
  $('dashLowStock').innerHTML = makeTable(['الصنف','المخزون','الحد','الحالة'], low.length?low:[['—','—','—','—']]);

  const ops = [];
  for(const p of db.purchases) ops.push({date:p.date,type:'شراء',no:p.invNo,total:p.total});
  for(const s of db.sales) ops.push({date:s.date,type:'بيع',no:s.invNo,total:s.total});
  ops.sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.no - a.no));
  const last = ops.slice(0,10).map(o=>[o.date,o.type,o.no,fmt(o.total)]);
  $('dashRecent').innerHTML = makeTable(['التاريخ','النوع','رقم','القيمة'], last.length?last:[['—','—','—','—']]);

  // settings reflect
  $('printMode').value = db.meta.printMode || 'A4';
}

function renderAll(){
  renderDropdowns();
  renderItems();
  renderParties();
  renderStock();
  renderDebts();
  renderDashboard();
  renderReports();
}
renderAll();
