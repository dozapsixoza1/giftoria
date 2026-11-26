"use client";
import { useEffect, useMemo, useState } from "react";

type Gift = { id: string; sticker?: { sticker_type?: string; file_id?: string; emoji?: string; set_name?: string }; star_count?: number; upgrade_star_count?: number; total_count?: number; remaining_count?: number };
type SavedGift = { gift_id: string; gift_name: string | null; gift_emoji: string | null; created_at: string };
type Tab = "home" | "marketplace" | "collection" | "profile";
declare global { interface Window { Telegram?: { WebApp?: { initData?: string; ready: () => void; expand: () => void; themeParams?: Record<string, string> } } } }

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [saved, setSaved] = useState<SavedGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<{id:number;first_name:string;username?:string}|null>(null);
  const [initData, setInitData] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    const data = window.Telegram?.WebApp?.initData || "";
    setInitData(data);
    if (data) {
      fetch("/api/auth", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({initData:data}) })
        .then(r => r.json()).then(d => { if (d.user) setUser(d.user); if (d.error) setError(d.error); }).catch(() => {});
      fetch("/api/collection?initData="+encodeURIComponent(data))
        .then(r => r.json()).then(d => { if (Array.isArray(d.gifts)) setSaved(d.gifts); }).catch(() => {});
    }
    fetch("/api/gifts").then(r => r.json()).then(d => { setGifts(d.gifts || []); setConfigured(!!d.configured); if (d.error) setError(d.error); }).catch(() => setError("Could not load the catalog.")).finally(() => setLoading(false));
  }, []);

  const title = useMemo(() => ({home:"Discover", marketplace:"Gift catalog", collection:"Saved gifts", profile:"Your profile"}[tab]), [tab]);
  const isSaved = (giftId: string) => saved.some(item => item.gift_id === giftId);

  async function toggleSaved(gift: Gift) {
    if (!initData) { setError("Open GIFTORIA inside Telegram to save gifts."); return; }
    setSavingId(gift.id);
    setError("");
    try {
      const response = await fetch("/api/collection", {
        method: isSaved(gift.id) ? "DELETE" : "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({initData, giftId:gift.id, giftName:gift.sticker?.set_name || "Telegram Gift", giftEmoji:gift.sticker?.emoji || ""})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update saved gifts.");
      if (isSaved(gift.id)) setSaved(items => items.filter(item => item.gift_id !== gift.id));
      else setSaved(items => [{gift_id:gift.id,gift_name:gift.sticker?.set_name || "Telegram Gift",gift_emoji:gift.sticker?.emoji || "",created_at:new Date().toISOString()},...items]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update saved gifts."); }
    finally { setSavingId(""); }
  }

  return <main className="shell">
    <header className="topbar"><a className="wordmark" href="#">GIFTORIA<span>®</span></a><span className="status">DIGITAL COLLECTIBLES</span></header>
    <section className="hero"><p className="eyebrow">A NEW WORLD OF DIGITAL GIFTS</p><h1>Meaningful gifts.<br/><i>Made digital.</i></h1><p className="hero-copy">Explore Telegram’s official gift catalog and keep your favorites in one place.</p><button className="primary" onClick={() => setTab("marketplace")}>Explore collection <span>↗</span></button><div className="hero-mark">G<span>✳</span></div></section>
    <section className="content"><div className="section-head"><div><p className="eyebrow">GIFTORIA / 01</p><h2>{title}</h2></div><span className="count">{(tab === "collection" ? saved.length : gifts.length).toString().padStart(2,"0")} ITEMS</span></div>
      {error && <p className="inline-error">{error}</p>}
      {tab === "profile" ? <div className="empty"><div className="empty-icon">◌</div><h3>{user ? user.first_name : "Telegram profile"}</h3><p>{user?.username ? "@"+user.username : user ? "Telegram account connected." : "Open GIFTORIA inside Telegram to securely connect your account."}</p></div> :
       tab === "collection" ? saved.length ? <div className="gift-grid">{saved.map(item => <article className="gift-card" key={item.gift_id}><div className="gift-art"><span>{item.gift_emoji || "✳"}</span><small>SAVED TELEGRAM GIFT</small></div><div className="gift-meta"><div><h3>{item.gift_name || "Telegram Gift"}</h3><p>ID · {item.gift_id}</p></div><button className="save-button" onClick={() => toggleSaved({id:item.gift_id,sticker:{set_name:item.gift_name || undefined,emoji:item.gift_emoji || undefined}})}>Remove</button></div></article>)}</div> : <div className="empty"><div className="empty-icon">◇</div><h3>No saved gifts yet</h3><p>Save items from the official Telegram catalog to keep them here. Saved items are bookmarks, not proof of NFT ownership.</p></div> :
       loading ? <div className="loading">Loading official catalog…</div> :
       gifts.length ? <div className="gift-grid">{gifts.map(g => <article className="gift-card" key={g.id}><div className="gift-art"><span>{g.sticker?.emoji || "✳"}</span><small>TELEGRAM GIFT</small></div><div className="gift-meta"><div><h3>{g.sticker?.set_name || "Telegram Gift"}</h3><p>ID · {g.id}</p></div><button className="save-button" disabled={savingId===g.id} onClick={() => toggleSaved(g)}>{savingId===g.id ? "…" : isSaved(g.id) ? "Saved ✓" : "Save +"}</button></div></article>)}</div> :
       <div className="empty"><div className="empty-icon">✳</div><h3>{error || (configured ? "No gifts returned" : "Connect your Telegram bot")}</h3><p>{configured ? "The official Telegram catalog did not return items. Try again later." : "The live catalog will appear here after the bot token is configured on the deployment."}</p></div>}
      <p className="footnote">Catalog data is requested from Telegram Bot API. Saved gifts are bookmarks only; actual NFT ownership is not verified.</p>
    </section>
    <nav className="bottom-nav">{(["home","marketplace","collection","profile"] as Tab[]).map((item,i)=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}><span>{["⌂","▦","◇","○"][i]}</span>{["Home","Catalog","Saved","Profile"][i]}</button>)}</nav>
    <footer><span>GIFTORIA © 2026</span><span>CRAFTED FOR TELEGRAM</span></footer>
  </main>;
}
