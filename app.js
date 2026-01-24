let data = JSON.parse(localStorage.getItem('data')||'{}');
data.items = data.items || {};

function save(){localStorage.setItem('data',JSON.stringify(data));render();}

function addItem(){
  const n=itemName.value,pb=+buyPrice.value,ps=+sellPrice.value;
  if(!n)return;
  data.items[n]={buy:pb,sell:ps,qty:0};
  save();
}

function buy(){
  const n=buyItem.value,q=+buyQty.value;
  if(!n||!q)return;
  data.items[n].qty+=q;save();
}

function sell(){
  const n=sellItem.value,q=+sellQty.value;
  if(!n||!q)return;
  if(data.items[n].qty<q){alert('مخزون غير كافي');return;}
  data.items[n].qty-=q;save();
}

function render(){
  buyItem.innerHTML=sellItem.innerHTML='';
  stock.innerHTML='';
  for(const n in data.items){
    let o=document.createElement('option');
    o.text=o.value=n;
    buyItem.add(o.cloneNode(true));
    sellItem.add(o.cloneNode(true));
    let li=document.createElement('li');
    li.textContent=`${n} : ${data.items[n].qty} كغم`;
    stock.appendChild(li);
  }
}
render();
