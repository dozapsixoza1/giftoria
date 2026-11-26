"use client";

import { useEffect, useMemo, useState } from "react";

type Gift = {
  id: string;
  sticker?: { file_id?: string; emoji?: string; set_name?: string; is_animated?: boolean; is_video?: boolean; thumbnail?: { file_id?: string } };
  star_count?: number;
  total_count?: number;
  remaining_count?: number;
  is_premium?: boolean;
  unique_gift_variant_count?: number;
};
type SavedGift = { gift_id: string; gift_name: string | null; gift_emoji: string | null; created_at: string };
type Tab = "home" | "marketplace" | "collection" | "profile";
declare global {
  interface Window {
    Telegram?: { WebApp?: { initData?: string; ready: () => void; expand: () => void; setHeaderColor?: (color: string) => void; setBackgroundColor?: (color: string) => void; HapticFeedback?: { impactOccurred: (style: string) => void } } };
  }
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [saved, setSaved] = useState<SavedGift[]>([]);
  const [user, setUser] = useState<{id:number;first_name:string;last_name?:string;username?:string;photo_url?:string}|null>(null);
  const [initData, setInitData] = useState("");
  const [auth, setAuth] = useState<"checking"|"connected"|"missing"|"error">("checking");
  const [authError, setAuthError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all"|"limited"|"premium">("all");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    app?.ready();
    app?.expand();
    app?.setHeaderColor?.("#0b0d16");
    app?.setBackgroundColor?.("#090b12");
    const data = app?.initData || "";
    setInitData(data);

    async function connect() {
      if (!data) {
        setAuth("missing");
        setAuthError("Открой приложение через Telegram-бота @giftoriarobot.");
        return;
      }
      try {
        const response = await fetch("/api/auth", {
          method: "POST", headers: {"content-type":"application/json"},
          body: JSON.stringify({initData:data}), cache: "no-store"
        });
        const result = await response.json();
        if (!response.ok || !result.user) {
          setAuth("error");
          setAuthError(result.error === "Invalid or expired Telegram session"
            ? "Telegram не подтвердил сессию. Закрой Mini App и открой заново через @giftoriarobot. Если ошибка останется, проверь, что TELEGRAM_BOT_TOKEN принадлежит именно этому боту."
            : result.error || "Не удалось подключить Telegram-профиль.");
          return;
        }
        setUser(result.user);
        setAuth("connected");
        setAuthError("");
        const collectionResponse = await fetch("/api/collection?initData=" + encodeURIComponent(data), {cache:"no-store"});
        const collection = await collectionResponse.json();
        if (collectionResponse.ok && Array.isArray(collection.gifts)) setSaved(collection.gifts);
      } catch {
        setAuth("error");
        setAuthError("Не удалось связаться с сервером. Попробуй ещё раз.");
      }
    }
    connect();

    fetch("/api/gifts", {cache:"no-store"})
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Каталог Telegram временно недоступен.");
        setGifts(Array.isArray(result.gifts) ? result.gifts : []);
        setConfigured(!!result.configured);
        if (result.error) setCatalogError(result.error);
      })
      .catch(error => setCatalogError(error instanceof Error ? error.message : "Не удалось загрузить каталог."))
      .finally(() => setLoading(false));
  }, []);

  const visibleGifts = useMemo(() => gifts.filter(gift => {
    const term = query.trim().toLowerCase();
    const matches = !term || gift.id.toLowerCase().includes(term) || (gift.sticker?.emoji || "").includes(term) || (gift.sticker?.set_name || "").toLowerCase().includes(term);
    const category = filter === "all" || (filter === "limited" ? typeof gift.total_count === "number" : !!gift.is_premium);
    return matches && category;
  }), [gifts, query, filter]);

  const isSaved = (id: string) => saved.some(item => item.gift_id === id);

  async function toggleSaved(gift: Gift) {
    if (auth !== "connected" || !initData) {
      setTab("profile");
      setAuthError("Открой GIFTORIA через @giftoriarobot, чтобы сохранять подарки.");
      return;
    }
    setSavingId(gift.id);
    try {
      const exists = isSaved(gift.id);
      const response = await fetch("/api/collection", {
        method: exists ? "DELETE" : "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({initData, giftId:gift.id, giftName:gift.sticker?.set_name || "Telegram Gift", giftEmoji:gift.sticker?.emoji || ""})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось обновить коллекцию.");
      if (exists) setSaved(items => items.filter(item => item.gift_id !== gift.id));
      else setSaved(items => [{gift_id:gift.id,gift_name:gift.sticker?.set_name || "Telegram Gift",gift_emoji:gift.sticker?.emoji || "",created_at:new Date().toISOString()},...items]);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Не удалось обновить коллекцию.");
    } finally {
      setSavingId("");
    }
  }

  const goCatalog = () => setTab("marketplace");

  return <main className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="topbar">
      <button className="brand" onClick={() => setTab("home")}><span className="brand-mark">G</span> GIFTORIA<sup>✦</sup></button>
      <div className="topbar-right"><span className={auth==="connected"?"connection connected":"connection"}><i/>{auth==="connected"?"CONNECTED":"TELEGRAM APP"}</span><button className="avatar-button" onClick={() => setTab("profile")}>{user?.photo_url?<img src={user.photo_url} alt=""/>:<span>{user?.first_name?.slice(0,1)?.toUpperCase()||"✦"}</span>}</button></div>
    </header>

    {tab==="home" && <>
      <section className="hero-panel">
        <div className="hero-copy"><div className="overline"><span className="live-dot"/> THE TELEGRAM GIFT UNIVERSE</div><h1>Collect the<br/><em>extraordinary.</em></h1><p>Explore official Telegram gifts, discover special designs and build your own digital collection.</p><button className="primary-button" onClick={goCatalog}>Explore gifts <span>↗</span></button></div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit-core">✦</div><div className="float-gift gift-a">🎁</div><div className="float-gift gift-b">💎</div><div className="float-gift gift-c">🌟</div><div className="orbit-caption">DIGITAL<br/>TREASURES</div></div>
        <div className="hero-bottom"><span>OFFICIAL TELEGRAM CATALOG</span><span>DISCOVER SOMETHING NEW ↓</span></div>
      </section>
      <section className="stats-row"><div><strong>{gifts.length.toString().padStart(2,"0")}</strong><span>AVAILABLE GIFTS</span></div><div><strong>{saved.length.toString().padStart(2,"0")}</strong><span>IN YOUR COLLECTION</span></div><div><strong>∞</strong><span>WAYS TO DISCOVER</span></div></section>
      <section className="section-block"><div className="section-heading"><div><span className="kicker">FROM THE TELEGRAM CATALOG</span><h2>Featured gifts</h2></div><button className="text-link" onClick={goCatalog}>View all →</button></div>
        {loading?<div className="skeleton-grid">{[1,2,3].map(n=><div className="skeleton-card" key={n}/>)}</div>:gifts.length?<div className="gift-grid">{gifts.slice(0,3).map(gift=><GiftCard key={gift.id} gift={gift} saved={isSaved(gift.id)} saving={savingId===gift.id} onSave={()=>toggleSaved(gift)}/>)}</div>:<CatalogEmpty configured={configured} error={catalogError}/>}
      </section>
    </>}

    {tab==="marketplace" && <section className="section-block catalog-page">
      <div className="page-intro"><span className="kicker">THE OFFICIAL TELEGRAM FEED</span><h1>Gift <em>catalog.</em></h1><p>Real gift entries returned by Telegram — no invented items or fake NFT claims.</p></div>
      <div className="catalog-toolbar"><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search gifts or ID..."/></div><div className="filter-row">{(["all","limited","premium"] as const).map(value=><button key={value} className={filter===value?"filter-chip selected":"filter-chip"} onClick={()=>setFilter(value)}>{value==="all"?"All gifts":value==="limited"?"Limited":"Premium"}</button>)}</div></div>
      <div className="results-line"><span>{loading?"SYNCING WITH TELEGRAM…":visibleGifts.length+" GIFTS FOUND"}</span><span>LIVE CATALOG</span></div>
      {loading?<div className="skeleton-grid">{[1,2,3,4,5,6].map(n=><div className="skeleton-card" key={n}/>)}</div>:visibleGifts.length?<div className="gift-grid">{visibleGifts.map(gift=><GiftCard key={gift.id} gift={gift} saved={isSaved(gift.id)} saving={savingId===gift.id} onSave={()=>toggleSaved(gift)}/>)}</div>:<CatalogEmpty configured={configured} error={catalogError}/>}
      <p className="catalog-note">The Bot API lists gifts currently available to bots. It does not expose a complete archive of every collectible model and every NFT ever issued.</p>
    </section>}

    {tab==="collection" && <section className="section-block collection-page">
      <div className="page-intro"><span className="kicker">YOUR PERSONAL SPACE</span><h1>My <em>collection.</em></h1><p>Keep your favourite Telegram gift designs close.</p></div>
      {auth!=="connected"?<AuthNotice state={auth} message={authError} onRetry={()=>window.location.reload()}/>:saved.length?<div className="gift-grid">{saved.map(item=><article className="gift-card saved-card" key={item.gift_id}><div className="gift-art saved-art"><span>{item.gift_emoji||"✦"}</span><small>BOOKMARKED GIFT</small></div><div className="gift-info"><div><h3>{item.gift_name||"Telegram Gift"}</h3><p>GIFT ID · {item.gift_id}</p></div><button className="save-button saved" onClick={()=>toggleSaved({id:item.gift_id,sticker:{set_name:item.gift_name||undefined,emoji:item.gift_emoji||undefined}})}>✓ Saved</button></div></article>)}</div>:<div className="empty-state"><span className="empty-symbol">◇</span><h3>Your collection is waiting</h3><p>Save gifts from the catalog and they will appear here.</p><button className="primary-button" onClick={goCatalog}>Browse gifts ↗</button></div>}
      <p className="catalog-note">Saved items are bookmarks, not proof of ownership of a Telegram collectible or NFT.</p>
    </section>}

    {tab==="profile" && <section className="section-block profile-page">
      <div className="page-intro"><span className="kicker">ACCOUNT CENTER</span><h1>Your <em>profile.</em></h1></div>
      {auth==="connected"&&user?<div className="profile-card"><div className="profile-avatar">{user.photo_url?<img src={user.photo_url} alt=""/>:user.first_name.slice(0,1).toUpperCase()}</div><div className="profile-details"><span className="verified-label"><i/> TELEGRAM VERIFIED SESSION</span><h2>{user.first_name} {user.last_name||""}</h2><p>{user.username?"@"+user.username:"Telegram user"}</p><div className="profile-stats"><div><b>{saved.length}</b><span>SAVED GIFTS</span></div><div><b>{gifts.length}</b><span>CATALOG ITEMS</span></div></div></div></div>:<AuthNotice state={auth} message={authError} onRetry={()=>window.location.reload()}/>}
      <div className="profile-foot"><span>GIFTORIA ACCOUNT</span><span>SECURED BY TELEGRAM INIT DATA</span></div>
    </section>}

    {authError&&tab!=="profile"&&<div className="toast-error">{authError}</div>}
    <nav className="bottom-nav">{([["home","⌂","Home"],["marketplace","✧","Explore"],["collection","◇","Collection"],["profile","◉","Profile"]] as [Tab,string,string][]).map(([key,icon,label])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}><span>{icon}</span>{label}</button>)}</nav>
    <footer className="app-footer"><span>GIFTORIA © 2026</span><span>MADE FOR TELEGRAM <b>✦</b></span></footer>
  </main>;
}

function GiftCard({gift,saved,saving,onSave}:{gift:Gift;saved:boolean;saving:boolean;onSave:()=>void}) {
  const fileId=gift.sticker?.thumbnail?.file_id||(!gift.sticker?.is_animated&&!gift.sticker?.is_video?gift.sticker?.file_id:undefined);
  return <article className="gift-card"><div className="gift-art"><div className="art-glow"/>{fileId?<img className="gift-image" src={"/api/gift-image?fileId="+encodeURIComponent(fileId)} alt={gift.sticker?.emoji||"Telegram gift"} loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<span className="gift-emoji">{gift.sticker?.emoji||"✦"}</span>}{gift.total_count?<span className="limited-badge">LIMITED</span>:gift.is_premium?<span className="limited-badge premium-badge">PREMIUM</span>:null}<span className="art-index">TG / {gift.id.slice(-5)}</span></div><div className="gift-info"><div className="gift-title"><h3>{gift.sticker?.emoji||"Telegram Gift"}</h3><p>{gift.total_count?"LIMITED · "+(gift.remaining_count??"—")+" LEFT":gift.is_premium?"PREMIUM GIFT":"OFFICIAL TELEGRAM GIFT"}</p></div><button className={saved?"save-button saved":"save-button"} disabled={saving} onClick={onSave}>{saving?"…":saved?"✓ Saved":"+ Save"}</button></div><div className="gift-card-bottom"><span>{gift.star_count?"✦ "+gift.star_count+" STARS":"TELEGRAM"}</span><span>{gift.unique_gift_variant_count?gift.unique_gift_variant_count+" VARIANTS":"COLLECTIBLE"}</span></div></article>;
}

function CatalogEmpty({configured,error}:{configured:boolean;error:string}) {
  return <div className="empty-state"><span className="empty-symbol">✧</span><h3>{error||(configured?"No gifts returned":"Catalog not connected")}</h3><p>{configured?"Telegram did not return gift entries right now. Refresh the app in a moment.":"Add TELEGRAM_BOT_TOKEN in Vercel to load the official gift catalog."}</p></div>;
}

function AuthNotice({state,message,onRetry}:{state:"checking"|"connected"|"missing"|"error";message:string;onRetry:()=>void}) {
  return <div className="auth-notice"><span className="auth-icon">{state==="checking"?"◌":"⌁"}</span><h3>{state==="checking"?"Connecting Telegram…":"Connect your Telegram account"}</h3><p>{message||"Open GIFTORIA from the Telegram bot to verify your session and load your profile."}</p><button className="primary-button" onClick={onRetry}>Try again ↻</button><a href="https://t.me/giftoriarobot" target="_blank" rel="noreferrer">Open @giftoriarobot ↗</a></div>;
}
