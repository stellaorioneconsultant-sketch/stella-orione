export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const TOKEN = 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc5MzA3NTIzLCJqdGkiOiI0ZTdlZDhkOS0yOTJmLTRjNjYtODI5OC0yN2FhMGE4YWFkOTkiLCJ1c2VyX3V1aWQiOiI5MjJiOGZkYS05ODNjLTRkNWUtYWNlYi1lZGQzZmRmYjUzN2MiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSB3ZWJob29rczpyZWFkIHdlYmhvb2tzOndyaXRlIn0.yXZKT9sKXmRxCaSxVm3sNO_E6TUoTtGc4WlR_rUs4fTggjg82L3Kr_Dmz9QzFFZ_NeMAgkognoK-EUiXOJtErg';
  try {
    const me = await fetch('https://api.calendly.com/users/me', { headers: { Authorization: `Bearer ${TOKEN}` } });
    const meData = await me.json();
    const userUri = meData.resource?.uri;
    const from = new Date(); from.setDate(from.getDate() - 30);
    const to = new Date(); to.setDate(to.getDate() + 60);
    const ev = await fetch(`https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${from.toISOString()}&max_start_time=${to.toISOString()}&count=50&status=active`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const evData = await ev.json();
    res.status(200).json(evData);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
