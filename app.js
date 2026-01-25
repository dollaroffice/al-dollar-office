let items = JSON.parse(localStorage.getItem('items')||'[]');

function render(){
  const list=document.getElementById('list');
  list.innerHTML='';
  items.forEach((i,idx)=>{
    const li=document.createElement('li');
    li.innerHTML = i.name+' - '+i.qty;
    list.appendChild(li);
  });
  localStorage.setItem('items',JSON.stringify(items));
}

function addItem(){
  const name=document.getElementById('name').value;
  const qty=document.getElementById('qty').value;
  if(!name||!qty) return;
  items.push({name,qty});
  render();
}

render();
