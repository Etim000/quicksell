// Commission rates by category
export const COMMISSION_RATES = {
  // Products
  Campus: 0.05,
  Food: 0.05,
  Thrift: 0.07,
  Clothes: 0.07,
  Accessories: 0.08,
  Electronics: 0.10,
  Other: 0.05,
  
  // Services
  Airtime: 0.03,
  Data: 0.03,
  Skills: 0.15,
  Bills: 0.05,
  
  // Tickets
  Tickets: 0.08
};

// Networks
export const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];

// Data plans
export const DATA_PLANS = {
  MTN: [
    { name: "100MB", price: 100 },
    { name: "200MB", price: 200 },
    { name: "500MB", price: 400 },
    { name: "1GB", price: 800 },
    { name: "2GB", price: 1500 },
    { name: "3GB", price: 2000 },
    { name: "5GB", price: 3000 },
    { name: "10GB", price: 5000 }
  ],
  Airtel: [
    { name: "100MB", price: 100 },
    { name: "300MB", price: 300 },
    { name: "1GB", price: 850 },
    { name: "2GB", price: 1600 },
    { name: "5GB", price: 3200 },
    { name: "10GB", price: 5200 }
  ],
  Glo: [
    { name: "200MB", price: 200 },
    { name: "500MB", price: 500 },
    { name: "1GB", price: 900 },
    { name: "2GB", price: 1700 },
    { name: "5GB", price: 3500 },
    { name: "10GB", price: 6000 }
  ],
  "9mobile": [
    { name: "500MB", price: 500 },
    { name: "1GB", price: 1000 },
    { name: "2GB", price: 1800 },
    { name: "5GB", price: 3800 },
    { name: "10GB", price: 6500 }
  ]
};

// Airtime amounts
export const AIRTIME_AMOUNTS = [500, 1000, 1500, 2000, 3000, 5000, 10000];

// Bill types
export const BILL_TYPES = [
  "NEPA/Electricity",
  "DSTV",
  "GOtv",
  "Startimes",
  "PHCN"
];

// Your bank account for deposits
export const BANK_ACCOUNTS = [
  { bank: "OPay", accountNumber: "9020853814", accountName: "Emmanuel Etim Kelvin" }
];
