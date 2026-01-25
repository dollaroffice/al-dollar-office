
/* محلات الحاج أبو ياسر زعرب وأولاده – أبو عماد
   برنامج إدارة مخزون + شراء/بيع + فواتير + تقارير
   تخزين محلي: LocalStorage
*/

const $ = (id) => document.getElementById(id);

const STORE_KEY = "abuYaserApp_v1";
const DEFAULTS = {
  settings: {
    shopName: document.title,
    startSerial: 1,
    invoiceFooter: "شكراً لزيارتكم",
    lowStockThreshold: 5
  },
  items: [],       // {id,name,unit,buyPrice,sellPrice,qty,notes,createdAt}
  movements: [],   // {id,type: 'buy'|'sell', itemId, qty, unitPrice, party, notes, at, total}
  invoices: [],    // {id, serial, at, customer, lines:[{itemId,name,qty,unitPrice,total}], subTotal, discount, grandTotal, notes}
  serialCounter: 0 // next serial = settings.startSerial + serialCounter
};

function uid(prefix="id"){
  return prefix + "_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function loadDB(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return structuredClone(DEFAULTS);
    const db = JSON.parse(raw);
    // migrate / ensure defaults
    return {
      ...structuredClone(DEFAULTS),
      ...db,
      settings: { ...structuredClone(DEFAULTS.settings), ...(db.settings || {}) }
    };
  }catch(e){
    console.warn("DB load error", e);
    return structuredClone(DEFAULTS);
  }
}
function saveDB(){
  localStorage.setItem(STORE_KEY, JSON.stringify(DB));
}
let DB = loadDB();

function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=>t.classList.remove("show"), 2200);
}

function fmtMoney(n){
  const x = Number(n||0);
  return x.toFixed(2);
}
function fmtDateTime(iso){
  const d = new Date(iso);
  return d.toLocaleString("ar", { hour12: true });
}
function todayISODate(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function setClock(){
  const now = new Date();
  $("clock").textContent = now.toLocaleString("ar", { weekday:"long", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}
setClock();
setInterval(setClock, 30000);

/* Tabs */
const tabBtns = Array.from(document.querySelectorAll(".tab"));
tabBtns.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    tabBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    $("view-"+view).classList.add("active");
    refreshAll();
  });
});

/* Settings modal */
const modal = $("settingsModal");
$("openSettings").addEventListener("click", ()=>openSettings(true));
$("closeSettings").addEventListener("click", ()=>openSettings(false));
modal.addEventListener("click", (e)=>{ if(e.target === modal) openSettings(false); });

function openSettings(open){
  if(open){
    $("shopNameInput").value = DB.settings.shopName || document.title;
    $("startSerial").value = DB.settings.startSerial ?? 1;
    $("invoiceFooter").value = DB.settings.invoiceFooter ?? "";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }else{
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
}

$("saveSettings").addEventListener("click", ()=>{
  DB.settings.shopName = $("shopNameInput").value.trim() || document.title;
  DB.settings.startSerial = Math.max(1, parseInt($("startSerial").value || "1", 10));
  DB.settings.invoiceFooter = $("invoiceFooter").value.trim() || "";
  saveDB();
  toast("تم حفظ الإعدادات");
  openSettings(false);
  refreshAll();
});

$("resetAll").addEventListener("click", ()=>{
  const ok = confirm("هل أنت متأكد؟ سيتم حذف كل البيانات من الجهاز.");
  if(!ok) return;
  localStorage.removeItem(STORE_KEY);
  DB = loadDB();
  saveDB();
  toast("تم مسح البيانات");
  openSettings(false);
  refreshAll();
});

/* Low stock threshold */
$("lowStockThreshold").value = DB.settings.lowStockThreshold ?? 5;
$("saveThreshold").addEventListener("click", ()=>{
  DB.settings.lowStockThreshold = Math.max(0, parseInt($("lowStockThreshold").value || "0", 10));
  saveDB();
  toast("تم حفظ حد التنبيه");
  refreshAll();
});

/* Items CRUD */
function upsertItem(item){
  const idx = DB.items.findIndex(x=>x.id===item.id);
  if(idx>=0) DB.items[idx] = item;
  else DB.items.unshift(item);
  saveDB();
}
function findItem(id){ return DB.items.find(x=>x.id===id); }

$("itemForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const id = $("itemId").value || uid("item");
  const existing = findItem(id);
  const qty = Math.max(0, parseInt($("itemQty").value || "0", 10));
  const item = {
    id,
    name: $("itemName").value.trim(),
    unit: $("itemUnit").value.trim(),
    buyPrice: Number($("itemBuyPrice").value || 0),
    sellPrice: Number($("itemSellPrice").value || 0),
    qty: qty,
    notes: $("itemNotes").value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if(!item.name){ toast("اكتب اسم الصنف"); return; }
  upsertItem(item);
  toast(existing ? "تم تحديث الصنف" : "تم إضافة الصنف");
  resetItemForm();
  refreshAll();
});

function resetItemForm(){
  $("itemId").value = "";
  $("itemName").value = "";
  $("itemUnit").value = "";
  $("itemBuyPrice").value = "";
  $("itemSellPrice").value = "";
  $("itemQty").value = "";
  $("itemNotes").value = "";
}
$("resetItemForm").addEventListener("click", resetItemForm);

$("itemsSearch").addEventListener("input", ()=>renderItemsTable());
$("quickSearchBtn").addEventListener("click", ()=>quickSearch());
$("quickSearch").addEventListener("keydown", (e)=>{ if(e.key==="Enter") quickSearch(); });

function quickSearch(){
  const q = $("quickSearch").value.trim();
  const results = DB.items.filter(i=>i.name.includes(q)).slice(0, 8);
  const box = $("quickResults");
  box.innerHTML = "";
  if(!q){ box.innerHTML = `<div class="hint">اكتب كلمة للبحث.</div>`; return; }
  if(results.length===0){ box.innerHTML = `<div class="hint">لا يوجد نتائج.</div>`; return; }
  results.forEach(i=>{
    const badge = (i.qty <= (DB.settings.lowStockThreshold||0)) ? `<span class="badge low">منخفض</span>` : `<span class="badge ok">جيد</span>`;
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div><strong>${escapeHtml(i.name)}</strong> <span class="meta">(${escapeHtml(i.unit||"")})</span></div>
                    <div>${badge} <span class="meta">الكمية: ${i.qty}</span></div>`;
    box.appendChild(el);
  });
}

/* Export/Import */
$("exportData").addEventListener("click", ()=>{
  const payload = JSON.stringify(DB, null, 2);
  const blob = new Blob([payload], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "backup_abu_yaser.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("تم تصدير ملف النسخة الاحتياطية");
});

$("importData").addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    // basic validation
    if(!data || typeof data !== "object") throw new Error("Invalid");
    DB = {
      ...structuredClone(DEFAULTS),
      ...data,
      settings: { ...structuredClone(DEFAULTS.settings), ...(data.settings || {}) }
    };
    saveDB();
    toast("تم الاستيراد بنجاح");
    refreshAll();
  }catch(err){
    console.error(err);
    toast("فشل الاستيراد: ملف غير صالح");
  }finally{
    e.target.value = "";
  }
});

/* Purchases */
$("buyForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const itemId = $("buyItem").value;
  const qty = Math.max(1, parseInt($("buyQty").value || "1", 10));
  const item = findItem(itemId);
  if(!item){ toast("اختر صنف"); return; }

  const unitPrice = Number($("buyUnitPrice").value || item.buyPrice || 0);
  const supplier = $("buySupplier").value.trim();
  const notes = $("buyNotes").value.trim();

  item.qty = Number(item.qty||0) + qty;
  if(unitPrice>0) item.buyPrice = unitPrice;
  item.updatedAt = new Date().toISOString();
  upsertItem(item);

  const mv = {
    id: uid("mv"),
    type: "buy",
    itemId,
    qty,
    unitPrice,
    party: supplier,
    notes,
    at: new Date().toISOString(),
    total: unitPrice * qty
  };
  DB.movements.unshift(mv);
  saveDB();
  toast("تم تسجيل الشراء");
  $("buyForm").reset();
  refreshAll();
});
$("buyReset").addEventListener("click", ()=>$("buyForm").reset());

/* Sales + Invoice */
$("sellForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const itemId = $("sellItem").value;
  const qty = Math.max(1, parseInt($("sellQty").value || "1", 10));
  const item = findItem(itemId);
  if(!item){ toast("اختر صنف"); return; }

  if(Number(item.qty||0) < qty){
    toast("الكمية غير كافية في المخزون");
    return;
  }

  const unitPrice = Number($("sellUnitPrice").value || item.sellPrice || 0);
  const customer = $("sellCustomer").value.trim();
  const discount = Number($("sellDiscount").value || 0);
  const notes = $("sellNotes").value.trim();

  // update stock
  item.qty = Number(item.qty||0) - qty;
  if(unitPrice>0) item.sellPrice = unitPrice;
  item.updatedAt = new Date().toISOString();
  upsertItem(item);

  // movement
  const mv = {
    id: uid("mv"),
    type: "sell",
    itemId,
    qty,
    unitPrice,
    party: customer,
    notes,
    at: new Date().toISOString(),
    total: unitPrice * qty
  };
  DB.movements.unshift(mv);

  // invoice serial
  const serial = (DB.settings.startSerial || 1) + (DB.serialCounter || 0);
  DB.serialCounter = (DB.serialCounter || 0) + 1;

  const lineTotal = unitPrice * qty;
  const subTotal = lineTotal;
  const grandTotal = Math.max(0, subTotal - discount);

  const invoice = {
    id: uid("inv"),
    serial,
    at: new Date().toISOString(),
    customer,
    lines: [{
      itemId,
      name: item.name,
      qty,
      unitPrice,
      total: lineTotal
    }],
    subTotal,
    discount,
    grandTotal,
    notes
  };
  DB.invoices.unshift(invoice);

  saveDB();
  toast("تم حفظ البيع وإنشاء فاتورة");
  $("sellForm").reset();
  // show invoice preview immediately
  showInvoice(invoice.id);
  // switch to invoices tab
  document.querySelector('.tab[data-view="invoices"]').click();
  refreshAll();
});
$("sellReset").addEventListener("click", ()=>$("sellForm").reset());

/* Invoice UI */
$("invoiceSearch").addEventListener("input", ()=>renderInvoicesTable());
$("printLastInvoice").addEventListener("click", ()=>{
  const inv = DB.invoices[0];
  if(!inv){ toast("لا توجد فواتير"); return; }
  showInvoice(inv.id);
  setTimeout(()=>window.print(), 250);
});

$("closeInvoicePreview").addEventListener("click", ()=>{
  $("invoicePreviewPanel").style.display = "none";
});

$("printInvoiceBtn").addEventListener("click", ()=>window.print());

function showInvoice(id){
  const inv = DB.invoices.find(x=>x.id===id);
  if(!inv){ toast("فاتورة غير موجودة"); return; }
  $("invoicePreviewPanel").style.display = "block";
  $("invoicePreview").innerHTML = invoiceHTML(inv);
}

function invoiceHTML(inv){
  const shop = escapeHtml(DB.settings.shopName || document.title);
  const footer = escapeHtml(DB.settings.invoiceFooter || "");
  const dt = fmtDateTime(inv.at);
  const cust = escapeHtml(inv.customer || "-");
  const notes = escapeHtml(inv.notes || "");
  const rows = inv.lines.map(l=>`
    <tr>
      <td>${escapeHtml(l.name)}</td>
      <td>${l.qty}</td>
      <td>${fmtMoney(l.unitPrice)}</td>
      <td>${fmtMoney(l.total)}</td>
    </tr>
  `).join("");
  return `
    <h2>${shop}</h2>
    <div class="muted">فاتورة رقم: <strong>${inv.serial}</strong> — بتاريخ: ${dt}</div>
    <div class="muted">الزبون: <strong>${cust}</strong></div>

    <table>
      <thead>
        <tr>
          <th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div>
        <div class="line"><span>المجموع</span><strong>${fmtMoney(inv.subTotal)}</strong></div>
        <div class="line"><span>الخصم</span><strong>${fmtMoney(inv.discount)}</strong></div>
        <div class="line"><span>الإجمالي النهائي</span><strong>${fmtMoney(inv.grandTotal)}</strong></div>
      </div>
    </div>

    ${notes ? `<div class="muted" style="margin-top:10px;">ملاحظات: ${notes}</div>` : ""}

    ${footer ? `<div class="muted" style="margin-top:16px; text-align:center;">${footer}</div>` : ""}
  `;
}

/* Reports */
$("reportDate").value = todayISODate();
$("runDailyReport").addEventListener("click", ()=>renderDailyReport());
$("printReport").addEventListener("click", ()=>{
  // simple print: open new window with report HTML
  const html = `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>تقرير يومي</title>
        <style>
          body{ font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif; padding:16px; }
          h2{ margin:0 0 10px; }
          table{ width:100%; border-collapse:collapse; margin-top:10px; }
          th,td{ border-bottom:1px solid #e5e7eb; padding:8px; text-align:right; }
          .muted{ color:#6b7280; }
        </style>
      </head>
      <body>
        <h2>${escapeHtml(DB.settings.shopName || document.title)}</h2>
        <div class="muted">تقرير يومي — ${escapeHtml($("reportDate").value || "")}</div>
        ${$("dailyReport").innerHTML}
      </body>
    </html>
  `;
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=>w.print(), 250);
});

function renderDailyReport(){
  const date = $("reportDate").value || todayISODate();
  const start = new Date(date + "T00:00:00");
  const end = new Date(date + "T23:59:59");

  const movements = DB.movements.filter(m=>{
    const t = new Date(m.at);
    return t>=start && t<=end;
  });

  const buys = movements.filter(m=>m.type==="buy");
  const sells = movements.filter(m=>m.type==="sell");
  const totalBuy = buys.reduce((a,b)=>a+(Number(b.total)||0),0);
  const totalSell = sells.reduce((a,b)=>a+(Number(b.total)||0),0);

  const rows = movements.slice(0, 200).map(m=>{
    const item = findItem(m.itemId);
    const name = item?.name || "(محذوف)";
    const type = m.type==="buy" ? "شراء" : "بيع";
    return `
      <tr>
        <td>${escapeHtml(type)}</td>
        <td>${escapeHtml(name)}</td>
        <td>${m.qty}</td>
        <td>${fmtMoney(m.unitPrice)}</td>
        <td>${fmtMoney(m.total)}</td>
        <td>${escapeHtml(m.party||"-")}</td>
        <td>${fmtDateTime(m.at)}</td>
      </tr>
    `;
  }).join("");

  $("dailyReport").innerHTML = `
    <div class="row wrap" style="justify-content:space-between; margin-bottom:10px;">
      <span class="badge">إجمالي شراء: ${fmtMoney(totalBuy)}</span>
      <span class="badge">إجمالي بيع: ${fmtMoney(totalSell)}</span>
      <span class="badge">عدد الحركات: ${movements.length}</span>
    </div>

    <div style="overflow:auto;">
      <table style="min-width: 900px; width:100%; border-collapse:collapse;">
        <thead>
          <tr style="color:#6b7280;">
            <th>النوع</th><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th><th>الطرف</th><th>الوقت</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="7" class="muted">لا توجد حركات في هذا اليوم.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

/* Rendering */
function escapeHtml(s){
  return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function renderItemsTable(){
  const q = ($("itemsSearch").value || "").trim();
  const items = DB.items.filter(i => !q || i.name.includes(q));
  const rows = items.map(i=>{
    const badge = (i.qty <= (DB.settings.lowStockThreshold||0)) ? `<span class="badge low">منخفض</span>` : `<span class="badge ok">جيد</span>`;
    return `
      <tr>
        <td>${escapeHtml(i.name)}</td>
        <td>${escapeHtml(i.unit||"")}</td>
        <td>${fmtMoney(i.buyPrice||0)}</td>
        <td>${fmtMoney(i.sellPrice||0)}</td>
        <td>${i.qty}</td>
        <td>${badge}</td>
        <td>
          <button class="btn ghost" data-act="edit" data-id="${i.id}">تعديل</button>
          <button class="btn danger" data-act="del" data-id="${i.id}">حذف</button>
        </td>
      </tr>
    `;
  }).join("");

  $("itemsList").innerHTML = `
    <div class="table">
      <table>
        <thead>
          <tr>
            <th>اسم الصنف</th><th>الوحدة</th><th>سعر الشراء</th><th>سعر البيع</th><th>الكمية</th><th>الحالة</th><th>إجراء</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="7" class="muted">لا توجد أصناف.</td></tr>`}</tbody>
      </table>
    </div>
  `;

  // actions
  $("itemsList").querySelectorAll("button[data-act]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      if(act==="edit"){
        const it = findItem(id);
        if(!it) return;
        $("itemId").value = it.id;
        $("itemName").value = it.name || "";
        $("itemUnit").value = it.unit || "";
        $("itemBuyPrice").value = it.buyPrice ?? "";
        $("itemSellPrice").value = it.sellPrice ?? "";
        $("itemQty").value = it.qty ?? 0;
        $("itemNotes").value = it.notes || "";
        toast("تم تحميل الصنف للتعديل");
        document.querySelector('.tab[data-view="items"]').click();
      }
      if(act==="del"){
        const ok = confirm("حذف الصنف؟ سيتم حذف الفواتير والحركات المرتبطة به أيضاً.");
        if(!ok) return;
        DB.items = DB.items.filter(x=>x.id!==id);
        DB.movements = DB.movements.filter(m=>m.itemId!==id);
        DB.invoices = DB.invoices.filter(inv => inv.lines.every(l => l.itemId !== id));
        saveDB();
        toast("تم الحذف");
        refreshAll();
      }
    });
  });
}

function renderMovementTables(){
  const buys = DB.movements.filter(m=>m.type==="buy").slice(0, 50);
  const sells = DB.movements.filter(m=>m.type==="sell").slice(0, 50);

  $("buyLog").innerHTML = movementTableHTML(buys, "شراء");
  $("sellLog").innerHTML = movementTableHTML(sells, "بيع");
}

function movementTableHTML(arr, title){
  const rows = arr.map(m=>{
    const item = findItem(m.itemId);
    return `
      <tr>
        <td>${escapeHtml(item?.name || "(محذوف)")}</td>
        <td>${m.qty}</td>
        <td>${fmtMoney(m.unitPrice)}</td>
        <td>${fmtMoney(m.total)}</td>
        <td>${escapeHtml(m.party||"-")}</td>
        <td>${fmtDateTime(m.at)}</td>
      </tr>
    `;
  }).join("");
  return `
    <div class="table">
      <table>
        <thead>
          <tr>
            <th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th><th>${title==="شراء"?"المورّد":"الزبون"}</th><th>الوقت</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="6" class="muted">لا يوجد.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderInvoicesTable(){
  const q = ($("invoiceSearch").value || "").trim();
  const invoices = DB.invoices.filter(inv=>{
    if(!q) return true;
    return String(inv.serial).includes(q) || (inv.customer||"").includes(q);
  });
  const rows = invoices.map(inv=>{
    return `
      <tr>
        <td>${inv.serial}</td>
        <td>${fmtDateTime(inv.at)}</td>
        <td>${escapeHtml(inv.customer||"-")}</td>
        <td>${fmtMoney(inv.grandTotal)}</td>
        <td>
          <button class="btn ghost" data-inv="${inv.id}">عرض/طباعة</button>
        </td>
      </tr>
    `;
  }).join("");
  $("invoiceList").innerHTML = `
    <div class="table">
      <table>
        <thead>
          <tr><th>رقم</th><th>التاريخ</th><th>الزبون</th><th>الإجمالي</th><th>إجراء</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="5" class="muted">لا توجد فواتير.</td></tr>`}</tbody>
      </table>
    </div>
  `;

  $("invoiceList").querySelectorAll("button[data-inv]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      showInvoice(btn.dataset.inv);
      setTimeout(()=>window.scrollTo({top:0, behavior:"smooth"}), 50);
    });
  });
}

function renderSelectOptions(){
  const items = DB.items.slice().sort((a,b)=>a.name.localeCompare(b.name, "ar"));
  const opt = (i)=>`<option value="${i.id}">${escapeHtml(i.name)} — (المخزون: ${i.qty})</option>`;
  $("buyItem").innerHTML = items.map(opt).join("") || `<option value="">لا يوجد أصناف</option>`;
  $("sellItem").innerHTML = items.map(opt).join("") || `<option value="">لا يوجد أصناف</option>`;

  // auto-fill unit price when choose
  $("buyItem").onchange = ()=>{
    const it = findItem($("buyItem").value);
    $("buyUnitPrice").value = it?.buyPrice ?? "";
  };
  $("sellItem").onchange = ()=>{
    const it = findItem($("sellItem").value);
    $("sellUnitPrice").value = it?.sellPrice ?? "";
  };
}

function renderKPI(){
  $("kpiItems").textContent = DB.items.length;
  $("kpiQty").textContent = DB.items.reduce((a,b)=>a + Number(b.qty||0), 0);
  const today = todayISODate();
  const todayCount = DB.invoices.filter(inv => (new Date(inv.at)).toISOString().slice(0,10) === today).length;
  $("kpiTodayInvoices").textContent = todayCount;
}

function renderLowStock(){
  const th = DB.settings.lowStockThreshold || 0;
  const low = DB.items.filter(i => Number(i.qty||0) <= th);
  const box = $("lowStockList");
  box.innerHTML = "";
  if(low.length===0){
    box.innerHTML = `<div class="hint">لا يوجد أصناف منخفضة حسب الحد الحالي.</div>`;
    return;
  }
  low.slice(0, 30).forEach(i=>{
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div><strong>${escapeHtml(i.name)}</strong> <span class="meta">(${escapeHtml(i.unit||"")})</span></div>
                    <div><span class="badge low">منخفض</span> <span class="meta">الكمية: ${i.qty}</span></div>`;
    box.appendChild(el);
  });
}

function renderStockSummary(){
  const rows = DB.items.slice().sort((a,b)=>a.name.localeCompare(b.name, "ar")).map(i=>{
    const badge = (i.qty <= (DB.settings.lowStockThreshold||0)) ? `<span class="badge low">منخفض</span>` : `<span class="badge ok">جيد</span>`;
    return `
      <tr>
        <td>${escapeHtml(i.name)}</td>
        <td>${i.qty}</td>
        <td>${escapeHtml(i.unit||"")}</td>
        <td>${fmtMoney(i.buyPrice||0)}</td>
        <td>${fmtMoney(i.sellPrice||0)}</td>
        <td>${badge}</td>
      </tr>
    `;
  }).join("");

  $("stockSummary").innerHTML = `
    <div class="table">
      <table>
        <thead>
          <tr><th>الصنف</th><th>الكمية</th><th>الوحدة</th><th>سعر الشراء</th><th>سعر البيع</th><th>الحالة</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="6" class="muted">لا توجد أصناف.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function refreshAll(){
  renderKPI();
  renderSelectOptions();
  renderItemsTable();
  renderMovementTables();
  renderInvoicesTable();
  renderLowStock();
  renderDailyReport();
  renderStockSummary();
}

refreshAll();
