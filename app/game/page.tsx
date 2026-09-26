'use client'
import {useEffect,useState} from 'react';
import {supabaseBrowser} from '@/lib/supabase-browser';
import TopupForm from '@/components/topup-form';
export default function GamePage(){
 const [slug,setSlug]=useState(''); const [game,setGame]=useState<any>(); const [fields,setFields]=useState<any[]>([]); const [products,setProducts]=useState<any[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{setSlug(new URLSearchParams(window.location.search).get('slug')||'')},[]);
 useEffect(()=>{if(!slug)return; (async()=>{const s=supabaseBrowser();const {data:g}=await s.from('games').select('*').eq('slug',slug).eq('is_active',true).single();setGame(g);if(g){const [{data:f},{data:p}]=await Promise.all([s.from('game_fields').select('*').eq('game_id',g.id).order('sort_order'),s.from('game_products').select('*').eq('game_id',g.id).eq('is_active',true).order('price')]);setFields(f||[]);setProducts(p||[]);}setLoading(false)})()},[slug]);
 if(loading)return <main className="mx-auto max-w-5xl px-4 py-20 text-center text-slate-400">Memuat game...</main>;
 if(!game)return <main className="mx-auto max-w-5xl px-4 py-20 text-center"><h1 className="text-3xl font-black">Game tidak ditemukan</h1><a className="mt-5 inline-block text-cyan-300" href="/games/">Kembali ke Games</a></main>;
 return <section className="mx-auto max-w-6xl px-4 py-12"><div className="glass overflow-hidden rounded-3xl"><div className="relative min-h-52 overflow-hidden bg-gradient-to-br from-cyan-500/10 via-purple-500/15 to-pink-500/10 p-8">{game.banner_url&&<img src={game.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25"/>}<div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent"/><div className="relative"><p className="text-sm font-bold text-cyan-300">TOP UP GAME</p><h1 className="mt-2 text-4xl font-black">{game.name}</h1><p className="mt-3 max-w-2xl text-slate-300">{game.description||'Pilih produk dan masukkan data akunmu.'}</p></div></div><div className="p-6 md:p-8"><TopupForm game={game} fields={fields} products={products}/></div></div></section>
}
