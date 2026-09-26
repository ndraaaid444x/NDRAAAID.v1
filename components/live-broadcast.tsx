'use client'
import {useEffect,useState} from 'react';
import {supabaseBrowser} from '@/lib/supabase-browser';
import {Megaphone,X,ExternalLink,Info,TriangleAlert,CheckCircle2,Tag} from 'lucide-react';

type Broadcast={id:string;title:string;message:string;type:'INFO'|'PROMO'|'WARNING'|'SUCCESS';starts_at:string;ends_at:string;link_url?:string|null;link_label?:string|null};
const icons:any={INFO:Info,PROMO:Tag,WARNING:TriangleAlert,SUCCESS:CheckCircle2};
export default function LiveBroadcast(){
 const [items,setItems]=useState<Broadcast[]>([]); const [closed,setClosed]=useState<string[]>([]);
 const load=async()=>{const s=supabaseBrowser();const now=new Date().toISOString();const {data}=await s.from('broadcasts').select('*').eq('is_active',true).lte('starts_at',now).gt('ends_at',now).order('created_at',{ascending:false}).limit(5);setItems((data||[]) as Broadcast[])};
 useEffect(()=>{load();const s=supabaseBrowser();const ch=s.channel('live-broadcasts').on('postgres_changes',{event:'*',schema:'public',table:'broadcasts'},()=>load()).subscribe();const timer=window.setInterval(load,30000);return()=>{window.clearInterval(timer);s.removeChannel(ch)}},[]);
 if(!items.length)return null;
 return <div className="sticky top-[57px] z-40 border-b border-cyan-400/15 bg-[#07101f]/95 shadow-[0_8px_30px_rgba(0,0,0,.25)] backdrop-blur-xl">
   <div className="mx-auto max-w-7xl px-4 py-2">
    {items.filter(x=>!closed.includes(x.id)).map(item=>{const Icon=icons[item.type]||Megaphone;return <div key={item.id} className="flex items-center gap-3 py-1.5 text-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Icon size={16}/></span>
      <div className="min-w-0 flex-1"><b className="mr-2 text-cyan-200">{item.title}</b><span className="text-slate-300">{item.message}</span></div>
      {item.link_url&&<a href={item.link_url} target="_blank" rel="noreferrer" className="hidden shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/5 sm:flex">{item.link_label||'Lihat'}<ExternalLink size={12}/></a>}
      <button aria-label="Tutup broadcast" onClick={()=>setClosed(v=>[...v,item.id])} className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><X size={16}/></button>
    </div>})}
   </div>
 </div>
}
