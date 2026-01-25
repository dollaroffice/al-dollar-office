let db=JSON.parse(localStorage.getItem('db')||'{}');
db.items=db.items||{};
function save(){localStorage.setItem('db',JSON.stringify(db));render();}
function show(id){document.querySelectorAll('.view').forEach(v=>v.style.display='none');document.getElementById(id).style.display='block';}
function addItem(){
 const n=iname.value; if(!n)return;
 db.items[n]={buy:+ibuy.value,sell:+isell.value,qty:0};
 save();
}
function buy(){
 const n=bitem.value; db.items[n].qty+=+bqty.value; save();
}
function sell(){
 const n=sitem.value; if(db.items[n].qty<sqty.value){alert('مخزون غير كافي');return;}
 db.items[n].qty-=+sqty.value; save();
}
function render(){
 itemsList.innerHTML=''; bitem.innerHTML=''; sitem.innerHTML=''; stockList.innerHTML='';
 for(let n in db.items){
  itemsList.innerHTML+=`<li>${n}</li>`;
  bitem.innerHTML+=`<option>${n}</option>`;
  sitem.innerHTML+=`<option>${n}</option>`;
  stockList.innerHTML+=`<li>${n}: ${db.items[n].qty} كغم</li>`;
 }
}
show('items'); render();
