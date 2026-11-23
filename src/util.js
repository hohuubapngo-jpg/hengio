export const startOfDay = d => { const x = new Date(d); x.setHours(0,0,0,0); return x }
export const addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x }
export const startOfWeek = d => { const x = startOfDay(d); return addDays(x, -((x.getDay()+6)%7)) }
export const hm = d => d.toTimeString().slice(0,5)
export const dayNames = ['T2','T3','T4','T5','T6','T7','CN']
export const toLocalInput = d => { const x = new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,16) }
export function intersect(a,b){ const r=[]; let i=0,j=0
  while(i<a.length&&j<b.length){ const s=Math.max(a[i][0],b[j][0]), e=Math.min(a[i][1],b[j][1]); if(e>s) r.push([s,e]); a[i][1]<b[j][1]?i++:j++ } return r }
// Khoảng mà TẤT CẢ user đều đánh dấu Rảnh, dài >= minutes. Chưa cập nhật = không rảnh.
export function findCommon(schedules, userIds, from, to, minutes){
  if(!userIds.length) return []
  let acc = null
  for(const u of userIds){
    const mine = schedules.filter(s=>s.user_id===u && s.status==='free').map(s=>[Math.max(+new Date(s.start_time),+from), Math.min(+new Date(s.end_time),+to)]).filter(x=>x[1]>x[0]).sort((x,y)=>x[0]-y[0])
    const m=[]; for(const x of mine){ if(m.length&&x[0]<=m[m.length-1][1]) m[m.length-1][1]=Math.max(m[m.length-1][1],x[1]); else m.push([...x]) }
    acc = acc===null ? m : intersect(acc,m)
  }
  return acc.filter(([s,e])=>e-s>=minutes*60000)
}
