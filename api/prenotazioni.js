// Legge il foglio Google delle prenotazioni (condiviso "chiunque con il link") e restituisce JSON
const SHEET_ID='1pnhUcmrkZHdDuASnpHPsJN2brEQgkGPt6jOVLRPiMVc';
const CSV_URL=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

function parseCSV(t){ // gestisce virgolette e a-capo nei campi
  const rows=[];let row=[],f='',q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else if(c==='"')q=true; else if(c===','){row.push(f);f='';}
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&t[i+1]==='\n')i++; row.push(f);rows.push(row);row=[];f=''; }
    else f+=c; }
  if(f!==''||row.length){row.push(f);rows.push(row);}
  return rows.filter(r=>r.some(x=>x.trim()!==''));
}
function normDate(s){ s=(s||'').trim(); if(!s)return '';
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if(m){const y=m[3].length===2?'20'+m[3]:m[3];return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
  const d=new Date(s); if(!isNaN(d))return d.toISOString().slice(0,10); return '';
}
function normTime(s){ s=(s||'').trim(); const m=s.match(/(\d{1,2})[:.](\d{2})/); return m?`${m[1].padStart(2,'0')}:${m[2]}`:''; }
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET');
  if(req.method==='OPTIONS'){res.status(200).end();return;}
  try{
    const r=await fetch(CSV_URL); if(!r.ok)throw new Error('Sheet '+r.status);
    const rows=parseCSV(await r.text()); if(!rows.length)throw new Error('foglio vuoto');
    const body=rows.slice(1); // salta intestazione
    const out=body.map((c,i)=>{
      const g=k=>(c[k]||'').trim();
      const data=normDate(g(5)), ora=normTime(g(6));
      return {id:[g(1),data,ora].join('|').toLowerCase().replace(/\s+/g,' '),
        prenotataIl:normDate(g(0)),nome:g(1),email:g(2),telefono:g(3),servizio:g(4),data,ora,note:g(7),riga:i+2};
    }).filter(e=>e.nome&&e.data);
    res.status(200).json({count:out.length,events:out});
  }catch(e){res.status(500).json({error:e.message});}
}
