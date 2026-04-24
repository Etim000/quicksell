import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, onSnapshot, serverTimestamp, where, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";
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
    alert("Order placed! Seller will deliver soon.");
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
      createdAt: serverTimestamp()
    });
    alert("Order placed! Seller will deliver soon.");
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
  
  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>Loading...</div>;
  if (!user) return <AuthPage onLogin={setUser} />;
  
  return (
    <div style={{background:"#f5f5f5",minHeight:"100vh"}}>
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
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"linear-gradient(135deg, #FFF5F2 0%, #FFE5DC 100%)",padding:"20px"}}>
      <div style={{background:"white",padding:"40px",borderRadius:"12px",boxShadow:"0 4px 20px rgba(255,107,53,0.15)",width:"100%",maxWidth:"420px"}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <h1 style={{fontSize:"36px",fontWeight:"800",marginBottom:"8px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>QuickSell</h1>
          <p style={{color:"#666",fontSize:"15px"}}>Buy and sell anything instantly</p>
        </div>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={{width:"100%",padding:"14px",marginBottom:"16px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px"}} />
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{width:"100%",padding:"14px",marginBottom:"16px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px"}} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{width:"100%",padding:"14px",marginBottom:"16px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px"}} />
          {error && <div style={{color:"#d32f2f",marginBottom:"16px",fontSize:"14px",padding:"12px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:"16px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"16px",fontWeight:"700",cursor:loading?"not-allowed":"pointer"}}>
            {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>
        <p style={{marginTop:"24px",textAlign:"center",color:"#666",fontSize:"14px"}}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setIsLogin(!isLogin)} style={{color:"#FF6B35",fontWeight:"700",cursor:"pointer"}}>
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
    const load = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setUserData(snap.data());
    };
    load();
  }, [user]);
  
  return (
    <>
      <div style={{background:"white",borderBottom:"1px solid #f0f0f0",padding:"16px 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:"1200px",margin:"0 auto"}}>
          <h1 onClick={() => setPage("browse")} style={{fontSize:"24px",fontWeight:"800",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",cursor:"pointer"}}>QuickSell</h1>
          <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
            <div style={{fontSize:"14px",color:"#666"}}>Hi, <span style={{fontWeight:"600"}}>{userData?.name || "User"}</span></div>
            <div 
              onClick={() => setShowAddMoney(true)}
              style={{padding:"6px 12px",background:"#FFF5F2",borderRadius:"20px",fontSize:"13px",fontWeight:"600",color:"#FF6B35",cursor:"pointer"}}
            >
              ₦{(userData?.wallet || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      <div style={{background:"white",borderBottom:"1px solid #f0f0f0",padding:"12px 20px",position:"sticky",top:"66px",zIndex:99}}>
        <div style={{display:"flex",gap:"12px",maxWidth:"1200px",margin:"0 auto"}}>
          {["products", "services", "tickets"].map(s => (
            <button key={s} onClick={() => {setSection(s); setPage("browse");}} style={{padding:"10px 24px",background:section===s?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"transparent",color:section===s?"white":"#666",border:"none",borderRadius:"20px",fontSize:"14px",fontWeight:"700",cursor:"pointer",textTransform:"capitalize"}}>
              {s}
            </button>
          ))}
        </div>
      </div>
      
      {showAddMoney && <AddMoneyModal user={user} onClose={() => setShowAddMoney(false)} />}
    </>
  );
};

const PRODUCT_CATEGORIES = ["All", "Campus", "Food", "Thrift", "Clothes", "Accessories", "Electronics", "Other"];
const SERVICE_CATEGORIES = ["All", "Airtime", "Data", "Skills", "Bills"];

const ProductsBrowse = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);
  const filtered = products.filter(p => {
    if (category !== "All" && p.category !== category) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  if (selectedProduct) return <ProductDetail product={selectedProduct} user={user} onBack={() => setSelectedProduct(null)} />;
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{width:"100%",padding:"14px",marginBottom:"20px",border:"2px solid #f0f0f0",borderRadius:"12px"}} />
      <div style={{display:"flex",gap:"10px",marginBottom:"24px",overflowX:"auto"}}>
        {PRODUCT_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{padding:"10px 20px",background:category===cat?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"white",color:category===cat?"white":"#666",border:"none",borderRadius:"24px",fontSize:"14px",fontWeight:"600",cursor:"pointer",whiteSpace:"nowrap"}}>{cat}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"80px 20px",background:"white",borderRadius:"16px"}}>
          <p style={{fontSize:"18px",color:"#666"}}>No products found</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:"20px"}}>
          {filtered.map(product => (
            <div key={product.id} onClick={() => setSelectedProduct(product)} style={{background:"white",borderRadius:"12px",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",cursor:"pointer"}}>
              {product.imageUrl && <img src={product.imageUrl} alt={product.title} style={{width:"100%",height:"180px",objectFit:"cover"}} />}
              <div style={{padding:"16px"}}>
                <div style={{display:"inline-block",padding:"4px 10px",background:"#FFF5F2",borderRadius:"12px",fontSize:"11px",fontWeight:"700",color:"#FF6B35",marginBottom:"8px"}}>{product.category}</div>
                <h3 style={{fontSize:"16px",fontWeight:"700",marginBottom:"8px"}}>{product.title}</h3>
                <p style={{fontSize:"22px",fontWeight:"800",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{product.price?.toLocaleString()}</p>
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
    <div style={{maxWidth:"800px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <button onClick={onBack} style={{marginBottom:"20px",padding:"10px 20px",background:"white",border:"2px solid #f0f0f0",borderRadius:"8px",cursor:"pointer"}}>← Back</button>
      <div style={{background:"white",borderRadius:"16px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
        {product.imageUrl && <img src={product.imageUrl} alt={product.title} style={{width:"100%",maxHeight:"400px",objectFit:"cover"}} />}
        <div style={{padding:"32px"}}>
          <h1 style={{fontSize:"32px",fontWeight:"800",marginBottom:"12px"}}>{product.title}</h1>
          <p style={{fontSize:"36px",fontWeight:"800",marginBottom:"24px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₦{product.price?.toLocaleString()}</p>
          <div style={{borderTop:"2px solid #f0f0f0",paddingTop:"24px"}}>
            <h3 style={{fontSize:"18px",fontWeight:"700",marginBottom:"12px"}}>Description</h3>
            <p style={{color:"#666",lineHeight:"1.8"}}>{product.description}</p>
          </div>
          {seller && (
            <div style={{borderTop:"2px solid #f0f0f0",paddingTop:"24px",marginTop:"24px"}}>
              <h3 style={{fontSize:"18px",fontWeight:"700",marginBottom:"12px"}}>Seller</h3>
              <p style={{fontWeight:"600"}}>{seller.name}</p>
            </div>
          )}
          {product.sellerId !== user.uid && (
            <button onClick={() => {
  if (window.confirm(`Buy ${product.title} for ₦${product.price?.toLocaleString()}?`)) {
    handleBuyProduct(product, user);
  }
}} style={{marginTop:"32px",width:"100%",padding:"18px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"12px",fontSize:"16px",fontWeight:"700",cursor:"pointer"}}>
  Buy Now - ₦{product.price?.toLocaleString()}
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
      alert("Product listed!");
      setPage("mylistings");
    } catch (err) { setError(err.message); }
    setUploading(false);
  };
  return (
    <div style={{maxWidth:"600px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <h2 style={{fontSize:"28px",fontWeight:"800",marginBottom:"24px"}}>Sell a Product</h2>
      <form onSubmit={handleSubmit} style={{background:"white",padding:"32px",borderRadius:"16px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
        <div style={{marginBottom:"24px"}}>
          <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="iPhone 13" style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px"}} />
        </div>
        <div style={{marginBottom:"24px"}}>
          <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px"}}>
            {PRODUCT_CATEGORIES.filter(c => c !== "All").map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div style={{marginBottom:"24px"}}>
          <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Price (₦)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50000" style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px"}} />
        </div>
        <div style={{marginBottom:"24px"}}>
          <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe..." rows="5" style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px",resize:"vertical"}} />
        </div>
        <div style={{marginBottom:"24px"}}>
          <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px"}} />
          {image && <p style={{marginTop:"10px",fontSize:"14px",color:"#FF6B35",fontWeight:"600"}}>✓ {image.name}</p>}
        </div>
        {error && <div style={{color:"#d32f2f",marginBottom:"20px",fontSize:"14px",padding:"14px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
        <button type="submit" disabled={uploading} style={{width:"100%",padding:"18px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"12px",fontSize:"16px",fontWeight:"700",cursor:uploading?"not-allowed":"pointer"}}>
          {uploading ? "Listing..." : "List Product"}
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
  const deleteProduct = async (id) => { if (window.confirm("Delete?")) await deleteDoc(doc(db, "products", id)); };
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <h2 style={{fontSize:"28px",fontWeight:"800",marginBottom:"24px"}}>My Products</h2>
      {products.length === 0 ? (
        <div style={{textAlign:"center",padding:"80px 20px",background:"white",borderRadius:"16px"}}><p>No products yet</p></div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:"20px"}}>
          {products.map(product => (
            <div key={product.id} style={{background:"white",borderRadius:"12px",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
              {product.imageUrl && <img src={product.imageUrl} alt={product.title} style={{width:"100%",height:"180px",objectFit:"cover"}} />}
              <div style={{padding:"16px"}}>
                <h3 style={{fontSize:"16px",fontWeight:"700",marginBottom:"8px"}}>{product.title}</h3>
                <p style={{fontSize:"22px",fontWeight:"800",marginBottom:"16px"}}>₦{product.price?.toLocaleString()}</p>
                <button onClick={() => deleteProduct(product.id)} style={{width:"100%",padding:"12px",background:"#ffebee",color:"#d32f2f",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"700",cursor:"pointer"}}>Delete</button>
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
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <div style={{display:"flex",gap:"10px",marginBottom:"24px",overflowX:"auto"}}>
        {SERVICE_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{padding:"10px 20px",background:category===cat?"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)":"white",color:category===cat?"white":"#666",border:"none",borderRadius:"24px",fontSize:"14px",fontWeight:"600",cursor:"pointer",whiteSpace:"nowrap"}}>{cat}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"80px 20px",background:"white",borderRadius:"16px"}}><p>No services found</p></div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"20px"}}>
          {filtered.map(service => (
            <div key={service.id} style={{background:"white",borderRadius:"12px",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",cursor:"pointer"}}>
              <div style={{padding:"20px"}}>
                <div style={{display:"inline-block",padding:"5px 12px",background:"#E8F5E9",borderRadius:"12px",fontSize:"11px",fontWeight:"700",color:"#4CAF50",marginBottom:"10px"}}>{service.category}</div>
                <h3 style={{fontSize:"17px",fontWeight:"700",marginBottom:"10px"}}>{service.title}</h3>
                <p style={{fontSize:"24px",fontWeight:"800",color:"#4CAF50"}}>₦{service.price?.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ServicesSell = ({ user, setPage }) => {
  const [category, setCategory] = useState("Airtime");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
  // For Airtime
  const [network, setNetwork] = useState("MTN");
  const [airtimeAmount, setAirtimeAmount] = useState("100");
  
  // For Data
  const [dataNetwork, setDataNetwork] = useState("MTN");
  const [dataPlan, setDataPlan] = useState("1GB - ₦500");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    let finalTitle = title;
    let finalDescription = description;
    
    // Auto-generate for Airtime
    if (category === "Airtime") {
      finalTitle = `${network} ₦${airtimeAmount} Airtime`;
      if (!description.trim()) finalDescription = `${network} airtime recharge of ₦${airtimeAmount}`;
    }
    
    // Auto-generate for Data
    if (category === "Data") {
      finalTitle = `${dataNetwork} ${dataPlan.split(' - ')[0]} Data`;
      if (!description.trim()) finalDescription = `${dataNetwork} data bundle - ${dataPlan}`;
    }
    
    if (!finalTitle.trim() || !finalDescription.trim() || !price) { 
      setError("Fill all fields"); 
      return; 
    }
    
    setUploading(true);
    try {
      await addDoc(collection(db, "services"), { 
        title: finalTitle.trim(), 
        description: finalDescription.trim(), 
        price: parseFloat(price), 
        category, 
        sellerId: user.uid, 
        createdAt: serverTimestamp(), 
        status: "active" 
      });
      alert("Service listed!");
      setPage("mylistings");
    } catch (err) { 
      setError(err.message); 
    }
    setUploading(false);
  };
  
  return (
    <div style={{maxWidth:"600px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <h2 style={{fontSize:"28px",fontWeight:"800",marginBottom:"24px"}}>Offer Service</h2>
      <form onSubmit={handleSubmit} style={{background:"white",padding:"32px",borderRadius:"16px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
        
        <div style={{marginBottom:"24px"}}>
          <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Service Type</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px"}}>
            {SERVICE_CATEGORIES.filter(c => c !== "All").map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        
        {/* AIRTIME FIELDS */}
        {category === "Airtime" && (
          <>
            <div style={{marginBottom:"24px"}}>
              <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Network</label>
              <select value={network} onChange={(e) => setNetwork(e.target.value)} style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px"}}>
                <option value="MTN">MTN</option>
                <option value="Airtel">Airtel</option>
                <option value="Glo">Glo</option>
                <option value="9mobile">9mobile</option>
              </select>
            </div>
            <div style={{marginBottom:"24px"}}>
              <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Amount</label>
              <select value={airtimeAmount} onChange={(e) => setAirtimeAmount(e.target.value)} style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px"}}>
                <option value="100">₦100</option>
                <option value="200">₦200</option>
                <option value="500">₦500</option>
                <option value="1000">₦1,000</option>
                <option value="2000">₦2,000</option>
                <option value="5000">₦5,000</option>
              </select>
            </div>
            <div style={{padding:"12px",background:"#E8F5E9",borderRadius:"8px",marginBottom:"24px"}}>
              <p style={{fontSize:"13px",color:"#4CAF50",fontWeight:"600"}}>Title will be: {network} ₦{airtimeAmount} Airtime</p>
            </div>
          </>
        )}
        
        {/* DATA FIELDS */}
        {category === "Data" && (
          <>
            <div style={{marginBottom:"24px"}}>
              <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Network</label>
              <select value={dataNetwork} onChange={(e) => setDataNetwork(e.target.value)} style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px"}}>
                <option value="MTN">MTN</option>
                <option value="Airtel">Airtel</option>
                <option value="Glo">Glo</option>
                <option value="9mobile">9mobile</option>
              </select>
            </div>
            <div style={{marginBottom:"24px"}}>
              <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Data Plan</label>
              <select value={dataPlan} onChange={(e) => setDataPlan(e.target.value)} style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px"}}>
                <option value="500MB - ₦500">500MB - ₦500</option>
                <option value="1GB - ₦800">1GB - ₦800</option>
                <option value="2GB - ₦1500">2GB - ₦1,500</option>
                <option value="5GB - ₦3000">5GB - ₦3,000</option>
                <option value="10GB - ₦5000">10GB - ₦5,000</option>
              </select>
            </div>
            <div style={{padding:"12px",background:"#E8F5E9",borderRadius:"8px",marginBottom:"24px"}}>
              <p style={{fontSize:"13px",color:"#4CAF50",fontWeight:"600"}}>Title will be: {dataNetwork} {dataPlan.split(' - ')[0]} Data</p>
            </div>
          </>
        )}
        
        {/* SKILLS/BILLS FIELDS (keep manual input) */}
        {(category === "Skills" || category === "Bills") && (
          <>
            <div style={{marginBottom:"24px"}}>
              <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={category === "Skills" ? "Logo Design" : "Electricity Bill Payment"} style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px"}} />
            </div>
            <div style={{marginBottom:"24px"}}>
              <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your service..." rows="5" style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px",resize:"vertical"}} />
            </div>
          </>
        )}
        
        <div style={{marginBottom:"24px"}}>
          <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Your Price (₦)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="500" style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px"}} />
        </div>
        
        {error && <div style={{color:"#d32f2f",marginBottom:"20px",padding:"14px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
        
        <button type="submit" disabled={uploading} style={{width:"100%",padding:"18px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",borderRadius:"12px",fontSize:"16px",fontWeight:"700",cursor:uploading?"not-allowed":"pointer"}}>
          {uploading ? "Listing..." : "List Service"}
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
  const deleteService = async (id) => { if (window.confirm("Delete?")) await deleteDoc(doc(db, "services", id)); };
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <h2>My Services</h2>
      {services.length === 0 ? <div style={{textAlign:"center",padding:"80px",background:"white",borderRadius:"16px"}}><p>No services yet</p></div> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"20px"}}>
          {services.map(s => (
            <div key={s.id} style={{background:"white",borderRadius:"12px",padding:"20px"}}>
              <h3>{s.title}</h3>
              <p style={{fontSize:"24px",fontWeight:"800",color:"#4CAF50"}}>₦{s.price?.toLocaleString()}</p>
              <button onClick={() => deleteService(s.id)} style={{width:"100%",marginTop:"16px",padding:"12px",background:"#ffebee",color:"#d32f2f",border:"none",borderRadius:"8px",cursor:"pointer"}}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TicketsBrowse = ({ user }) => {
  const [tickets, setTickets] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, []);
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      {tickets.length === 0 ? <div style={{textAlign:"center",padding:"80px",background:"white",borderRadius:"16px"}}><p>No tickets</p></div> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:"24px"}}>
          {tickets.map(t => (
            <div key={t.id} style={{background:"white",borderRadius:"16px",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
              {t.imageUrl && <img src={t.imageUrl} alt={t.title} style={{width:"100%",height:"200px",objectFit:"cover"}} />}
              <div style={{padding:"24px"}}>
                <h3>{t.title}</h3>
                <p>📅 {t.eventDate}</p>
                <p style={{fontSize:"28px",fontWeight:"800",color:"#9C27B0"}}>₦{t.price?.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TicketsSell = ({ user, setPage }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [uploading, setUploading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !price || !eventDate.trim()) { alert("Fill required fields"); return; }
    setUploading(true);
    try {
      await addDoc(collection(db, "tickets"), { title: title.trim(), description: description.trim(), price: parseFloat(price), eventDate: eventDate.trim(), venue: venue.trim() || null, imageUrl: "", sellerId: user.uid, createdAt: serverTimestamp(), status: "active" });
      alert("Ticket listed!");
      setPage("mylistings");
    } catch (err) { alert(err.message); }
    setUploading(false);
  };
  return (
    <div style={{maxWidth:"600px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <h2>Sell Tickets</h2>
      <form onSubmit={handleSubmit} style={{background:"white",padding:"32px",borderRadius:"16px"}}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event Name" style={{width:"100%",padding:"14px",marginBottom:"16px",border:"2px solid #f0f0f0",borderRadius:"8px"}} />
        <input type="text" value={eventDate} onChange={(e) => setEventDate(e.target.value)} placeholder="Date" style={{width:"100%",padding:"14px",marginBottom:"16px",border:"2px solid #f0f0f0",borderRadius:"8px"}} />
        <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue" style={{width:"100%",padding:"14px",marginBottom:"16px",border:"2px solid #f0f0f0",borderRadius:"8px"}} />
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" style={{width:"100%",padding:"14px",marginBottom:"16px",border:"2px solid #f0f0f0",borderRadius:"8px"}} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows="5" style={{width:"100%",padding:"14px",marginBottom:"16px",border:"2px solid #f0f0f0",borderRadius:"8px",resize:"vertical"}} />
        <button type="submit" disabled={uploading} style={{width:"100%",padding:"18px",background:"linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",color:"white",border:"none",borderRadius:"12px",fontSize:"16px",fontWeight:"700"}}>{uploading ? "Listing..." : "List"}</button>
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
  const deleteTicket = async (id) => { if (window.confirm("Delete?")) await deleteDoc(doc(db, "tickets", id)); };
  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <h2>My Tickets</h2>
      {tickets.length === 0 ? <div style={{textAlign:"center",padding:"80px",background:"white",borderRadius:"16px"}}><p>No tickets</p></div> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:"24px"}}>
          {tickets.map(t => (
            <div key={t.id} style={{background:"white",borderRadius:"16px",padding:"24px"}}>
              <h3>{t.title}</h3>
              <p>📅 {t.eventDate}</p>
              <p style={{fontSize:"24px",fontWeight:"800",color:"#9C27B0"}}>₦{t.price?.toLocaleString()}</p>
              <button onClick={() => deleteTicket(t.id)} style={{width:"100%",marginTop:"16px",padding:"12px",background:"#ffebee",color:"#d32f2f",border:"none",borderRadius:"8px",cursor:"pointer"}}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
const AddMoneyModal = ({ user, onClose }) => {
  const [amount, setAmount] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
  const handleScreenshotChange = (e) => {
    if (e.target.files[0]) setScreenshot(e.target.files[0]);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!amount || !screenshot) {
      setError("Please enter amount and upload payment proof");
      return;
    }
    
    setUploading(true);
    
    try {
      // Upload screenshot
      const screenshotRef = ref(storage, `deposits/${user.uid}/${Date.now()}_${screenshot.name}`);
      await uploadBytes(screenshotRef, screenshot);
      const screenshotUrl = await getDownloadURL(screenshotRef);
      
      // Create deposit request
      await addDoc(collection(db, "deposits"), {
        userId: user.uid,
        amount: parseFloat(amount),
        screenshotUrl,
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      alert("Deposit request submitted! You'll be credited once approved.");
      onClose();
    } catch (err) {
      setError(err.message);
    }
    
    setUploading(false);
  };
  
  return (
    <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}>
      <div onClick={(e) => e.stopPropagation()} style={{background:"white",borderRadius:"16px",padding:"32px",maxWidth:"500px",width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
        <h2 style={{fontSize:"24px",fontWeight:"800",marginBottom:"24px"}}>Add Money to Wallet</h2>
        
        <div style={{padding:"20px",background:"#FFF5F2",borderRadius:"12px",marginBottom:"24px"}}>
          <p style={{fontSize:"14px",fontWeight:"700",color:"#FF6B35",marginBottom:"12px"}}>TRANSFER TO:</p>
          <p style={{fontSize:"16px",fontWeight:"700",marginBottom:"4px"}}>Bank: OPay</p>
          <p style={{fontSize:"16px",fontWeight:"700",marginBottom:"4px"}}>Account: 9020853814</p>
          <p style={{fontSize:"16px",fontWeight:"700"}}>Name: Emmanuel Etim Kelvin</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:"20px"}}>
            <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Amount Sent (₦)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="5000"
              style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px"}}
            />
          </div>
          
          <div style={{marginBottom:"20px"}}>
            <label style={{display:"block",fontSize:"14px",fontWeight:"700",marginBottom:"8px"}}>Upload Payment Proof</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleScreenshotChange}
              style={{width:"100%",padding:"14px",border:"2px solid #f0f0f0",borderRadius:"8px",fontSize:"15px"}}
            />
            {screenshot && <p style={{marginTop:"10px",fontSize:"14px",color:"#4CAF50",fontWeight:"600"}}>✓ {screenshot.name}</p>}
          </div>
          
          {error && <div style={{color:"#d32f2f",marginBottom:"20px",fontSize:"14px",padding:"14px",background:"#ffebee",borderRadius:"8px"}}>{error}</div>}
          
          <div style={{display:"flex",gap:"12px"}}>
            <button 
              type="button" 
              onClick={onClose}
              style={{flex:1,padding:"16px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:"8px",fontSize:"16px",fontWeight:"700",cursor:"pointer"}}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={uploading}
              style={{flex:1,padding:"16px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"16px",fontWeight:"700",cursor:uploading?"not-allowed":"pointer"}}
            >
              {uploading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProfilePage = ({ user }) => {
  const [userData, setUserData] = useState(null);
  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setUserData(snap.data());
    };
    load();
  }, [user]);
  return (
    <div style={{maxWidth:"600px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <div style={{background:"white",padding:"32px",borderRadius:"16px"}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{width:"80px",height:"80px",borderRadius:"50%",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"36px",fontWeight:"800",margin:"0 auto 16px"}}>{userData?.name?.charAt(0).toUpperCase()}</div>
          <h2>{userData?.name}</h2>
          <p style={{color:"#999"}}>{user.email}</p>
        </div>
        <div style={{padding:"24px",background:"linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%)",borderRadius:"16px",marginBottom:"24px",textAlign:"center"}}>
          <p style={{color:"white",opacity:0.9,marginBottom:"8px"}}>Wallet</p>
          <p style={{fontSize:"40px",fontWeight:"800",color:"white"}}>₦{(userData?.wallet || 0).toLocaleString()}</p>
        </div>
        <button onClick={() => signOut(auth)} style={{width:"100%",padding:"16px",background:"#ffebee",color:"#d32f2f",border:"none",borderRadius:"12px",fontSize:"16px",fontWeight:"700",cursor:"pointer"}}>Sign Out</button>
      </div>
    </div>
  );
};
const OrdersPage = ({ user }) => {
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    const q = query(collection(db, "orders"), where("buyerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);
  
  const confirmDelivery = async (order) => {
    if (!window.confirm("Confirm you received this?")) return;
    
    try {
      // Update order status
      await updateDoc(doc(db, "orders", order.id), {
        status: "completed",
        completedAt: serverTimestamp()
      });
      
      // Pay seller
      const sellerSnap = await getDoc(doc(db, "users", order.sellerId));
      const sellerWallet = sellerSnap.data()?.wallet || 0;
      
      await updateDoc(doc(db, "users", order.sellerId), {
        wallet: sellerWallet + order.price,
        totalSales: (sellerSnap.data()?.totalSales || 0) + 1
      });
      
      alert("Delivery confirmed! Seller has been paid.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };
  
  return (
    <div style={{maxWidth:"800px",margin:"0 auto",padding:"20px",paddingBottom:"80px"}}>
      <h2 style={{fontSize:"28px",fontWeight:"800",marginBottom:"24px"}}>My Orders</h2>
      
      {orders.length === 0 ? (
        <div style={{textAlign:"center",padding:"80px 20px",background:"white",borderRadius:"16px"}}>
          <p style={{fontSize:"18px",color:"#666"}}>No orders yet</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {orders.map(order => (
            <div key={order.id} style={{background:"white",padding:"24px",borderRadius:"16px",boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:"16px"}}>
                <div>
                  <h3 style={{fontSize:"18px",fontWeight:"700",marginBottom:"4px"}}>{order.title}</h3>
                  <p style={{fontSize:"13px",color:"#999"}}>{order.createdAt?.toDate().toLocaleString()}</p>
                </div>
                <div style={{padding:"6px 12px",background:order.status==="completed"?"#E8F5E9":"#FFF9C4",borderRadius:"12px",fontSize:"12px",fontWeight:"700",color:order.status==="completed"?"#4CAF50":"#F57F17"}}>
                  {order.status}
                </div>
              </div>
              
              <p style={{fontSize:"24px",fontWeight:"800",marginBottom:"16px",color:"#FF6B35"}}>₦{order.price?.toLocaleString()}</p>
              
              {order.status === "pending" && (
                <button onClick={() => confirmDelivery(order)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",color:"white",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"700",cursor:"pointer"}}>
                  Confirm Delivery
                </button>
              )}
              
              {order.status === "completed" && (
                <div style={{padding:"14px",background:"#E8F5E9",borderRadius:"8px",textAlign:"center"}}>
                  <p style={{fontSize:"14px",fontWeight:"600",color:"#4CAF50"}}>✓ Completed</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NavBar = ({ page, setPage }) => {
  const icons = {
    browse: <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
    sell: <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
    mylistings: <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
    orders: <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
    profile: <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
  };
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"white",borderTop:"1px solid #f0f0f0",display:"flex",justifyContent:"space-around",padding:"12px 0",zIndex:100}}>
      {[
        { key: "browse", label: "Browse" },
        { key: "sell", label: "Sell" },
        { key: "mylistings", label: "Listings" },
        { key: "orders", label: "Orders" },
        { key: "profile", label: "Profile" }
      ].map(item => (
        <button key={item.key} onClick={() => setPage(item.key)} style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",cursor:"pointer",color:page===item.key?"#FF6B35":"#999",fontWeight:page===item.key?"700":"400",padding:"8px"}}>
          {icons[item.key]}
          <span style={{fontSize:"12px"}}>{item.label}</span>
        </button>
      ))}
    </div>
  );
};


export default App;
