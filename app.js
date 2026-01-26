const DB=JSON.parse(localStorage.getItem('DB')||'{"items":[], "customers":[]}');
const save=()=>localStorage.setItem('DB',JSON.stringify(DB));
function show(id){document.querySelectorAll('section').forEach(s=>s.classList.add('hide'));document.getElementById(id).classList.remove('hide');render();}
function addItem(){if(!itemName.value)return;DB.items.push({name:itemName.value,qty:+itemQty.value||0});save();render();}
function buyItem(){const i=DB.items.find(x=>x.name===buyName.value);if(i)i.qty+=+buyQty.value||0;save();render();}
function sellItem(){const i=DB.items.find(x=>x.name===sellName.value);if(!i||i.qty<sellQty.value)return alert('خطأ');i.qty-=+sellQty.value||0;if(sellPay.value==='credit'){let c=DB.customers.find(x=>x.name===sellCustomer.value);if(!c){c={name:sellCustomer.value,balance:0};DB.customers.push(c);}c.balance+=+sellQty.value||0;}save();render();}
function render(){itemsList.innerHTML=DB.items.map(i=>i.name+' : '+i.qty).join('<br>');custList.innerHTML=DB.customers.map(c=>c.name+' : '+c.balance).join('<br>');}
function openPay(){payCustomer.innerHTML=DB.customers.map(c=>'<option>'+c.name+'</option>').join('');payModal.classList.add('show');}
function closePay(){payModal.classList.remove('show');}
function confirmPay(){let c=DB.customers.find(x=>x.name===payCustomer.value);if(c)c.balance-=+payAmount.value||0;save();closePay();render();}
render();