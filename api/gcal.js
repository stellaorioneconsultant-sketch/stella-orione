// Legge il calendario Google (indirizzo iCal segreto) e restituisce le prenotazioni in JSON
const ICS_URL = 'https://calendar.google.com/calendar/ical/stellaorioneconsultant%40gmail.com/private-420843410adf7219ebae53837394e290/basic.ics';
const OWNER = 'stellaorioneconsultant@gmail.com';

function unfold(t){ return t.replace(/\r\n/g,'\n').replace(/\n[ \t]/g,''); }
function unesc(s){ return (s||'').replace(/\\n/g,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\'); }
function romeParts(d){ // Date -> {date:'YYYY-MM-DD', time:'HH:MM'} in Europe/Rome
  const f=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const s=f.format(d); return {date:s.slice(0,10), time:s.slice(11,16)};
}
function parseDT(val, params){ // returns {date,time,ms}
  const m=val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/); if(!m) return null;
  const [_,Y,M,D,h='00',mi='00',s='00',z]=m;
  if(!m[4]) return {date:`${Y}-${M}-${D}`,time:'',ms:Date.parse(`${Y}-${M}-${D}T12:00:00Z`),allday:true};
  if(z){ const d=new Date(Date.UTC(+Y,+M-1,+D,+h,+mi,+s)); const p=romeParts(d); return {...p,ms:d.getTime()}; }
  // floating / TZID: prendo l'orario così com'è (il calendario è in Europe/Rome)
  return {date:`${Y}-${M}-${D}`,time:`${h}:${mi}`,ms:Date.parse(`${Y}-${M}-${D}T${h}:${mi}:${s}`)};
}
function parseICS(text){
  const lines=unfold(text).split('\n'); const events=[]; let cur=null;
  for(const line of lines){
    if(line==='BEGIN:VEVENT'){cur={att:[]};continue;}
    if(line==='END:VEVENT'){if(cur)events.push(cur);cur=null;continue;}
    if(!cur)continue;
    const i=line.indexOf(':'); if(i<0)continue;
    const left=line.slice(0,i), val=line.slice(i+1);
    const [key,...ps]=left.split(';'); const params={}; ps.forEach(p=>{const [k,v]=p.split('=');params[k]=v;});
    switch(key){
      case 'UID': cur.uid=val; break;
      case 'SUMMARY': cur.summary=unesc(val); break;
      case 'DESCRIPTION': cur.description=unesc(val); break;
      case 'LOCATION': cur.location=unesc(val); break;
      case 'STATUS': cur.status=val; break;
      case 'DTSTART': cur.start=parseDT(val,params); break;
      case 'DTEND': cur.end=parseDT(val,params); break;
      case 'ATTENDEE': cur.att.push({email:val.replace(/^mailto:/i,'').toLowerCase(),name:unesc(params.CN||'')}); break;
      case 'ORGANIZER': cur.org={email:val.replace(/^mailto:/i,'').toLowerCase(),name:unesc(params.CN||'')}; break;
    }
  }
  return events;
}
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET');
  if(req.method==='OPTIONS'){res.status(200).end();return;}
  try{
    const r=await fetch(ICS_URL,{headers:{'User-Agent':'Mozilla/5.0'}});
    if(!r.ok) throw new Error('ICS '+r.status);
    const txt=await r.text();
    const now=Date.now(), from=now-30*864e5, to=now+90*864e5;
    const out=parseICS(txt).filter(e=>e.start&&e.start.ms>=from&&e.start.ms<=to&&e.status!=='CANCELLED').map(e=>{
      const guest=e.att.find(a=>a.email&&a.email!==OWNER)||null;
      const meet=(e.location||'').match(/https?:\/\/\S+/)?.[0]||(e.description||'').match(/https:\/\/meet\.google\.com\/\S+/)?.[0]||'';
      const dur=e.end&&e.start&&!e.start.allday?Math.round((e.end.ms-e.start.ms)/60000):null;
      return {id:e.uid,date:e.start.date,time:e.start.time,allday:!!e.start.allday,title:e.summary||'',description:e.description||'',
        guestName:guest?.name||'',guestEmail:guest?.email||'',location:e.location||'',link:meet,duration:dur};
    }).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    res.status(200).json({count:out.length,events:out});
  }catch(e){ res.status(500).json({error:e.message}); }
}
