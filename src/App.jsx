import {useEffect,useState,useCallback,useMemo} from 'react'
import {supabase} from './supabase'
import Calendar from './Calendar'
import {startOfWeek,startOfDay,addDays,hm,toLocalInput,findCommon,dayNames} from './util'

const btn='px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50'
const ghost='px-3 py-1.5 rounded border text-sm hover:bg-slate-100'
const inp='border rounded px-2 py-1.5 w-full text-sm'

function Auth(){
  const [mode,setMode]=useState('in'),[email,setEmail]=useState(''),[pw,setPw]=useState(''),[name,setName]=useState(''),[msg,setMsg]=useState('')
  const submit=async e=>{ e.preventDefault(); setMsg('')
    let r
    if(mode==='in') r=await supabase.auth.signInWithPassword({email,password:pw})
    else if(mode==='up'){ r=await supabase.auth.signUp({email,password:pw,options:{data:{display_name:name}}}); if(!r.error&&!r.data.session) return setMsg('Kiểm tra email để xác nhận tài khoản.') }
    else { r=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin}); if(!r.error) return setMsg('Đã gửi email đặt lại mật khẩu.') }
    if(r.error) setMsg(r.error.message) }
  return <div className="min-h-screen grid place-items-center p-4"><form onSubmit={submit} className="bg-white p-6 rounded-lg border w-full max-w-sm space-y-3">
    <h1 className="text-xl font-semibold">My Free Time</h1>
    {mode==='up'&&<input className={inp} placeholder="Tên hiển thị" value={name} onChange={e=>setName(e.target.value)} required/>}
    <input className={inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
    {mode!=='reset'&&<input className={inp} type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" minLength={6} value={pw} onChange={e=>setPw(e.target.value)} required/>}
    {msg&&<p className="text-sm text-red-600">{msg}</p>}
    <button className={btn+' w-full'}>{mode==='in'?'Đăng nhập':mode==='up'?'Đăng ký':'Gửi email đặt lại'}</button>
    <div className="text-sm text-blue-600 flex justify-between">
      <button type="button" onClick={()=>setMode(mode==='in'?'up':'in')}>{mode==='in'?'Tạo tài khoản':'Đã có tài khoản'}</button>
      <button type="button" onClick={()=>setMode('reset')}>Quên mật khẩu</button></div>
  </form></div>
}

function Modal({onClose,children}){ return <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={onClose}><div className="bg-white rounded-lg p-5 w-full max-w-sm space-y-3" onClick={e=>e.stopPropagation()}>{children}</div></div> }

function Editor({item,me,profiles,onClose}){
  const own=!item.id||item.user_id===me
  const [start,setStart]=useState(toLocalInput(item.start_time)),[end,setEnd]=useState(toLocalInput(item.end_time)),[status,setStatus]=useState(item.status||'free'),[note,setNote]=useState(''),[err,setErr]=useState('')
  useEffect(()=>{ if(item.id&&own) supabase.from('schedule_notes').select('note').eq('schedule_id',item.id).maybeSingle().then(r=>setNote(r.data?.note||'')) },[])
  if(!own){ const p=profiles.find(x=>x.id===item.user_id); return <Modal onClose={onClose}>
    <h3 className="font-semibold">{p?.display_name}</h3><p>{item.status==='free'?'Rảnh':'Bận'}: {hm(new Date(item.start_time))}–{hm(new Date(item.end_time))} ({new Date(item.start_time).toLocaleDateString('vi-VN')})</p>
    <button className={ghost} onClick={onClose}>Đóng</button></Modal> }
  const save=async()=>{ const s=new Date(start),e=new Date(end); if(!(e>s)) return setErr('Giờ kết thúc phải sau giờ bắt đầu.')
    const row={start_time:s.toISOString(),end_time:e.toISOString(),status}
    const r=item.id?await supabase.from('schedules').update(row).eq('id',item.id).select().single():await supabase.from('schedules').insert({...row,user_id:me}).select().single()
    if(r.error) return setErr(r.error.message.includes('exclusion')||r.error.code==='23P01'?'Khoảng giờ này trùng với lịch khác của bạn. Hãy sửa hoặc xóa lịch cũ trước.':r.error.message)
    if(note.trim()) await supabase.from('schedule_notes').upsert({schedule_id:r.data.id,user_id:me,note}); else if(item.id) await supabase.from('schedule_notes').delete().eq('schedule_id',item.id)
    onClose() }
  const del=async()=>{ await supabase.from('schedules').delete().eq('id',item.id); onClose() }
  return <Modal onClose={onClose}>
    <h3 className="font-semibold">{item.id?'Sửa lịch':'Thêm lịch'}</h3>
    <label className="text-sm block">Bắt đầu<input type="datetime-local" step="60" className={inp} value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label className="text-sm block">Kết thúc<input type="datetime-local" step="60" className={inp} value={end} onChange={e=>setEnd(e.target.value)}/></label>
    <div className="flex gap-2">{[['free','Rảnh','bg-green-600'],['busy','Bận','bg-red-600']].map(([v,l,c])=><button key={v} onClick={()=>setStatus(v)} className={`flex-1 py-1.5 rounded text-sm border ${status===v?c+' text-white':''}`}>{l}</button>)}</div>
    <textarea className={inp} placeholder="Ghi chú (chỉ mình bạn xem được)" value={note} onChange={e=>setNote(e.target.value)}/>
    {err&&<p className="text-sm text-red-600">{err}</p>}
    <div className="flex gap-2"><button className={btn} onClick={save}>Lưu</button>{item.id&&<button className={ghost+' text-red-600'} onClick={del}>Xóa</button>}<button className={ghost} onClick={onClose}>Hủy</button></div>
  </Modal>
}

function Filter({profiles,sel,setSel}){
  const [q,setQ]=useState('')
  const list=profiles.filter(p=>p.display_name.toLowerCase().includes(q.toLowerCase()))
  const toggle=id=>{const n=new Set(sel); n.has(id)?n.delete(id):n.add(id); setSel(n)}
  return <div className="bg-white border rounded-lg p-2 flex flex-wrap items-center gap-2 text-sm">
    <input className="border rounded px-2 py-1 w-36" placeholder="Tìm tên…" value={q} onChange={e=>setQ(e.target.value)}/>
    <button className={ghost} onClick={()=>setSel(new Set(profiles.map(p=>p.id)))}>Select All</button>
    <button className={ghost} onClick={()=>setSel(new Set())}>Clear All</button>
    {list.map(p=><label key={p.id} className="flex items-center gap-1 border rounded-full px-2 py-0.5 cursor-pointer"><input type="checkbox" checked={sel.has(p.id)} onChange={()=>toggle(p.id)}/>{p.display_name}</label>)}
  </div>
}

export default function App(){
  const [session,setSession]=useState(undefined),[profiles,setProfiles]=useState([]),[schedules,setSchedules]=useState([])
  const [view,setView]=useState('shared'),[anchor,setAnchor]=useState(new Date()),[nd,setNd]=useState(window.innerWidth<640?1:7)
  const [sel,setSel]=useState(null),[editing,setEditing]=useState(null),[minutes,setMinutes]=useState(60),[range,setRange]=useState(7),[found,setFound]=useState(null),[name,setName]=useState('')
  useEffect(()=>{ supabase.auth.getSession().then(r=>setSession(r.data.session)); const {data}=supabase.auth.onAuthStateChange((_,s)=>setSession(s)); return ()=>data.subscription.unsubscribe() },[])
  const me=session?.user?.id
  const load=useCallback(async()=>{
    const since=addDays(new Date(),-30).toISOString()
    const [p,s]=await Promise.all([supabase.from('profiles').select('*').order('display_name'),supabase.from('schedules').select('*').gte('end_time',since)])
    if(p.data){ setProfiles(p.data); setSel(prev=>prev||new Set(p.data.map(x=>x.id))) }
    if(s.data) setSchedules(s.data) },[])
  useEffect(()=>{ if(!me) return; load()
    const ch=supabase.channel('mft').on('postgres_changes',{event:'*',schema:'public',table:'schedules'},load).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},load).subscribe()
    return ()=>{supabase.removeChannel(ch)} },[me,load])
  useEffect(()=>{ const p=profiles.find(x=>x.id===me); if(p) setName(p.display_name) },[profiles,me])

  const days=useMemo(()=>{ const s=nd===7?startOfWeek(anchor):startOfDay(anchor); return Array.from({length:nd},(_,i)=>addDays(s,i)) },[anchor,nd])
  const eff=view==='mine'?new Set([me]):sel||new Set()
  const shown=schedules.filter(s=>eff.has(s.user_id))
  const highlights=view==='find'&&found?found.map(([s,e])=>[s,e]):[]
  const runFind=()=>{ const from=startOfDay(anchor),to=addDays(from,range); setFound(findCommon(schedules,[...eff],from,to,minutes)) }
  const fmt=t=>new Date(t).toLocaleString('vi-VN',{weekday:'short',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})

  if(session===undefined) return null
  if(!session) return <Auth/>
  const nav=[['shared','Lịch chung'],['mine','Lịch của tôi'],['find','Tìm thời gian rảnh chung'],['members','Danh sách thành viên'],['settings','Cài đặt']]
  const showCal=['shared','mine','find'].includes(view)
  return <div className="min-h-screen flex flex-col">
    <header className="bg-white border-b px-4 py-2 flex items-center justify-between"><b className="text-blue-600">My Free Time</b>
      <div className="flex items-center gap-3 text-sm"><span className="w-7 h-7 rounded-full bg-blue-100 grid place-items-center">{name[0]?.toUpperCase()}</span><span className="hidden sm:inline">{name}</span><button className={ghost} onClick={()=>supabase.auth.signOut()}>Đăng xuất</button></div></header>
    <div className="flex flex-1 flex-col md:flex-row">
      <nav className="md:w-56 bg-white border-r p-2 flex md:flex-col gap-1 overflow-x-auto text-sm">{nav.map(([k,l])=><button key={k} onClick={()=>setView(k)} className={`text-left whitespace-nowrap px-3 py-2 rounded ${view===k?'bg-blue-50 text-blue-700 font-medium':'hover:bg-slate-100'}`}>{l}</button>)}</nav>
      <main className="flex-1 p-3 space-y-3 min-w-0">
        {showCal&&<>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold mr-2">{days[0].toLocaleDateString('vi-VN')} – {days[days.length-1].toLocaleDateString('vi-VN')}</h2>
            <button className={ghost} onClick={()=>setAnchor(addDays(anchor,-nd))}>‹</button><button className={ghost} onClick={()=>setAnchor(new Date())}>Today</button><button className={ghost} onClick={()=>setAnchor(addDays(anchor,nd))}>›</button>
            <select className={ghost} value={nd} onChange={e=>setNd(+e.target.value)}><option value={1}>1 ngày</option><option value={3}>3 ngày</option><option value={7}>7 ngày</option></select>
            <button className={btn+' ml-auto'} onClick={()=>{const s=new Date();s.setMinutes(0,0,0);setEditing({start_time:s,end_time:new Date(+s+36e5)})}}>+ Thêm lịch</button></div>
          {view!=='mine'&&sel&&<Filter profiles={profiles} sel={sel} setSel={setSel}/>}
          <div className="flex gap-3 text-xs"><span><i className="inline-block w-3 h-3 bg-green-200 border border-green-600"/> Rảnh</span><span><i className="inline-block w-3 h-3 bg-red-200 border border-red-600"/> Bận</span><span><i className="inline-block w-3 h-3 bg-slate-100 border"/> Chưa cập nhật</span></div>
          {view==='find'&&<div className="bg-white border rounded-lg p-3 flex flex-wrap items-end gap-3 text-sm">
            <label>Thời lượng<select className={inp} value={minutes} onChange={e=>setMinutes(+e.target.value)}>{[30,60,90,120].map(m=><option key={m} value={m}>{m>=60?`${m/60} giờ${m%60?' 30':''}`.replace(' 30',' 30 phút'):'30 phút'}</option>)}</select></label>
            <label>Tùy chỉnh (phút)<input type="number" min="5" className={inp+' w-24'} value={minutes} onChange={e=>setMinutes(+e.target.value||30)}/></label>
            <label>Số ngày từ đầu hiển thị<input type="number" min="1" max="31" className={inp+' w-24'} value={range} onChange={e=>setRange(+e.target.value||7)}/></label>
            <button className={btn} disabled={!eff.size} onClick={runFind}>Find Common Free Time</button>
            {found&&<div className="w-full">{found.length?<ul className="list-disc pl-5">{found.map(([s,e],i)=><li key={i}>{fmt(s)} → {hm(new Date(e))}</li>)}</ul>:<p className="text-slate-500">Không có khoảng nào cả nhóm cùng Rảnh. Khoảng chưa cập nhật không được tính là rảnh.</p>}</div>}
          </div>}
          <Calendar days={days} schedules={shown} profiles={profiles} me={me} highlights={highlights} onCreate={(s,e)=>setEditing({start_time:s,end_time:e})} onOpen={setEditing}/>
        </>}
        {view==='members'&&<ul className="bg-white border rounded-lg divide-y">{profiles.map(p=><li key={p.id} className="p-3 flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-blue-100 grid place-items-center">{p.display_name[0]?.toUpperCase()}</span>{p.display_name}</li>)}</ul>}
        {view==='settings'&&<div className="bg-white border rounded-lg p-4 max-w-sm space-y-3"><label className="text-sm">Tên hiển thị<input className={inp} value={name} onChange={e=>setName(e.target.value)}/></label>
          <button className={btn} onClick={async()=>{await supabase.from('profiles').update({display_name:name}).eq('id',me);load()}}>Lưu</button></div>}
      </main></div>
    {editing&&<Editor item={editing} me={me} profiles={profiles} onClose={()=>{setEditing(null);load()}}/>}
  </div>
}
