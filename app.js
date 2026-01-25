
const DB = JSON.parse(localStorage.getItem("DB")||'{"customers":[]}');
const save=()=>localStorage.setItem("DB",JSON.stringify(DB));

document.querySelectorAll('.tab').forEach(b=>{
 b.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.getElementById('view-'+b.dataset.view).classList.add('active');
  renderCustomers();
 }
});

document.getElementById('sellForm').onsubmit=e=>{
 e.preventDefault();
 const name=sellCustomer.value.trim();
 const amt=Number(sellAmount.value);
 const method=sellPayMethod.value;
 let c=DB.customers.find(x=>x.name===name);
 if(!c){c={id:crypto.randomUUID(),name,balance:0,payments:[]};DB.customers.push(c);}
 if(method==='credit'){c.balance+=amt;}
 save();alert("تم الحفظ");e.target.reset();renderCustomers();
};

function renderCustomers(){
 const box=document.getElementById('customersList');
 box.innerHTML='';
 DB.customers.filter(c=>c.balance>0).forEach(c=>{
  box.innerHTML+=`<div>${c.name} — ${c.balance}</div>`;
 });
}

const modal=document.getElementById('payModal');
document.getElementById('fabPay').onclick=()=>{
 const sel=document.getElementById('payCustomer');
 sel.innerHTML=DB.customers.filter(c=>c.balance>0)
  .map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
 modal.classList.add('show');
};

function closePay(){modal.classList.remove('show');}
document.getElementById('confirmPay').onclick=()=>{
 const id=payCustomer.value;
 const amt=Number(payAmount.value);
 const c=DB.customers.find(x=>x.id===id);
 if(!c||amt<=0)return;
 c.balance=Math.max(0,c.balance-amt);
 c.payments.push({amt,date:new Date().toISOString()});
 save();closePay();renderCustomers();alert("تم التسديد");
};
