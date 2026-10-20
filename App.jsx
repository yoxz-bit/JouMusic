import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioLines, ChartNoAxesColumnIncreasing, ChevronRight, CircleUserRound, Disc3, Heart, Home, ListMusic, Music2, Pause, Play, Plus, Search, Settings, SkipBack, SkipForward, Volume2, X, Shuffle, Repeat2, Clock3, Download, Sparkles } from 'lucide-react'

const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const demo = [
  { id:'demo-1', title:'Night Drive', artist:'JOÜGA Radio', duration:'3:42', cover:'', demo:true },
  { id:'demo-2', title:'Purple Skies', artist:'JOÜGA Radio', duration:'4:08', cover:'', demo:true },
  { id:'demo-3', title:'After the Rain', artist:'JOÜGA Radio', duration:'3:16', cover:'', demo:true },
  { id:'demo-4', title:'Midnight Bloom', artist:'JOÜGA Radio', duration:'3:55', cover:'', demo:true }
]
const fmt = s => { if (!Number.isFinite(s) || s < 0) return '0:00'; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}` }
function Art({ track, large=false }) {
  return track?.cover
    ? <img className={`art ${large?'art-large':''}`} src={track.cover} alt="" loading="lazy" />
    : <div className={`art art-placeholder ${large?'art-large':''}`}><AudioLines size={large?48:25}/></div>
}
function App() {
  const [query,setQuery] = useState('')
  const [searching,setSearching] = useState(false)
  const [results,setResults] = useState([])
  const [error,setError] = useState('')
  const [page,setPage] = useState('Home')
  const [current,setCurrent] = useState(null)
  const [audioUrl,setAudioUrl] = useState('')
  const [playing,setPlaying] = useState(false)
  const [busy,setBusy] = useState(false)
  const [progress,setProgress] = useState(0)
  const [duration,setDuration] = useState(0)
  const [volume,setVolume] = useState(0.8)
  const [favorites,setFavorites] = useState(()=>read('jouga:favorites',[]))
  const [history,setHistory] = useState(()=>read('jouga:history',[]))
  const [playlists,setPlaylists] = useState(()=>read('jouga:playlists',[]))
  const [activePlaylist,setActivePlaylist] = useState(null)
  const [showCreate,setShowCreate] = useState(false)
  const [playlistName,setPlaylistName] = useState('')
  const [queue,setQueue] = useState([])
  const [queueIndex,setQueueIndex] = useState(-1)
  const [shuffle,setShuffle] = useState(false)
  const [repeat,setRepeat] = useState(false)
  const audioRef = useRef(null)
  const requestId = useRef(0)

  useEffect(()=>write('jouga:favorites',favorites),[favorites])
  useEffect(()=>write('jouga:history',history),[history])
  useEffect(()=>write('jouga:playlists',playlists),[playlists])
  useEffect(()=>{ if(audioRef.current) audioRef.current.volume=volume },[volume])
  useEffect(()=>{ if(audioRef.current && audioUrl) { audioRef.current.load(); audioRef.current.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false)) } },[audioUrl])
  useEffect(()=>{ const a=audioRef.current; if(!a)return; const time=()=>setProgress(a.currentTime||0); const meta=()=>setDuration(a.duration||0); const ended=()=>{if(repeat){a.currentTime=0;a.play()}else nextTrack()}; a.addEventListener('timeupdate',time);a.addEventListener('loadedmetadata',meta);a.addEventListener('ended',ended);return()=>{a.removeEventListener('timeupdate',time);a.removeEventListener('loadedmetadata',meta);a.removeEventListener('ended',ended)} },[repeat,queue,queueIndex,shuffle])
  const visibleTracks = useMemo(()=>{
    if(page==='Favorit') return favorites
    if(page==='Riwayat') return history
    if(page==='Playlist') {
      const p=playlists.find(x=>x.id===activePlaylist)
      return p ? p.tracks : []
    }
    if(page==='Hasil pencarian') return results
    return results.length ? results : demo
  },[page,favorites,history,playlists,activePlaylist,results])
  async function search(e) {
    e?.preventDefault()
    const q=query.trim(); if(!q)return
    setPage('Hasil pencarian');setSearching(true);setError('')
    try {
      const r=await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data=await r.json()
      if(!r.ok || !data.status) throw new Error(data.error || 'Pencarian gagal.')
      setResults(data.tracks || [])
      if(!data.tracks?.length) setError('Tidak ada hasil. Coba kata kunci lain.')
    } catch(err) { setResults([]);setError(err.message || 'Gagal menghubungi server.') }
    finally { setSearching(false) }
  }
  async function playTrack(track, list=visibleTracks) {
    if(!track || track.demo) { setError('Lagu contoh hanya untuk pratinjau tampilan. Cari lagu untuk memutar audio dari API.'); return }
    const id=++requestId.current
    setCurrent(track);setBusy(true);setError('')
    const nextQueue=list?.length?list:[track]
    setQueue(nextQueue);setQueueIndex(Math.max(0,nextQueue.findIndex(t=>t.id===track.id)))
    try {
      const q=[track.title,track.artist].filter(Boolean).join(' ')
      const r=await fetch(`/api/play?q=${encodeURIComponent(q)}`)
      const data=await r.json()
      if(!r.ok || !data.status) throw new Error(data.error || 'Audio tidak tersedia.')
      if(id!==requestId.current)return
      setCurrent({...track,...data.track,id:track.id})
      setAudioUrl(data.audioUrl)
      setHistory(old=>[track,...old.filter(t=>t.id!==track.id)].slice(0,60))
    } catch(err) { if(id===requestId.current)setError(err.message || 'Gagal menyiapkan audio.') }
    finally { if(id===requestId.current)setBusy(false) }
  }
  function togglePlay() {
    const a=audioRef.current;if(!a || !audioUrl)return
    if(a.paused) a.play().then(()=>setPlaying(true)).catch(()=>setError('Audio gagal diputar. Coba lagu lain.'))
    else {a.pause();setPlaying(false)}
  }
  function nextTrack() {
    if(!queue.length)return
    const idx=shuffle?Math.floor(Math.random()*queue.length):(queueIndex+1)%queue.length
    playTrack(queue[idx],queue)
  }
  function previousTrack() {
    if(!queue.length)return
    const idx=(queueIndex-1+queue.length)%queue.length
    playTrack(queue[idx],queue)
  }
  function toggleFavorite(track) { setFavorites(old=>old.some(t=>t.id===track.id)?old.filter(t=>t.id!==track.id):[track,...old]) }
  function createPlaylist(e) {
    e.preventDefault();const name=playlistName.trim();if(!name)return
    const p={id:crypto.randomUUID?.()||String(Date.now()),name,tracks:[]}
    setPlaylists(old=>[p,...old]);setPlaylistName('');setShowCreate(false);setActivePlaylist(p.id);setPage('Playlist')
  }
  function addToPlaylist(track,id) { setPlaylists(old=>old.map(p=>p.id===id?{...p,tracks:p.tracks.some(t=>t.id===track.id)?p.tracks:[track,...p.tracks]}:p)) }
  const nav=[['Home',Home],['Cari',Search],['Trending',ChartNoAxesColumnIncreasing],['Koleksi',ListMusic]]
  return <div className="app">
    <audio ref={audioRef} src={audioUrl || undefined} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} />
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><AudioLines size={23}/></span><span>JOÜGA<span className="brand-sub">MUSIC</span></span></div>
      <p className="nav-label">MENU</p>
      {nav.map(([name,Icon])=><button key={name} className={`nav-item ${page===name?'active':''}`} onClick={()=>{setPage(name==='Koleksi'?'Favorit':name);setError('')}}><Icon size={19}/>{name}</button>)}
      <p className="nav-label space-top">KOLEKSI KAMU</p>
      <button className={`nav-item ${page==='Favorit'?'active':''}`} onClick={()=>setPage('Favorit')}><Heart size={19}/>Favorit</button>
      <button className={`nav-item ${page==='Riwayat'?'active':''}`} onClick={()=>setPage('Riwayat')}><Clock3 size={19}/>Baru diputar</button>
      <button className={`nav-item ${page==='Playlist'?'active':''}`} onClick={()=>setPage('Playlist')}><ListMusic size={19}/>Playlist</button>
      <div className="sidebar-bottom"><div className="profile"><div className="avatar"><CircleUserRound/></div><div><b>Music lover</b><small>Guest mode</small></div></div><div className="pwa-note"><Sparkles size={16}/><span>Musikmu, gayamu.<br/><small>Simpan web ke layar utama.</small></span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="mobile-brand"><AudioLines/> JOÜGA MUSIC</div><div className="top-spacer"/><span className="online-dot"/> <span className="top-caption">Your sound, your world</span><button className="icon-btn" title="Pengaturan" onClick={()=>setError('Pengaturan akun akan ditambahkan pada versi berikutnya.')}><Settings size={19}/></button></header>
      <section className="content">
        {page==='Home' && <>
          <div className="greeting"><div><p className="eyebrow"><Sparkles size={14}/> YOUR PERSONAL SOUNDTRACK</p><h1>Hai, music <span>lover.</span></h1><p className="subheading">Temukan lagu yang cocok dengan suasana hatimu.</p></div><div className="hero-orb"><Disc3 size={110} strokeWidth={1}/></div></div>
          <div className="filter-row">{['Semua','Rilis Baru','Trending','Top Hits','Santai'].map((v,i)=><button key={v} className={`chip ${i===0?'selected':''}`} onClick={()=>{setQuery(i===0?'':v==='Rilis Baru'?'new release':v==='Santai'?'chill music':v);if(i!==0){setTimeout(()=>document.getElementById('search-input')?.focus(),0)}}}>{v}</button>)}</div>
          <section className="section"><div className="section-head"><div><p className="eyebrow">PILIHAN MINGGU INI</p><h2>Curated & trending</h2></div><button className="text-link" onClick={()=>{setQuery('trending music');setPage('Cari')}}>Jelajahi <ChevronRight size={16}/></button></div>
            <div className="hero-card"><div className="hero-copy"><span className="pill"><Sparkles size={13}/> MADE FOR YOUR MOOD</span><h2>Discover<br/>your next favorite.</h2><p>Temukan favorit baru.<br/>Satu lagu, sejuta suasana.</p><button className="round-play" onClick={()=>{setQuery('popular music');setPage('Cari')}}><Search size={18}/> Cari musik</button></div><div className="hero-art"><div className="vinyl"><div className="vinyl-center"><AudioLines size={30}/></div></div><div className="floating-note note-one">♫</div><div className="floating-note note-two">♪</div></div></div>
          </section>
          <section className="section"><div className="section-head"><div><p className="eyebrow">DIPILIH UNTUKMU</p><h2>Pilihan harian</h2></div><button className="text-link" onClick={()=>setPage('Hasil pencarian')}>Lihat semua <ChevronRight size={16}/></button></div>
            {results.length? <TrackList tracks={results.slice(0,5)} current={current} playing={playing} busy={busy} favorites={favorites} onPlay={playTrack} onFavorite={toggleFavorite} onAdd={t=>{setCurrent(t);setShowCreate(true)}}/>:<div className="empty-picks"><div className="empty-icon"><Music2 size={26}/></div><div><b>Playlist kamu dimulai di sini</b><p>Cari lagu favorit untuk mengisi pilihan harianmu.</p></div><button className="outline-btn" onClick={()=>setPage('Cari')}>Cari lagu</button></div>}
          </section>
        </>}
        {page==='Cari' && <section className="section search-page"><p className="eyebrow">TEMUKAN SUARAMU</p><h1>Jelajahi musik.</h1><p className="subheading">Cari judul lagu atau nama artis favoritmu.</p><form className="searchbar" onSubmit={search}><Search/><input id="search-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Lagu, artis, atau suasana..." autoFocus/><button type="submit" disabled={searching}>{searching?'Mencari...':'Cari'}</button></form>{error&&<div className="notice">{error}</div>}{searching&&<div className="loading"><span className="loader"/> Mencari lagu...</div>}{!searching&&results.length>0&&<><div className="section-head results-head"><h2>Hasil pencarian <span>({results.length})</span></h2></div><TrackList tracks={results} current={current} playing={playing} busy={busy} favorites={favorites} onPlay={playTrack} onFavorite={toggleFavorite} onAdd={t=>{setCurrent(t);setShowCreate(true)}}/></>}</section>}
        {page==='Hasil pencarian' && <section className="section"><p className="eyebrow">HASIL PENCARIAN</p><h1>Musik yang kamu cari.</h1><form className="searchbar" onSubmit={search}><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari lagu atau artis..."/><button type="submit" disabled={searching}>{searching?'Mencari...':'Cari'}</button></form>{error&&<div className="notice">{error}</div>}{searching?<div className="loading"><span className="loader"/> Mencari lagu...</div>:<TrackList tracks={results} current={current} playing={playing} busy={busy} favorites={favorites} onPlay={playTrack} onFavorite={toggleFavorite} onAdd={t=>{setCurrent(t);setShowCreate(true)}}/>}</section>}
        {page==='Trending' && <section className="section"><p className="eyebrow">SEDANG BANYAK DIDENGAR</p><h1>Trending sekarang.</h1><p className="subheading">Cari lagu populer dari katalog pencarian.</p><button className="outline-btn" onClick={()=>{setQuery('trending');setPage('Cari')}}><Search size={17}/> Cari lagu trending</button></section>}
        {page==='Favorit' && <Collection title="Lagu favorit" subtitle="Lagu yang kamu tandai dengan hati." tracks={favorites} current={current} playing={playing} busy={busy} favorites={favorites} onPlay={playTrack} onFavorite={toggleFavorite} onAdd={t=>{setCurrent(t);setShowCreate(true)}}/>}
        {page==='Riwayat' && <Collection title="Baru diputar" subtitle="Riwayat tersimpan di perangkat ini." tracks={history} current={current} playing={playing} busy={busy} favorites={favorites} onPlay={playTrack} onFavorite={toggleFavorite} onAdd={t=>{setCurrent(t);setShowCreate(true)}}/>}
        {page==='Playlist' && <section className="section"><p className="eyebrow">RUANG MUSIK PRIBADIMU</p><div className="section-head"><div><h1>Playlist kamu.</h1><p className="subheading">Kumpulkan lagu sesuai suasana.</p></div><button className="primary-btn" onClick={()=>setShowCreate(true)}><Plus size={17}/> Buat playlist</button></div>{playlists.length===0?<div className="empty-state"><ListMusic size={36}/><h3>Belum ada playlist</h3><p>Buat playlist pertama kamu, lalu tambahkan lagu dari hasil pencarian.</p><button className="primary-btn" onClick={()=>setShowCreate(true)}><Plus size={17}/> Buat playlist</button></div>:<div className="playlist-grid">{playlists.map(p=><button className={`playlist-card ${activePlaylist===p.id?'chosen':''}`} key={p.id} onClick={()=>setActivePlaylist(p.id)}><div className="playlist-cover"><ListMusic size={28}/></div><b>{p.name}</b><small>{p.tracks.length} lagu</small><span className="playlist-open" onClick={e=>{e.stopPropagation();setActivePlaylist(p.id)}}>Buka <ChevronRight size={15}/></span></button>)}</div>}{activePlaylist&&<div className="playlist-detail"><div className="section-head"><h2>{playlists.find(p=>p.id===activePlaylist)?.name}</h2><button className="text-link" onClick={()=>setActivePlaylist(null)}>Tutup</button></div><TrackList tracks={playlists.find(p=>p.id===activePlaylist)?.tracks||[]} current={current} playing={playing} busy={busy} favorites={favorites} onPlay={playTrack} onFavorite={toggleFavorite} onAdd={t=>{setCurrent(t);setShowCreate(true)}}/></div>}</section>}
      </section>
    </main>
    {current&&<div className="player">
      <div className="player-track"><Art track={current}/><div className="track-meta"><b>{current.title}</b><small>{current.artist}</small></div><button className={`heart-btn ${favorites.some(t=>t.id===current.id)?'liked':''}`} onClick={()=>toggleFavorite(current)} title="Favorit"><Heart size={18} fill={favorites.some(t=>t.id===current.id)?'currentColor':'none'}/></button></div>
      <div className="player-center"><div className="player-controls"><button className={shuffle?'control-on':''} onClick={()=>setShuffle(!shuffle)} title="Acak"><Shuffle size={16}/></button><button onClick={previousTrack} title="Sebelumnya"><SkipBack size={18} fill="currentColor"/></button><button className="main-play" onClick={togglePlay} disabled={!audioUrl||busy}>{busy?<span className="mini-loader"/>:playing?<Pause size={19} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}</button><button onClick={nextTrack} title="Berikutnya"><SkipForward size={18} fill="currentColor"/></button><button className={repeat?'control-on':''} onClick={()=>setRepeat(!repeat)} title="Ulangi"><Repeat2 size={16}/></button></div><div className="timeline"><span>{fmt(progress)}</span><input aria-label="Posisi lagu" type="range" min="0" max={duration||100} value={Math.min(progress,duration||100)} onChange={e=>{if(audioRef.current)audioRef.current.currentTime=Number(e.target.value)}}/><span>{fmt(duration)}</span></div></div>
      <div className="player-right"><Volume2 size={18}/><input aria-label="Volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/><button title="Tutup player" onClick={()=>{audioRef.current?.pause();setCurrent(null);setAudioUrl('');setPlaying(false)}}><X size={18}/></button></div>
    </div>}
    <nav className="mobile-nav">{nav.map(([name,Icon])=><button key={name} className={page===name?'active':''} onClick={()=>setPage(name==='Koleksi'?'Favorit':name)}><Icon size={20}/><span>{name}</span></button>)}</nav>
    {showCreate&&<div className="modal-backdrop" onClick={()=>setShowCreate(false)}><form className="modal" onClick={e=>e.stopPropagation()} onSubmit={createPlaylist}><button type="button" className="modal-close" onClick={()=>setShowCreate(false)}><X/></button><div className="modal-icon"><ListMusic/></div><h2>Buat playlist</h2><p>Beri nama untuk koleksi musik barumu.</p><input autoFocus value={playlistName} onChange={e=>setPlaylistName(e.target.value)} placeholder="Misalnya: Night Drive" maxLength={50}/><button className="primary-btn" type="submit">Buat playlist</button><small>Setelah dibuat, gunakan tombol + pada lagu untuk menambahkannya.</small></form></div>}
    {showCreate&&current&&<div className="add-track-pop"><b>Tambahkan “{current.title}” ke playlist</b>{playlists.length?playlists.map(p=><button key={p.id} onClick={()=>{addToPlaylist(current,p.id);setShowCreate(false)}}><ListMusic size={16}/>{p.name}<Plus size={15}/></button>):<small>Buat playlist dahulu untuk menambahkan lagu.</small>}</div>}
    {error&&page!=='Cari'&&page!=='Hasil pencarian'&&<button className="toast" onClick={()=>setError('')}>{error}<X size={16}/></button>}
  </div>
}
function TrackList({tracks,current,playing,busy,favorites,onPlay,onFavorite,onAdd}) {
  if(!tracks?.length)return <div className="empty-state"><Music2 size={34}/><h3>Belum ada lagu di sini</h3><p>Cari musik terlebih dahulu atau pilih lagu dari hasil pencarian.</p></div>
  return <div className="track-list">{tracks.map((t,i)=><div className={`track-row ${current?.id===t.id?'track-active':''}`} key={t.id||i}><span className="track-number">{String(i+1).padStart(2,'0')}</span><button className="track-main" onClick={()=>onPlay(t,tracks)}><Art track={t}/><span className="track-meta"><b>{t.title}</b><small>{t.artist}</small></span></button><span className="track-album">{t.album||'Single'}</span><span className="track-duration">{t.duration||'--:--'}</span><button className={`heart-btn ${favorites.some(f=>f.id===t.id)?'liked':''}`} onClick={()=>onFavorite(t)} title="Favorit"><Heart size={17} fill={favorites.some(f=>f.id===t.id)?'currentColor':'none'}/></button><button className="row-play" onClick={()=>onPlay(t,tracks)} title="Putar">{busy&&current?.id===t.id?<span className="mini-loader"/>:current?.id===t.id&&playing?<Pause size={17}/>:<Play size={17} fill="currentColor"/>}</button><button className="add-btn" onClick={()=>onAdd(t)} title="Tambah ke playlist"><Plus size={17}/></button></div>)}</div>
}
function Collection({title,subtitle,tracks,...props}) {
  return <section className="section"><p className="eyebrow">KOLEKSI PRIBADI</p><h1>{title}.</h1><p className="subheading">{subtitle}</p><TrackList tracks={tracks} {...props}/></section>
}
