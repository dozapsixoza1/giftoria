"use client";
import { useEffect, useMemo, useState } from "react";

type Gift = { id: string; sticker?: { sticker_type?: string; file_id?: string; emoji?: string; set_name?: string }; star_count?: number; upgrade_star_count?: number; total_count?: number; remaining_count?: number };
type Tab = "home" | "marketplace" | "collection" | "profile";
declare global { interface Window { Telegram?: { WebApp?: { initData?: string; ready: () => void; expand: () => void; themeParams?: Record<string, string> } } } }

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<{id:number;first_name:string;username?:string}|null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    const initData = window.Telegram?.WebApp?.initData || "";
    if (initData) fetch("/api/auth", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({initData}) })
      .then(r => r.json()).then(d => { if (d.user) setUser(d.user); }).catch(() => {});
    fetch("/api/gifts").then(r => r.json()).then(d => { setGifts(d.gifts || []); setConfigured(!!d.configured); if (d.error) setError(d.error); }).catch(() => setError("Could not load the catalog.")).finally(() => setLoading(false));
  }, []);
  const title = useMemo(() => ({home:"Discover", marketplace:"Gift catalog", collection:"My collection", profile:"Your profile"}[tab]), [tab]);
  return <main className="shell">
    <header className="topbar"><a className="wordmark" href="#">GIFTORIA<span>®</span></a><span className="status">DIGITAL COLLECTIBLES</span></header>
    <section className="hero"><p className="eyebrow">A NEW WORLD OF DIGITAL GIFTS</p><h1>Meaningful gifts.<br/><i>Made digital.</i></h1><p className="hero-copy">Explore Telegram’s official gift catalog and keep your favorites in one place.</p><button className="primary" onClick={() => setTab("marketplace")}>Explore collection <span>↗</span></button><div className="hero-mark">G<span>✳</span></div></section>
    <section className="content"><div className="section-head"><div><p className="eyebrow">GIFTORIA / 01</p><h2>{title}</h2></div><span className="count">{gifts.length.toString().padStart(2,"0")} ITEMS</span></div>
      {tab === "profile" ? <div className="empty"><div className="empty-icon">◌</div><h3>{user ? user.first_name : "Telegram profile"}</h3><p>{user?.username ? "@"+user.username : user ? "Telegram account connected." : "Open GIFTORIA inside Telegram to securely connect your account."}</p></div> :
       tab === "collection" ? <div className="empty"><div className="empty-icon">◇</div><h3>Your collection starts here</h3><p>Official gifts you own can be displayed here once collection access is connected. No items are fabricated.</p></div> :
       loading ? <div className="loading">Loading official catalog…</div> :
       gifts.length ? <div className="gift-grid">{gifts.map(g => <article className="gift-card" key={g.id}><div className="gift-art"><span>{g.sticker?.emoji || "✳"}</span><small>TELEGRAM GIFT</small></div><div className="gift-meta"><div><h3>{g.sticker?.set_name || "Telegram Gift"}</h3><p>ID · {g.id}</p></div><b>{g.star_count ? `✦ ${g.star_count}` : "—"}</b></div></article>)}</div> :
       <div className="empty"><div className="empty-icon">✳</div><h3>{error || (configured ? "No gifts returned" : "Connect your Telegram bot")}</h3><p>{configured ? "The official Telegram catalog did not return items. Try again later." : "The live catalog will appear here after the bot token is configured on the deployment."}</p></div>}
      <p className="footnote">Catalog data is requested from Telegram Bot API. Availability and prices may change.</p>
    </section>
    <nav className="bottom-nav">{(["home","marketplace","collection","profile"] as Tab[]).map((item,i)=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}><span>{["⌂","▦","◇","○"][i]}</span>{["Home","Catalog","Collection","Profile"][i]}</button>)}</nav>
    <footer><span>GIFTORIA © 2026</span><span>CRAFTED FOR TELEGRAM</span></footer>
  </main>;
}