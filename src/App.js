import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, onSnapshot, serverTimestamp, where, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";

const PRODUCT_CATEGORIES = ["All", "Campus", "Food", "Thrift", "Clothes", "Accessories", "Electronics", "Other"];
const SERVICE_CATEGORIES = ["All", "Airtime", "Data", "Bills", "Skills", "Gift Cards", "Crypto"];
const ADMIN_UID = "Hnl2ncOnVtPWbnVTz3TcU2jJUXy1";

const handleBuyProduct = async (product, user) => {
  try {
    const buyerSnap = await getDoc(doc(db, "users", user.uid));
    const buyerWallet = buyerSnap.data()?.wallet || 0;
    if (buyerWallet < product.price) {
      alert("Insufficient funds! Add money to your wallet.");
      return;
    }
    await updateDoc(doc(db, "users", user.uid), {
      wallet: buyerWallet - product.price
    });
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
    alert("✅ Order placed! Seller will deliver soon.");
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
    if (service.category === "Gift Cards") {
      const cardType = prompt("🎁 Enter card type (e.g., iTunes $50):");
      if (!cardType) return;
      extraInfo.cardType = cardType;
    }
    if (service.category === "Crypto") {
      const walletAddress = prompt("💰 Enter your crypto wallet address:");
      if (!walletAddress) return;
      extraInfo.walletAddress = walletAddress;
    }
    await updateDoc(doc(db, "users", user.uid), {
      wallet: buyerWallet - service.price
    });
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
    alert("✅ Order placed! Seller will deliver soon.");
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
    await updateDoc(doc(db, "users", user.uid), {
      wallet: buyerWallet - ticket.price
    });
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
    alert("✅ Ticket purchased! Check your orders.");
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
        <div style={{width:"60px",height:"60px",border:"4px solid rgba(255,255,255,0.3)",borderTop:"4px solid white",borderRadius:"50%",margin:"0 auto 20px",animation:"spin 1s linear infinite"}}></div>
        <p style={{color:"white",fontSize:"18px",fontWeight:"700"}}>Loading QuickSell...</p>
      </div>
    </div>
  );
  if (!user) return <AuthPage onLogin={setUser} />;
  return (
    <div style={{background:"linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%)",minHeight:"100vh"}}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-8px); box-shadow: 0 12px 24px rgba(255,107,53,0.2) !important; }
      `}</style>
      <Header user={user} section={section} setSection={setSection} setPage={setPage} />
      {section === "products" && (
        <>
          {page === "browse" && <ProductsBrowse user={user} />}
          {page === "sell" && <ProductsSell user={user} setPage={setPage} />}
          {page === "mylistings" && <ProductsMyListings user={user} />}
        </>
      )}
      {section === "services" && (
        <>
          {page === "browse" && <ServicesBrowse user={user} />}
          {page === "sell" && <ServicesSell user={user} setPage={setPage} />}
          {page === "mylistings" && <ServicesMyListings user={user} />}
        </>
      )}
      {section === "tickets" && (
        <>
          {page === "browse" && <TicketsBrowse user={user} />}
          {page === "sell" && <TicketsSell user={user} setPage={setPage} />}
          {page === "mylistings" && <TicketsMyListings user={user} />}
        </>
      )}
      {page === "profile" && <ProfilePage user={user} />}
      {page === "orders" && <OrdersPage user={user} />}
      {page === "transfer" && <MoneyTransfer user={user} />}
      <NavBar page={page} setPage={setPage} />
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
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",padding:"20px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-10%",right:"-10%",width:"500px",height:"500px",background:"rgba(255,255,255,0.1)",borderRadius:"50%",filter:"blur(100px)"}}></div>
      <div style={{position:"absolute",bottom:"-10%",left:"-10%",width:"400px",height:"400px",background:"rgba(255,255,255,0.1)",borderRadius:"50%",filter:"blur(100px)"}}></div>
      <div style={{background:"white",padding:"48px",borderRadius:"24px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"100%",maxWidth:"440px",position:"relative",zIndex:1,animation:"fadeIn 0.6s ease"}}>
        <div style={{textAlign:"center",marginBottom:"40px"}}>
          <div style={{width:"80px",height:"80px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",borderRadius:"20px",margin:"0 auto 20px",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 20px rgba(255,107,53,0.4)"}}>
            <svg width="40" height="40" fill="white" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </div>
          <h1 style={{fontSize:"42px",fontWeight:"900",marginBottom:"12px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-1px"}}>QuickSell</h1>
          <p style={{color:"#666",fontSize:"16px",fontWeight:"500"}}>Nigeria's #1 Marketplace</p>
        </div>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{marginBottom:"20px"}}>
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"2px solid #f0f0f0",borderRadius:"12px",fontSize:"15px",fontWeight:"500",transition:"all 0.3s",outline:"none"}} onFocus={(e) => e.target.style.borderColor = "#FF6B35"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
            </div>
          )}
          <div style={{marginBottom:"20px"}}>
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{width:"100%",padding:"16px 20px",border:"2px solid #f0f0f0",borderRadius:"12px",fontSize:"15px",fontWeight:"500",transition:"all 0.3s",outline:"none"}} onFocus={(e) => e.target.style.borderColor = "#FF6B35"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
          </div>
          <div style={{marginBottom:"24px"}}>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{width:"100%",padding:"16px 20px",border:"2px solid #f0f0f0",borderRadius:"12px",fontSize:"15px",fontWeight:"500",transition:"all 0.3s",outline:"none"}} onFocus={(e) => e.target.style.borderColor = "#FF6B35"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
          </div>
          {error && <div style={{color:"#d32f2f",marginBottom:"20px",fontSize:"14px",fontWeight:"600",padding:"16px",background:"#ffebee",borderRadius:"12px",border:"2px solid #ffcdd2"}}>{error}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:"18px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"12px",fontSize:"17px",fontWeight:"800",cursor:loading?"not-allowed":"pointer",boxShadow:"0 8px 20px rgba(255,107,53,0.4)",transition:"all 0.3s",letterSpacing:"0.5px"}}>
            {loading ? "PLEASE WAIT..." : (isLogin ? "SIGN IN" : "CREATE ACCOUNT")}
          </button>
        </form>
        <p style={{marginTop:"28px",textAlign:"center",color:"#666",fontSize:"15px",fontWeight:"500"}}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setIsLogin(!isLogin)} style={{color:"#FF6B35",fontWeight:"800",cursor:"pointer",textDecoration:"underline"}}>
            {isLogin ? "Sign Up" : "Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
};
const Header = ({ user, section, setSection, setPage }) => {
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
      <div style={{background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",borderBottom:"4px solid #E85D2C",padding:"20px",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(255,107,53,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:"1200px",margin:"0 auto"}}>
          <h1 onClick={() => setPage("browse")} style={{fontSize:"28px",fontWeight:"900",color:"white",cursor:"pointer",letterSpacing:"-0.5px",textShadow:"0 2px 10px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:"8px"}}>
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
            QuickSell
          </h1>
          <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
            <div style={{fontSize:"14px",color:"white",fontWeight:"600",textShadow:"0 1px 3px rgba(0,0,0,0.2)"}}>
              Hi, <span style={{fontWeight:"800"}}>{userData?.name || "User"}</span>
            </div>
            <div onClick={() => setShowAddMoney(true)} style={{padding:"10px 20px",background:"rgba(255,255,255,0.25)",backdropFilter:"blur(10px)",borderRadius:"30px",fontSize:"15px",fontWeight:"800",color:"white",cursor:"pointer",boxShadow:"0 4px 15px rgba(0,0,0,0.2)",border:"2px solid rgba(255,255,255,0.3)",transition:"all 0.3s"}}>
              ₦{(userData?.wallet || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      <div style={{background:"white",borderBottom:"3px solid #f0f0f0",padding:"16px 20px",position:"sticky",top:"76px",zIndex:99,boxShadow:"0 2px 10px rgba(0,0,0,0.05)"}}>
        <div style={{display:"flex",gap:"12px",maxWidth:"1200px",margin:"0 auto",overflowX:"auto"}}>
          {["products", "services", "tickets"].map(s => (
            <button key={s} onClick={() => {setSection(s); setPage("browse");}} style={{padding:"12px 28px",background:section===s?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"#f8f9fa",color:section===s?"white":"#666",border:"none",borderRadius:"25px",fontSize:"15px",fontWeight:"800",cursor:"pointer",textTransform:"capitalize",boxShadow:section===s?"0 6px 15px rgba(255,107,53,0.4)":"0 2px 5px rgba(0,0,0,0.05)",transition:"all 0.3s",whiteSpace:"nowrap",letterSpacing:"0.3px"}}>
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
    if (!amount) {
      setError("Please enter amount");
      return;
    }
    setUploading(true);
    try {
      let screenshotUrl = "no-screenshot-uploaded";
      if (screenshot) {
        try {
          const screenshotRef = ref(storage, `deposits/${user.uid}/${Date.now()}_${screenshot.name}`);
          await uploadBytes(screenshotRef, screenshot);
          screenshotUrl = await getDownloadURL(screenshotRef);
          console.log("✅ Screenshot uploaded successfully!");
        } catch (err) {
          console.log("⚠️ Screenshot upload failed, continuing anyway:", err);
          screenshotUrl = "screenshot-upload-failed";
        }
      }
      
      console.log("Creating deposit document...");
      await addDoc(collection(db, "deposits"), {
        userId: user.uid,
        amount: parseFloat(amount),
        screenshotUrl,
        status: "pending",
        createdAt: serverTimestamp()
      });
      console.log("✅ Deposit document created!");
      
      alert("✅ Deposit request submitted! You'll be credited once approved.");
      onClose();
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message);
    }
    setUploading(false);
  };
  return (
    <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px",backdropFilter:"blur(5px)",animation:"fadeIn 0.3s ease"}}>
      <div onClick={(e) => e.stopPropagation()} style={{background:"white",borderRadius:"24px",padding:"40px",maxWidth:"520px",width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.4)",animation:"fadeIn 0.4s ease"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"32px"}}>
          <h2 style={{fontSize:"28px",fontWeight:"900",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Add Money</h2>
          <button onClick={onClose} style={{width:"40px",height:"40px",borderRadius:"50%",background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:"20px",fontWeight:"700",color:"#666"}}>×</button>
        </div>
        <div style={{padding:"24px",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",borderRadius:"16px",marginBottom:"32px",border:"3px dashed #FF6B35"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
            <div style={{width:"50px",height:"50px",borderRadius:"12px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            </div>
            <div>
              <p style={{fontSize:"13px",fontWeight:"700",color:"#FF6B35",marginBottom:"4px"}}>TRANSFER TO:</p>
              <p style={{fontSize:"17px",fontWeight:"800",color:"#2C3E50"}}>OPay - 9020853814</p>
              <p style={{fontSize:"14px",fontWeight:"600",color:"#666"}}>Emmanuel Etim Kelvin</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:"24px"}}>
            <label style={{display:"block",fontSize:"15px",fontWeight:"800",marginBottom:"10px",color:"#2C3E50"}}>Amount Sent (₦)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#FF6B35"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
          </div>
          <div style={{marginBottom:"24px"}}>
            <label style={{display:"block",fontSize:"15px",fontWeight:"800",marginBottom:"10px",color:"#2C3E50"}}>Upload Payment Proof (Optional for testing)</label>
            <input type="file" accept="image/*" onChange={handleScreenshotChange} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"15px",fontWeight:"600",cursor:"pointer"}} />
            {screenshot && <p style={{marginTop:"12px",fontSize:"15px",color:"#4CAF50",fontWeight:"700"}}>✓ {screenshot.name}</p>}
          </div>
          {error && <div style={{color:"#d32f2f",marginBottom:"24px",fontSize:"15px",fontWeight:"700",padding:"16px",background:"#ffebee",borderRadius:"12px",border:"2px solid #ffcdd2"}}>{error}</div>}
          <div style={{display:"flex",gap:"12px"}}>
            <button type="button" onClick={onClose} style={{flex:1,padding:"18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"12px",fontSize:"16px",fontWeight:"800",cursor:"pointer",transition:"all 0.3s"}}>Cancel</button>
            <button type="submit" disabled={uploading} style={{flex:1,padding:"18px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"12px",fontSize:"16px",fontWeight:"800",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 6px 15px rgba(255,107,53,0.4)",transition:"all 0.3s"}}>
              {uploading ? "SUBMITTING..." : "SUBMIT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductsBrowse = ({ user }) => {
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
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <div style={{position:"relative",marginBottom:"28px"}}>
        <svg style={{position:"absolute",left:"20px",top:"50%",transform:"translateY(-50%)",width:"22px",height:"22px"}} fill="#999" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} style={{width:"100%",padding:"18px 20px 18px 56px",border:"3px solid #f0f0f0",borderRadius:"16px",fontSize:"16px",fontWeight:"600",outline:"none",boxShadow:"0 4px 15px rgba(0,0,0,0.05)",transition:"all 0.3s"}} onFocus={(e) => {e.target.style.borderColor = "#FF6B35"; e.target.style.boxShadow = "0 6px 20px rgba(255,107,53,0.2)";}} onBlur={(e) => {e.target.style.borderColor = "#f0f0f0"; e.target.style.boxShadow = "0 4px 15px rgba(0,0,0,0.05)";}} />
      </div>
      <div style={{display:"flex",gap:"12px",marginBottom:"32px",overflowX:"auto",paddingBottom:"8px"}}>
        {PRODUCT_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{padding:"12px 24px",background:category===cat?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"white",color:category===cat?"white":"#666",border:category===cat?"none":"3px solid #f0f0f0",borderRadius:"30px",fontSize:"15px",fontWeight:"800",cursor:"pointer",whiteSpace:"nowrap",boxShadow:category===cat?"0 6px 15px rgba(255,107,53,0.3)":"0 2px 8px rgba(0,0,0,0.05)",transition:"all 0.3s",letterSpacing:"0.3px"}}>
            {cat}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"100px 20px",background:"white",borderRadius:"24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:"72px",marginBottom:"20px"}}>🛍️</div>
          <p style={{fontSize:"22px",color:"#2C3E50",fontWeight:"800",marginBottom:"8px"}}>No products found</p>
          <p style={{fontSize:"16px",color:"#999",fontWeight:"600"}}>Try searching for something else</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"24px"}}>
          {filtered.map(product => (
            <div key={product.id} onClick={() => setSelectedProduct(product)} className="card-hover" style={{background:"white",borderRadius:"20px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",cursor:"pointer",border:"3px solid transparent",transition:"all 0.3s"}}>
              {product.imageUrl ? (
                <div style={{position:"relative",width:"100%",height:"220px",overflow:"hidden"}}>
                  <img src={product.imageUrl} alt={product.title} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  <div style={{position:"absolute",top:"16px",left:"16px",padding:"8px 16px",background:"rgba(255,255,255,0.95)",backdropFilter:"blur(10px)",borderRadius:"20px",fontSize:"12px",fontWeight:"800",color:"#FF6B35",textTransform:"uppercase",letterSpacing:"0.5px",boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>{product.category}</div>
                </div>
              ) : (
                <div style={{width:"100%",height:"220px",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="80" height="80" fill="#FF6B35" viewBox="0 0 24 24" opacity="0.3"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7.5 16c0 .28-.22.5-.5.5H5c-.28 0-.5-.22-.5-.5V5c0-.28.22-.5.5-.5h14c.28 0 .5.22.5.5v14z"/></svg>
                </div>
              )}
              <div style={{padding:"20px"}}>
                <h3 style={{fontSize:"18px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50",lineHeight:"1.3"}}>{product.title}</h3>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <p style={{fontSize:"26px",fontWeight:"900",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{product.price?.toLocaleString()}</p>
                  <svg width="28" height="28" fill="#FF6B35" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                </div>
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
    <div style={{maxWidth:"900px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.4s ease"}}>
      <button onClick={onBack} style={{marginBottom:"24px",padding:"14px 28px",background:"white",border:"3px solid #f0f0f0",borderRadius:"16px",cursor:"pointer",fontSize:"16px",fontWeight:"800",color:"#2C3E50",display:"flex",alignItems:"center",gap:"8px",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",transition:"all 0.3s"}}>
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
        Back
      </button>
      <div style={{background:"white",borderRadius:"24px",overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.12)",border:"3px solid #f8f9fa"}}>
        {product.imageUrl && <img src={product.imageUrl} alt={product.title} style={{width:"100%",maxHeight:"500px",objectFit:"cover"}} />}
        <div style={{padding:"40px"}}>
          <div style={{display:"inline-block",padding:"10px 20px",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",borderRadius:"20px",fontSize:"13px",fontWeight:"800",color:"#FF6B35",marginBottom:"16px",textTransform:"uppercase",letterSpacing:"0.5px",border:"2px solid #FF6B35"}}>{product.category}</div>
          <h1 style={{fontSize:"38px",fontWeight:"900",marginBottom:"16px",color:"#2C3E50",lineHeight:"1.2"}}>{product.title}</h1>
          <p style={{fontSize:"48px",fontWeight:"900",marginBottom:"32px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{product.price?.toLocaleString()}</p>
          <div style={{borderTop:"3px solid #f0f0f0",paddingTop:"32px",marginBottom:"32px"}}>
            <h3 style={{fontSize:"20px",fontWeight:"800",marginBottom:"16px",color:"#2C3E50"}}>Description</h3>
            <p style={{color:"#666",lineHeight:"1.8",fontSize:"16px",fontWeight:"500"}}>{product.description}</p>
          </div>
          {seller && (
            <div style={{borderTop:"3px solid #f0f0f0",paddingTop:"32px",marginBottom:"32px"}}>
              <h3 style={{fontSize:"20px",fontWeight:"800",marginBottom:"16px",color:"#2C3E50"}}>Seller Information</h3>
              <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
                <div style={{width:"60px",height:"60px",borderRadius:"50%",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"24px",fontWeight:"900",boxShadow:"0 4px 15px rgba(255,107,53,0.3)"}}>{seller.name?.charAt(0).toUpperCase()}</div>
                <div>
                  <p style={{fontWeight:"800",fontSize:"18px",color:"#2C3E50"}}>{seller.name}</p>
                  <p style={{fontSize:"15px",color:"#999",fontWeight:"600"}}>⭐ {seller.rating || 0}/5 Rating</p>
                </div>
              </div>
            </div>
          )}
          {product.sellerId !== user.uid && (
            <button onClick={() => { if (window.confirm(`Buy ${product.title} for ₦${product.price?.toLocaleString()}?`)) { handleBuyProduct(product, user); }}} style={{width:"100%",padding:"22px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"16px",fontSize:"18px",fontWeight:"900",cursor:"pointer",boxShadow:"0 8px 20px rgba(255,107,53,0.4)",transition:"all 0.3s",letterSpacing:"0.5px"}}>
              BUY NOW - ₦{product.price?.toLocaleString()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ProductsSell = ({ user, setPage }) => {
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
      alert("✅ Product listed successfully!");
      setPage("mylistings");
    } catch (err) { setError(err.message); }
    setUploading(false);
  };
  return (
    <div style={{maxWidth:"700px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"32px",fontWeight:"900",marginBottom:"32px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Sell a Product</h2>
      <form onSubmit={handleSubmit} style={{background:"white",padding:"40px",borderRadius:"24px",boxShadow:"0 8px 30px rgba(0,0,0,0.1)",border:"3px solid #f8f9fa"}}>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Product Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="iPhone 13 Pro Max" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#FF6B35"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",cursor:"pointer"}}>
            {PRODUCT_CATEGORIES.filter(c => c !== "All").map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Price (₦)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50000" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#FF6B35"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product in detail..." rows="5" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",resize:"vertical",outline:"none",transition:"all 0.3s",fontFamily:"inherit"}} onFocus={(e) => e.target.style.borderColor = "#FF6B35"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Product Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"15px",fontWeight:"600",cursor:"pointer"}} />
          {image && <p style={{marginTop:"12px",fontSize:"15px",color:"#4CAF50",fontWeight:"800"}}>✓ {image.name}</p>}
        </div>
        {error && <div style={{color:"#d32f2f",marginBottom:"24px",fontSize:"15px",fontWeight:"700",padding:"18px",background:"#ffebee",borderRadius:"12px",border:"2px solid #ffcdd2"}}>{error}</div>}
        <button type="submit" disabled={uploading} style={{width:"100%",padding:"20px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"16px",fontSize:"18px",fontWeight:"900",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 8px 20px rgba(255,107,53,0.4)",transition:"all 0.3s",letterSpacing:"0.5px"}}>
          {uploading ? "LISTING..." : "LIST PRODUCT"}
        </button>
      </form>
    </div>
  );
};

const ProductsMyListings = ({ user }) => {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "products"), where("sellerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, [user]);
  const deleteProduct = async (id) => { if (window.confirm("Delete this product?")) await deleteDoc(doc(db, "products", id)); };
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"32px",fontWeight:"900",marginBottom:"32px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>My Products</h2>
      {products.length === 0 ? (
        <div style={{textAlign:"center",padding:"100px 20px",background:"white",borderRadius:"24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:"72px",marginBottom:"20px"}}>📦</div>
          <p style={{fontSize:"22px",color:"#2C3E50",fontWeight:"800"}}>No products yet</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"24px"}}>
          {products.map(product => (
            <div key={product.id} style={{background:"white",borderRadius:"20px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:"3px solid #f8f9fa"}}>
              {product.imageUrl && <img src={product.imageUrl} alt={product.title} style={{width:"100%",height:"220px",objectFit:"cover"}} />}
              <div style={{padding:"20px"}}>
                <h3 style={{fontSize:"18px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>{product.title}</h3>
                <p style={{fontSize:"26px",fontWeight:"900",marginBottom:"20px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{product.price?.toLocaleString()}</p>
                <button onClick={() => deleteProduct(product.id)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",color:"#d32f2f",border:"none",borderRadius:"12px",fontSize:"15px",fontWeight:"800",cursor:"pointer",transition:"all 0.3s"}}>DELETE</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
const ServicesBrowse = ({ user }) => {
  const [services, setServices] = useState([]);
  const [category, setCategory] = useState("All");
  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, []);
  const filtered = services.filter(s => category === "All" || s.category === category);
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <div style={{display:"flex",gap:"12px",marginBottom:"32px",overflowX:"auto",paddingBottom:"8px"}}>
        {SERVICE_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{padding:"12px 24px",background:category===cat?"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)":"white",color:category===cat?"white":"#666",border:category===cat?"none":"3px solid #f0f0f0",borderRadius:"30px",fontSize:"15px",fontWeight:"800",cursor:"pointer",whiteSpace:"nowrap",boxShadow:category===cat?"0 6px 15px rgba(76,175,80,0.3)":"0 2px 8px rgba(0,0,0,0.05)",transition:"all 0.3s",letterSpacing:"0.3px"}}>
            {cat}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"100px 20px",background:"white",borderRadius:"24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:"72px",marginBottom:"20px"}}>💼</div>
          <p style={{fontSize:"22px",color:"#2C3E50",fontWeight:"800"}}>No services found</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:"24px"}}>
          {filtered.map(service => (
            <div key={service.id} onClick={() => {
              if (service.sellerId === user.uid) {
                alert("This is your own service!");
              } else {
                if (window.confirm(`Buy ${service.title} for ₦${service.price?.toLocaleString()}?`)) {
                  handleBuyService(service, user);
                }
              }
            }} className="card-hover" style={{background:"white",borderRadius:"20px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",cursor:"pointer",border:"3px solid transparent",transition:"all 0.3s"}}>
              {service.imageUrl && (
                <div style={{width:"100%",height:"200px",overflow:"hidden"}}>
                  <img src={service.imageUrl} alt={service.title} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                </div>
              )}
              <div style={{padding:"24px"}}>
                <div style={{display:"inline-block",padding:"8px 16px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"20px",fontSize:"12px",fontWeight:"800",color:"#4CAF50",marginBottom:"12px",textTransform:"uppercase",letterSpacing:"0.5px",border:"2px solid #4CAF50"}}>{service.category}</div>
                <h3 style={{fontSize:"19px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50",lineHeight:"1.3"}}>{service.title}</h3>
                <p style={{color:"#666",fontSize:"14px",marginBottom:"16px",lineHeight:"1.6",fontWeight:"500"}}>{service.description?.substring(0,90)}...</p>
                {service.category === "Crypto" && service.cryptoType && (
                  <div style={{padding:"12px",background:"#FFF9C4",borderRadius:"12px",marginBottom:"12px"}}>
                    <p style={{fontSize:"13px",fontWeight:"800",color:"#F57F17"}}>💰 {service.cryptoType}</p>
                  </div>
                )}
                <p style={{fontSize:"28px",fontWeight:"900",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{service.price?.toLocaleString()}</p>
                {service.sellerId === user.uid && (
                  <div style={{marginTop:"16px",padding:"12px",background:"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"12px",textAlign:"center",border:"2px solid #FBC02D"}}>
                    <p style={{fontSize:"13px",fontWeight:"800",color:"#F57F17"}}>YOUR SERVICE</p>
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

const ServicesSell = ({ user, setPage }) => {
  const isAdmin = user.uid === ADMIN_UID;
  const availableCategories = isAdmin 
    ? SERVICE_CATEGORIES.filter(c => c !== "All")
    : SERVICE_CATEGORIES.filter(c => c !== "All" && c !== "Airtime" && c !== "Data" && c !== "Bills");
  
  const [category, setCategory] = useState(availableCategories[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [network, setNetwork] = useState("MTN");
  const [airtimeAmount, setAirtimeAmount] = useState("100");
  const [dataNetwork, setDataNetwork] = useState("MTN");
  const [dataPlan, setDataPlan] = useState("1GB - ₦500");
  const [billType, setBillType] = useState("NEPA");
  const [cryptoType, setCryptoType] = useState("Bitcoin");
  const [cryptoWallet, setCryptoWallet] = useState("");
  const [cardImage, setCardImage] = useState(null);
  
  const handleCardImageChange = (e) => { if (e.target.files[0]) setCardImage(e.target.files[0]); };
  
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
      if (cardImage) {
        const imageRef = ref(storage, `giftcards/${user.uid}/${Date.now()}_${cardImage.name}`);
        await uploadBytes(imageRef, cardImage);
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
      alert("✅ Service listed successfully!");
      setPage("mylistings");
    } catch (err) { setError(err.message); }
    setUploading(false);
  };
  
  return (
    <div style={{maxWidth:"700px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"32px",fontWeight:"900",marginBottom:"32px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Offer a Service</h2>
      <form onSubmit={handleSubmit} style={{background:"white",padding:"40px",borderRadius:"24px",boxShadow:"0 8px 30px rgba(0,0,0,0.1)",border:"3px solid #f8f9fa"}}>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Service Type</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",cursor:"pointer"}}>
            {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        
        {category === "Airtime" && (
          <>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Network</label>
              <select value={network} onChange={(e) => setNetwork(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600"}}>
                {["MTN","Airtel","Glo","9mobile"].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Amount</label>
              <select value={airtimeAmount} onChange={(e) => setAirtimeAmount(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600"}}>
                {["100","200","500","1000","2000","5000"].map(a => <option key={a} value={a}>₦{a}</option>)}
              </select>
            </div>
            <div style={{padding:"16px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"12px",marginBottom:"28px",border:"2px solid #4CAF50"}}>
              <p style={{fontSize:"14px",color:"#4CAF50",fontWeight:"800"}}>✓ Title: {network} ₦{airtimeAmount} Airtime</p>
            </div>
          </>
        )}
        
        {category === "Data" && (
          <>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Network</label>
              <select value={dataNetwork} onChange={(e) => setDataNetwork(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600"}}>
                {["MTN","Airtel","Glo","9mobile"].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Data Plan</label>
              <select value={dataPlan} onChange={(e) => setDataPlan(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600"}}>
                {["500MB - ₦500","1GB - ₦800","2GB - ₦1500","5GB - ₦3000","10GB - ₦5000"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{padding:"16px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"12px",marginBottom:"28px",border:"2px solid #4CAF50"}}>
              <p style={{fontSize:"14px",color:"#4CAF50",fontWeight:"800"}}>✓ Title: {dataNetwork} {dataPlan.split(' - ')[0]} Data</p>
            </div>
          </>
        )}
        
        {category === "Bills" && (
          <>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Bill Type</label>
              <select value={billType} onChange={(e) => setBillType(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600"}}>
                {["NEPA","DSTV","GOtv","Startimes"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{padding:"16px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"12px",marginBottom:"28px",border:"2px solid #4CAF50"}}>
              <p style={{fontSize:"14px",color:"#4CAF50",fontWeight:"800"}}>✓ Title: {billType} Bill Payment</p>
            </div>
          </>
        )}
        
        {category === "Gift Cards" && (
          <>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Card Details</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="iTunes $50 Gift Card" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#4CAF50"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
            </div>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>📷 Card Photo (Front/Back)</label>
              <input type="file" accept="image/*" capture="environment" onChange={handleCardImageChange} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"15px",fontWeight:"600",cursor:"pointer"}} />
              {cardImage && <p style={{marginTop:"12px",fontSize:"15px",color:"#4CAF50",fontWeight:"800"}}>✓ {cardImage.name}</p>}
            </div>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Unused gift card, can verify..." rows="3" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#4CAF50"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
            </div>
          </>
        )}
        
        {category === "Crypto" && (
          <>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Crypto Type</label>
              <select value={cryptoType} onChange={(e) => setCryptoType(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600"}}>
                {["Bitcoin","Ethereum","USDT","BNB","Litecoin","Dogecoin"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Amount</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="0.005 BTC" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#4CAF50"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
            </div>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Your Wallet Address</label>
              <input type="text" value={cryptoWallet} onChange={(e) => setCryptoWallet(e.target.value)} placeholder="bc1q..." style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#4CAF50"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
            </div>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Selling crypto at current market rate..." rows="3" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#4CAF50"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
            </div>
          </>
        )}
        
        {category === "Skills" && (
          <>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Service Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Professional Logo Design" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#4CAF50"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
            </div>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="I will design a professional logo for your business..." rows="5" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#4CAF50"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
            </div>
          </>
        )}
        
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Your Price (₦)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#4CAF50"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        
        {error && <div style={{color:"#d32f2f",marginBottom:"24px",fontSize:"15px",fontWeight:"700",padding:"18px",background:"#ffebee",borderRadius:"12px",border:"2px solid #ffcdd2"}}>{error}</div>}
        
        <button type="submit" disabled={uploading} style={{width:"100%",padding:"20px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",borderRadius:"16px",fontSize:"18px",fontWeight:"900",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 8px 20px rgba(76,175,80,0.4)",transition:"all 0.3s",letterSpacing:"0.5px"}}>
          {uploading ? "LISTING..." : "LIST SERVICE"}
        </button>
      </form>
    </div>
  );
};

const ServicesMyListings = ({ user }) => {
  const [services, setServices] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "services"), where("sellerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, [user]);
  const deleteService = async (id) => { if (window.confirm("Delete this service?")) await deleteDoc(doc(db, "services", id)); };
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"32px",fontWeight:"900",marginBottom:"32px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>My Services</h2>
      {services.length === 0 ? (
        <div style={{textAlign:"center",padding:"100px 20px",background:"white",borderRadius:"24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:"72px",marginBottom:"20px"}}>💼</div>
          <p style={{fontSize:"22px",color:"#2C3E50",fontWeight:"800"}}>No services yet</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:"24px"}}>
          {services.map(s => (
            <div key={s.id} style={{background:"white",borderRadius:"20px",padding:"24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:"3px solid #f8f9fa"}}>
              <div style={{display:"inline-block",padding:"8px 16px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"20px",fontSize:"12px",fontWeight:"800",color:"#4CAF50",marginBottom:"12px",textTransform:"uppercase",border:"2px solid #4CAF50"}}>{s.category}</div>
              <h3 style={{fontSize:"18px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>{s.title}</h3>
              <p style={{fontSize:"26px",fontWeight:"900",color:"#4CAF50",marginBottom:"20px"}}>₦{s.price?.toLocaleString()}</p>
              <button onClick={() => deleteService(s.id)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",color:"#d32f2f",border:"none",borderRadius:"12px",fontSize:"15px",fontWeight:"800",cursor:"pointer",transition:"all 0.3s"}}>DELETE</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
const TicketsBrowse = ({ user }) => {
  const [tickets, setTickets] = useState([]);
  const [ticketType, setTicketType] = useState("All");
  useEffect(() => {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, []);
  const filtered = tickets.filter(t => ticketType === "All" || t.ticketType === ticketType);
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <div style={{display:"flex",gap:"12px",marginBottom:"32px",overflowX:"auto",paddingBottom:"8px"}}>
        {["All","Event","Flight"].map(type => (
          <button key={type} onClick={() => setTicketType(type)} style={{padding:"12px 24px",background:ticketType===type?"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)":"white",color:ticketType===type?"white":"#666",border:ticketType===type?"none":"3px solid #f0f0f0",borderRadius:"30px",fontSize:"15px",fontWeight:"800",cursor:"pointer",whiteSpace:"nowrap",boxShadow:ticketType===type?"0 6px 15px rgba(156,39,176,0.3)":"0 2px 8px rgba(0,0,0,0.05)",transition:"all 0.3s",letterSpacing:"0.3px"}}>
            {type === "Event" ? "🎉 Event" : type === "Flight" ? "✈️ Flight" : "All"}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"100px 20px",background:"white",borderRadius:"24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:"72px",marginBottom:"20px"}}>🎫</div>
          <p style={{fontSize:"22px",color:"#2C3E50",fontWeight:"800"}}>No tickets available</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))",gap:"28px"}}>
          {filtered.map(t => (
            <div key={t.id} onClick={() => {
              if (t.sellerId === user.uid) {
                alert("This is your own ticket!");
              } else {
                if (window.confirm(`Buy ${t.title} for ₦${t.price?.toLocaleString()}?`)) {
                  handleBuyTicket(t, user);
                }
              }
            }} className="card-hover" style={{background:"white",borderRadius:"24px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",cursor:"pointer",border:"3px solid transparent",transition:"all 0.3s"}}>
              {t.imageUrl ? (
                <div style={{position:"relative",width:"100%",height:"220px"}}>
                  <img src={t.imageUrl} alt={t.title} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  <div style={{position:"absolute",top:"16px",right:"16px",padding:"8px 16px",background:"rgba(156,39,176,0.95)",backdropFilter:"blur(10px)",borderRadius:"20px",fontSize:"12px",fontWeight:"800",color:"white",textTransform:"uppercase",letterSpacing:"0.5px"}}>{t.ticketType}</div>
                </div>
              ) : (
                <div style={{width:"100%",height:"220px",background:t.ticketType==="Flight"?"linear-gradient(135deg, #E1F5FE 0%, #B3E5FC 100%)":"linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:"80px"}}>{t.ticketType === "Flight" ? "✈️" : "🎉"}</div>
                </div>
              )}
              <div style={{padding:"28px"}}>
                <h3 style={{fontSize:"20px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50",lineHeight:"1.3"}}>{t.title}</h3>
                {t.eventDate && (
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                    <svg width="18" height="18" fill="#9C27B0" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                    <p style={{fontSize:"15px",color:"#666",fontWeight:"700"}}>{t.eventDate}</p>
                  </div>
                )}
                {t.venue && (
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"16px"}}>
                    <svg width="18" height="18" fill="#9C27B0" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    <p style={{fontSize:"15px",color:"#666",fontWeight:"700"}}>{t.venue}</p>
                  </div>
                )}
                <p style={{fontSize:"32px",fontWeight:"900",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{t.price?.toLocaleString()}</p>
                {t.sellerId === user.uid && (
                  <div style={{marginTop:"16px",padding:"12px",background:"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"12px",textAlign:"center",border:"2px solid #FBC02D"}}>
                    <p style={{fontSize:"13px",fontWeight:"800",color:"#F57F17"}}>YOUR TICKET</p>
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

const TicketsSell = ({ user, setPage }) => {
  const [ticketType, setTicketType] = useState("Event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [airline, setAirline] = useState("Air Peace");
  const [route, setRoute] = useState("");
  const [uploading, setUploading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !price) { alert("Fill required fields"); return; }
    setUploading(true);
    try {
      const ticketData = { 
        title: title.trim(), 
        description: description.trim(), 
        price: parseFloat(price), 
        ticketType,
        eventDate: eventDate.trim() || null, 
        venue: venue.trim() || null, 
        imageUrl: "", 
        sellerId: user.uid, 
        createdAt: serverTimestamp(), 
        status: "active" 
      };
      if (ticketType === "Flight") {
        ticketData.airline = airline;
        ticketData.route = route.trim();
      }
      await addDoc(collection(db, "tickets"), ticketData);
      alert("✅ Ticket listed successfully!");
      setPage("mylistings");
    } catch (err) { alert(err.message); }
    setUploading(false);
  };
  return (
    <div style={{maxWidth:"700px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"32px",fontWeight:"900",marginBottom:"32px",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Sell Tickets</h2>
      <form onSubmit={handleSubmit} style={{background:"white",padding:"40px",borderRadius:"24px",boxShadow:"0 8px 30px rgba(0,0,0,0.1)",border:"3px solid #f8f9fa"}}>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Ticket Type</label>
          <select value={ticketType} onChange={(e) => setTicketType(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",cursor:"pointer"}}>
            <option value="Event">🎉 Event Ticket</option>
            <option value="Flight">✈️ Flight Ticket</option>
          </select>
        </div>
        {ticketType === "Flight" && (
          <>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Airline</label>
              <select value={airline} onChange={(e) => setAirline(e.target.value)} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600"}}>
                {["Air Peace","Arik Air","Dana Air","Ibom Air","Aero Contractors","Max Air","United Nigeria"].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"28px"}}>
              <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Route</label>
              <input type="text" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Lagos to Abuja" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#9C27B0"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
            </div>
          </>
        )}
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>{ticketType === "Event" ? "Event Name" : "Flight Title"}</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ticketType === "Event" ? "Wizkid Live Concert" : "Lagos to Abuja - Morning Flight"} style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#9C27B0"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>{ticketType === "Event" ? "Event Date" : "Flight Date"}</label>
          <input type="text" value={eventDate} onChange={(e) => setEventDate(e.target.value)} placeholder="Dec 25, 2024" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#9C27B0"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        {ticketType === "Event" && (
          <div style={{marginBottom:"28px"}}>
            <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Venue</label>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Eko Hotel, Lagos" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#9C27B0"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
          </div>
        )}
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Price (₦)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="15000" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#9C27B0"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details..." rows="4" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#9C27B0"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        <button type="submit" disabled={uploading} style={{width:"100%",padding:"20px",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",color:"white",border:"none",borderRadius:"16px",fontSize:"18px",fontWeight:"900",cursor:uploading?"not-allowed":"pointer",boxShadow:"0 8px 20px rgba(156,39,176,0.4)",transition:"all 0.3s",letterSpacing:"0.5px"}}>
          {uploading ? "LISTING..." : "LIST TICKET"}
        </button>
      </form>
    </div>
  );
};

const TicketsMyListings = ({ user }) => {
  const [tickets, setTickets] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "tickets"), where("sellerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, [user]);
  const deleteTicket = async (id) => { if (window.confirm("Delete this ticket?")) await deleteDoc(doc(db, "tickets", id)); };
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"32px",fontWeight:"900",marginBottom:"32px",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>My Tickets</h2>
      {tickets.length === 0 ? (
        <div style={{textAlign:"center",padding:"100px 20px",background:"white",borderRadius:"24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:"72px",marginBottom:"20px"}}>🎫</div>
          <p style={{fontSize:"22px",color:"#2C3E50",fontWeight:"800"}}>No tickets yet</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))",gap:"24px"}}>
          {tickets.map(t => (
            <div key={t.id} style={{background:"white",borderRadius:"24px",padding:"28px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:"3px solid #f8f9fa"}}>
              <div style={{display:"inline-block",padding:"8px 16px",background:"linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",borderRadius:"20px",fontSize:"12px",fontWeight:"800",color:"#9C27B0",marginBottom:"12px",textTransform:"uppercase",border:"2px solid #9C27B0"}}>{t.ticketType}</div>
              <h3 style={{fontSize:"19px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>{t.title}</h3>
              {t.eventDate && <p style={{fontSize:"15px",color:"#666",marginBottom:"8px",fontWeight:"600"}}>📅 {t.eventDate}</p>}
              <p style={{fontSize:"28px",fontWeight:"900",color:"#9C27B0",marginTop:"12px",marginBottom:"20px"}}>₦{t.price?.toLocaleString()}</p>
              <button onClick={() => deleteTicket(t.id)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",color:"#d32f2f",border:"none",borderRadius:"12px",fontSize:"15px",fontWeight:"800",cursor:"pointer",transition:"all 0.3s"}}>DELETE</button>
            </div>
          ))}
        </div>
      )}
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
    if (!window.confirm("Confirm you received this?")) return;
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "completed", completedAt: serverTimestamp() });
      const sellerSnap = await getDoc(doc(db, "users", order.sellerId));
      const sellerWallet = sellerSnap.data()?.wallet || 0;
      await updateDoc(doc(db, "users", order.sellerId), {
        wallet: sellerWallet + order.price,
        totalSales: (sellerSnap.data()?.totalSales || 0) + 1
      });
      alert("✅ Delivery confirmed! Seller has been paid.");
      window.location.reload();
    } catch (err) { alert("Error: " + err.message); }
  };
  return (
    <div style={{maxWidth:"900px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"32px",fontWeight:"900",marginBottom:"32px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>My Orders</h2>
      {orders.length === 0 ? (
        <div style={{textAlign:"center",padding:"100px 20px",background:"white",borderRadius:"24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:"72px",marginBottom:"20px"}}>📦</div>
          <p style={{fontSize:"22px",color:"#2C3E50",fontWeight:"800",marginBottom:"8px"}}>No orders yet</p>
          <p style={{fontSize:"16px",color:"#999",fontWeight:"600"}}>Start shopping to see your orders here</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
          {orders.map(order => (
            <div key={order.id} style={{background:"white",padding:"32px",borderRadius:"24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:"3px solid #f8f9fa"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:"20px"}}>
                <div>
                  <h3 style={{fontSize:"20px",fontWeight:"800",marginBottom:"6px",color:"#2C3E50"}}>{order.title}</h3>
                  <p style={{fontSize:"14px",color:"#999",fontWeight:"600"}}>{order.createdAt?.toDate().toLocaleString()}</p>
                </div>
                <div style={{padding:"8px 16px",background:order.status==="completed"?"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)":"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"20px",fontSize:"13px",fontWeight:"800",color:order.status==="completed"?"#4CAF50":"#F57F17",textTransform:"uppercase",border:order.status==="completed"?"2px solid #4CAF50":"2px solid #FBC02D"}}>
                  {order.status}
                </div>
              </div>
              <p style={{fontSize:"32px",fontWeight:"900",marginBottom:"20px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{order.price?.toLocaleString()}</p>
              {order.phoneNumber && (
                <div style={{padding:"16px",background:"linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",borderRadius:"12px",marginBottom:"16px",border:"2px solid #2196F3"}}>
                  <p style={{fontSize:"14px",color:"#1976D2",fontWeight:"800"}}>📱 Phone: {order.phoneNumber}</p>
                </div>
              )}
              {order.accountNumber && (
                <div style={{padding:"16px",background:"linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",borderRadius:"12px",marginBottom:"16px",border:"2px solid #FF9800"}}>
                  <p style={{fontSize:"14px",color:"#F57F17",fontWeight:"800"}}>⚡ Account: {order.accountNumber}</p>
                </div>
              )}
              {order.cardType && (
                <div style={{padding:"16px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"12px",marginBottom:"16px",border:"2px solid #4CAF50"}}>
                  <p style={{fontSize:"14px",color:"#4CAF50",fontWeight:"800"}}>🎁 Card: {order.cardType}</p>
                </div>
              )}
              {order.walletAddress && (
                <div style={{padding:"16px",background:"linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",borderRadius:"12px",marginBottom:"16px",border:"2px solid #FBC02D"}}>
                  <p style={{fontSize:"14px",color:"#F57F17",fontWeight:"800"}}>💰 Wallet: {order.walletAddress}</p>
                </div>
              )}
              {order.status === "pending" && (
                <button onClick={() => confirmDelivery(order)} style={{width:"100%",padding:"18px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",borderRadius:"16px",fontSize:"16px",fontWeight:"900",cursor:"pointer",boxShadow:"0 6px 15px rgba(76,175,80,0.4)",transition:"all 0.3s",letterSpacing:"0.5px"}}>
                  CONFIRM DELIVERY
                </button>
              )}
              {order.status === "completed" && (
                <div style={{padding:"18px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"16px",textAlign:"center",border:"2px solid #4CAF50"}}>
                  <p style={{fontSize:"16px",fontWeight:"900",color:"#4CAF50"}}>✓ COMPLETED</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MoneyTransfer = ({ user }) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleTransfer = async (e) => {
    e.preventDefault();
    setError("");
    if (!recipientEmail.trim() || !amount) {
      setError("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const senderSnap = await getDoc(doc(db, "users", user.uid));
      const senderWallet = senderSnap.data()?.wallet || 0;
      if (senderWallet < parseFloat(amount)) {
        setError("Insufficient funds!");
        setLoading(false);
        return;
      }
      alert("🚧 International money transfer coming soon!");
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };
  return (
    <div style={{maxWidth:"700px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <h2 style={{fontSize:"32px",fontWeight:"900",marginBottom:"32px",background:"linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Send Money</h2>
      <form onSubmit={handleTransfer} style={{background:"white",padding:"40px",borderRadius:"24px",boxShadow:"0 8px 30px rgba(0,0,0,0.1)",border:"3px solid #f8f9fa"}}>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Recipient Email</label>
          <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="recipient@example.com" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#2196F3"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Amount (₦)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",outline:"none",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#2196F3"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        <div style={{marginBottom:"28px"}}>
          <label style={{display:"block",fontSize:"16px",fontWeight:"800",marginBottom:"12px",color:"#2C3E50"}}>Note (Optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's this for?" rows="3" style={{width:"100%",padding:"16px 20px",border:"3px solid #f0f0f0",borderRadius:"12px",fontSize:"16px",fontWeight:"600",resize:"vertical",outline:"none",fontFamily:"inherit",transition:"all 0.3s"}} onFocus={(e) => e.target.style.borderColor = "#2196F3"} onBlur={(e) => e.target.style.borderColor = "#f0f0f0"} />
        </div>
        {error && <div style={{color:"#d32f2f",marginBottom:"24px",fontSize:"15px",fontWeight:"700",padding:"18px",background:"#ffebee",borderRadius:"12px",border:"2px solid #ffcdd2"}}>{error}</div>}
        <button type="submit" disabled={loading} style={{width:"100%",padding:"20px",background:"linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",color:"white",border:"none",borderRadius:"16px",fontSize:"18px",fontWeight:"900",cursor:loading?"not-allowed":"pointer",boxShadow:"0 8px 20px rgba(33,150,243,0.4)",transition:"all 0.3s",letterSpacing:"0.5px"}}>
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
    <div style={{maxWidth:"700px",margin:"0 auto",padding:"24px",paddingBottom:"100px",animation:"fadeIn 0.5s ease"}}>
      <div style={{background:"white",padding:"48px",borderRadius:"24px",boxShadow:"0 8px 30px rgba(0,0,0,0.1)",border:"3px solid #f8f9fa"}}>
        <div style={{textAlign:"center",marginBottom:"40px"}}>
          <div style={{width:"120px",height:"120px",borderRadius:"50%",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"56px",fontWeight:"900",margin:"0 auto 24px",boxShadow:"0 8px 25px rgba(255,107,53,0.4)"}}>{userData?.name?.charAt(0).toUpperCase()}</div>
          <h2 style={{fontSize:"32px",fontWeight:"900",marginBottom:"8px",color:"#2C3E50"}}>{userData?.name}</h2>
          <p style={{color:"#999",fontSize:"17px",fontWeight:"600"}}>{user.email}</p>
        </div>
        <div style={{padding:"32px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",borderRadius:"20px",marginBottom:"32px",textAlign:"center",boxShadow:"0 8px 20px rgba(255,107,53,0.3)"}}>
          <p style={{color:"rgba(255,255,255,0.9)",fontSize:"18px",fontWeight:"700",marginBottom:"12px",letterSpacing:"0.5px"}}>WALLET BALANCE</p>
          <p style={{fontSize:"56px",fontWeight:"900",color:"white",textShadow:"0 4px 10px rgba(0,0,0,0.2)"}}>₦{(userData?.wallet || 0).toLocaleString()}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px",marginBottom:"32px"}}>
          <div style={{padding:"24px",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",borderRadius:"16px",textAlign:"center",border:"3px solid #FF6B35"}}>
            <p style={{fontSize:"15px",color:"#FF6B35",fontWeight:"800",marginBottom:"8px",textTransform:"uppercase"}}>Rating</p>
            <p style={{fontSize:"32px",fontWeight:"900",color:"#FF6B35"}}>⭐ {userData?.rating || 0}/5</p>
          </div>
          <div style={{padding:"24px",background:"linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",borderRadius:"16px",textAlign:"center",border:"3px solid #4CAF50"}}>
            <p style={{fontSize:"15px",color:"#4CAF50",fontWeight:"800",marginBottom:"8px",textTransform:"uppercase"}}>Total Sales</p>
            <p style={{fontSize:"32px",fontWeight:"900",color:"#4CAF50"}}>{userData?.totalSales || 0}</p>
          </div>
        </div>
        <button onClick={() => signOut(auth)} style={{width:"100%",padding:"20px",background:"linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",color:"#d32f2f",border:"none",borderRadius:"16px",fontSize:"18px",fontWeight:"900",cursor:"pointer",transition:"all 0.3s",letterSpacing:"0.5px"}}>
          SIGN OUT
        </button>
      </div>
    </div>
  );
};

const NavBar = ({ page, setPage }) => {
  const icons = {
    browse: <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
    sell: <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
    mylistings: <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
    orders: <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
    transfer: <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
    profile: <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
  };
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"white",borderTop:"4px solid #f0f0f0",display:"flex",justifyContent:"space-around",padding:"12px 0 16px",zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,0.1)"}}>
      {[
        { key: "browse", label: "Browse" },
        { key: "sell", label: "Sell" },
        { key: "mylistings", label: "Listings" },
        { key: "orders", label: "Orders" },
        { key: "transfer", label: "Transfer" },
        { key: "profile", label: "Profile" }
      ].map(item => (
        <button key={item.key} onClick={() => setPage(item.key)} style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",cursor:"pointer",color:page===item.key?"#FF6B35":"#999",fontWeight:page===item.key?"900":"600",padding:"8px 12px",borderRadius:"12px",transition:"all 0.3s"}}>
          <div style={{transform:page===item.key?"scale(1.1)":"scale(1)",transition:"all 0.3s"}}>{icons[item.key]}</div>
          <span style={{fontSize:"12px",letterSpacing:"0.3px"}}>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default App;
