import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, onSnapshot, serverTimestamp, where, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";

const PRODUCT_CATEGORIES = ["All", "Campus", "Food", "Thrift", "Clothes", "Accessories", "Electronics", "Other"];
const SERVICE_CATEGORIES = ["All", "Airtime", "Data", "Bills", "Skills", "Gift Cards"];
const ADMIN_UID = "Hnl2ncOnVtPWbnVTz3TcU2jJUXy1";
const WELCOME_BONUS = 5000;

const GIFT_CARD_TYPES = [
  { name: "iTunes", logo: "🍎" },
  { name: "Google Play", logo: "▶️" },
  { name: "Steam", logo: "🎮" },
  { name: "Amazon", logo: "📦" },
  { name: "Xbox", logo: "🎮" },
  { name: "PlayStation", logo: "🎮" },
  { name: "Spotify", logo: "🎵" },
  { name: "Netflix", logo: "🎬" }
];

const NETWORK_PREFIXES = {
  MTN: ["0803", "0806", "0810", "0813", "0814", "0816", "0903", "0906", "0913"],
  Airtel: ["0802", "0808", "0812", "0901", "0902", "0907", "0911", "0912"],
  Glo: ["0805", "0807", "0811", "0815", "0905"],
  "9mobile": ["0809", "0817", "0818", "0908", "0909"]
};

const detectNetwork = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\s+/g, '');
  const prefix = cleaned.substring(0, 4);
  for (const [network, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix)) return network;
  }
  return null;
};

const NIGERIAN_BANKS = ["OPay", "Zenith Bank", "GTBank", "Access Bank", "First Bank", "UBA", "Kuda", "Palmpay", "Polaris Bank", "Wema Bank", "Union Bank", "Sterling Bank", "Fidelity Bank", "Keystone Bank", "FCMB", "Ecobank", "Stanbic IBTC", "Heritage Bank", "Jaiz Bank", "Providus Bank", "SunTrust Bank", "Globus Bank", "VFD Microfinance Bank", "Moniepoint", "Rubies Bank", "Sparkle Bank", "Unity Bank", "Taj Bank", "Titan Trust Bank", "PremiumTrust Bank"];

const COUNTRIES = [
  { name: "Nigeria", code: "NG", currency: "NGN", symbol: "₦", rate: 1, flag: "🇳🇬", banks: NIGERIAN_BANKS },
  { name: "United States", code: "US", currency: "USD", symbol: "$", rate: 1580, flag: "🇺🇸", banks: ["Bank of America", "Chase", "Wells Fargo", "Citibank", "US Bank", "Capital One", "PNC Bank", "TD Bank", "Truist Bank", "Fifth Third Bank"] },
  { name: "United Kingdom", code: "GB", currency: "GBP", symbol: "£", rate: 1950, flag: "🇬🇧", banks: ["HSBC", "Barclays", "Lloyds", "NatWest", "Santander", "TSB", "Nationwide", "Metro Bank", "Monzo", "Revolut"] },
  { name: "Canada", code: "CA", currency: "CAD", symbol: "C$", rate: 1150, flag: "🇨🇦", banks: ["TD Bank", "RBC", "Scotiabank", "BMO", "CIBC", "National Bank", "Tangerine", "Simplii"] },
  { name: "Ghana", code: "GH", currency: "GHS", symbol: "GH₵", rate: 130, flag: "🇬🇭", banks: ["GCB Bank", "Ecobank Ghana", "Zenith Bank Ghana", "Stanbic Bank", "Fidelity Bank", "CalBank", "Access Bank Ghana", "Absa Bank", "Standard Chartered Ghana", "Prudential Bank"] },
  { name: "Kenya", code: "KE", currency: "KES", symbol: "KSh", rate: 12, flag: "🇰🇪", banks: ["KCB Bank", "Equity Bank", "Co-operative Bank", "Barclays Kenya", "Standard Chartered Kenya", "Diamond Trust Bank", "I&M Bank", "National Bank of Kenya", "Stanbic Bank Kenya"] },
  { name: "South Africa", code: "ZA", currency: "ZAR", symbol: "R", rate: 85, flag: "🇿🇦", banks: ["Standard Bank", "Absa", "FNB", "Nedbank", "Capitec", "Discovery Bank", "TymeBank", "African Bank", "Bidvest Bank"] },
  { name: "France", code: "FR", currency: "EUR", symbol: "€", rate: 1680, flag: "🇫🇷", banks: ["BNP Paribas", "Crédit Agricole", "Société Générale", "LCL", "Banque Postale", "Crédit Mutuel", "HSBC France", "Boursorama"] },
  { name: "Germany", code: "DE", currency: "EUR", symbol: "€", rate: 1680, flag: "🇩🇪", banks: ["Deutsche Bank", "Commerzbank", "DZ Bank", "KfW", "N26", "ING Germany", "Postbank", "Sparkasse"] },
  { name: "Italy", code: "IT", currency: "EUR", symbol: "€", rate: 1680, flag: "🇮🇹", banks: ["UniCredit", "Intesa Sanpaolo", "Banco BPM", "BPER Banca", "Monte dei Paschi", "UBI Banca"] },
  { name: "Spain", code: "ES", currency: "EUR", symbol: "€", rate: 1680, flag: "🇪🇸", banks: ["Santander", "BBVA", "CaixaBank", "Bankia", "Sabadell", "Bankinter", "ING Spain"] },
  { name: "UAE", code: "AE", currency: "AED", symbol: "AED", rate: 430, flag: "🇦🇪", banks: ["Emirates NBD", "First Abu Dhabi Bank", "Dubai Islamic Bank", "ADCB", "Mashreq Bank", "RAKBANK", "Commercial Bank of Dubai"] }
];

const CRYPTO_COINS = [
  { name: "Bitcoin", symbol: "BTC", icon: "₿", buyRate: 95000000, sellRate: 93000000 },
  { name: "Ethereum", symbol: "ETH", icon: "Ξ", buyRate: 5200000, sellRate: 5100000 },
  { name: "USDT", symbol: "USDT", icon: "₮", buyRate: 1580, sellRate: 1570 },
  { name: "BNB", symbol: "BNB", icon: "BNB", buyRate: 950000, sellRate: 930000 },
  { name: "Litecoin", symbol: "LTC", icon: "Ł", buyRate: 280000, sellRate: 275000 },
  { name: "Dogecoin", symbol: "DOGE", icon: "Ð", buyRate: 580, sellRate: 570 }
];

const handleBuyProduct = async (product, user) => {
  try {
    const buyerSnap = await getDoc(doc(db, "users", user.uid));
    const buyerWallet = buyerSnap.data()?.wallet || 0;
    if (buyerWallet < product.price) {
      alert("Insufficient funds! Add money to your wallet.");
      return;
    }
    if (!window.confirm(`Confirm purchase of ${product.title} for ₦${product.price?.toLocaleString()}?`)) return;
    await updateDoc(doc(db, "users", user.uid), { wallet: buyerWallet - product.price });
    await addDoc(collection(db, "orders"), {
      productId: product.id,
      title: product.title,
      price: product.price,
      buyerId: user.uid,
      sellerId: product.sellerId || ADMIN_UID,
      type: "product",
      status: "pending",
      createdAt: serverTimestamp()
    });
    alert("✅ Order placed successfully!");
    window.location.reload();
  } catch (err) {
    alert("Error: " + err.message);
  }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("products");
  const [page, setPage] = useState("browse");
  const [editingItem, setEditingItem] = useState(null);
  const [buyingService, setBuyingService] = useState(null);
  const [buyingCrypto, setBuyingCrypto] = useState(null);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  
  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"50px",height:"50px",border:"3px solid rgba(255,255,255,0.3)",borderTop:"3px solid white",borderRadius:"50%",margin:"0 auto 16px",animation:"spin 1s linear infinite"}}></div>
        <p style={{color:"white",fontSize:"16px",fontWeight:"700"}}>Loading...</p>
      </div>
    </div>
  );
  
  if (!user) return <AuthPage onLogin={setUser} />;
  const isAdmin = user.uid === ADMIN_UID;
  
  return (
    <div style={{background:"linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%)",minHeight:"100vh"}}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(255,107,53,0.2) !important; }
      `}</style>
      <Header user={user} section={section} setSection={setSection} setPage={setPage} isAdmin={isAdmin} />
      {section === "products" && (
        <>
          {page === "browse" && <ProductsBrowse user={user} isAdmin={isAdmin} setPage={setPage} setEditingItem={setEditingItem} />}
          {page === "add-product" && isAdmin && <AddProduct user={user} setPage={setPage} editingItem={editingItem} setEditingItem={setEditingItem} />}
        </>
      )}
      {section === "services" && (
        <>
          {page === "browse" && <ServicesBrowse user={user} isAdmin={isAdmin} setPage={setPage} setEditingItem={setEditingItem} setBuyingService={setBuyingService} />}
          {page === "add-service" && isAdmin && <AddService user={user} setPage={setPage} editingItem={editingItem} setEditingItem={setEditingItem} />}
        </>
      )}
      {section === "tickets" && (
        <>
          {page === "browse" && <TicketsBrowse user={user} isAdmin={isAdmin} setPage={setPage} setEditingItem={setEditingItem} />}
          {page === "add-ticket" && isAdmin && <AddTicket user={user} setPage={setPage} editingItem={editingItem} setEditingItem={setEditingItem} />}
        </>
      )}
      {page === "crypto" && <CryptoExchange user={user} buyingCrypto={buyingCrypto} setBuyingCrypto={setBuyingCrypto} setPage={setPage} />}
      {page === "profile" && <ProfilePage user={user} />}
      {page === "orders" && <OrdersPage user={user} isAdmin={isAdmin} />}
      {page === "transfer" && <MoneyTransfer user={user} />}
      {page === "settings" && <SettingsPage user={user} setPage={setPage} />}
      {buyingService && <BuyServiceModal service={buyingService} user={user} onClose={() => setBuyingService(null)} />}
      <NavBar page={page} setPage={setPage} section={section} />
    </div>
  );
};

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        onLogin(cred.user);
      } else {
        if (!name.trim()) {
          setError("Please enter your name");
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          name: name.trim(),
          email,
          createdAt: serverTimestamp(),
          rating: 0,
          totalSales: 0,
          wallet: WELCOME_BONUS,
          notifications: true
        });
        alert(`🎉 Welcome! You got ₦${WELCOME_BONUS.toLocaleString()} bonus!`);
        onLogin(cred.user);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };
  
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",padding:"20px"}}>
      <div style={{background:"white",padding:"36px",borderRadius:"20px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"100%",maxWidth:"400px",animation:"fadeIn 0.6s ease"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{width:"60px",height:"60px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",borderRadius:"14px",margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 16px rgba(255,107,53,0.4)"}}>
            <svg width="30" height="30" fill="white" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </div>
          <h1 style={{fontSize:"32px",fontWeight:"900",marginBottom:"6px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>QuickSell</h1>
          <p style={{color:"#666",fontSize:"14px",fontWeight:"600"}}>Your Marketplace</p>
        </div>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={{width:"100%",padding:"12px",marginBottom:"14px",border:"2px solid #f0f0f0",borderRadius:"10px",fontSize:"14px",fontWeight:"500",outline:"none"}} />
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{width:"100%",padding:"12px",marginBottom:"14px",border:"2px solid #f0f0f0",borderRadius:"10px",fontSize:"14px",fontWeight:"500",outline:"none"}} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{width:"100%",padding:"12px",marginBottom:"14px",border:"2px solid #f0f0f0",borderRadius:"10px",fontSize:"14px",fontWeight:"500",outline:"none"}} />
          {error && <div style={{color:"#d32f2f",marginBottom:"14px",fontSize:"12px",fontWeight:"600",padding:"10px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"10px",fontSize:"15px",fontWeight:"800",cursor:loading?"not-allowed":"pointer",boxShadow:"0 6px 16px rgba(255,107,53,0.4)"}}>
            {loading ? "WAIT..." : (isLogin ? "SIGN IN" : "SIGN UP")}
          </button>
        </form>
        <p style={{marginTop:"18px",textAlign:"center",color:"#666",fontSize:"13px",fontWeight:"500"}}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setIsLogin(!isLogin)} style={{color:"#FF6B35",fontWeight:"800",cursor:"pointer"}}>
            {isLogin ? "Sign Up" : "Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
};
const Header = ({ user, section, setSection, setPage, isAdmin }) => {
  const [userData, setUserData] = useState(null);
  const [showAddMoney, setShowAddMoney] = useState(false);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });
    return () => unsub();
  }, [user]);
  return (
    <>
      <div style={{background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",padding:"14px 16px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 10px rgba(255,107,53,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:"1200px",margin:"0 auto"}}>
          <h1 onClick={() => {setSection("products"); setPage("browse");}} style={{fontSize:"20px",fontWeight:"900",color:"white",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px"}}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
            QuickSell
          </h1>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{fontSize:"12px",color:"white",fontWeight:"600"}}>Hi, <span style={{fontWeight:"800"}}>{userData?.name?.split(' ')[0] || "User"}</span></div>
            <div onClick={() => setShowAddMoney(true)} style={{padding:"6px 14px",background:"rgba(255,255,255,0.2)",backdropFilter:"blur(10px)",borderRadius:"16px",fontSize:"13px",fontWeight:"800",color:"white",cursor:"pointer",border:"2px solid rgba(255,255,255,0.3)"}}>
              ₦{(userData?.wallet || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      <div style={{background:"white",borderBottom:"2px solid #f0f0f0",padding:"10px 16px",position:"sticky",top:"56px",zIndex:99}}>
        <div style={{display:"flex",gap:"6px",maxWidth:"1200px",margin:"0 auto",overflowX:"auto"}}>
          {["products", "services", "tickets"].map(s => (
            <button key={s} onClick={() => {setSection(s); setPage("browse");}} style={{padding:"8px 16px",background:section===s?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"#f8f9fa",color:section===s?"white":"#666",border:"none",borderRadius:"16px",fontSize:"13px",fontWeight:"800",cursor:"pointer",textTransform:"capitalize",boxShadow:section===s?"0 3px 8px rgba(255,107,53,0.3)":"none",whiteSpace:"nowrap"}}>
              {s}
            </button>
          ))}
          <button onClick={() => setPage("crypto")} style={{padding:"8px 16px",background:section==="crypto"?"linear-gradient(135deg, #FBC02D 0%, #F57F17 100%)":"#f8f9fa",color:section==="crypto"?"white":"#666",border:"none",borderRadius:"16px",fontSize:"13px",fontWeight:"800",cursor:"pointer",boxShadow:section==="crypto"?"0 3px 8px rgba(251,192,45,0.3)":"none",whiteSpace:"nowrap"}}>
            💰 Crypto
          </button>
        </div>
      </div>
      {showAddMoney && <AddMoneyModal user={user} onClose={() => setShowAddMoney(false)} />}
    </>
  );
};

const AddMoneyModal = ({ user, onClose }) => {
  const [amount, setAmount] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const handleScreenshotChange = (e) => { if (e.target.files[0]) setScreenshot(e.target.files[0]); };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!amount) { setError("Please enter amount"); return; }
    setUploading(true);
    try {
      let screenshotUrl = "no-screenshot";
      if (screenshot) {
        try {
          const screenshotRef = ref(storage, `deposits/${user.uid}/${Date.now()}_${screenshot.name}`);
          await uploadBytes(screenshotRef, screenshot);
          screenshotUrl = await getDownloadURL(screenshotRef);
        } catch (err) {
          console.log("Screenshot upload failed:", err);
        }
      }
      await addDoc(collection(db, "deposits"), {
        userId: user.uid,
        amount: parseFloat(amount),
        screenshotUrl,
        status: "pending",
        createdAt: serverTimestamp()
      });
      alert("✅ Deposit request submitted!");
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  };
  return (
    <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px",backdropFilter:"blur(5px)"}}>
      <div onClick={(e) => e.stopPropagation()} style={{background:"white",borderRadius:"16px",padding:"24px",maxWidth:"440px",width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
          <h2 style={{fontSize:"20px",fontWeight:"900",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Add Money</h2>
          <button onClick={onClose} style={{width:"32px",height:"32px",borderRadius:"50%",background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:"16px",fontWeight:"700",color:"#666"}}>×</button>
        </div>
        <div style={{padding:"16px",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",borderRadius:"10px",marginBottom:"20px",border:"2px dashed #FF6B35"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"40px",height:"40px",borderRadius:"8px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            </div>
            <div>
              <p style={{fontSize:"11px",fontWeight:"700",color:"#FF6B35",marginBottom:"3px"}}>TRANSFER TO:</p>
              <p style={{fontSize:"15px",fontWeight:"800",color:"#2C3E50"}}>OPay - 9020853814</p>
              <p style={{fontSize:"12px",fontWeight:"600",color:"#666"}}>Emmanuel Etim Kelvin</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:"16px"}}>
            <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Amount (₦)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
          </div>
          <div style={{marginBottom:"16px"}}>
            <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Payment Proof (Optional)</label>
            <input type="file" accept="image/*" onChange={handleScreenshotChange} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"13px",fontWeight:"600",cursor:"pointer"}} />
            {screenshot && <p style={{marginTop:"8px",fontSize:"13px",color:"#4CAF50",fontWeight:"700"}}>✓ {screenshot.name}</p>}
          </div>
          {error && <div style={{color:"#d32f2f",marginBottom:"16px",fontSize:"12px",fontWeight:"700",padding:"10px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
          <div style={{display:"flex",gap:"8px"}}>
            <button type="button" onClick={onClose} style={{flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>Cancel</button>
            <button type="submit" disabled={uploading} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 4px 10px rgba(255,107,53,0.4)"}}>
              {uploading ? "SUBMITTING..." : "SUBMIT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BuyServiceModal = ({ service, user, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [detectedNetwork, setDetectedNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (phoneNumber && (service.category === "Airtime" || service.category === "Data")) {
      const network = detectNetwork(phoneNumber);
      setDetectedNetwork(network);
    }
  }, [phoneNumber, service.category]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (service.category === "Airtime" || service.category === "Data") {
      if (!phoneNumber.trim()) {
        alert("Please enter phone number");
        return;
      }
      if (!detectedNetwork) {
        alert("Invalid phone number! Cannot detect network.");
        return;
      }
    }
    if (service.category === "Bills" && !accountNumber.trim()) {
      alert("Please enter meter/smartcard number");
      return;
    }
    
    setLoading(true);
    try {
      const buyerSnap = await getDoc(doc(db, "users", user.uid));
      const buyerWallet = buyerSnap.data()?.wallet || 0;
      if (buyerWallet < service.price) {
        alert("Insufficient funds! Add money to your wallet.");
        setLoading(false);
        return;
      }
      
      await updateDoc(doc(db, "users", user.uid), { wallet: buyerWallet - service.price });
      
      const orderData = {
        serviceId: service.id,
        title: service.title,
        price: service.price,
        category: service.category,
        buyerId: user.uid,
        sellerId: service.sellerId || ADMIN_UID,
        type: "service",
        status: "pending",
        createdAt: serverTimestamp()
      };
      
      if (phoneNumber) {
        orderData.phoneNumber = phoneNumber.trim();
        orderData.network = detectedNetwork;
      }
      if (accountNumber) orderData.accountNumber = accountNumber.trim();
      
      await addDoc(collection(db, "orders"), orderData);
      alert("✅ Order placed successfully!");
      onClose();
      window.location.reload();
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };
  
  return (
    <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px",backdropFilter:"blur(5px)"}}>
      <div onClick={(e) => e.stopPropagation()} style={{background:"white",borderRadius:"16px",padding:"24px",maxWidth:"440px",width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
          <h2 style={{fontSize:"18px",fontWeight:"900",color:"#2C3E50"}}>Buy {service.title}</h2>
          <button onClick={onClose} style={{width:"32px",height:"32px",borderRadius:"50%",background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:"16px",fontWeight:"700",color:"#666"}}>×</button>
        </div>
        
        <div style={{padding:"16px",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",borderRadius:"10px",marginBottom:"20px",border:"2px solid #FF6B35"}}>
          <p style={{fontSize:"12px",fontWeight:"700",color:"#FF6B35",marginBottom:"4px"}}>PRICE</p>
          <p style={{fontSize:"24px",fontWeight:"900",color:"#FF6B35"}}>₦{service.price?.toLocaleString()}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          {(service.category === "Airtime" || service.category === "Data") && (
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Phone Number</label>
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0803 123 4567" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
              {detectedNetwork && (
                <p style={{marginTop:"6px",fontSize:"13px",fontWeight:"700",color:"#4CAF50"}}>✓ Network: {detectedNetwork}</p>
              )}
              {phoneNumber && !detectedNetwork && phoneNumber.length >= 4 && (
                <p style={{marginTop:"6px",fontSize:"13px",fontWeight:"700",color:"#d32f2f"}}>❌ Invalid phone number</p>
              )}
            </div>
          )}
          
          {service.category === "Bills" && (
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Meter/Smartcard Number</label>
              <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
            </div>
          )}
          
          <div style={{display:"flex",gap:"8px"}}>
            <button type="button" onClick={onClose} style={{flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>Cancel</button>
            <button type="submit" disabled={loading} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:loading?"not-allowed":"pointer",boxShadow:"0 4px 10px rgba(76,175,80,0.4)"}}>
              {loading ? "PROCESSING..." : "CONFIRM PURCHASE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductsBrowse = ({ user, isAdmin, setPage, setEditingItem }) => {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, []);
  const filtered = products.filter(p => {
    if (category !== "All" && p.category !== category) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  
  const handleEdit = (product) => {
    setEditingItem(product);
    setPage("add-product");
  };
  
  const handleDelete = async (productId, isOwn) => {
    if (!window.confirm(isOwn ? "Delete this product?" : "⚠️ FORCE DELETE this product? This cannot be undone!")) return;
    try {
      await deleteDoc(doc(db, "products", productId));
      alert("✅ Product deleted!");
    } catch (err) { alert("Error: " + err.message); }
  };
  
  if (selectedProduct) return <ProductDetail product={selectedProduct} user={user} onBack={() => setSelectedProduct(null)} />;
  
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      {isAdmin && (
        <button onClick={() => {setEditingItem(null); setPage("add-product");}} style={{position:"fixed",bottom:"90px",right:"20px",width:"56px",height:"56px",borderRadius:"50%",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",fontSize:"28px",fontWeight:"700",cursor:"pointer",boxShadow:"0 6px 20px rgba(255,107,53,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      )}
      <input type="text" placeholder="🔍 Search products..." value={search} onChange={(e) => setSearch(e.target.value)} style={{width:"100%",padding:"12px 16px",marginBottom:"14px",border:"2px solid #f0f0f0",borderRadius:"10px",fontSize:"14px",fontWeight:"500",outline:"none"}} />
      <div style={{display:"flex",gap:"6px",marginBottom:"16px",overflowX:"auto",paddingBottom:"6px"}}>
        {PRODUCT_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{padding:"6px 14px",background:category===cat?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"white",color:category===cat?"white":"#666",border:category===cat?"none":"2px solid #f0f0f0",borderRadius:"16px",fontSize:"12px",fontWeight:"800",cursor:"pointer",whiteSpace:"nowrap",boxShadow:category===cat?"0 3px 8px rgba(255,107,53,0.3)":"none"}}>
            {cat}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 16px",background:"white",borderRadius:"14px"}}>
          <div style={{fontSize:"50px",marginBottom:"12px"}}>🛍️</div>
          <p style={{fontSize:"16px",color:"#2C3E50",fontWeight:"800"}}>No products found</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))",gap:"14px"}}>
          {filtered.map(product => {
            const isOwn = product.sellerId === user.uid;
            return (
              <div key={product.id} style={{background:"white",borderRadius:"14px",overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.08)",position:"relative"}}>
                <div onClick={() => setSelectedProduct(product)} className="card-hover" style={{cursor:"pointer"}}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title} style={{width:"100%",height:"160px",objectFit:"cover"}} />
                  ) : (
                    <div style={{width:"100%",height:"160px",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="50" height="50" fill="#FF6B35" viewBox="0 0 24 24" opacity="0.3"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>
                    </div>
                  )}
                  <div style={{padding:"12px"}}>
                    <div style={{display:"inline-block",padding:"3px 8px",background:"#FFF5F2",borderRadius:"8px",fontSize:"9px",fontWeight:"800",color:"#FF6B35",marginBottom:"6px",textTransform:"uppercase"}}>{product.category}</div>
                    <h3 style={{fontSize:"14px",fontWeight:"800",marginBottom:"8px",color:"#2C3E50",lineHeight:"1.2"}}>{product.title}</h3>
                    <p style={{fontSize:"18px",fontWeight:"900",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{product.price?.toLocaleString()}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div style={{position:"absolute",top:"8px",right:"8px",display:"flex",gap:"6px"}}>
                    {isOwn && (
                      <button onClick={() => handleEdit(product)} style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(33,150,243,0.9)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                        <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                    )}
                    <button onClick={() => handleDelete(product.id, isOwn)} style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(244,67,54,0.9)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                      <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ProductDetail = ({ product, user, onBack }) => {
  const [seller, setSeller] = useState(null);
  useEffect(() => {
    const load = async () => {
      const sellerId = product.sellerId || ADMIN_UID;
      const snap = await getDoc(doc(db, "users", sellerId));
      if (snap.exists()) setSeller(snap.data());
    };
    load();
  }, [product]);
  return (
    <div style={{maxWidth:"700px",margin:"0 auto",padding:"16px",paddingBottom:"90px"}}>
      <button onClick={onBack} style={{marginBottom:"16px",padding:"8px 16px",background:"white",border:"2px solid #f0f0f0",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:"800",color:"#2C3E50"}}>← Back</button>
      <div style={{background:"white",borderRadius:"14px",overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
        {product.imageUrl && <img src={product.imageUrl} alt={product.title} style={{width:"100%",maxHeight:"350px",objectFit:"cover"}} />}
        <div style={{padding:"24px"}}>
          <h1 style={{fontSize:"24px",fontWeight:"900",marginBottom:"10px",color:"#2C3E50"}}>{product.title}</h1>
          <p style={{fontSize:"30px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{product.price?.toLocaleString()}</p>
          <div style={{borderTop:"2px solid #f0f0f0",paddingTop:"16px",marginBottom:"16px"}}>
            <h3 style={{fontSize:"16px",fontWeight:"800",marginBottom:"10px",color:"#2C3E50"}}>Description</h3>
            <p style={{color:"#666",lineHeight:"1.5",fontSize:"14px"}}>{product.description}</p>
          </div>
          {seller && (
            <div style={{borderTop:"2px solid #f0f0f0",paddingTop:"16px",marginBottom:"16px"}}>
              <p style={{fontWeight:"700",fontSize:"14px",color:"#2C3E50"}}>Seller: {seller.name}</p>
            </div>
          )}
          {product.sellerId !== user.uid && (
            <button onClick={() => handleBuyProduct(product, user)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"10px",fontSize:"15px",fontWeight:"900",cursor:"pointer",boxShadow:"0 4px 12px rgba(255,107,53,0.4)"}}>
              BUY NOW - ₦{product.price?.toLocaleString()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
const AddProduct = ({ user, setPage, editingItem, setEditingItem }) => {
  const [title, setTitle] = useState(editingItem?.title || "");
  const [description, setDescription] = useState(editingItem?.description || "");
  const [price, setPrice] = useState(editingItem?.price || "");
  const [category, setCategory] = useState(editingItem?.category || "Campus");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
  const handleImageChange = (e) => { if (e.target.files[0]) setImage(e.target.files[0]); };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !description.trim() || !price) { setError("Please fill all fields"); return; }
    setUploading(true);
    try {
      let imageUrl = editingItem?.imageUrl || "";
      if (image) {
        const imageRef = ref(storage, `products/${user.uid}/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const productData = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category,
        imageUrl,
        sellerId: user.uid,
        status: "active"
      };
      
      if (editingItem) {
        await updateDoc(doc(db, "products", editingItem.id), productData);
        alert("✅ Product updated!");
      } else {
        await addDoc(collection(db, "products"), {
          ...productData,
          createdAt: serverTimestamp()
        });
        alert("✅ Product added!");
      }
      
      setEditingItem(null);
      setPage("browse");
    } catch (err) { setError(err.message); }
    setUploading(false);
  };
  
  return (
    <div style={{maxWidth:"550px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
        {editingItem ? "Edit Product" : "Add Product"}
      </h2>
      <form onSubmit={handleSubmit} style={{background:"white",padding:"20px",borderRadius:"14px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="iPhone 13" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}}>
            {PRODUCT_CATEGORIES.filter(c => c !== "All").map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Price (₦)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50000" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product..." rows="4" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit"}} />
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"13px",fontWeight:"600",cursor:"pointer"}} />
          {image && <p style={{marginTop:"8px",fontSize:"13px",color:"#FF6B35",fontWeight:"700"}}>✓ {image.name}</p>}
          {editingItem?.imageUrl && !image && <p style={{marginTop:"8px",fontSize:"13px",color:"#4CAF50",fontWeight:"700"}}>✓ Current image will be kept</p>}
        </div>
        {error && <div style={{color:"#d32f2f",marginBottom:"16px",fontSize:"12px",fontWeight:"700",padding:"10px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
        <div style={{display:"flex",gap:"8px"}}>
          <button type="button" onClick={() => {setEditingItem(null); setPage("browse");}} style={{flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>Cancel</button>
          <button type="submit" disabled={uploading} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 4px 10px rgba(255,107,53,0.4)"}}>
            {uploading ? (editingItem ? "UPDATING..." : "ADDING...") : (editingItem ? "UPDATE" : "ADD PRODUCT")}
          </button>
        </div>
      </form>
    </div>
  );
};

const ServicesBrowse = ({ user, isAdmin, setPage, setEditingItem, setBuyingService }) => {
  const [services, setServices] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, []);
  const filtered = services.filter(s => {
    if (category !== "All" && s.category !== category) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  
  const handleEdit = (service) => {
    setEditingItem(service);
    setPage("add-service");
  };
  
  const handleDelete = async (serviceId, isOwn) => {
    if (!window.confirm(isOwn ? "Delete this service?" : "⚠️ FORCE DELETE this service? This cannot be undone!")) return;
    try {
      await deleteDoc(doc(db, "services", serviceId));
      alert("✅ Service deleted!");
    } catch (err) { alert("Error: " + err.message); }
  };
  
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      {isAdmin && (
        <button onClick={() => {setEditingItem(null); setPage("add-service");}} style={{position:"fixed",bottom:"90px",right:"20px",width:"56px",height:"56px",borderRadius:"50%",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",fontSize:"28px",fontWeight:"700",cursor:"pointer",boxShadow:"0 6px 20px rgba(76,175,80,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      )}
      <input type="text" placeholder="🔍 Search services..." value={search} onChange={(e) => setSearch(e.target.value)} style={{width:"100%",padding:"12px 16px",marginBottom:"14px",border:"2px solid #f0f0f0",borderRadius:"10px",fontSize:"14px",fontWeight:"500",outline:"none"}} />
      <div style={{display:"flex",gap:"6px",marginBottom:"16px",overflowX:"auto",paddingBottom:"6px"}}>
        {SERVICE_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{padding:"6px 14px",background:category===cat?"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)":"white",color:category===cat?"white":"#666",border:category===cat?"none":"2px solid #f0f0f0",borderRadius:"16px",fontSize:"12px",fontWeight:"800",cursor:"pointer",whiteSpace:"nowrap",boxShadow:category===cat?"0 3px 8px rgba(76,175,80,0.3)":"none"}}>
            {cat}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 16px",background:"white",borderRadius:"14px"}}>
          <div style={{fontSize:"50px",marginBottom:"12px"}}>💼</div>
          <p style={{fontSize:"16px",color:"#2C3E50",fontWeight:"800"}}>No services available</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:"14px"}}>
          {filtered.map(service => {
            const cardType = service.category === "Gift Cards" && service.cardType ? GIFT_CARD_TYPES.find(c => c.name === service.cardType) : null;
            const isOwn = service.sellerId === user.uid;
            return (
              <div key={service.id} style={{background:"white",borderRadius:"14px",overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.08)",position:"relative"}}>
                <div onClick={() => {
                  if (service.sellerId === user.uid) {
                    alert("This is your own service!");
                  } else {
                    setBuyingService(service);
                  }
                }} className="card-hover" style={{cursor:"pointer"}}>
                  {cardType && (
                    <div style={{width:"100%",height:"140px",background:"linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"70px"}}>
                      {cardType.logo}
                    </div>
                  )}
                  <div style={{padding:"12px"}}>
                    <div style={{display:"inline-block",padding:"3px 8px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"8px",fontSize:"9px",fontWeight:"800",color:"#4CAF50",marginBottom:"6px",textTransform:"uppercase",border:"1px solid #4CAF50"}}>{service.category}</div>
                    <h3 style={{fontSize:"14px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50",lineHeight:"1.2"}}>{service.title}</h3>
                    <p style={{fontSize:"18px",fontWeight:"900",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{service.price?.toLocaleString()}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div style={{position:"absolute",top:"8px",right:"8px",display:"flex",gap:"6px"}}>
                    {isOwn && (
                      <button onClick={() => handleEdit(service)} style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(33,150,243,0.9)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                        <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                    )}
                    <button onClick={() => handleDelete(service.id, isOwn)} style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(244,67,54,0.9)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                      <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AddService = ({ user, setPage, editingItem, setEditingItem }) => {
  const [category, setCategory] = useState(editingItem?.category || "Airtime");
  const [jobTitle, setJobTitle] = useState(editingItem?.jobTitle || "");
  const [price, setPrice] = useState(editingItem?.price || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [network, setNetwork] = useState("MTN");
  const [airtimeAmount, setAirtimeAmount] = useState("100");
  const [dataNetwork, setDataNetwork] = useState("MTN");
  const [dataPlan, setDataPlan] = useState("1GB - ₦500");
  const [billType, setBillType] = useState("NEPA");
  const [cardType, setCardType] = useState(editingItem?.cardType || "iTunes");
  const [cardValue, setCardValue] = useState(editingItem?.cardValue || "");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    let finalTitle = "";
    
    if (category === "Airtime") finalTitle = `${network} ₦${airtimeAmount} Airtime`;
    else if (category === "Data") finalTitle = `${dataNetwork} ${dataPlan.split(' - ')[0]} Data`;
    else if (category === "Bills") finalTitle = `${billType} Bill Payment`;
    else if (category === "Gift Cards") {
      if (!cardValue.trim()) { setError("Enter card value (e.g., $50, $100)"); return; }
      finalTitle = `${cardType} ${cardValue.trim()}`;
    }
    else if (category === "Skills") {
      if (!jobTitle.trim()) { setError("Enter what job/service you offer"); return; }
      finalTitle = jobTitle.trim();
    }
    
    if (!finalTitle.trim() || !price) { setError("Fill all fields"); return; }
    
    setUploading(true);
    try {
      const serviceData = { 
        title: finalTitle.trim(), 
        price: parseFloat(price), 
        category, 
        sellerId: user.uid, 
        status: "active"
      };
      if (category === "Gift Cards") serviceData.cardType = cardType;
      if (category === "Skills") serviceData.jobTitle = jobTitle.trim();
      
      if (editingItem) {
        await updateDoc(doc(db, "services", editingItem.id), serviceData);
        alert("✅ Service updated!");
      } else {
        await addDoc(collection(db, "services"), {
          ...serviceData,
          createdAt: serverTimestamp()
        });
        alert("✅ Service added!");
      }
      
      setEditingItem(null);
      setPage("browse");
    } catch (err) { setError(err.message); }
    setUploading(false);
  };
  
  return (
    <div style={{maxWidth:"550px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
        {editingItem ? "Edit Service" : "Add Service"}
      </h2>
      <form onSubmit={handleSubmit} style={{background:"white",padding:"20px",borderRadius:"14px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Service Type</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
            {SERVICE_CATEGORIES.filter(c => c !== "All").map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        {category === "Airtime" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Network</label>
              <select value={network} onChange={(e) => setNetwork(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
                {["MTN","Airtel","Glo","9mobile"].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Amount</label>
              <select value={airtimeAmount} onChange={(e) => setAirtimeAmount(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
                {["100","200","500","1000","2000","5000"].map(a => <option key={a} value={a}>₦{a}</option>)}
              </select>
            </div>
          </>
        )}
        {category === "Data" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Network</label>
              <select value={dataNetwork} onChange={(e) => setDataNetwork(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
                {["MTN","Airtel","Glo","9mobile"].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Data Plan</label>
              <select value={dataPlan} onChange={(e) => setDataPlan(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
                {["500MB - ₦500","1GB - ₦800","2GB - ₦1500","5GB - ₦3000","10GB - ₦5000"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </>
        )}
        {category === "Bills" && (
          <div style={{marginBottom:"16px"}}>
            <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Bill Type</label>
            <select value={billType} onChange={(e) => setBillType(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
              {["NEPA","DSTV","GOtv","Startimes"].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
        {category === "Gift Cards" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Card Type</label>
              <select value={cardType} onChange={(e) => setCardType(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
                {GIFT_CARD_TYPES.map(c => <option key={c.name} value={c.name}>{c.logo} {c.name}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Card Value</label>
              <input type="text" value={cardValue} onChange={(e) => setCardValue(e.target.value)} placeholder="$50" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
            </div>
          </>
        )}
        {category === "Skills" && (
          <div style={{marginBottom:"16px"}}>
            <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>What job/service do you offer?</label>
            <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g., Graphic Designer, Hairdresser, Plumber" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
            <p style={{fontSize:"11px",color:"#999",marginTop:"4px",fontWeight:"600"}}>Examples: Web Developer, Photographer, Electrician</p>
          </div>
        )}
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Your Price (₦)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        {error && <div style={{color:"#d32f2f",marginBottom:"16px",fontSize:"12px",fontWeight:"700",padding:"10px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
        <div style={{display:"flex",gap:"8px"}}>
          <button type="button" onClick={() => {setEditingItem(null); setPage("browse");}} style={{flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>Cancel</button>
          <button type="submit" disabled={uploading} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 4px 10px rgba(76,175,80,0.4)"}}>
            {uploading ? (editingItem ? "UPDATING..." : "ADDING...") : (editingItem ? "UPDATE" : "ADD SERVICE")}
          </button>
        </div>
      </form>
    </div>
  );
};
const CryptoExchange = ({ user, buyingCrypto, setBuyingCrypto, setPage }) => {
  const [action, setAction] = useState("buy");
  const [selectedCoin, setSelectedCoin] = useState(CRYPTO_COINS[0]);
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  
  const nairaAmount = amount ? (action === "buy" ? parseFloat(amount) * selectedCoin.buyRate : parseFloat(amount) * selectedCoin.sellRate) : 0;
  
  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !walletAddress.trim()) {
      alert("Please fill all fields");
      return;
    }
    
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userWallet = userSnap.data()?.wallet || 0;
      
      if (action === "buy" && userWallet < nairaAmount) {
        alert("Insufficient funds! Add money to your wallet.");
        setLoading(false);
        return;
      }
      
      if (action === "buy") {
        await updateDoc(doc(db, "users", user.uid), { wallet: userWallet - nairaAmount });
      }
      
      await addDoc(collection(db, "orders"), {
        title: `${action === "buy" ? "Buy" : "Sell"} ${amount} ${selectedCoin.symbol}`,
        price: nairaAmount,
        buyerId: user.uid,
        sellerId: ADMIN_UID,
        type: "crypto",
        cryptoAction: action,
        cryptoCoin: selectedCoin.name,
        cryptoAmount: parseFloat(amount),
        walletAddress: walletAddress.trim(),
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      alert(`✅ ${action === "buy" ? "Purchase" : "Sale"} request submitted!`);
      setAmount("");
      setWalletAddress("");
      setPage("orders");
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };
  
  return (
    <div style={{maxWidth:"600px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #FBC02D 0%, #F57F17 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Crypto Exchange</h2>
      
      <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
        <button onClick={() => setAction("buy")} style={{flex:1,padding:"12px",background:action==="buy"?"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)":"white",color:action==="buy"?"white":"#666",border:action==="buy"?"none":"2px solid #f0f0f0",borderRadius:"10px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>
          BUY CRYPTO
        </button>
        <button onClick={() => setAction("sell")} style={{flex:1,padding:"12px",background:action==="sell"?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"white",color:action==="sell"?"white":"#666",border:action==="sell"?"none":"2px solid #f0f0f0",borderRadius:"10px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>
          SELL CRYPTO
        </button>
      </div>
      
      <form onSubmit={handleTransaction} style={{background:"white",padding:"20px",borderRadius:"14px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"8px",color:"#2C3E50"}}>Select Cryptocurrency</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"8px"}}>
            {CRYPTO_COINS.map(coin => (
              <div key={coin.symbol} onClick={() => setSelectedCoin(coin)} style={{padding:"12px",background:selectedCoin.symbol===coin.symbol?"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)":"#f8f9fa",border:selectedCoin.symbol===coin.symbol?"2px solid #FBC02D":"2px solid transparent",borderRadius:"10px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:"24px",marginBottom:"4px"}}>{coin.icon}</div>
                <p style={{fontSize:"12px",fontWeight:"800",color:"#2C3E50"}}>{coin.name}</p>
                <p style={{fontSize:"10px",fontWeight:"700",color:"#F57F17"}}>{coin.symbol}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{padding:"14px",background:"linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",borderRadius:"10px",marginBottom:"16px",border:"2px solid #2196F3"}}>
          <p style={{fontSize:"11px",fontWeight:"700",color:"#1976D2",marginBottom:"6px"}}>RATE:</p>
          <p style={{fontSize:"16px",fontWeight:"900",color:"#1976D2"}}>
            1 {selectedCoin.symbol} = ₦{(action === "buy" ? selectedCoin.buyRate : selectedCoin.sellRate).toLocaleString()}
          </p>
          <p style={{fontSize:"10px",fontWeight:"600",color:"#1976D2",marginTop:"4px"}}>
            {action === "buy" ? "BUY" : "SELL"} RATE
          </p>
        </div>
        
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Amount ({selectedCoin.symbol})</label>
          <input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.005" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
          {amount && (
            <p style={{marginTop:"6px",fontSize:"13px",fontWeight:"700",color:"#2196F3"}}>= ₦{nairaAmount.toLocaleString()}</p>
          )}
        </div>
        
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>
            {action === "buy" ? "Your Wallet Address" : "Your Wallet Address (to receive)"}
          </label>
          <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="bc1q..." style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        
        <button type="submit" disabled={loading} style={{width:"100%",padding:"14px",background:action==="buy"?"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)":"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"10px",fontSize:"15px",fontWeight:"900",cursor:loading?"not-allowed":"pointer",boxShadow:"0 4px 12px rgba(251,192,45,0.4)"}}>
          {loading ? "PROCESSING..." : (action === "buy" ? `BUY ${selectedCoin.symbol}` : `SELL ${selectedCoin.symbol}`)}
        </button>
      </form>
    </div>
  );
};

const TicketsBrowse = ({ user, isAdmin, setPage, setEditingItem }) => {
  const [tickets, setTickets] = useState([]);
  const [ticketType, setTicketType] = useState("All");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, []);
  
  const filtered = tickets.filter(t => {
    if (ticketType !== "All" && t.ticketType !== ticketType) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  
  const handleEdit = (ticket) => {
    setEditingItem(ticket);
    setPage("add-ticket");
  };
  
  const handleDelete = async (ticketId, isOwn) => {
    if (!window.confirm(isOwn ? "Delete this ticket?" : "⚠️ FORCE DELETE this ticket? This cannot be undone!")) return;
    try {
      await deleteDoc(doc(db, "tickets", ticketId));
      alert("✅ Ticket deleted!");
    } catch (err) { alert("Error: " + err.message); }
  };
  
  const handleBuyTicket = async (ticket) => {
    try {
      const buyerSnap = await getDoc(doc(db, "users", user.uid));
      const buyerWallet = buyerSnap.data()?.wallet || 0;
      if (buyerWallet < ticket.price) {
        alert("Insufficient funds! Add money to your wallet.");
        return;
      }
      if (!window.confirm(`Confirm purchase of ${ticket.title} for ₦${ticket.price?.toLocaleString()}?`)) return;
      await updateDoc(doc(db, "users", user.uid), { wallet: buyerWallet - ticket.price });
      await addDoc(collection(db, "orders"), {
        ticketId: ticket.id,
        title: ticket.title,
        price: ticket.price,
        buyerId: user.uid,
        sellerId: ticket.sellerId || ADMIN_UID,
        type: "ticket",
        ticketType: ticket.ticketType,
        status: "pending",
        createdAt: serverTimestamp()
      });
      alert("✅ Ticket purchased successfully!");
      window.location.reload();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };
  
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      {isAdmin && (
        <button onClick={() => {setEditingItem(null); setPage("add-ticket");}} style={{position:"fixed",bottom:"90px",right:"20px",width:"56px",height:"56px",borderRadius:"50%",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",color:"white",border:"none",fontSize:"28px",fontWeight:"700",cursor:"pointer",boxShadow:"0 6px 20px rgba(156,39,176,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      )}
      <input type="text" placeholder="🔍 Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} style={{width:"100%",padding:"12px 16px",marginBottom:"14px",border:"2px solid #f0f0f0",borderRadius:"10px",fontSize:"14px",fontWeight:"500",outline:"none"}} />
      <div style={{display:"flex",gap:"6px",marginBottom:"16px",overflowX:"auto",paddingBottom:"6px"}}>
        {["All","Event","Flight"].map(type => (
          <button key={type} onClick={() => setTicketType(type)} style={{padding:"6px 14px",background:ticketType===type?"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)":"white",color:ticketType===type?"white":"#666",border:ticketType===type?"none":"2px solid #f0f0f0",borderRadius:"16px",fontSize:"12px",fontWeight:"800",cursor:"pointer",whiteSpace:"nowrap",boxShadow:ticketType===type?"0 3px 8px rgba(156,39,176,0.3)":"none"}}>
            {type === "Event" ? "🎉 Event" : type === "Flight" ? "✈️ Flight" : "All"}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 16px",background:"white",borderRadius:"14px"}}>
          <div style={{fontSize:"50px",marginBottom:"12px"}}>🎫</div>
          <p style={{fontSize:"16px",color:"#2C3E50",fontWeight:"800"}}>No tickets available</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"14px"}}>
          {filtered.map(t => {
            const isOwn = t.sellerId === user.uid;
            return (
              <div key={t.id} style={{background:"white",borderRadius:"14px",overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.08)",position:"relative"}}>
                <div onClick={() => {
                  if (t.sellerId === user.uid) {
                    alert("This is your own ticket!");
                  } else {
                    handleBuyTicket(t);
                  }
                }} className="card-hover" style={{cursor:"pointer"}}>
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt={t.title} style={{width:"100%",height:"160px",objectFit:"cover"}} />
                  ) : (
                    <div style={{width:"100%",height:"160px",background:t.ticketType==="Flight"?"linear-gradient(135deg, #E1F5FE 0%, #B3E5FC 100%)":"linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:"60px"}}>{t.ticketType === "Flight" ? "✈️" : "🎉"}</div>
                    </div>
                  )}
                  <div style={{padding:"12px"}}>
                    <div style={{display:"inline-block",padding:"3px 8px",background:"#F3E5F5",borderRadius:"8px",fontSize:"9px",fontWeight:"800",color:"#9C27B0",marginBottom:"6px",textTransform:"uppercase"}}>{t.ticketType}</div>
                    <h3 style={{fontSize:"14px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50",lineHeight:"1.2"}}>{t.title}</h3>
                    {t.eventDate && <p style={{fontSize:"12px",color:"#666",marginBottom:"4px",fontWeight:"600"}}>📅 {t.eventDate}</p>}
                    {t.venue && <p style={{fontSize:"12px",color:"#666",marginBottom:"8px",fontWeight:"600"}}>📍 {t.venue}</p>}
                    {t.airline && <p style={{fontSize:"12px",color:"#666",marginBottom:"8px",fontWeight:"600"}}>✈️ {t.airline}</p>}
                    <p style={{fontSize:"20px",fontWeight:"900",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{t.price?.toLocaleString()}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div style={{position:"absolute",top:"8px",right:"8px",display:"flex",gap:"6px"}}>
                    {isOwn && (
                      <button onClick={() => handleEdit(t)} style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(33,150,243,0.9)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                        <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                    )}
                    <button onClick={() => handleDelete(t.id, isOwn)} style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(244,67,54,0.9)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                      <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AddTicket = ({ user, setPage, editingItem, setEditingItem }) => {
  const [ticketType, setTicketType] = useState(editingItem?.ticketType || "Event");
  const [title, setTitle] = useState(editingItem?.title || "");
  const [price, setPrice] = useState(editingItem?.price || "");
  const [eventDate, setEventDate] = useState(editingItem?.eventDate || "");
  const [venue, setVenue] = useState(editingItem?.venue || "");
  const [airline, setAirline] = useState(editingItem?.airline || "Air Peace");
  const [route, setRoute] = useState(editingItem?.route || "");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
  const handleImageChange = (e) => { if (e.target.files[0]) setImage(e.target.files[0]); };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !price) { setError("Fill required fields"); return; }
    setUploading(true);
    try {
      let imageUrl = editingItem?.imageUrl || "";
      if (image) {
        const imageRef = ref(storage, `tickets/${user.uid}/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const ticketData = { 
        title: title.trim(), 
        price: parseFloat(price), 
        ticketType, 
        sellerId: user.uid, 
        status: "active",
        imageUrl
      };
      if (ticketType === "Event") {
        ticketData.eventDate = eventDate;
        ticketData.venue = venue.trim();
      }
      if (ticketType === "Flight") {
        ticketData.airline = airline;
        ticketData.route = route.trim();
      }
      
      if (editingItem) {
        await updateDoc(doc(db, "tickets", editingItem.id), ticketData);
        alert("✅ Ticket updated!");
      } else {
        await addDoc(collection(db, "tickets"), {
          ...ticketData,
          createdAt: serverTimestamp()
        });
        alert("✅ Ticket added!");
      }
      
      setEditingItem(null);
      setPage("browse");
    } catch (err) { setError(err.message); }
    setUploading(false);
  };
  
  return (
    <div style={{maxWidth:"550px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
        {editingItem ? "Edit Ticket" : "Add Ticket"}
      </h2>
      <form onSubmit={handleSubmit} style={{background:"white",padding:"20px",borderRadius:"14px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Ticket Type</label>
          <select value={ticketType} onChange={(e) => setTicketType(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
            <option value="Event">Event</option>
            <option value="Flight">Flight</option>
          </select>
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ticketType==="Event"?"Concert Ticket":"Lagos to Abuja"} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        {ticketType === "Event" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Event Date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}} />
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Venue</label>
              <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Eko Hotel" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
            </div>
          </>
        )}
        {ticketType === "Flight" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Airline</label>
              <select value={airline} onChange={(e) => setAirline(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
                {["Air Peace","Arik Air","Dana Air","Ibom Air","Aero Contractors","Max Air","United Nigeria"].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Route</label>
              <input type="text" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Lagos - Abuja" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
            </div>
          </>
        )}
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Price (₦)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50000" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Image (Optional)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"13px",fontWeight:"600",cursor:"pointer"}} />
          {image && <p style={{marginTop:"8px",fontSize:"13px",color:"#9C27B0",fontWeight:"700"}}>✓ {image.name}</p>}
        </div>
        {error && <div style={{color:"#d32f2f",marginBottom:"16px",fontSize:"12px",fontWeight:"700",padding:"10px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
        <div style={{display:"flex",gap:"8px"}}>
          <button type="button" onClick={() => {setEditingItem(null); setPage("browse");}} style={{flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>Cancel</button>
          <button type="submit" disabled={uploading} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 4px 10px rgba(156,39,176,0.4)"}}>
            {uploading ? (editingItem ? "UPDATING..." : "ADDING...") : (editingItem ? "UPDATE" : "ADD TICKET")}
          </button>
        </div>
      </form>
    </div>
  );
};

const OrdersPage = ({ user, isAdmin }) => {
  const [myOrders, setMyOrders] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("my");
  
  useEffect(() => {
    const myQ = query(collection(db, "orders"), where("buyerId", "==", user.uid), orderBy("createdAt", "desc"));
    const myUnsub = onSnapshot(myQ, (snap) => { setMyOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    if (isAdmin) {
      const customerQ = query(collection(db, "orders"), where("sellerId", "==", ADMIN_UID), orderBy("createdAt", "desc"));
      const customerUnsub = onSnapshot(customerQ, (snap) => { setCustomerOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
      return () => { myUnsub(); customerUnsub(); };
    }
    return () => myUnsub();
  }, [user, isAdmin]);
  
  const confirmDelivery = async (order) => {
    if (!window.confirm("Confirm received?")) return;
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "completed", completedAt: serverTimestamp() });
      const sellerId = order.sellerId || ADMIN_UID;
      const sellerSnap = await getDoc(doc(db, "users", sellerId));
      const sellerWallet = sellerSnap.data()?.wallet || 0;
      await updateDoc(doc(db, "users", sellerId), {
        wallet: sellerWallet + order.price,
        totalSales: (sellerSnap.data()?.totalSales || 0) + 1
      });
      alert("✅ Confirmed!");
      window.location.reload();
    } catch (err) { alert("Error: " + err.message); }
  };
  
  const deleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order? This cannot be undone!")) return;
    try {
      await deleteDoc(doc(db, "orders", orderId));
      alert("✅ Order deleted!");
    } catch (err) { alert("Error: " + err.message); }
  };
  
  const currentOrders = activeTab === "my" ? myOrders : customerOrders;
  
  return (
    <div style={{maxWidth:"700px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Orders</h2>
      {isAdmin && (
        <div style={{display:"flex",gap:"8px",marginBottom:"16px",background:"white",padding:"6px",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
          <button onClick={() => setActiveTab("my")} style={{flex:1,padding:"10px",background:activeTab==="my"?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"transparent",color:activeTab==="my"?"white":"#666",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:"800",cursor:"pointer",transition:"all 0.3s"}}>
            My Orders ({myOrders.length})
          </button>
          <button onClick={() => setActiveTab("customer")} style={{flex:1,padding:"10px",background:activeTab==="customer"?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"transparent",color:activeTab==="customer"?"white":"#666",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:"800",cursor:"pointer",transition:"all 0.3s"}}>
            Customer Orders ({customerOrders.length})
          </button>
        </div>
      )}
      {currentOrders.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 16px",background:"white",borderRadius:"14px"}}>
          <div style={{fontSize:"50px",marginBottom:"12px"}}>📦</div>
          <p style={{fontSize:"16px",color:"#2C3E50",fontWeight:"800"}}>{activeTab==="my"?"No orders yet":"No customer orders yet"}</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          {currentOrders.map(order => (
            <div key={order.id} style={{background:"white",padding:"16px",borderRadius:"12px",boxShadow:"0 2px 10px rgba(0,0,0,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:"10px"}}>
                <div>
                  <h3 style={{fontSize:"14px",fontWeight:"800",marginBottom:"3px",color:"#2C3E50"}}>{order.title}</h3>
                  <p style={{fontSize:"11px",color:"#999",fontWeight:"600"}}>{order.createdAt?.toDate().toLocaleString()}</p>
                </div>
                <div style={{padding:"5px 10px",background:order.status==="completed"?"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)":"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"10px",fontSize:"10px",fontWeight:"800",color:order.status==="completed"?"#4CAF50":"#F57F17",textTransform:"uppercase"}}>
                  {order.status}
                </div>
              </div>
              <p style={{fontSize:"20px",fontWeight:"900",marginBottom:"10px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{order.price?.toLocaleString()}</p>
              {order.phoneNumber && (
                <div style={{padding:"10px",background:"linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",borderRadius:"8px",marginBottom:"10px"}}>
                  <p style={{fontSize:"12px",color:"#1976D2",fontWeight:"700"}}>📱 {order.phoneNumber}</p>
                  {order.network && <p style={{fontSize:"11px",color:"#1976D2",fontWeight:"600"}}>Network: {order.network}</p>}
                </div>
              )}
              {order.accountNumber && (
                <div style={{padding:"10px",background:"linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",borderRadius:"8px",marginBottom:"10px"}}>
                  <p style={{fontSize:"12px",color:"#F57F17",fontWeight:"700"}}>⚡ {order.accountNumber}</p>
                </div>
              )}
              {order.walletAddress && (
                <div style={{padding:"10px",background:"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"8px",marginBottom:"10px"}}>
                  <p style={{fontSize:"12px",color:"#F57F17",fontWeight:"700"}}>💰 {order.walletAddress}</p>
                  {order.cryptoAction && <p style={{fontSize:"11px",color:"#F57F17",fontWeight:"600"}}>Action: {order.cryptoAction.toUpperCase()}</p>}
                </div>
              )}
              <div style={{display:"flex",gap:"8px"}}>
                {activeTab==="my" && order.status==="pending" && (
                  <button onClick={() => confirmDelivery(order)} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:"800",cursor:"pointer"}}>
                    CONFIRM DELIVERY
                  </button>
                )}
                {activeTab==="customer" && isAdmin && (
                  <button onClick={() => deleteOrder(order.id)} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",color:"#d32f2f",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:"800",cursor:"pointer"}}>
                    DELETE ORDER
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
const MoneyTransfer = ({ user }) => {
  const [fromCountry, setFromCountry] = useState(COUNTRIES[0]);
  const [toCountry, setToCountry] = useState(COUNTRIES[1]);
  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientBank, setRecipientBank] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const sendAmount = amount ? parseFloat(amount) : 0;
  const receiveAmount = sendAmount > 0 ? (sendAmount / fromCountry.rate * toCountry.rate).toFixed(2) : "0.00";
  
  const handleTransfer = async (e) => {
    e.preventDefault();
    setError("");
    if (!amount || !recipientName.trim() || !recipientBank || !recipientAccount.trim()) {
      setError("Fill all fields");
      return;
    }
    
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userWallet = userSnap.data()?.wallet || 0;
    const nairaDeduction = fromCountry.code === "NG" ? sendAmount : sendAmount * fromCountry.rate;
    
    if (userWallet < nairaDeduction) {
      setError("Insufficient funds!");
      return;
    }
    
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { wallet: userWallet - nairaDeduction });
      await addDoc(collection(db, "transfers"), {
        userId: user.uid,
        fromCountry: fromCountry.name,
        toCountry: toCountry.name,
        sendAmount,
        sendCurrency: fromCountry.currency,
        receiveAmount: parseFloat(receiveAmount),
        receiveCurrency: toCountry.currency,
        recipientName: recipientName.trim(),
        recipientBank,
        recipientAccount: recipientAccount.trim(),
        status: "processing",
        createdAt: serverTimestamp()
      });
      alert(`✅ Transfer of ${fromCountry.symbol}${sendAmount} → ${toCountry.symbol}${receiveAmount} is processing!`);
      setAmount("");
      setRecipientName("");
      setRecipientBank("");
      setRecipientAccount("");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };
  
  return (
    <div style={{maxWidth:"550px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Send Money Internationally</h2>
      <form onSubmit={handleTransfer} style={{background:"white",padding:"20px",borderRadius:"14px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"8px",color:"#2C3E50"}}>From (You're sending from)</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"8px",maxHeight:"200px",overflowY:"auto"}}>
            {COUNTRIES.map(c => (
              <div key={c.code} onClick={() => {setFromCountry(c);}} style={{padding:"8px",background:fromCountry.code===c.code?"linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)":"#f8f9fa",border:fromCountry.code===c.code?"2px solid #2196F3":"2px solid transparent",borderRadius:"8px",cursor:"pointer",textAlign:"center",transition:"all 0.3s"}}>
                <div style={{fontSize:"18px",marginBottom:"2px"}}>{c.flag}</div>
                <p style={{fontSize:"10px",fontWeight:"800",color:"#2C3E50"}}>{c.code}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"8px",color:"#2C3E50"}}>To (Recipient's country)</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"8px",maxHeight:"200px",overflowY:"auto"}}>
            {COUNTRIES.map(c => (
              <div key={c.code} onClick={() => {setToCountry(c); setRecipientBank("");}} style={{padding:"8px",background:toCountry.code===c.code?"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)":"#f8f9fa",border:toCountry.code===c.code?"2px solid #4CAF50":"2px solid transparent",borderRadius:"8px",cursor:"pointer",textAlign:"center",transition:"all 0.3s"}}>
                <div style={{fontSize:"18px",marginBottom:"2px"}}>{c.flag}</div>
                <p style={{fontSize:"10px",fontWeight:"800",color:"#2C3E50"}}>{c.code}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{padding:"12px",background:"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"10px",marginBottom:"16px",border:"2px solid #FBC02D"}}>
          <p style={{fontSize:"11px",fontWeight:"700",color:"#F57F17",marginBottom:"4px"}}>Exchange Rate:</p>
          <p style={{fontSize:"14px",fontWeight:"900",color:"#F57F17"}}>1 {fromCountry.currency} = {(toCountry.rate / fromCountry.rate).toFixed(4)} {toCountry.currency}</p>
        </div>
        
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>You Send ({fromCountry.currency})</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
          {sendAmount > 0 && (
            <p style={{marginTop:"6px",fontSize:"13px",fontWeight:"700",color:"#2196F3"}}>Recipient Gets: {toCountry.symbol}{receiveAmount} {toCountry.currency}</p>
          )}
        </div>
        
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Recipient Name</label>
          <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="John Doe" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Recipient Bank ({toCountry.name})</label>
          <select value={recipientBank} onChange={(e) => setRecipientBank(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
            <option value="">Select Bank</option>
            {toCountry.banks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
          </select>
        </div>
        
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Account Number</label>
          <input type="text" value={recipientAccount} onChange={(e) => setRecipientAccount(e.target.value)} placeholder="1234567890" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        
        {error && <div style={{color:"#d32f2f",marginBottom:"16px",fontSize:"12px",fontWeight:"700",padding:"10px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
        <button type="submit" disabled={loading} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",color:"white",border:"none",borderRadius:"10px",fontSize:"15px",fontWeight:"900",cursor:loading?"not-allowed":"pointer",boxShadow:"0 4px 12px rgba(33,150,243,0.4)"}}>
          {loading ? "SENDING..." : "SEND MONEY"}
        </button>
      </form>
    </div>
  );
};

const SettingsPage = ({ user, setPage }) => {
  const [userData, setUserData] = useState(null);
  const [notifications, setNotifications] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setUserData(snap.data());
        setNotifications(snap.data()?.notifications !== false);
      }
    });
    return () => unsub();
  }, [user]);
  const toggleNotifications = async () => {
    try {
      await updateDoc(doc(db, "users", user.uid), { notifications: !notifications });
      setNotifications(!notifications);
      alert(`Notifications ${!notifications ? "enabled" : "disabled"}!`);
    } catch (err) { alert("Error: " + err.message); }
  };
  return (
    <div style={{maxWidth:"600px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Settings</h2>
      <div style={{background:"white",borderRadius:"14px",overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
        <div onClick={() => setPage("profile")} style={{padding:"16px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{width:"40px",height:"40px",borderRadius:"50%",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div>
              <p style={{fontSize:"14px",fontWeight:"800",color:"#2C3E50"}}>Profile</p>
              <p style={{fontSize:"12px",color:"#999",fontWeight:"600"}}>{userData?.name}</p>
            </div>
          </div>
          <svg width="20" height="20" fill="#999" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </div>
        <div onClick={toggleNotifications} style={{padding:"16px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{width:"40px",height:"40px",borderRadius:"50%",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>
            </div>
            <div>
              <p style={{fontSize:"14px",fontWeight:"800",color:"#2C3E50"}}>Notifications</p>
              <p style={{fontSize:"12px",color:"#999",fontWeight:"600"}}>{notifications ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
          <div style={{width:"44px",height:"24px",borderRadius:"12px",background:notifications?"#4CAF50":"#ccc",position:"relative",transition:"all 0.3s"}}>
            <div style={{width:"20px",height:"20px",borderRadius:"50%",background:"white",position:"absolute",top:"2px",left:notifications?"22px":"2px",transition:"all 0.3s",boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}></div>
          </div>
        </div>
        <div style={{padding:"16px",borderBottom:"1px solid #f0f0f0"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{width:"40px",height:"40px",borderRadius:"50%",background:"linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
            <div>
              <p style={{fontSize:"14px",fontWeight:"800",color:"#2C3E50"}}>Version</p>
              <p style={{fontSize:"12px",color:"#999",fontWeight:"600"}}>QuickSell v2.0.0</p>
            </div>
          </div>
        </div>
        <div style={{padding:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{width:"40px",height:"40px",borderRadius:"50%",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>
            </div>
            <div>
              <p style={{fontSize:"14px",fontWeight:"800",color:"#2C3E50"}}>Help & Support</p>
              <p style={{fontSize:"12px",color:"#999",fontWeight:"600"}}>Contact: 9020853814</p>
            </div>
          </div>
        </div>
      </div>
      <button onClick={() => signOut(auth)} style={{width:"100%",marginTop:"16px",padding:"14px",background:"linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",color:"#d32f2f",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:"900",cursor:"pointer"}}>
        SIGN OUT
      </button>
    </div>
  );
};

const ProfilePage = ({ user }) => {
  const [userData, setUserData] = useState(null);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });
    return () => unsub();
  }, [user]);
  return (
    <div style={{maxWidth:"550px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <div style={{background:"white",padding:"24px",borderRadius:"14px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
        <div style={{textAlign:"center",marginBottom:"20px"}}>
          <div style={{width:"70px",height:"70px",borderRadius:"50%",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"34px",fontWeight:"900",margin:"0 auto 12px",boxShadow:"0 4px 16px rgba(255,107,53,0.3)"}}>{userData?.name?.charAt(0).toUpperCase()}</div>
          <h2 style={{fontSize:"22px",fontWeight:"900",marginBottom:"4px",color:"#2C3E50"}}>{userData?.name}</h2>
          <p style={{color:"#999",fontSize:"13px",fontWeight:"600"}}>{user.email}</p>
        </div>
        <div style={{padding:"20px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",borderRadius:"12px",marginBottom:"16px",textAlign:"center",boxShadow:"0 4px 12px rgba(255,107,53,0.3)"}}>
          <p style={{color:"rgba(255,255,255,0.9)",fontSize:"12px",fontWeight:"700",marginBottom:"6px"}}>WALLET</p>
          <p style={{fontSize:"34px",fontWeight:"900",color:"white"}}>₦{(userData?.wallet || 0).toLocaleString()}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
          <div style={{padding:"16px",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",borderRadius:"10px",textAlign:"center",border:"2px solid #FF6B35"}}>
            <p style={{fontSize:"11px",color:"#FF6B35",fontWeight:"800",marginBottom:"4px"}}>RATING</p>
            <p style={{fontSize:"24px",fontWeight:"900",color:"#FF6B35"}}>⭐ {userData?.rating || 0}/5</p>
          </div>
          <div style={{padding:"16px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"10px",textAlign:"center",border:"2px solid #4CAF50"}}>
            <p style={{fontSize:"11px",color:"#4CAF50",fontWeight:"800",marginBottom:"4px"}}>SALES</p>
            <p style={{fontSize:"24px",fontWeight:"900",color:"#4CAF50"}}>{userData?.totalSales || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavBar = ({ page, setPage }) => {
  const icons = {
    browse: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
    orders: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
    transfer: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
    settings: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
  };
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"white",borderTop:"3px solid #f0f0f0",display:"flex",justifyContent:"space-around",padding:"8px 0 12px",zIndex:100,boxShadow:"0 -2px 12px rgba(0,0,0,0.08)"}}>
      {[
        { key: "browse", label: "Browse" },
        { key: "orders", label: "Orders" },
        { key: "transfer", label: "Transfer" },
        { key: "settings", label: "Settings" }
      ].map(item => (
        <button key={item.key} onClick={() => setPage(item.key)} style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",cursor:"pointer",color:page===item.key?"#FF6B35":"#999",fontWeight:page===item.key?"900":"600",padding:"4px 8px",borderRadius:"8px",transition:"all 0.3s"}}>
          <div style={{transform:page===item.key?"scale(1.1)":"scale(1)",transition:"all 0.3s"}}>{icons[item.key]}</div>
          <span style={{fontSize:"10px"}}>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default App;
