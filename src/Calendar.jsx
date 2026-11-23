import {useRef,useState,useMemo} from 'react'
import {startOfDay,hm,dayNames} from './util'
const H=24 // px mỗi 30 phút
const snap = y => Math.max(0,Math.min(48,Math.round(y/H)))

// Xếp các block chồng nhau thành các cột cạnh nhau
function pack(items){
  const sorted=[...items].sort((a,b)=>a.s-b.s||a.e-b.e), out=[]; let cluster=[], end=0
  const flush=()=>{ const cols=[]; cluster.forEach(it=>{ let c=cols.findIndex(x=>x<=it.s); if(c<0){c=cols.length;cols.push(0)} cols[c]=it.e; it.col=c }); cluster.forEach(it=>it.cols=cols.length); out.push(...cluster); cluster=[] }
  sorted.forEach(it=>{ if(cluster.length&&it.s>=end) flush(); cluster.push(it); end=cluster.length===1?it.e:Math.max(end,it.e) }); if(cluster.length) flush(); return out
}

export default function Calendar({days,schedules,profiles,onCreate,onOpen,highlights=[],me}){
  const drag=useRef(null), [sel,setSel]=useState(null)
  const pm=useMemo(()=>Object.fromEntries(profiles.map(p=>[p.id,p])),[profiles])
  const down=(e,day)=>{ if(e.target.closest('[data-block]')) return
    const r=e.currentTarget.getBoundingClientRect(); const a=snap(e.clientY-r.top); drag.current={day,r,a,b:a,moved:false}; setSel({day,a,b:a}); e.currentTarget.setPointerCapture(e.pointerId) }
  const move=e=>{ const d=drag.current; if(!d) return; const b=snap(e.clientY-d.r.top); if(b!==d.a) d.moved=true; d.b=b; setSel({day:d.day,a:d.a,b}) }
  const up=()=>{ const d=drag.current; if(!d) return; drag.current=null; setSel(null)
    let [a,b]=[Math.min(d.a,d.b),Math.max(d.a,d.b)]; if(!d.moved||a===b){ b=Math.min(48,a+2); if(b===a) a=b-2 }
    onCreate(new Date(+startOfDay(d.day)+a*30*6e4), new Date(+startOfDay(d.day)+b*30*6e4)) }
  return (
  <div className="overflow-auto bg-white border rounded-lg" style={{maxHeight:'calc(100vh - 260px)'}}>
    <div className="flex sticky top-0 z-30 bg-white border-b">
      <div className="w-12 shrink-0"/>
      {days.map(d=>{const today=+startOfDay(new Date())===+d; return (
        <div key={+d} className="flex-1 min-w-[90px] text-center py-1 border-l text-sm">
          <div className="text-slate-500">{dayNames[(d.getDay()+6)%7]}</div>
          <div className={today?'mx-auto px-2 rounded-full bg-blue-600 text-white w-fit':''}>{d.getDate()}/{d.getMonth()+1}</div>
        </div>)})}
    </div>
    <div className="flex relative" style={{height:48*H}}>
      <div className="w-12 shrink-0 relative text-[11px] text-slate-500">
        {Array.from({length:24},(_,h)=><div key={h} className="absolute right-1" style={{top:h*2*H-6}}>{h?String(h).padStart(2,'0')+':00':''}</div>)}
      </div>
      {days.map(d=>{
        const ds=+startOfDay(d), de=ds+864e5
        const items=pack(schedules.filter(s=>+new Date(s.end_time)>ds&&+new Date(s.start_time)<de).map(s=>({s:Math.max(+new Date(s.start_time),ds),e:Math.min(+new Date(s.end_time),de),raw:s})))
        const hl=highlights.filter(([s,e])=>e>ds&&s<de)
        return (
        <div key={+d} className="flex-1 min-w-[90px] relative border-l touch-none select-none"
          style={{backgroundImage:`repeating-linear-gradient(to bottom,#e2e8f0 0,#e2e8f0 1px,transparent 1px,transparent ${H*2}px),repeating-linear-gradient(to bottom,transparent 0,transparent ${H}px,#f1f5f9 ${H}px,#f1f5f9 ${H+1}px,transparent ${H+1}px,transparent ${H*2}px)`}}
          onPointerDown={e=>down(e,d)} onPointerMove={move} onPointerUp={up}>
          {hl.map(([s,e],i)=><div key={i} className="absolute inset-x-0 bg-emerald-300/50 border-y-2 border-emerald-600 text-[10px] text-emerald-900 px-1 pointer-events-none" style={{top:(Math.max(s,ds)-ds)/36e5*2*H,height:(Math.min(e,de)-Math.max(s,ds))/36e5*2*H}}>Cùng rảnh</div>)}
          {items.map(it=>{const p=pm[it.raw.user_id], free=it.raw.status==='free', mine=it.raw.user_id===me
            return <div key={it.raw.id} data-block onClick={()=>onOpen(it.raw)} title={`${p?.display_name} · ${hm(new Date(it.raw.start_time))}–${hm(new Date(it.raw.end_time))}`}
              className={`absolute z-10 rounded px-1 text-[11px] leading-tight overflow-hidden cursor-pointer border ${free?'bg-green-100/90 border-green-600 text-green-900':'bg-red-100/90 border-red-600 text-red-900'} ${mine?'ring-2 ring-blue-500':''}`}
              style={{top:(it.s-ds)/36e5*2*H,height:Math.max(14,(it.e-it.s)/36e5*2*H-1),left:`${it.col/it.cols*100}%`,width:`${100/it.cols}%`}}>
              <b>{p?.display_name||'?'}</b><div>{free?'Rảnh':'Bận'}</div></div>})}
          {sel&&+sel.day===+d&&<div className="absolute inset-x-0 bg-blue-300/40 border border-blue-500 z-20 pointer-events-none" style={{top:Math.min(sel.a,sel.b)*H,height:Math.max(1,Math.abs(sel.b-sel.a))*H}}/>}
        </div>)})}
    </div>
  </div>)
}
