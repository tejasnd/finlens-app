import { useState, useCallback, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Food & Dining","Groceries","Shopping","Travel","Transport",
  "Entertainment","Health & Medical","Utilities","Subscriptions",
  "Education","Personal Care","Home & Living","Finance & Fees",
  "Insurance","Gifts & Donations","Other"
];
const SHARED_CATS = ["Home & Living","Utilities","Groceries","Travel","Entertainment"];
const CAT_COLORS = {
  "Food & Dining":"#FF6B6B","Groceries":"#FF9F43","Shopping":"#FFC312",
  "Travel":"#06C5D8","Transport":"#54A0FF","Entertainment":"#A29BFE",
  "Health & Medical":"#00B894","Utilities":"#FDCB6E","Subscriptions":"#E17055",
  "Education":"#74B9FF","Personal Care":"#FD79A8","Home & Living":"#55EFC4",
  "Finance & Fees":"#636E72","Insurance":"#B2BEC3","Gifts & Donations":"#E84393","Other":"#778CA3",
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PERSON_A = { name:"Kadambari", color:"#FF6B9D", short:"K" };
const PERSON_B = { name:"Tejas",     color:"#7C8CF8", short:"T" };

// ─── CATEGORIZATION ENGINE ────────────────────────────────────────────────────
const RULES = [
  ["Subscriptions",[/netflix/,/spotify/,/hulu/,/disney\+/,/disney plus/,/hbo/,/apple tv/,/paramount/,/peacock/,/youtube premium/,/amazon prime/,/prime video/,/crunchyroll/,/adobe/,/microsoft 365/,/office 365/,/dropbox/,/icloud/,/google one/,/patreon/,/substack/,/duolingo/,/headspace/,/grammarly/,/1password/,/nordvpn/,/audible/,/kindle unlimited/,/apple music/,/tidal/,/playstation plus/,/xbox game pass/,/nintendo online/,/annual fee/,/monthly plan/,/yearly plan/,/subscription/]],
  ["Groceries",[/walmart/,/wal-mart/,/costco/,/sam.s club/,/kroger/,/safeway/,/publix/,/whole foods/,/trader joe/,/aldi/,/lidl/,/wegmans/,/stop & shop/,/stop and shop/,/market basket/,/hannaford/,/shaws/,/harris teeter/,/h-e-b/,/heb/,/meijer/,/giant food/,/food lion/,/fresh market/,/sprouts/,/natural grocers/,/supermarket/,/grocery/,/fresh fare/,/food mart/,/target/]],
  ["Food & Dining",[/restaurant/,/cafe/,/coffee/,/starbucks/,/dunkin/,/mcdonald/,/burger king/,/wendy.s/,/taco bell/,/chipotle/,/subway/,/pizza/,/domino/,/papa john/,/kfc/,/popeyes/,/chick-fil/,/five guys/,/shake shack/,/panera/,/jimmy john/,/olive garden/,/applebee.s/,/chili.s/,/red lobster/,/outback/,/ihop/,/denny.s/,/waffle house/,/cheesecake factory/,/buffalo wild wings/,/doordash/,/uber eats/,/grubhub/,/postmates/,/caviar/,/sushi/,/ramen/,/noodle/,/grill/,/diner/,/bistro/,/steakhouse/,/bbq/,/pub/,/tavern/,/eatery/,/bakery/,/donut/,/bagel/,/smoothie/,/boba/,/ice cream/]],
  ["Transport",[/uber/,/lyft/,/taxi/,/yellow cab/,/mbta/,/mta/,/bart/,/cta/,/wmata/,/transit/,/bus pass/,/train ticket/,/amtrak/,/shell/,/exxon/,/bp /,/chevron/,/sunoco/,/speedway/,/circle k/,/gas station/,/fuel/,/petrol/,/parking/,/parkway/,/garage fee/,/spothero/,/toll/,/e-zpass/,/sunpass/,/zipcar/,/enterprise rent/,/hertz/,/avis/,/budget car/]],
  ["Travel",[/delta air/,/united air/,/american air/,/southwest air/,/jetblue/,/spirit air/,/frontier air/,/alaska air/,/lufthansa/,/british airways/,/airline/,/flight/,/airport/,/marriott/,/hilton/,/hyatt/,/ihg/,/best western/,/wyndham/,/sheraton/,/westin/,/ritz carlton/,/four seasons/,/holiday inn/,/hampton inn/,/la quinta/,/airbnb/,/vrbo/,/booking\.com/,/expedia/,/hotels\.com/,/priceline/,/kayak/,/trivago/,/travelocity/,/carnival cruise/,/royal caribbean/,/global entry/,/tsa precheck/]],
  ["Entertainment",[/amc theatres/,/regal cinema/,/cinemark/,/movie theater/,/cinema/,/ticketmaster/,/stubhub/,/eventbrite/,/seatgeek/,/livenation/,/live nation/,/concert/,/broadway/,/museum/,/zoo/,/aquarium/,/theme park/,/steam/,/playstation store/,/xbox store/,/nintendo eshop/,/epic games/,/blizzard/,/bowling/,/minigolf/,/escape room/,/laser tag/,/golf course/,/country club/]],
  ["Health & Medical",[/cvs pharmacy/,/walgreens/,/rite aid/,/duane reade/,/pharmacy/,/drug store/,/prescription/,/hospital/,/medical center/,/urgent care/,/emergency room/,/doctor/,/physician/,/clinic/,/labcorp/,/quest diagnostics/,/dentist/,/dental/,/orthodont/,/optometrist/,/vision center/,/eye exam/,/therapy/,/therapist/,/counseling/,/psychiatr/,/mental health/,/chiropractor/,/physical therapy/,/planet fitness/,/equinox/,/la fitness/,/anytime fitness/,/ymca/,/24 hour fitness/,/orange theory/,/crossfit/,/gold.s gym/,/gym/,/peloton/,/yoga studio/,/pilates/]],
  ["Utilities",[/verizon/,/at&t/,/t-mobile/,/sprint/,/metro pcs/,/boost mobile/,/spectrum/,/comcast/,/xfinity/,/cox communication/,/optimum/,/altice/,/centurylink/,/frontier communication/,/electric/,/electricity/,/eversource/,/national grid/,/pge/,/pg&e/,/con ed/,/consolidated edison/,/duke energy/,/dominion energy/,/gas company/,/natural gas/,/gas bill/,/water bill/,/water utility/,/sewer/,/waste management/,/utility/,/internet bill/,/cable bill/,/phone bill/]],
  ["Education",[/tuition/,/university/,/college/,/school fee/,/udemy/,/coursera/,/skillshare/,/linkedin learning/,/pluralsight/,/codecademy/,/khan academy/,/chegg/,/tutoring/,/textbook/,/bookstore/,/student loan/,/sallie mae/,/navient/,/daycare/,/preschool/]],
  ["Personal Care",[/sephora/,/ulta beauty/,/bath & body/,/lush cosmetics/,/salon/,/hair salon/,/barber/,/nail salon/,/nail spa/,/waxing/,/spa/,/massage/,/beauty/,/skincare/,/makeup/,/great clips/,/sport clips/,/supercuts/,/laser hair/,/botox/,/medspa/]],
  ["Home & Living",[/home depot/,/lowe.s/,/menards/,/ace hardware/,/true value/,/harbor freight/,/ikea/,/wayfair/,/overstock/,/bed bath/,/crate & barrel/,/pottery barn/,/west elm/,/restoration hardware/,/rent payment/,/rent check/,/lease/,/property management/,/mortgage/,/hoa fee/,/cleaning service/,/maid service/,/pest control/,/exterminator/,/hvac/,/plumber/,/electrician/,/storage unit/,/extra space storage/,/u-haul/,/furniture/,/mattress/]],
  ["Insurance",[/geico/,/progressive insurance/,/allstate/,/state farm/,/farmers insurance/,/liberty mutual/,/nationwide insurance/,/usaa/,/travelers insurance/,/aetna/,/cigna/,/humana/,/united health/,/anthem/,/blue cross/,/bcbs/,/kaiser permanente/,/metlife/,/prudential/,/new york life/,/auto insurance/,/car insurance/,/home insurance/,/renters insurance/,/life insurance/,/insurance premium/]],
  ["Shopping",[/amazon/,/ebay/,/etsy/,/wish\.com/,/temu/,/shein/,/aliexpress/,/zara/,/h&m/,/gap/,/old navy/,/banana republic/,/j\.crew/,/nordstrom/,/macy.s/,/bloomingdale/,/saks/,/neiman marcus/,/tj maxx/,/marshalls/,/ross stores/,/burlington/,/best buy/,/apple store/,/apple\.com/,/microsoft store/,/chewy/,/petco/,/petsmart/,/lululemon/,/athleta/,/under armour/,/nike\.com/,/adidas\.com/,/autozone/,/advance auto/,/dollar tree/,/dollar general/,/family dollar/,/five below/,/victoria.s secret/]],
  ["Gifts & Donations",[/gofundme/,/charity/,/donation/,/nonprofit/,/red cross/,/salvation army/,/unicef/,/1-800-flowers/,/ftd flowers/,/teleflora/,/edible arrangements/,/hallmark/,/gift card/]],
  ["Finance & Fees",[/late fee/,/overdraft/,/nsf fee/,/atm fee/,/atm withdrawal/,/wire transfer/,/wire fee/,/foreign transaction/,/interest charge/,/finance charge/,/cash advance/,/account fee/,/service fee/,/paypal fee/,/venmo fee/,/bank transfer/,/ach transfer/]],
];

function smartCategory(desc) {
  if (!desc) return "Other";
  const d = desc.toLowerCase().replace(/[^\w\s&.'/\-]/g," ");
  for (const [cat,patterns] of RULES) {
    for (const p of patterns) { if (p.test(d)) return cat; }
  }
  return "Other";
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt  = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const fmtD = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
const pct  = (a,b) => b ? ((a/b)*100).toFixed(1)+"%" : "0%";

function guessColumns(headers) {
  const h = headers.map(x=>String(x).toLowerCase().trim());
  const find = (...terms) => { const i=h.findIndex(c=>terms.some(t=>c.includes(t))); return i>=0?headers[i]:null; };
  return {
    date:   find("date","time","txn date","transaction date","posted date","post date","trans date"),
    amount: find("amount","debit","charge","sum","total","payment amount","transaction amount","credit","withdrawal","spending"),
    desc:   find("description","merchant","memo","name","narration","particular","details","payee","vendor","store","transaction name"),
  };
}
function parseAmount(val) {
  if (val==null||val==="") return null;
  const n=parseFloat(String(val).replace(/[^0-9.\-]/g,""));
  return isNaN(n)?null:Math.abs(n);
}
function parseDate(val) {
  if (!val) return null;
  if (typeof val==="number") { const d=new Date(Math.round((val-25569)*86400*1000)); return isNaN(d)?null:d; }
  const d=new Date(val); return isNaN(d)?null:d;
}

// ─── FILE PARSER ──────────────────────────────────────────────────────────────
function parseFile(file, owner, cardType) {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result,{type:"array",cellDates:false});
        let all = [];
        wb.SheetNames.forEach(sn => {
          const ws = wb.Sheets[sn];
          const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
          if (rows.length<2) return;
          let hdrIdx = rows.findIndex(r=>r.filter(c=>String(c).trim()).length>=3);
          if (hdrIdx<0) hdrIdx=0;
          const headers = rows[hdrIdx].map(String);
          const cols = guessColumns(headers);
          if (!cols.amount) return;
          rows.slice(hdrIdx+1).forEach((row,ri) => {
            let amount = parseAmount(row[headers.indexOf(cols.amount)]);
            if (amount === null || amount === 0) return;
            
            // 1. Align signs: Make Expenses (+) and Payments/Refunds (-)
            //if (cardType == "Chase") {
             // amount = amount * -1;
            //}
            
            const desc = cols.desc ? String(row[headers.indexOf(cols.desc)] ?? "").trim() : "";
            
            // --- NEW REPLACEMENT START ---
            // Explicitly mark credits as negative based on keywords
            const isCreditOrPayment = /payment|thank you|mobile pmt|directdep|redemption|refund|cashback/i.test(desc);
            if (isCreditOrPayment && amount > 0) {
              amount = amount * -1;
            }
            // --- NEW REPLACEMENT END ---
            
            // 2. DISCRETE PAYMENTS: Detect card payments and categorize them separately
            const isPayment = /payment|thank you|mobile pmt|directdep/i.test(desc);
            const cat = isPayment ? "Finance & Fees" : smartCategory(desc);

            const date = parseDate(cols.date ? row[headers.indexOf(cols.date)] : null);
            all.push({
              id:`${file.name}-${sn}-${ri}`, 
              source: cardType, // Stores "Standard" or "Chase"
              owner, date:date||new Date(), amount, description:desc, category:cat,
              splitType: SHARED_CATS.includes(cat)?"shared":"personal"
            });
          });
        });
        resolve(all);
      } catch(err){reject(err);}
    };
    reader.onerror=reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
function exportToExcel(transactions, splitPct) {
  const total = transactions.reduce((s,t)=>s+t.amount,0);
  const txnRows = [["Date","Description","Card/Source","Owner","Amount ($)","Category","Split Type"],
    ...transactions.map(t=>[t.date.toLocaleDateString("en-US"),t.description,t.source,t.owner,t.amount,t.category,t.splitType])];
  const catMap={};
  transactions.forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+t.amount;});
  const catRows=[["Category","Total ($)","% of Total"],
    ...Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([c,v])=>[c,v,pct(v,total)])];
  const monthMap={};
  transactions.forEach(t=>{
    const k=`${t.date.getFullYear()}-${String(t.date.getMonth()+1).padStart(2,"0")}`;
    const label=`${MONTHS[t.date.getMonth()]} ${t.date.getFullYear()}`;
    if(!monthMap[k]) monthMap[k]={label,total:0,k:0,t:0};
    monthMap[k].total+=t.amount;
    if(t.owner===PERSON_A.name) monthMap[k].k+=t.amount;
    if(t.owner===PERSON_B.name) monthMap[k].t+=t.amount;
  });
  const monthRows=[["Month","Total ($)",`${PERSON_A.name} ($)`,`${PERSON_B.name} ($)`],
    ...Object.entries(monthMap).sort().map(([,v])=>[v.label,v.total,v.k,v.t])];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(txnRows),"Transactions");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(catRows),"By Category");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(monthRows),"By Month");
  XLSX.writeFile(wb,"FinLens_KT_Export.xlsx");
}

// ─── SETTLEMENT CALCULATOR ────────────────────────────────────────────────────
function calcSettlement(transactions, splitPct) {
  let kPaid=0, tPaid=0, kOwes=0, tOwes=0;
  transactions.forEach(t => {
    if (t.splitType==="personal") {
      if (t.owner===PERSON_A.name) kPaid+=t.amount; else tPaid+=t.amount;
    } else {
      const kShare=t.amount*(splitPct.K/100), tShare=t.amount*(splitPct.T/100);
      if (t.owner===PERSON_A.name) { kPaid+=t.amount; tOwes+=tShare; }
      else { tPaid+=t.amount; kOwes+=kShare; }
    }
  });
  const net=kOwes-tOwes;
  return { kPaid, tPaid, kOwes, tOwes, net,
    settlement: net>0?`${PERSON_A.name} owes ${PERSON_B.name} ${fmtD(net)}`:
                net<0?`${PERSON_B.name} owes ${PERSON_A.name} ${fmtD(Math.abs(net))}`:"All settled up! 🎉"
  };
}

// ─── GITHUB SYNC ──────────────────────────────────────────────────────────────
async function syncToGitHub(token,repo,data) {
  const filename="finlens-data.json";
  const content=btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2))));
  let sha=null;
  try {
    const r=await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`,
      {headers:{"Authorization":`token ${token}`,"Accept":"application/vnd.github.v3+json"}});
    if(r.ok){const d=await r.json();sha=d.sha;}
  }catch{}
  const body={message:`FinLens sync ${new Date().toISOString()}`,content};
  if(sha)body.sha=sha;
  const res=await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`,
    {method:"PUT",headers:{"Authorization":`token ${token}`,"Content-Type":"application/json","Accept":"application/vnd.github.v3+json"},body:JSON.stringify(body)});
  if(!res.ok){const e=await res.json();throw new Error(e.message||"Sync failed");}
}
async function loadFromGitHub(token,repo) {
  const r=await fetch(`https://api.github.com/repos/${repo}/contents/finlens-data.json`,
    {headers:{"Authorization":`token ${token}`,"Accept":"application/vnd.github.v3+json"}});
  if(!r.ok)throw new Error("Could not load from GitHub");
  const d=await r.json();
  const json=JSON.parse(decodeURIComponent(escape(atob(d.content))));
  json.transactions=(json.transactions||[]).map(t=>({...t,date:new Date(t.date)}));
  return json;
}

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS=["Overview","Couple","Monthly","Categories","Budget","Planning","Transactions"];

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [transactions,setTransactions]=useState([]);
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState("Overview");
  const [editId,setEditId]=useState(null);
  const [search,setSearch]=useState("");
  const [filterCat,setFilterCat]=useState("All");
  const [filterOwner,setFilterOwner]=useState("All");
  const [customRules,setCustomRules]=useState([]);
  const [newKw,setNewKw]=useState(""); const [newCat,setNewCat]=useState(CATEGORIES[0]);
  const [showRules,setShowRules]=useState(false);
  const [uploadOwner,setUploadOwner]=useState(PERSON_A.name);
  const [showUploadModal,setShowUploadModal]=useState(false);
  const [uploadCard, setUploadCard] = useState("Standard");
  const [splitPct,setSplitPct]=useState({K:50,T:50});
  const [showSplitModal,setShowSplitModal]=useState(false);
  const [budgets,setBudgets]=useState({});
  const [editBudgetCat,setEditBudgetCat]=useState(null);
  const [budgetVal,setBudgetVal]=useState("");
  const [planData,setPlanData]=useState({
    kadambariIncome:9150.72,tejasIncome:13841.69,
    k401kPct:25,t401kPct:17,
    rothGoal:7000,hsaGoal:4300,savingsGoal:20000,
    investments:{k401k:0,t401k:0,rothIRA:0,hsa:0,brokerage:0,hysa:0,overseas:0}
  });
  const [editPlan,setEditPlan]=useState(false);
  const [ghToken,setGhToken]=useState(localStorage.getItem("fl_gh_token")||"");
  const [ghRepo,setGhRepo]=useState(localStorage.getItem("fl_gh_repo")||"");
  const [ghStatus,setGhStatus]=useState("");
  const [showGhPanel,setShowGhPanel]=useState(false);
  const [ghSyncing,setGhSyncing]=useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // DERIVED
  const [dateRange, setDateRange] = useState("All");
  const filtered=useMemo(() => {
    const result = transactions.filter(t => {
      // If you want to hide payments from the UI list entirely:
      // if(t.category === "Finance & Fees") return false; 
      
      if(filterOwner!=="All"&&t.owner!==filterOwner)return false;
      
      if(filterCat!=="All"&&t.category!==filterCat)return false;
      if(search&&!t.description.toLowerCase().includes(search.toLowerCase()))return false;
      
      if (dateRange !== "All") {
        const now = new Date();
        let start = null;
        if (dateRange === "1M") start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        if (dateRange === "3M") start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        if (dateRange === "6M") start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        if (dateRange === "1Y") start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        if (start && t.date < start) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'date') {
        aVal = a.date.getTime();
        bVal = b.date.getTime();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, filterCat, filterOwner, search, dateRange, sortConfig]);
  const totalSpend = useMemo(() => 
    filtered
      .filter(t => t.category !== "Finance & Fees") // Remove payments/fees
      .reduce((s, t) => s + t.amount, 0), 
  [filtered]);
  const catTotals = useMemo(() => {
    const m = {};
    filtered
      .filter(t => t.category !== "Finance & Fees") // Ignore payments in charts
      .forEach(t => {
        m[t.category] = (m[t.category] || 0) + t.amount;
      });
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);
  const monthlyData=useMemo(()=>{
    const m={};
    filtered.forEach(t=>{
      const k=`${t.date.getFullYear()}-${String(t.date.getMonth()+1).padStart(2,"0")}`;
      if(!m[k])m[k]={month:`${MONTHS[t.date.getMonth()]} ${t.date.getFullYear()}`,sortKey: new Date(t.date.getFullYear(), t.date.getMonth(), 1).getTime(),total:0,kadambari:0,tejas:0,...Object.fromEntries(CATEGORIES.map(c=>[c,0]))};
      m[k].total+=t.amount;
      if(t.owner===PERSON_A.name)m[k].kadambari+=t.amount;
      if(t.owner===PERSON_B.name)m[k].tejas+=t.amount;
      m[k][t.category]=(m[k][t.category]||0)+t.amount;
    });
    return Object.values(m).sort((a,b)=>a.sortKey - b.sortKey);
  },[filtered]);
  const topMerchants=useMemo(()=>{
    const m={};
    filtered.forEach(t=>{const key=t.description.slice(0,32)||"Unknown";if(!m[key])m[key]={name:key,total:0,count:0,category:t.category};m[key].total+=t.amount;m[key].count++;});
    return Object.values(m).sort((a,b)=>b.total-a.total).slice(0,10);
  },[filtered]);
  const settlement=useMemo(()=>calcSettlement(transactions,splitPct),[transactions,splitPct]);
  const avgMonthly=monthlyData.length?totalSpend/monthlyData.length:0;
  const uncategorized=transactions.filter(t=>t.category==="Other").length;
  const budgetStatus=useMemo(()=>{
    const cur=monthlyData[monthlyData.length-1];
    if(!cur)return[];
    return CATEGORIES.filter(c=>budgets[c]).map(c=>({category:c,budget:budgets[c],actual:cur[c]||0,pct:Math.min(100,((cur[c]||0)/budgets[c])*100),over:(cur[c]||0)>budgets[c]}));
  },[monthlyData,budgets]);
  const kNet=planData.kadambariIncome*(1-planData.k401kPct/100)*0.72;
  const tNet=planData.tejasIncome*(1-planData.t401kPct/100)*0.72;
  const totalNet=kNet+tNet;
  const totalInv=Object.values(planData.investments).reduce((s,v)=>s+(v||0),0);
  const savingsRate=totalNet>0?((totalNet-avgMonthly)/totalNet*100).toFixed(1):0;
  const isEmpty=transactions.length===0;

  // HANDLERS
  const doFiles=useCallback(async(files,owner,cardType)=>{
    setLoading(true);
    try{
      const results=await Promise.all([...files].map(f=>parseFile(f,owner,cardType)));
      const merged=results.flat();
      setTransactions(prev=>{
        const ids=new Set(prev.map(t=>t.id));
        return[...prev,...merged.filter(t=>!ids.has(t.id)).map(t=>{
          const d=t.description.toLowerCase();
          for(const r of customRules){if(d.includes(r.keyword))return{...t,category:r.category};}
          return t;
        })];
      });
    }catch(e){alert("Error: "+e.message);}
    setLoading(false);
  },[customRules]);
  const handleDrop=useCallback((e,owner)=>{
    e.preventDefault();
    doFiles(e.dataTransfer.files, owner, uploadCard);
  },[doFiles, uploadCard]);
  const addRule=()=>{const kw=newKw.trim().toLowerCase();if(!kw)return;setCustomRules(p=>[{keyword:kw,category:newCat},...p]);setTransactions(p=>p.map(t=>t.description.toLowerCase().includes(kw)?{...t,category:newCat}:t));setNewKw("");};
  const removeRule=(i)=>setCustomRules(p=>p.filter((_,j)=>j!==i));
  const updateCategory=(id,cat)=>{setTransactions(p=>p.map(t=>t.id===id?{...t,category:cat}:t));setEditId(null);};
  const updateSplitType=(id,st)=>setTransactions(p=>p.map(t=>t.id===id?{...t,splitType:st}:t));
  const saveGH=()=>{localStorage.setItem("fl_gh_token",ghToken);localStorage.setItem("fl_gh_repo",ghRepo);setGhStatus("Settings saved.");};
  const doSync=async()=>{
    if(!ghToken||!ghRepo){setGhStatus("Enter token & repo first.");return;}
    setGhSyncing(true);setGhStatus("Syncing…");
    try{
      await syncToGitHub(ghToken,ghRepo,{transactions:transactions.map(t=>({...t,date:t.date.toISOString()})),budgets,planData,splitPct,customRules,lastSync:new Date().toISOString()});
      setGhStatus("✅ Synced at "+new Date().toLocaleTimeString());
    }catch(e){setGhStatus("❌ "+e.message);}
    setGhSyncing(false);
  };
  const doLoad=async()=>{
    if(!ghToken||!ghRepo){setGhStatus("Enter token & repo first.");return;}
    setGhSyncing(true);setGhStatus("Loading…");
    try{
      const data=await loadFromGitHub(ghToken,ghRepo);
      if(data.transactions)setTransactions(data.transactions);
      if(data.budgets)setBudgets(data.budgets);
      if(data.planData)setPlanData(data.planData);
      if(data.splitPct)setSplitPct(data.splitPct);
      if(data.customRules)setCustomRules(data.customRules);
      setGhStatus("✅ Loaded from GitHub");
    }catch(e){setGhStatus("❌ "+e.message);}
    setGhSyncing(false);
  };

  const openFilePicker=(owner)=>{
    const inp=document.createElement("input");inp.type="file";inp.accept=".xlsx,.xls,.csv";inp.multiple=true;
    inp.onchange=e=>{doFiles(e.target.files,owner,uploadCard);setShowUploadModal(false);};inp.click();
  };

  const invItems=[
    {k:"k401k",label:`${PERSON_A.name}'s 401K`,color:PERSON_A.color},
    {k:"t401k",label:`${PERSON_B.name}'s 401K`,color:PERSON_B.color},
    {k:"rothIRA",label:"Roth IRA",color:"#A29BFE"},
    {k:"hsa",label:"HSA",color:"#00B894"},
    {k:"brokerage",label:"Brokerage",color:"#FFC312"},
    {k:"hysa",label:"HYSA",color:"#06C5D8"},
    {k:"overseas",label:"Overseas",color:"#FF9F43"},
  ];

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:#1A1D26}
    ::-webkit-scrollbar-thumb{background:#30354A;border-radius:2px}
    .tab{background:none;border:none;cursor:pointer;padding:7px 13px;border-radius:8px;font-family:inherit;font-size:12px;font-weight:500;transition:all .2s;color:#6B7280;white-space:nowrap}
    .tab.on{background:#1E2235;color:#7C8CF8}
    .tab:not(.on):hover{color:#9CA3AF}
    .card{background:#161924;border:1px solid #252A3A;border-radius:14px;padding:18px}
    .dz{border:2px dashed #2A3050;border-radius:14px;padding:32px 20px;text-align:center;cursor:pointer;transition:all .3s}
    .dz:hover,.dz.active{border-color:#7C8CF8;background:rgba(124,140,248,.05)}
    .btn{padding:8px 14px;border-radius:10px;border:none;cursor:pointer;font-family:inherit;font-weight:600;font-size:12px;transition:all .2s;display:inline-flex;align-items:center;gap:5px}
    .p{background:#7C8CF8;color:#fff}.p:hover{background:#6B7AE8}
    .s{background:#1E2235;color:#7C8CF8;border:1px solid #2A3050}.s:hover{background:#252A3A}
    .g{background:#00B894;color:#fff}.g:hover{background:#00A382}
    .pk{background:#FF6B9D;color:#fff}.pk:hover{background:#EE5A8D}
    .stat{background:#161924;border:1px solid #252A3A;border-radius:14px;padding:16px 20px}
    .inp{background:#1A1D26;border:1px solid #252A3A;border-radius:8px;padding:7px 11px;color:#E8EAF0;font-family:inherit;font-size:13px;outline:none}
    .inp:focus{border-color:#7C8CF8}
    select.inp option{background:#1A1D26}
    .tr:hover{background:rgba(255,255,255,.02)}
    .badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}
    .pb{height:6px;border-radius:3px;background:#1E2235;overflow:hidden}
    .pf{height:100%;border-radius:3px;transition:width .5s ease}
    .mono{font-family:'Space Mono',monospace}
    .warn{background:rgba(253,203,110,.08);border:1px solid rgba(253,203,110,.2);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;font-size:12px;color:#FDCB6E;margin-bottom:14px}
    .chip{display:inline-flex;align-items:center;gap:5px;background:#1E2235;border-radius:20px;padding:3px 9px;font-size:11px}
    .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal{background:#161924;border:1px solid #252A3A;border-radius:16px;padding:24px;max-width:440px;width:100%}
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .g4{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
    .sec{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#4B5563;margin-bottom:10px}
  `;

  return (
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#0D0F14",minHeight:"100vh",color:"#E8EAF0"}}>
      <style>{css}</style>

      {/* ── UPLOAD MODAL ── */}
      {showUploadModal&&(
        <div className="modal-bg" onClick={()=>setShowUploadModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Upload Card Bills</div>
        
        {/* NEW DROPDOWN SECTION */}
        <div style={{marginBottom:18, marginTop:12}}>
          <label style={{fontSize:11, fontWeight:700, color:"#4B5563", textTransform:"uppercase", display:"block", marginBottom:5}}>Statement Format</label>
          <select 
            className="inp" 
            style={{width:"100%", background:"#1A1D26", border:"1px solid #2A3050", color: "#E5E7EB"}}
            value={uploadCard}
            onChange={(e) => setUploadCard(e.target.value)}
          >
            <option value="Standard">Standard (Amex, Citi, Bilt, Discover)</option>
            <option value="Chase">Chase (Negative Expenses)</option>
          </select>
          <div style={{fontSize: 10, color: "#6B7280", marginTop: 4}}>
            Standard: Expenses are positive. Chase: Expenses are negative.
          </div>
        </div>

        <div style={{color:"#6B7280",fontSize:12,marginBottom:18}}>Choose whose card statement you're uploading:</div>
        <div className="g2" style={{marginBottom:18}}>
          {[PERSON_A,PERSON_B].map(p=>(
            <div key={p.name} className={`dz${uploadOwner===p.name?" active":""}`}
              style={{borderColor:uploadOwner===p.name?p.color:undefined,background:uploadOwner===p.name?`${p.color}18`:undefined}}
              onClick={()=>setUploadOwner(p.name)}>
              <div style={{width:42,height:42,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,margin:"0 auto 8px"}}>{p.short}</div>
              <div style={{fontWeight:600,fontSize:14,color:uploadOwner===p.name?p.color:"#9CA3AF"}}>{p.name}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn p" style={{flex:1}} onClick={()=>openFilePicker(uploadOwner)}>📂 Select Files</button>
          <button className="btn s" onClick={()=>setShowUploadModal(false)}>Cancel</button>
        </div>
      </div>
          
        </div>
      )}

      {/* ── SPLIT MODAL ── */}
      {showSplitModal&&(
        <div className="modal-bg" onClick={()=>setShowSplitModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Shared Expense Split</div>
            <div style={{color:"#6B7280",fontSize:12,marginBottom:18}}>Set what % each person owes for shared expenses (rent, utilities, groceries…)</div>
            {[{p:PERSON_A,k:"K"},{p:PERSON_B,k:"T"}].map(({p,k})=>(
              <div key={k} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <label style={{fontSize:12,color:p.color,fontWeight:600}}>{p.name}</label>
                  <span className="mono" style={{color:p.color,fontWeight:700}}>{splitPct[k]}%</span>
                </div>
                <input type="range" min={0} max={100} value={splitPct[k]} style={{width:"100%",accentColor:p.color}}
                  onChange={e=>{const v=+e.target.value;const o=k==="K"?"T":"K";setSplitPct({...splitPct,[k]:v,[o]:100-v});}}/>
              </div>
            ))}
            <div style={{background:"#1A1D26",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#9CA3AF",marginBottom:16}}>
              Shared expenses: <strong style={{color:PERSON_A.color}}>{PERSON_A.name} {splitPct.K}%</strong> · <strong style={{color:PERSON_B.color}}>{PERSON_B.name} {splitPct.T}%</strong>
            </div>
            <button className="btn p" style={{width:"100%"}} onClick={()=>setShowSplitModal(false)}>✅ Save Split</button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{borderBottom:"1px solid #1E2235",padding:"11px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#FF6B9D,#7C8CF8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>💳</div>
          <div>
            <span style={{fontSize:14,fontWeight:700}}>FinLens</span>
            <span style={{fontSize:11,color:"#4B5563",marginLeft:6}}>K & T · Free · No API</span>
          </div>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
          {!isEmpty&&<button className="btn s" onClick={()=>setShowRules(p=>!p)}>⚙️ Rules{customRules.length>0?` (${customRules.length})`:""}</button>}
          {!isEmpty&&<button className="btn s" onClick={()=>setShowSplitModal(true)}>⚖️ {splitPct.K}/{splitPct.T}</button>}
          {!isEmpty&&<button className="btn g" onClick={()=>exportToExcel(transactions,splitPct)}>⬇️ Export</button>}
          <button className="btn s" onClick={()=>setShowGhPanel(p=>!p)}>🐙 GitHub</button>
          <button className="btn pk" onClick={()=>setShowUploadModal(true)}>+ Upload Bills</button>
        </div>
      </div>

      {/* ── GITHUB PANEL ── */}
      {showGhPanel&&(
        <div style={{background:"#12151D",borderBottom:"1px solid #1E2235",padding:"12px 22px"}}>
          <div style={{maxWidth:800,display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontSize:11,color:"#6B7280",marginBottom:3}}>Personal Access Token (repo scope)</div>
              <input className="inp" type="password" placeholder="ghp_xxxxxxxxxxxx" value={ghToken} onChange={e=>setGhToken(e.target.value)} style={{width:"100%"}}/>
            </div>
            <div style={{flex:1,minWidth:150}}>
              <div style={{fontSize:11,color:"#6B7280",marginBottom:3}}>Repo (owner/repo-name)</div>
              <input className="inp" placeholder="yourname/finlens-data" value={ghRepo} onChange={e=>setGhRepo(e.target.value)} style={{width:"100%"}}/>
            </div>
            <button className="btn s" onClick={saveGH}>💾 Save</button>
            <button className="btn p" onClick={doSync} disabled={ghSyncing}>{ghSyncing?"⏳":"☁️"} Sync</button>
            <button className="btn s" onClick={doLoad} disabled={ghSyncing}>{ghSyncing?"⏳":"📥"} Load</button>
          </div>
          {ghStatus&&<div style={{fontSize:12,color:"#9CA3AF",marginTop:6}}>{ghStatus}</div>}
          <div style={{fontSize:11,color:"#4B5563",marginTop:4}}>💡 Create a <strong>private</strong> repo on GitHub → generate a token at Settings → Developer Settings → Personal access tokens (classic) with <code style={{color:"#7C8CF8"}}>repo</code> scope. Saves as <code style={{color:"#7C8CF8"}}>finlens-data.json</code>.</div>
        </div>
      )}

      {/* ── RULES PANEL ── */}
      {showRules&&(
        <div style={{background:"#12151D",borderBottom:"1px solid #1E2235",padding:"12px 22px"}}>
          <div style={{maxWidth:720}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>⚙️ Custom Rules <span style={{color:"#4B5563",fontWeight:400}}>— override auto-categorization</span></div>
            <div style={{display:"flex",gap:7,marginBottom:8,flexWrap:"wrap"}}>
              <input className="inp" placeholder='Keyword (e.g. "wholefds")' value={newKw} onChange={e=>setNewKw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRule()} style={{flex:1,minWidth:140}}/>
              <select className="inp" value={newCat} onChange={e=>setNewCat(e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
              <button className="btn p" onClick={addRule}>Add</button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {customRules.length===0?<span style={{color:"#4B5563",fontSize:11}}>No rules yet.</span>:customRules.map((r,i)=>(
                <span key={i} className="chip"><span style={{color:"#7C8CF8"}}>"{r.keyword}"</span><span style={{color:"#6B7280"}}>→</span><span style={{color:CAT_COLORS[r.category]}}>{r.category}</span><button onClick={()=>removeRule(i)} style={{background:"none",border:"none",color:"#4B5563",cursor:"pointer",fontSize:10,padding:0}}>✕</button></span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{padding:"16px 22px",maxWidth:1300,margin:"0 auto"}}>

        {/* ── EMPTY STATE ── */}
        {isEmpty?(
          <div style={{maxWidth:580,margin:"50px auto",textAlign:"center"}}>
            <div style={{fontSize:42,marginBottom:12}}>💑</div>
            <h1 style={{fontSize:24,fontWeight:700,marginBottom:8}}>Kadambari & Tejas · FinLens</h1>
            <p style={{color:"#6B7280",fontSize:13,lineHeight:1.7,marginBottom:28}}>Upload each person's card bills separately. FinLens merges, categorizes, tracks who paid what, calculates your settlement, and plans your finances — <strong style={{color:"#7C8CF8"}}>free, offline, no API.</strong></p>
            <div className="g2" style={{marginBottom:20}}>
              {[PERSON_A,PERSON_B].map(p=>(
                <div key={p.name} className="dz" onDrop={e=>handleDrop(e,p.name)} onDragOver={e=>e.preventDefault()} onClick={()=>{setUploadOwner(p.name);setShowUploadModal(true);}}>
                  <div style={{width:46,height:46,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,margin:"0 auto 10px"}}>{p.short}</div>
                  <div style={{fontWeight:600,color:p.color,marginBottom:4}}>{p.name}'s Bills</div>
                  <div style={{color:"#4B5563",fontSize:11}}>Drop .xlsx / .csv or click</div>
                </div>
              ))}
            </div>
            {loading&&<div style={{color:"#7C8CF8",fontWeight:600,marginBottom:16}}>⏳ Parsing files…</div>}
            <div className="g2">
              {[["💑","Couple Tracking","Each person uploads their own card bills, auto-tagged"],["⚖️","Custom Split","Set your % for shared expenses like rent & utilities"],["📊","Budget Planning","Monthly targets per category vs actual spend"],["🐙","GitHub Sync","All data saved to your private GitHub repo"]].map(([ic,t,d])=>(
                <div key={t} style={{background:"#161924",border:"1px solid #252A3A",borderRadius:12,padding:"12px 14px",textAlign:"left"}}>
                  <div style={{fontSize:18,marginBottom:5}}>{ic}</div>
                  <div style={{fontWeight:600,fontSize:12,marginBottom:3}}>{t}</div>
                  <div style={{color:"#6B7280",fontSize:11,lineHeight:1.5}}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        ):(
          <>
            {uncategorized>0&&<div className="warn">⚠️ <span><strong>{uncategorized}</strong> transactions still "Other". Use ⚙️ Rules or click badges in Transactions tab to fix.</span></div>}

            {/* TABS */}
            <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{display:"flex",background:"#161924",border:"1px solid #252A3A",borderRadius:10,overflow:"hidden"}}>
                {TABS.map(t=><button key={t} className={`tab ${tab===t?"on":""}`} onClick={()=>setTab(t)}>{t}</button>)}
              </div>
              <select className="inp" value={filterOwner} onChange={e=>setFilterOwner(e.target.value)} style={{width:"auto"}}>
                <option value="All">All People</option>
                <option>{PERSON_A.name}</option><option>{PERSON_B.name}</option>
              </select>
              <select className="inp" value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{width:"auto"}}>
                <option>All</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <select className="inp" value={dateRange} onChange={e=>setDateRange(e.target.value)} style={{width:"auto"}}>
                <option value="All">All Time</option>
                <option value="1M">Last 1 Month</option>
                <option value="3M">Last 3 Months</option>
                <option value="6M">Last 6 Months</option>
                <option value="1Y">Last 1 Year</option>
              </select>
              {tab==="Transactions"&&<input className="inp" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{width:160}}/>}
              <div style={{marginLeft:"auto",color:"#4B5563",fontSize:11}}>{filtered.length} txns · {[...new Set(transactions.map(t=>t.source))].length} card(s)</div>
            </div>

            {/* ══ OVERVIEW ══ */}
            {tab==="Overview"&&(<>
              <div className="g4" style={{marginBottom:14}}>
                {[{l:"Total Spent",v:fmt(totalSpend),i:"💸",a:"#7C8CF8"},{l:"Avg / Month",v:fmt(avgMonthly),i:"📅",a:"#00D4A1"},{l:"Transactions",v:filtered.length.toLocaleString(),i:"🧾",a:"#FF9F43"},{l:"Avg / Txn",v:fmt(filtered.length?totalSpend/filtered.length:0),i:"📌",a:"#FF6B6B"}].map(s=>(
                  <div key={s.l} className="stat">
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><div style={{fontSize:10,color:"#6B7280",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>{s.l}</div><div>{s.i}</div></div>
                    <div className="mono" style={{fontSize:21,fontWeight:700,color:s.a}}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="g2" style={{marginBottom:12}}>
                <div className="card">
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Spending by Category</div>
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart><Pie data={catTotals.slice(0,9)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {catTotals.slice(0,9).map(c=><Cell key={c.name} fill={CAT_COLORS[c.name]||"#778CA3"}/>)}
                    </Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1D26",border:"1px solid #252A3A",borderRadius:8,color:"#E8EAF0"}}/>
                    <Legend formatter={v=><span style={{color:"#9CA3AF",fontSize:10}}>{v}</span>}/></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Category Breakdown</div>
                  <div style={{display:"flex",flexDirection:"column",gap:9,overflowY:"auto",maxHeight:250}}>
                    {catTotals.map(c=>(<div key={c.name}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}><span style={{color:"#D1D5DB"}}>{c.name}</span><span className="mono" style={{color:CAT_COLORS[c.name],fontWeight:700,fontSize:11}}>{fmt(c.value)}</span></div>
                      <div className="pb"><div className="pf" style={{width:`${(c.value/catTotals[0].value)*100}%`,background:CAT_COLORS[c.name]||"#778CA3"}}/></div>
                    </div>))}
                  </div>
                </div>
              </div>
              <div className="card">
                <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Top 10 Merchants</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:9}}>
                  {topMerchants.map((m,i)=>(
                    <div key={m.name} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:"#1A1D26",borderRadius:9}}>
                      <div style={{fontWeight:700,color:"#4B5563",fontSize:11,minWidth:20}}>#{i+1}</div>
                      <div style={{flex:1,overflow:"hidden"}}>
                        <div style={{fontSize:12,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                        <div style={{fontSize:10,color:"#6B7280"}}>{m.count} txns · <span style={{color:CAT_COLORS[m.category]}}>{m.category}</span></div>
                      </div>
                      <div className="mono" style={{fontSize:11,fontWeight:700,color:"#7C8CF8"}}>{fmt(m.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>)}

            {/* ══ COUPLE ══ */}
            {tab==="Couple"&&(()=>{
              const kTxns=transactions.filter(t=>t.owner===PERSON_A.name);
              const tTxns=transactions.filter(t=>t.owner===PERSON_B.name);
              const kTotal=kTxns.reduce((s,t)=>s+t.amount,0);
              const tTotal=tTxns.reduce((s,t)=>s+t.amount,0);
              const kShared=kTxns.filter(t=>t.splitType==="shared").reduce((s,t)=>s+t.amount,0);
              const tShared=tTxns.filter(t=>t.splitType==="shared").reduce((s,t)=>s+t.amount,0);
              const catSplit={};
              transactions.forEach(t=>{
                if(!catSplit[t.category])catSplit[t.category]={cat:t.category,k:0,t:0};
                if(t.owner===PERSON_A.name)catSplit[t.category].k+=t.amount;
                else catSplit[t.category].t+=t.amount;
              });
              const catSplitArr=Object.values(catSplit).filter(c=>c.k+c.t>0).sort((a,b)=>(b.k+b.t)-(a.k+a.t));
              return(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="card" style={{borderTop:`3px solid ${settlement.net>0?PERSON_A.color:settlement.net<0?PERSON_B.color:"#00B894"}`}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
                    <div>
                      <div className="sec">Settlement Summary</div>
                      <div style={{fontSize:20,fontWeight:700,color:settlement.net===0?"#00B894":settlement.net>0?PERSON_A.color:PERSON_B.color}}>{settlement.settlement}</div>
                      <div style={{fontSize:11,color:"#6B7280",marginTop:4}}>Based on {splitPct.K}/{splitPct.T} split · <button className="btn s" style={{fontSize:10,padding:"2px 8px"}} onClick={()=>setShowSplitModal(true)}>Change</button></div>
                    </div>
                    <div className="g2">
                      {[{p:PERSON_A,paid:settlement.kPaid,owes:settlement.kOwes},{p:PERSON_B,paid:settlement.tPaid,owes:settlement.tOwes}].map(({p,paid,owes})=>(
                        <div key={p.name} style={{background:"#1A1D26",borderRadius:9,padding:"10px 14px",borderLeft:`3px solid ${p.color}`}}>
                          <div style={{color:p.color,fontWeight:700,fontSize:12,marginBottom:5}}>{p.name}</div>
                          <div style={{fontSize:11,color:"#9CA3AF"}}>Paid: <span className="mono" style={{color:"#E8EAF0",fontSize:12}}>{fmt(paid)}</span></div>
                          <div style={{fontSize:11,color:"#9CA3AF"}}>Owes (shared): <span className="mono" style={{color:p.color,fontSize:12}}>{fmt(owes)}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="g2">
                  {[{p:PERSON_A,total:kTotal,shared:kShared,personal:kTotal-kShared,txns:kTxns.length},{p:PERSON_B,total:tTotal,shared:tShared,personal:tTotal-tShared,txns:tTxns.length}].map(({p,total,shared,personal,txns})=>(
                    <div key={p.name} className="card" style={{borderTop:`3px solid ${p.color}`}}>
                      <div style={{color:p.color,fontWeight:700,fontSize:14,marginBottom:10}}>{p.name}</div>
                      <div className="mono" style={{fontSize:24,fontWeight:700,marginBottom:6}}>{fmt(total)}</div>
                      <div style={{fontSize:11,color:"#9CA3AF",marginBottom:10}}>{txns} transactions</div>
                      {[["Personal",personal,"#778CA3"],["Shared (paid by)",shared,p.color]].map(([l,v,c])=>(
                        <div key={l} style={{marginBottom:8}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:11}}><span style={{color:"#9CA3AF"}}>{l}</span><span className="mono" style={{color:c,fontSize:11}}>{fmt(v)}</span></div>
                          <div className="pb"><div className="pf" style={{width:total?`${(v/total)*100}%`:"0%",background:c}}/></div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Spending by Category — K vs T</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={catSplitArr.slice(0,10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2235"/>
                      <XAxis dataKey="cat" stroke="#4B5563" fontSize={10} tickFormatter={v=>v.split(" ")[0]}/>
                      <YAxis stroke="#4B5563" fontSize={10} tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"}/>
                      <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1D26",border:"1px solid #252A3A",borderRadius:8,color:"#E8EAF0"}}/>
                      <Legend formatter={v=><span style={{color:"#9CA3AF",fontSize:10}}>{v}</span>}/>
                      <Bar dataKey="k" name={PERSON_A.name} fill={PERSON_A.color} radius={[4,4,0,0]}/>
                      <Bar dataKey="t" name={PERSON_B.name} fill={PERSON_B.color} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card" style={{overflowX:"auto"}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Detailed Category Split</div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr style={{borderBottom:"1px solid #252A3A"}}>
                      {["Category",PERSON_A.name,PERSON_B.name,"Total","K / T Split"].map(h=>(
                        <th key={h} style={{textAlign:h==="Category"?"left":"right",padding:"7px 10px",color:"#6B7280",fontWeight:600,fontSize:10}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{catSplitArr.map(c=>(
                      <tr key={c.cat} className="tr" style={{borderBottom:"1px solid #1A1D26"}}>
                        <td style={{padding:"9px 10px"}}><span className="badge" style={{background:(CAT_COLORS[c.cat]||"#778CA3")+"22",color:CAT_COLORS[c.cat]||"#778CA3"}}>{c.cat}</span></td>
                        <td className="mono" style={{textAlign:"right",padding:"9px 10px",color:PERSON_A.color,fontSize:11}}>{fmt(c.k)}</td>
                        <td className="mono" style={{textAlign:"right",padding:"9px 10px",color:PERSON_B.color,fontSize:11}}>{fmt(c.t)}</td>
                        <td className="mono" style={{textAlign:"right",padding:"9px 10px",fontWeight:700,fontSize:11}}>{fmt(c.k+c.t)}</td>
                        <td style={{textAlign:"right",padding:"9px 10px",fontSize:11,color:"#6B7280"}}>
                          {(c.k+c.t)>0?`${((c.k/(c.k+c.t))*100).toFixed(0)}% / ${((c.t/(c.k+c.t))*100).toFixed(0)}%`:"—"}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>);
            })()}

            {/* ══ MONTHLY ══ */}
            {tab==="Monthly"&&(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="card">
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Monthly Trend</div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2235"/>
                      <XAxis dataKey="month" stroke="#4B5563" fontSize={10}/>
                      <YAxis stroke="#4B5563" fontSize={10} tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"}/>
                      <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1D26",border:"1px solid #252A3A",borderRadius:8,color:"#E8EAF0"}}/>
                      <Legend formatter={v=><span style={{color:"#9CA3AF",fontSize:10}}>{v}</span>}/>
                      <Line type="monotone" dataKey="total" name="Combined" stroke="#7C8CF8" strokeWidth={2.5} dot={{fill:"#7C8CF8",r:3}}/>
                      <Line type="monotone" dataKey="kadambari" name={PERSON_A.name} stroke={PERSON_A.color} strokeWidth={2} strokeDasharray="4 2" dot={{fill:PERSON_A.color,r:3}}/>
                      <Line type="monotone" dataKey="tejas" name={PERSON_B.name} stroke={PERSON_B.color} strokeWidth={2} strokeDasharray="4 2" dot={{fill:PERSON_B.color,r:3}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Monthly by Category (Stacked)</div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2235"/>
                      <XAxis dataKey="month" stroke="#4B5563" fontSize={10}/>
                      <YAxis stroke="#4B5563" fontSize={10} tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"}/>
                      <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1D26",border:"1px solid #252A3A",borderRadius:8,color:"#E8EAF0"}}/>
                      <Legend formatter={v=><span style={{color:"#9CA3AF",fontSize:10}}>{v}</span>}/>
                      {catTotals.slice(0,8).map(c=><Bar key={c.name} dataKey={c.name} stackId="a" fill={CAT_COLORS[c.name]}/>)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card" style={{overflowX:"auto"}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Monthly Breakdown Table</div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr style={{borderBottom:"1px solid #252A3A"}}>
                      <th style={{textAlign:"left",padding:"7px 10px",color:"#6B7280",fontWeight:600,fontSize:10}}>Month</th>
                      <th style={{textAlign:"right",padding:"7px 10px",color:"#6B7280",fontWeight:600,fontSize:10}}>Total</th>
                      <th style={{textAlign:"right",padding:"7px 10px",color:PERSON_A.color,fontWeight:600,fontSize:10}}>{PERSON_A.name}</th>
                      <th style={{textAlign:"right",padding:"7px 10px",color:PERSON_B.color,fontWeight:600,fontSize:10}}>{PERSON_B.name}</th>
                      {catTotals.slice(0,5).map(c=>(
                        <th key={c.name} style={{textAlign:"right",padding:"7px 10px",color:CAT_COLORS[c.name],fontWeight:600,fontSize:10}}>{c.name.split(" ")[0]}</th>
                      ))}
                    </tr></thead>
                    <tbody>{monthlyData.map(m=>(
                      <tr key={m.month} className="tr" style={{borderBottom:"1px solid #1A1D26"}}>
                        <td style={{padding:"9px 10px",fontWeight:500}}>{m.month}</td>
                        <td className="mono" style={{textAlign:"right",padding:"9px 10px",color:"#7C8CF8",fontWeight:700,fontSize:11}}>{fmt(m.total)}</td>
                        <td className="mono" style={{textAlign:"right",padding:"9px 10px",color:PERSON_A.color,fontSize:11}}>{fmt(m.kadambari)}</td>
                        <td className="mono" style={{textAlign:"right",padding:"9px 10px",color:PERSON_B.color,fontSize:11}}>{fmt(m.tejas)}</td>
                        {catTotals.slice(0,5).map(c=>(
                          <td key={c.name} className="mono" style={{textAlign:"right",padding:"9px 10px",color:m[c.name]?"#D1D5DB":"#2A3050",fontSize:11}}>{m[c.name]?fmt(m[c.name]):"—"}</td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ CATEGORIES ══ */}
            {tab==="Categories"&&(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="card">
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>All Categories Ranked</div>
                  <ResponsiveContainer width="100%" height={Math.max(260,catTotals.length*32)}>
                    <BarChart data={catTotals} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2235" horizontal={false}/>
                      <XAxis type="number" stroke="#4B5563" fontSize={10} tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"}/>
                      <YAxis type="category" dataKey="name" stroke="#4B5563" fontSize={10} width={125}/>
                      <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1D26",border:"1px solid #252A3A",borderRadius:8,color:"#E8EAF0"}}/>
                      <Bar dataKey="value" radius={[0,6,6,0]}>{catTotals.map(c=><Cell key={c.name} fill={CAT_COLORS[c.name]||"#778CA3"}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:11}}>
                  {catTotals.map(c=>{const count=filtered.filter(t=>t.category===c.name).length;return(
                    <div key={c.name} className="card" style={{borderLeft:`3px solid ${CAT_COLORS[c.name]||"#778CA3"}`}}>
                      <div style={{fontSize:11,color:"#6B7280",marginBottom:4}}>{c.name}</div>
                      <div className="mono" style={{fontSize:18,fontWeight:700,color:CAT_COLORS[c.name]||"#778CA3"}}>{fmt(c.value)}</div>
                      <div style={{fontSize:10,color:"#4B5563",marginTop:4}}>{count} txns · {pct(c.value,totalSpend)} of total</div>
                    </div>
                  );})}
                </div>
              </div>
            )}

            {/* ══ BUDGET ══ */}
            {tab==="Budget"&&(()=>{
              const cur=monthlyData[monthlyData.length-1];
              return(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="card">
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div><div style={{fontWeight:600,fontSize:14}}>Monthly Budget Targets</div><div style={{fontSize:11,color:"#6B7280",marginTop:2}}>Actuals from most recent month{cur?` (${cur.month})`:""}</div></div>
                    <button className="btn p" style={{fontSize:11}} onClick={()=>{setEditBudgetCat("");setBudgetVal("");}}>+ Add Budget</button>
                  </div>
                  {editBudgetCat!==null&&(
                    <div style={{background:"#1A1D26",borderRadius:10,padding:"12px",marginBottom:14,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <select className="inp" style={{flex:1,minWidth:140}} value={editBudgetCat} onChange={e=>setEditBudgetCat(e.target.value)}>
                        <option value="">-- Category --</option>
                        {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                      </select>
                      <input className="inp" type="number" placeholder="$ budget" value={budgetVal} onChange={e=>setBudgetVal(e.target.value)} style={{width:120}}/>
                      <button className="btn p" style={{fontSize:11}} onClick={()=>{
                        if(editBudgetCat&&budgetVal>0){setBudgets(p=>({...p,[editBudgetCat]:+budgetVal}));}
                        setEditBudgetCat(null);setBudgetVal("");
                      }}>Save</button>
                      <button className="btn s" style={{fontSize:11}} onClick={()=>{setEditBudgetCat(null);setBudgetVal("");}}>Cancel</button>
                    </div>
                  )}
                  {Object.keys(budgets).length===0
                    ?<div style={{color:"#4B5563",fontSize:12,textAlign:"center",padding:"20px 0"}}>No budgets set yet. Click "+ Add Budget" to start.</div>
                    :<div style={{display:"flex",flexDirection:"column",gap:9}}>
                      {CATEGORIES.filter(c=>budgets[c]).map(c=>{
                        const actual=cur?cur[c]||0:0;
                        const pp=Math.min(100,(actual/budgets[c])*100);
                        const over=actual>budgets[c];
                        return(
                          <div key={c} className="card" style={{padding:"12px 14px",borderLeft:`3px solid ${over?"#FF6B6B":CAT_COLORS[c]||"#778CA3"}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,alignItems:"center"}}>
                              <div style={{display:"flex",alignItems:"center",gap:7}}>
                                <span style={{fontWeight:600,fontSize:13}}>{c}</span>
                                {over&&<span className="badge" style={{background:"rgba(255,107,107,.2)",color:"#FF6B6B"}}>Over!</span>}
                              </div>
                              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                                <span className="mono" style={{fontSize:12,color:over?"#FF6B6B":CAT_COLORS[c]}}>{fmt(actual)}</span>
                                <span style={{color:"#4B5563",fontSize:11}}>/ {fmt(budgets[c])}</span>
                                <button onClick={()=>{setEditBudgetCat(c);setBudgetVal(budgets[c]);}} style={{background:"none",border:"none",color:"#4B5563",cursor:"pointer",fontSize:11}}>✏️</button>
                                <button onClick={()=>setBudgets(p=>{const n={...p};delete n[c];return n;})} style={{background:"none",border:"none",color:"#4B5563",cursor:"pointer",fontSize:11}}>✕</button>
                              </div>
                            </div>
                            <div className="pb"><div className="pf" style={{width:`${pp}%`,background:over?"#FF6B6B":CAT_COLORS[c]||"#778CA3"}}/></div>
                            <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:10,color:"#6B7280"}}>
                              <span>{pp.toFixed(0)}% used</span>
                              <span>{over?`${fmt(actual-budgets[c])} over`:`${fmt(budgets[c]-actual)} left`}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  }
                </div>
                {budgetStatus.length>0&&(
                  <div className="g2">
                    <div className="card">
                      <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Budget vs Actual</div>
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={budgetStatus}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E2235"/>
                          <XAxis dataKey="category" stroke="#4B5563" fontSize={9} tickFormatter={v=>v.split(" ")[0]}/>
                          <YAxis stroke="#4B5563" fontSize={10} tickFormatter={v=>"$"+(v/1000).toFixed(1)+"k"}/>
                          <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1D26",border:"1px solid #252A3A",borderRadius:8,color:"#E8EAF0"}}/>
                          <Legend formatter={v=><span style={{color:"#9CA3AF",fontSize:10}}>{v}</span>}/>
                          <Bar dataKey="budget" name="Budget" fill="#252A3A" radius={[4,4,0,0]}/>
                          <Bar dataKey="actual" name="Actual" fill="#7C8CF8" radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card">
                      <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Budget Health</div>
                      <div style={{display:"flex",flexDirection:"column",gap:9}}>
                        {budgetStatus.map(b=>(
                          <div key={b.category} style={{display:"flex",alignItems:"center",gap:9}}>
                            <div style={{width:90,fontSize:11,color:"#9CA3AF",textAlign:"right",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{b.category}</div>
                            <div style={{flex:1,height:7,background:"#1E2235",borderRadius:4,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${Math.min(100,b.pct)}%`,background:b.over?"#FF6B6B":CAT_COLORS[b.category]||"#7C8CF8",borderRadius:4}}/>
                            </div>
                            <div style={{fontSize:10,color:b.over?"#FF6B6B":"#6B7280",minWidth:32,textAlign:"right"}}>{b.pct.toFixed(0)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>);
            })()}

            {/* ══ PLANNING ══ */}
            {tab==="Planning"&&(<>
              <div className="g2" style={{marginBottom:12}}>
                {[{p:PERSON_A,incomeKey:"kadambariIncome",pctKey:"k401kPct",gross:planData.kadambariIncome,pct401k:planData.k401kPct},
                  {p:PERSON_B,incomeKey:"tejasIncome",pctKey:"t401kPct",gross:planData.tejasIncome,pct401k:planData.t401kPct}].map(({p,incomeKey,pctKey,gross,pct401k})=>(
                  <div key={p.name} className="card" style={{borderTop:`3px solid ${p.color}`}}>
                    <div style={{color:p.color,fontWeight:700,fontSize:13,marginBottom:9}}>{p.name} — Income</div>
                    <div className="mono" style={{fontSize:20,fontWeight:700,marginBottom:4}}>{fmt(gross)}<span style={{fontSize:11,color:"#6B7280"}}>/mo</span></div>
                    <div style={{fontSize:11,color:"#9CA3AF"}}>Annual: {fmt(gross*12)} · 401K: {pct401k}% = {fmt(gross*(pct401k/100))}/mo</div>
                    {editPlan&&(<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                      <input className="inp" type="number" placeholder="Gross monthly $" value={gross} onChange={e=>setPlanData(p2=>({...p2,[incomeKey]:+e.target.value}))}/>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <label style={{fontSize:11,color:"#9CA3AF",whiteSpace:"nowrap"}}>401K %</label>
                        <input type="range" min={0} max={50} value={pct401k} style={{flex:1,accentColor:p.color}} onChange={e=>setPlanData(p2=>({...p2,[pctKey]:+e.target.value}))}/>
                        <span className="mono" style={{color:p.color,minWidth:32,fontSize:12}}>{pct401k}%</span>
                      </div>
                    </div>)}
                  </div>
                ))}
              </div>
              <div className="g3" style={{marginBottom:12}}>
                {[{l:"Monthly Spend",v:fmt(avgMonthly),c:"#FF6B6B",i:"💸"},{l:"Savings Rate",v:`${savingsRate}%`,c:+savingsRate>20?"#00B894":+savingsRate>10?"#FFC312":"#FF6B6B",i:"💰"},{l:"Total Investments",v:fmt(totalInv),c:"#A29BFE",i:"📈"}].map(s=>(
                  <div key={s.l} className="stat"><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><div style={{fontSize:10,color:"#6B7280",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>{s.l}</div><div>{s.i}</div></div><div className="mono" style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div></div>
                ))}
              </div>
              <div className="card" style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontWeight:600,fontSize:13}}>Investment Portfolio</div>
                  <button className="btn s" style={{fontSize:11}} onClick={()=>setEditPlan(p=>!p)}>{editPlan?"✅ Done":"✏️ Edit"}</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:9}}>
                  {invItems.map(item=>(
                    <div key={item.k} style={{background:"#1A1D26",borderRadius:9,padding:"11px 13px",borderLeft:`3px solid ${item.color}`}}>
                      <div style={{fontSize:10,color:"#6B7280",marginBottom:4}}>{item.label}</div>
                      {editPlan
                        ?<input className="inp" type="number" placeholder="Balance $" value={planData.investments[item.k]||""} onChange={e=>setPlanData(p=>({...p,investments:{...p.investments,[item.k]:+e.target.value}}))}/>
                        :<div className="mono" style={{fontSize:17,fontWeight:700,color:item.color}}>{fmt(planData.investments[item.k]||0)}</div>
                      }
                    </div>
                  ))}
                </div>
                {totalInv>0&&(<div style={{marginTop:12}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={invItems.filter(i=>(planData.investments[i.k]||0)>0).map(i=>({name:i.label,value:planData.investments[i.k],color:i.color}))}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name.split(" ")[0]} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                        {invItems.filter(i=>(planData.investments[i.k]||0)>0).map(i=><Cell key={i.k} fill={i.color}/>)}
                      </Pie>
                      <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1D26",border:"1px solid #252A3A",borderRadius:8,color:"#E8EAF0"}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>)}
              </div>
              <div className="card">
                <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Annual Goals</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:10}}>
                  {[
                    {l:"Roth IRA",goal:planData.rothGoal,current:planData.investments.rothIRA||0,color:"#A29BFE",key:"rothGoal"},
                    {l:"HSA",goal:planData.hsaGoal,current:planData.investments.hsa||0,color:"#00B894",key:"hsaGoal"},
                    {l:"Annual Savings",goal:planData.savingsGoal,current:Math.max(0,(totalNet-avgMonthly)*12),color:"#FFC312",key:"savingsGoal"},
                  ].map(g=>{
                    const pp=Math.min(100,(g.current/g.goal)*100);
                    return(
                      <div key={g.l} style={{background:"#1A1D26",borderRadius:9,padding:"13px 14px"}}>
                        <div style={{fontSize:11,color:"#9CA3AF",marginBottom:5}}>{g.l} Goal</div>
                        {editPlan
                          ?<input className="inp" type="number" value={planData[g.key]||""} onChange={e=>setPlanData(p=>({...p,[g.key]:+e.target.value}))} style={{marginBottom:8}}/>
                          :<div className="mono" style={{fontSize:17,fontWeight:700,color:g.color,marginBottom:8}}>{fmt(g.current)} <span style={{fontSize:11,color:"#6B7280"}}>/ {fmt(g.goal)}</span></div>
                        }
                        <div className="pb"><div className="pf" style={{width:`${pp}%`,background:g.color}}/></div>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:10,color:"#6B7280"}}>
                          <span>{pp.toFixed(0)}%</span>
                          <span>{pp>=100?"✅ Reached!":fmt(g.goal-g.current)+" to go"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>)}

            {/* ══ TRANSACTIONS ══ */}
            {tab==="Transactions"&&(
              <div className="card" style={{overflowX:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,alignItems:"center"}}>
                  <div style={{fontWeight:600,fontSize:13}}>All Transactions</div>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    <div style={{fontSize:11,color:"#6B7280"}}>{filtered.length} results</div>
                    <button className="btn g" style={{padding:"5px 12px",fontSize:11}} onClick={()=>exportToExcel(transactions,splitPct)}>⬇️ Export</button>
                  </div>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{borderBottom:"1px solid #252A3A"}}>
                    {[
                      { label: "Date", key: "date" },
                      { label: "Description", key: "description" },
                      { label: "Paid By", key: "owner" },
                      { label: "Amount", key: "amount" },
                      { label: "Category", key: "category" },
                      { label: "Split", key: "splitType" },
                      { label: "", key: null }
                    ].map(({ label, key }) => (
                      <th 
                        key={label || 'action'} 
                        style={{
                          textAlign: label === "Amount" ? "right" : "left", 
                          padding: "7px 10px", 
                          color: "#6B7280", 
                          fontWeight: 600, 
                          fontSize: 10,
                          cursor: key ? "pointer" : "default",
                          userSelect: "none"
                        }}
                        onClick={() => key && handleSort(key)}
                      >
                        {label} {key && sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                      </th>
                    ))}
                  </tr></thead>
                  <tbody>{filtered.slice(0,300).map(t=>(
                    <tr key={t.id} className="tr" style={{borderBottom:"1px solid #1A1D26"}}>
                      <td style={{padding:"8px 10px",color:"#9CA3AF",fontSize:11,whiteSpace:"nowrap"}}>{t.date.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"2-digit"})}</td>
                      <td style={{padding:"8px 10px",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description||"—"}</td>
                      <td style={{padding:"8px 10px"}}>
                        <span className="badge" style={{background:(t.owner===PERSON_A.name?PERSON_A.color:PERSON_B.color)+"22",color:t.owner===PERSON_A.name?PERSON_A.color:PERSON_B.color,fontSize:10}}>{t.owner||"?"}</span>
                      </td>
                      <td className="mono" style={{textAlign:"right",padding:"8px 10px",fontWeight:700,color:"#FF6B6B",fontSize:11}}>{fmt(t.amount)}</td>
                      <td style={{padding:"8px 10px"}}>
                        {editId===t.id
                          ?<select className="inp" defaultValue={t.category} autoFocus onChange={e=>updateCategory(t.id,e.target.value)} onBlur={()=>setEditId(null)} style={{fontSize:11}}>
                            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                          </select>
                          :<span className="badge" style={{background:(CAT_COLORS[t.category]||"#778CA3")+"22",color:CAT_COLORS[t.category]||"#778CA3",cursor:"pointer",fontSize:10}} onClick={()=>setEditId(t.id)}>{t.category}</span>
                        }
                      </td>
                      <td style={{padding:"8px 10px"}}>
                        <select className="inp" value={t.splitType||"personal"} onChange={e=>updateSplitType(t.id,e.target.value)} style={{fontSize:10,padding:"2px 5px",width:"auto"}}>
                          <option value="personal">Personal</option>
                          <option value="shared">Shared</option>
                        </select>
                      </td>
                      <td style={{padding:"8px 10px"}}><button onClick={()=>setEditId(t.id)} style={{background:"none",border:"none",color:"#4B5563",cursor:"pointer",fontSize:11}}>✏️</button></td>
                    </tr>
                  ))}</tbody>
                </table>
                {filtered.length>300&&<div style={{textAlign:"center",padding:12,color:"#6B7280",fontSize:11}}>Showing 300 of {filtered.length} · Use filters to narrow</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
