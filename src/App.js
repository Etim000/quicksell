import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, onSnapshot, serverTimestamp, where, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";

const PRODUCT_CATEGORIES = ["All", "Campus", "Food", "Thrift", "Clothes", "Accessories", "Electronics", "Other"];
const SERVICE_CATEGORIES = ["All", "Airtime", "Data", "Bills", "Skills", "Gift Cards", "Crypto"];
const ADMIN_UID = "Hnl2ncOnVtPWbnVTz3TcU2jJUXy1";

const COUNTRIES = [
  { 
    name: "United States", code: "US", currency: "USD", symbol: "$", rate: 1580, flag: "🇺🇸",
    banks: ["Bank of America", "Chase", "Wells Fargo", "Citibank", "US Bank", "Capital One"]
  },
  { 
    name: "United Kingdom", code: "GB", currency: "GBP", symbol: "£", rate: 1950, flag: "🇬🇧",
    banks: ["HSBC", "Barclays", "Lloyds", "NatWest", "Santander", "TSB"]
  },
  { 
    name: "Canada", code: "CA", currency: "CAD", symbol: "C$", rate: 1150, flag: "🇨🇦",
    banks: ["TD Bank", "RBC", "Scotiabank", "BMO", "CIBC"]
  },
  { 
    name: "Ghana", code: "GH", currency: "GHS", symbol: "GH₵", rate: 130, flag: "🇬🇭",
    banks: ["GCB Bank", "Ecobank", "Zenith Bank Ghana", "Stanbic Bank", "Fidelity Bank"]
  },
  { 
    name: "Kenya", code: "KE", currency: "KES", symbol: "KSh", rate: 12, flag: "🇰🇪",
    banks: ["KCB Bank", "Equity Bank", "Co-operative Bank", "Barclays Kenya", "Standard Chartered"]
  },
  { 
    name: "South Africa", code: "ZA", currency: "ZAR", symbol: "R", rate: 85, flag: "🇿🇦",
    banks: ["Standard Bank", "Absa", "FNB", "Nedbank", "Capitec"]
  },
  { 
    name: "Europe", code: "EU", currency: "EUR", symbol: "€", rate: 1680, flag: "🇪🇺",
    banks: ["Deutsche Bank", "BNP Paribas", "Santander", "ING", "UniCredit"]
  }
];

const CRYPTO_COINS = [
  { name: "Bitcoin", symbol: "BTC", price: 95000000, icon: "₿", color: "#F7931A" },
  { name: "Ethereum", symbol: "ETH", price: 5200000, icon: "Ξ", color: "#627EEA" },
  { name: "USDT", symbol: "USDT", price: 1580, icon: "₮", color: "#26A17B" },
  { name: "BNB", symbol: "BNB", price: 950000, icon: "BNB", color: "#F3BA2F" },
  { name: "Litecoin", symbol: "LTC", price: 280000, icon: "Ł", color: "#345D9D" },
  { name: "Dogecoin", symbol: "DOGE", price: 580, icon: "Ð", color: "#C2A633" }
];

const handleBuyProduct = async (product, user) => {
  try {
    const buyerSnap = await getDoc(doc(db, "users", user.uid));
    const buyerWallet = buyerSnap.data()?.wallet || 0;
    if (buyerWallet < product.price) {
      alert("Insufficient funds! Add money to your wallet.");
      return;
    }
    await updateDoc(doc(db, "users", user.uid), { wallet: buyerWallet - product.price });
    await addDoc(collection(db, "orders"), {
      productId: product.id,
      title: product.title,
      price: product.price,
      buyerId: user.uid,
      sellerId: product.sellerId,
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

const handleBuyService = async (service, user) => {
  try {
    const buyerSnap = await getDoc(doc(db, "users", user.uid));
    const buyerWallet = buyerSnap.data()?.wallet || 0;
    if (buyerWallet < service.price) {
      alert("Insufficient funds! Add money to your wallet.");
      return;
    }
    let extraInfo = {};
    if (service.category === "Airtime" || service.category === "Data") {
      const phoneNumber = prompt("📱 Enter your phone number:");
      if (!phoneNumber) return;
      extraInfo.phoneNumber = phoneNumber;
    }
    if (service.category === "Bills") {
      const accountNumber = prompt("⚡ Enter your meter/smartcard number:");
      if (!accountNumber) return;
      extraInfo.accountNumber = accountNumber;
    }
    if (service.category === "Crypto") {
      const walletAddress = prompt("💰 Enter your crypto wallet address:");
      if (!walletAddress) return;
      extraInfo.walletAddress = walletAddress;
    }
    await updateDoc(doc(db, "users", user.uid), { wallet: buyerWallet - service.price });
    await addDoc(collection(db, "orders"), {
      serviceId: service.id,
      title: service.title,
      price: service.price,
      category: service.category,
      buyerId: user.uid,
      sellerId: service.sellerId,
      type: "service",
      status: "pending",
      createdAt: serverTimestamp(),
      ...extraInfo
    });
    alert("✅ Order placed successfully!");
    window.location.reload();
  } catch (err) {
    alert("Error: " + err.message);
  }
};

const handleBuyTicket = async (ticket, user) => {
  try {
    const buyerSnap = await getDoc(doc(db, "users", user.uid));
    const buyerWallet = buyerSnap.data()?.wallet || 0;
    if (buyerWallet < ticket.price) {
      alert("Insufficient funds! Add money to your wallet.");
      return;
    }
    await updateDoc(doc(db, "users", user.uid), { wallet: buyerWallet - ticket.price });
    await addDoc(collection(db, "orders"), {
      ticketId: ticket.id,
      title: ticket.title,
      price: ticket.price,
      buyerId: user.uid,
      sellerId: ticket.sellerId,
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

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("products");
  const [page, setPage] = useState("browse");
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
          {page === "browse" && <ProductsBrowse user={user} isAdmin={isAdmin} setPage={setPage} />}
          {page === "add-product" && isAdmin && <AddProduct user={user} setPage={setPage} />}
        </>
      )}
      {section === "services" && (
        <>
          {page === "browse" && <ServicesBrowse user={user} isAdmin={isAdmin} setPage={setPage} />}
          {page === "add-service" && isAdmin && <AddService user={user} setPage={setPage} />}
        </>
      )}
      {section === "tickets" && (
        <>
          {page === "browse" && <TicketsBrowse user={user} isAdmin={isAdmin} setPage={setPage} />}
          {page === "add-ticket" && isAdmin && <AddTicket user={user} setPage={setPage} />}
        </>
      )}
      {page === "profile" && <ProfilePage user={user} />}
      {page === "orders" && <OrdersPage user={user} />}
      {page === "transfer" && <MoneyTransfer user={user} />}
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
          wallet: 0
        });
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
const ProductsBrowse = ({ user, isAdmin, setPage }) => {
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
  if (selectedProduct) return <ProductDetail product={selectedProduct} user={user} onBack={() => setSelectedProduct(null)} />;
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      {isAdmin && (
        <button onClick={() => setPage("add-product")} style={{position:"fixed",bottom:"90px",right:"20px",width:"56px",height:"56px",borderRadius:"50%",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",fontSize:"28px",fontWeight:"700",cursor:"pointer",boxShadow:"0 6px 20px rgba(255,107,53,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      )}
      <input type="text" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{width:"100%",padding:"12px 16px",marginBottom:"14px",border:"2px solid #f0f0f0",borderRadius:"10px",fontSize:"14px",fontWeight:"500",outline:"none"}} />
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
          {filtered.map(product => (
            <div key={product.id} onClick={() => setSelectedProduct(product)} className="card-hover" style={{background:"white",borderRadius:"14px",overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.08)",cursor:"pointer"}}>
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
          ))}
        </div>
      )}
    </div>
  );
};

const ProductDetail = ({ product, user, onBack }) => {
  const [seller, setSeller] = useState(null);
  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "users", product.sellerId));
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
            <button onClick={() => { if (window.confirm(`Buy ${product.title} for ₦${product.price?.toLocaleString()}?`)) { handleBuyProduct(product, user); }}} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"10px",fontSize:"15px",fontWeight:"900",cursor:"pointer",boxShadow:"0 4px 12px rgba(255,107,53,0.4)"}}>
              BUY NOW - ₦{product.price?.toLocaleString()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AddProduct = ({ user, setPage }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Campus");
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
      let imageUrl = "";
      if (image) {
        const imageRef = ref(storage, `products/${user.uid}/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }
      await addDoc(collection(db, "products"), {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category,
        imageUrl,
        sellerId: user.uid,
        createdAt: serverTimestamp(),
        status: "active"
      });
      alert("✅ Product added!");
      setPage("browse");
    } catch (err) { setError(err.message); }
    setUploading(false);
  };
  return (
    <div style={{maxWidth:"550px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Add Product</h2>
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
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe..." rows="4" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit"}} />
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"13px",fontWeight:"600",cursor:"pointer"}} />
          {image && <p style={{marginTop:"8px",fontSize:"13px",color:"#FF6B35",fontWeight:"700"}}>✓ {image.name}</p>}
        </div>
        {error && <div style={{color:"#d32f2f",marginBottom:"16px",fontSize:"12px",fontWeight:"700",padding:"10px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
        <div style={{display:"flex",gap:"8px"}}>
          <button type="button" onClick={() => setPage("browse")} style={{flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>Cancel</button>
          <button type="submit" disabled={uploading} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 4px 10px rgba(255,107,53,0.4)"}}>
            {uploading ? "ADDING..." : "ADD PRODUCT"}
          </button>
        </div>
      </form>
    </div>
  );
};
const ServicesBrowse = ({ user, isAdmin, setPage }) => {
  const [services, setServices] = useState([]);
  const [category, setCategory] = useState("All");
  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, []);
  const filtered = services.filter(s => category === "All" || s.category === category);
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      {isAdmin && (
        <button onClick={() => setPage("add-service")} style={{position:"fixed",bottom:"90px",right:"20px",width:"56px",height:"56px",borderRadius:"50%",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",fontSize:"28px",fontWeight:"700",cursor:"pointer",boxShadow:"0 6px 20px rgba(76,175,80,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      )}
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
          {filtered.map(service => (
            <div key={service.id} onClick={() => {
              if (service.sellerId === user.uid) {
                alert("This is your own service!");
              } else {
                if (window.confirm(`Buy ${service.title} for ₦${service.price?.toLocaleString()}?`)) {
                  handleBuyService(service, user);
                }
              }
            }} className="card-hover" style={{background:"white",borderRadius:"14px",overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.08)",cursor:"pointer"}}>
              {service.imageUrl && (
                <div style={{width:"100%",height:"140px",background:"linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px"}}>
                  <img src={service.imageUrl} alt={service.title} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} />
                </div>
              )}
              <div style={{padding:"12px"}}>
                <div style={{display:"inline-block",padding:"3px 8px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"8px",fontSize:"9px",fontWeight:"800",color:"#4CAF50",marginBottom:"6px",textTransform:"uppercase",border:"1px solid #4CAF50"}}>{service.category}</div>
                <h3 style={{fontSize:"14px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50",lineHeight:"1.2"}}>{service.title}</h3>
                {service.description && <p style={{color:"#666",fontSize:"12px",marginBottom:"8px",lineHeight:"1.3"}}>{service.description?.substring(0,60)}...</p>}
                {service.category === "Crypto" && service.cryptoType && (
                  <div style={{padding:"6px",background:"#FFF9C4",borderRadius:"6px",marginBottom:"6px"}}>
                    <p style={{fontSize:"11px",fontWeight:"800",color:"#F57F17"}}>{service.cryptoType}</p>
                  </div>
                )}
                <p style={{fontSize:"18px",fontWeight:"900",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{service.price?.toLocaleString()}</p>
                {service.sellerId === user.uid && (
                  <div style={{marginTop:"10px",padding:"6px",background:"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"6px",textAlign:"center",border:"1px solid #FBC02D"}}>
                    <p style={{fontSize:"10px",fontWeight:"800",color:"#F57F17"}}>YOUR SERVICE</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AddService = ({ user, setPage }) => {
  const [category, setCategory] = useState("Airtime");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [network, setNetwork] = useState("MTN");
  const [airtimeAmount, setAirtimeAmount] = useState("100");
  const [dataNetwork, setDataNetwork] = useState("MTN");
  const [dataPlan, setDataPlan] = useState("1GB - ₦500");
  const [billType, setBillType] = useState("NEPA");
  const [cryptoType, setCryptoType] = useState("Bitcoin");
  const [cryptoWallet, setCryptoWallet] = useState("");
  
  const handleImageChange = (e) => { if (e.target.files[0]) setImage(e.target.files[0]); };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    let finalTitle = title;
    let finalDescription = description;
    
    if (category === "Airtime") {
      finalTitle = `${network} ₦${airtimeAmount} Airtime`;
      if (!description.trim()) finalDescription = `${network} airtime recharge of ₦${airtimeAmount}`;
    }
    if (category === "Data") {
      finalTitle = `${dataNetwork} ${dataPlan.split(' - ')[0]} Data`;
      if (!description.trim()) finalDescription = `${dataNetwork} data bundle - ${dataPlan}`;
    }
    if (category === "Bills") {
      finalTitle = `${billType} Bill Payment`;
      if (!description.trim()) finalDescription = `Pay your ${billType} bill instantly`;
    }
    if (category === "Crypto" && !cryptoWallet.trim()) {
      setError("Please enter your crypto wallet address");
      return;
    }
    if (!finalTitle.trim() || !finalDescription.trim() || !price) { setError("Fill all fields"); return; }
    
    setUploading(true);
    try {
      let imageUrl = "";
      if (image) {
        const imageRef = ref(storage, `services/${user.uid}/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }
      const serviceData = { 
        title: finalTitle.trim(), 
        description: finalDescription.trim(), 
        price: parseFloat(price), 
        category, 
        sellerId: user.uid, 
        createdAt: serverTimestamp(), 
        status: "active",
        imageUrl
      };
      if (category === "Crypto") {
        serviceData.cryptoType = cryptoType;
        serviceData.cryptoWallet = cryptoWallet.trim();
      }
      await addDoc(collection(db, "services"), serviceData);
      alert("✅ Service added!");
      setPage("browse");
    } catch (err) { setError(err.message); }
    setUploading(false);
  };
  
  return (
    <div style={{maxWidth:"550px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Add Service</h2>
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
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Card Details</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="iTunes $50 Gift Card" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>📸 Card Photo</label>
              <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"13px",fontWeight:"600",cursor:"pointer"}} />
              {image && <p style={{marginTop:"8px",fontSize:"13px",color:"#4CAF50",fontWeight:"700"}}>✓ {image.name}</p>}
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Unused card..." rows="3" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit"}} />
            </div>
          </>
        )}
        
        {category === "Crypto" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Crypto Type</label>
              <select value={cryptoType} onChange={(e) => setCryptoType(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
                {CRYPTO_COINS.map(c => <option key={c.symbol} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Amount</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="0.005 BTC" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Your Wallet Address</label>
              <input type="text" value={cryptoWallet} onChange={(e) => setCryptoWallet(e.target.value)} placeholder="bc1q..." style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Selling crypto..." rows="3" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit"}} />
            </div>
          </>
        )}
        
        {category === "Skills" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Logo Design" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="I will design..." rows="4" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit"}} />
            </div>
          </>
        )}
        
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Your Price (₦)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        
        {error && <div style={{color:"#d32f2f",marginBottom:"16px",fontSize:"12px",fontWeight:"700",padding:"10px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
        
        <div style={{display:"flex",gap:"8px"}}>
          <button type="button" onClick={() => setPage("browse")} style={{flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>Cancel</button>
          <button type="submit" disabled={uploading} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 4px 10px rgba(76,175,80,0.4)"}}>
            {uploading ? "ADDING..." : "ADD SERVICE"}
          </button>
        </div>
      </form>
    </div>
  );
};
const TicketsBrowse = ({ user, isAdmin, setPage }) => {
  const [tickets, setTickets] = useState([]);
  const [ticketType, setTicketType] = useState("All");
  useEffect(() => {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, []);
  const filtered = tickets.filter(t => ticketType === "All" || t.ticketType === ticketType);
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      {isAdmin && (
        <button onClick={() => setPage("add-ticket")} style={{position:"fixed",bottom:"90px",right:"20px",width:"56px",height:"56px",borderRadius:"50%",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",color:"white",border:"none",fontSize:"28px",fontWeight:"700",cursor:"pointer",boxShadow:"0 6px 20px rgba(156,39,176,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      )}
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
          {filtered.map(t => (
            <div key={t.id} onClick={() => {
              if (t.sellerId === user.uid) {
                alert("This is your own ticket!");
              } else {
                if (window.confirm(`Buy ${t.title} for ₦${t.price?.toLocaleString()}?`)) {
                  handleBuyTicket(t, user);
                }
              }
            }} className="card-hover" style={{background:"white",borderRadius:"14px",overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.08)",cursor:"pointer"}}>
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
                {t.sellerId === user.uid && (
                  <div style={{marginTop:"10px",padding:"6px",background:"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"6px",textAlign:"center",border:"1px solid #FBC02D"}}>
                    <p style={{fontSize:"10px",fontWeight:"800",color:"#F57F17"}}>YOUR TICKET</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AddTicket = ({ user, setPage }) => {
  const [ticketType, setTicketType] = useState("Event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [airline, setAirline] = useState("Air Peace");
  const [route, setRoute] = useState("");
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
      let imageUrl = "";
      if (image) {
        const imageRef = ref(storage, `tickets/${user.uid}/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }
      const ticketData = { 
        title: title.trim(), 
        description: description.trim(), 
        price: parseFloat(price), 
        ticketType, 
        sellerId: user.uid, 
        createdAt: serverTimestamp(), 
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
      await addDoc(collection(db, "tickets"), ticketData);
      alert("✅ Ticket added!");
      setPage("browse");
    } catch (err) { setError(err.message); }
    setUploading(false);
  };
  return (
    <div style={{maxWidth:"550px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Add Ticket</h2>
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
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Description (Optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows="3" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit"}} />
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Image (Optional)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"13px",fontWeight:"600",cursor:"pointer"}} />
          {image && <p style={{marginTop:"8px",fontSize:"13px",color:"#9C27B0",fontWeight:"700"}}>✓ {image.name}</p>}
        </div>
        {error && <div style={{color:"#d32f2f",marginBottom:"16px",fontSize:"12px",fontWeight:"700",padding:"10px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
        <div style={{display:"flex",gap:"8px"}}>
          <button type="button" onClick={() => setPage("browse")} style={{flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>Cancel</button>
          <button type="submit" disabled={uploading} style={{flex:1,padding:"12px",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"800",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 4px 10px rgba(156,39,176,0.4)"}}>
            {uploading ? "ADDING..." : "ADD TICKET"}
          </button>
        </div>
      </form>
    </div>
  );
};

const OrdersPage = ({ user }) => {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "orders"), where("buyerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, [user]);
  const confirmDelivery = async (order) => {
    if (!window.confirm("Confirm received?")) return;
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "completed", completedAt: serverTimestamp() });
      const sellerSnap = await getDoc(doc(db, "users", order.sellerId));
      const sellerWallet = sellerSnap.data()?.wallet || 0;
      await updateDoc(doc(db, "users", order.sellerId), {
        wallet: sellerWallet + order.price,
        totalSales: (sellerSnap.data()?.totalSales || 0) + 1
      });
      alert("✅ Confirmed!");
      window.location.reload();
    } catch (err) { alert("Error: " + err.message); }
  };
  return (
    <div style={{maxWidth:"700px",margin:"0 auto",padding:"16px",paddingBottom:"90px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>My Orders</h2>
      {orders.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 16px",background:"white",borderRadius:"14px"}}>
          <div style={{fontSize:"50px",marginBottom:"12px"}}>📦</div>
          <p style={{fontSize:"16px",color:"#2C3E50",fontWeight:"800"}}>No orders yet</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          {orders.map(order => (
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
                </div>
              )}
              {order.status === "pending" && (
                <button onClick={() => confirmDelivery(order)} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:"800",cursor:"pointer",boxShadow:"0 3px 8px rgba(76,175,80,0.3)"}}>
                  CONFIRM DELIVERY
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MoneyTransfer = ({ user }) => {
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientBank, setRecipientBank] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nairaAmount = amount ? parseFloat(amount) : 0;
  const foreignAmount = nairaAmount > 0 ? (nairaAmount / country.rate).toFixed(2) : "0.00";
  const handleTransfer = async (e) => {
    e.preventDefault();
    setError("");
    if (!amount || !recipientName.trim() || !recipientBank || !recipientAccount.trim()) {
      setError("Fill all fields");
      return;
    }
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userWallet = userSnap.data()?.wallet || 0;
    if (userWallet < nairaAmount) {
      setError("Insufficient funds!");
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { wallet: userWallet - nairaAmount });
      await addDoc(collection(db, "transfers"), {
        userId: user.uid,
        country: country.name,
        currency: country.currency,
        nairaAmount,
        foreignAmount: parseFloat(foreignAmount),
        recipientName: recipientName.trim(),
        recipientBank,
        recipientAccount: recipientAccount.trim(),
        status: "processing",
        createdAt: serverTimestamp()
      });
      alert(`✅ Transfer of ${country.symbol}${foreignAmount} is processing!`);
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
      <h2 style={{fontSize:"20px",fontWeight:"900",marginBottom:"16px",background:"linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Send Money Abroad</h2>
      <form onSubmit={handleTransfer} style={{background:"white",padding:"20px",borderRadius:"14px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"8px",color:"#2C3E50"}}>Select Country</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"8px"}}>
            {COUNTRIES.map(c => (
              <div key={c.code} onClick={() => {setCountry(c); setRecipientBank("");}} style={{padding:"10px",background:country.code===c.code?"linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)":"#f8f9fa",border:country.code===c.code?"2px solid #2196F3":"2px solid transparent",borderRadius:"8px",cursor:"pointer",textAlign:"center",transition:"all 0.3s"}}>
                <div style={{fontSize:"20px",marginBottom:"3px"}}>{c.flag}</div>
                <p style={{fontSize:"11px",fontWeight:"800",color:"#2C3E50"}}>{c.name}</p>
                <p style={{fontSize:"10px",fontWeight:"700",color:"#2196F3"}}>{c.currency}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"12px",background:"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"10px",marginBottom:"16px",border:"2px solid #FBC02D"}}>
          <p style={{fontSize:"11px",fontWeight:"700",color:"#F57F17",marginBottom:"4px"}}>Rate:</p>
          <p style={{fontSize:"16px",fontWeight:"900",color:"#F57F17"}}>₦1 = {country.symbol}{(1/country.rate).toFixed(4)}</p>
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Amount (₦)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
          {nairaAmount > 0 && (
            <p style={{marginTop:"6px",fontSize:"13px",fontWeight:"700",color:"#2196F3"}}>= {country.symbol}{foreignAmount} {country.currency}</p>
          )}
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Recipient Name</label>
          <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="John Doe" style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600",outline:"none"}} />
        </div>
        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",fontSize:"13px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>Recipient Bank</label>
          <select value={recipientBank} onChange={(e) => setRecipientBank(e.target.value)} style={{width:"100%",padding:"12px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"14px",fontWeight:"600"}}>
            <option value="">Select Bank</option>
            {country.banks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
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
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"20px"}}>
          <div style={{padding:"16px",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",borderRadius:"10px",textAlign:"center",border:"2px solid #FF6B35"}}>
            <p style={{fontSize:"11px",color:"#FF6B35",fontWeight:"800",marginBottom:"4px"}}>RATING</p>
            <p style={{fontSize:"24px",fontWeight:"900",color:"#FF6B35"}}>⭐ {userData?.rating || 0}/5</p>
          </div>
          <div style={{padding:"16px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"10px",textAlign:"center",border:"2px solid #4CAF50"}}>
            <p style={{fontSize:"11px",color:"#4CAF50",fontWeight:"800",marginBottom:"4px"}}>SALES</p>
            <p style={{fontSize:"24px",fontWeight:"900",color:"#4CAF50"}}>{userData?.totalSales || 0}</p>
          </div>
        </div>
        <button onClick={() => signOut(auth)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",color:"#d32f2f",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:"900",cursor:"pointer"}}>
          SIGN OUT
        </button>
      </div>
    </div>
  );
};

const NavBar = ({ page, setPage, section }) => {
  const icons = {
    browse: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
    orders: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
    transfer: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
    profile: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
  };
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"white",borderTop:"3px solid #f0f0f0",display:"flex",justifyContent:"space-around",padding:"8px 0 12px",zIndex:100,boxShadow:"0 -2px 12px rgba(0,0,0,0.08)"}}>
      {[
        { key: "browse", label: "Browse" },
        { key: "orders", label: "Orders" },
        { key: "transfer", label: "Transfer" },
        { key: "profile", label: "Profile" }
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
