const RULES = [
  ["Subscriptions", [/netflix/,/spotify/,/hulu/,/disney\+/,/disney plus/,/hbo/,/apple tv/,/paramount/,/peacock/,/youtube premium/,/amazon prime/,/prime video/,/crunchyroll/,/adobe/,/microsoft 365/,/office 365/,/dropbox/,/icloud/,/google one/,/patreon/,/substack/,/duolingo/,/headspace/,/grammarly/,/1password/,/nordvpn/,/audible/,/kindle unlimited/,/apple music/,/tidal/,/playstation plus/,/xbox game pass/,/nintendo online/,/annual fee/,/monthly plan/,/yearly plan/,/subscription/]],
  ["Groceries",     [/walmart/,/wal-mart/,/costco/,/sam.s club/,/kroger/,/safeway/,/publix/,/whole foods/,/trader joe/,/aldi/,/lidl/,/wegmans/,/stop & shop/,/stop and shop/,/market basket/,/hannaford/,/shaws/,/harris teeter/,/h-e-b/,/heb/,/meijer/,/giant food/,/food lion/,/fresh market/,/sprouts/,/natural grocers/,/supermarket/,/grocery/,/fresh fare/,/food mart/,/target/]],
  ["Food & Dining", [/restaurant/,/cafe/,/coffee/,/starbucks/,/dunkin/,/mcdonald/,/burger king/,/wendy.s/,/taco bell/,/chipotle/,/subway/,/pizza/,/domino/,/papa john/,/kfc/,/popeyes/,/chick-fil/,/five guys/,/shake shack/,/panera/,/jimmy john/,/olive garden/,/applebee.s/,/chili.s/,/red lobster/,/outback/,/ihop/,/denny.s/,/waffle house/,/cheesecake factory/,/buffalo wild wings/,/doordash/,/uber eats/,/grubhub/,/postmates/,/caviar/,/sushi/,/ramen/,/noodle/,/grill/,/diner/,/bistro/,/steakhouse/,/bbq/,/pub/,/tavern/,/eatery/,/bakery/,/donut/,/bagel/,/smoothie/,/boba/,/ice cream/]],
  ["Transport",     [/uber/,/lyft/,/taxi/,/yellow cab/,/mbta/,/mta/,/bart/,/cta/,/wmata/,/transit/,/bus pass/,/train ticket/,/amtrak/,/shell/,/exxon/,/bp /,/chevron/,/sunoco/,/speedway/,/circle k/,/gas station/,/fuel/,/petrol/,/parking/,/parkway/,/garage fee/,/spothero/,/toll/,/e-zpass/,/sunpass/,/zipcar/,/enterprise rent/,/hertz/,/avis/,/budget car/]],
  ["Travel",        [/delta air/,/united air/,/american air/,/southwest air/,/jetblue/,/spirit air/,/frontier air/,/alaska air/,/lufthansa/,/british airways/,/airline/,/flight/,/airport/,/marriott/,/hilton/,/hyatt/,/ihg/,/best western/,/wyndham/,/sheraton/,/westin/,/ritz carlton/,/four seasons/,/holiday inn/,/hampton inn/,/la quinta/,/airbnb/,/vrbo/,/booking\.com/,/expedia/,/hotels\.com/,/priceline/,/kayak/,/trivago/,/travelocity/,/carnival cruise/,/royal caribbean/,/global entry/,/tsa precheck/]],
  ["Entertainment", [/amc theatres/,/regal cinema/,/cinemark/,/movie theater/,/cinema/,/ticketmaster/,/stubhub/,/eventbrite/,/seatgeek/,/livenation/,/live nation/,/concert/,/broadway/,/museum/,/zoo/,/aquarium/,/theme park/,/steam/,/playstation store/,/xbox store/,/nintendo eshop/,/epic games/,/blizzard/,/bowling/,/minigolf/,/escape room/,/laser tag/,/golf course/,/country club/]],
  ["Health & Medical",[/cvs pharmacy/,/walgreens/,/rite aid/,/duane reade/,/pharmacy/,/drug store/,/prescription/,/hospital/,/medical center/,/urgent care/,/emergency room/,/doctor/,/physician/,/clinic/,/labcorp/,/quest diagnostics/,/dentist/,/dental/,/orthodont/,/optometrist/,/vision center/,/eye exam/,/therapy/,/therapist/,/counseling/,/psychiatr/,/mental health/,/chiropractor/,/physical therapy/,/planet fitness/,/equinox/,/la fitness/,/anytime fitness/,/ymca/,/24 hour fitness/,/orange theory/,/crossfit/,/gold.s gym/,/gym/,/peloton/,/yoga studio/,/pilates/]],
  ["Utilities",     [/verizon/,/at&t/,/t-mobile/,/sprint/,/metro pcs/,/boost mobile/,/spectrum/,/comcast/,/xfinity/,/cox communication/,/optimum/,/altice/,/centurylink/,/frontier communication/,/electric/,/electricity/,/eversource/,/national grid/,/pge/,/pg&e/,/con ed/,/consolidated edison/,/duke energy/,/dominion energy/,/gas company/,/natural gas/,/gas bill/,/water bill/,/water utility/,/sewer/,/waste management/,/utility/,/internet bill/,/cable bill/,/phone bill/]],
  ["Education",     [/tuition/,/university/,/college/,/school fee/,/udemy/,/coursera/,/skillshare/,/linkedin learning/,/pluralsight/,/codecademy/,/khan academy/,/chegg/,/tutoring/,/textbook/,/bookstore/,/student loan/,/sallie mae/,/navient/,/daycare/,/preschool/]],
  ["Personal Care", [/sephora/,/ulta beauty/,/bath & body/,/lush cosmetics/,/salon/,/hair salon/,/barber/,/nail salon/,/nail spa/,/waxing/,/spa/,/massage/,/beauty/,/skincare/,/makeup/,/great clips/,/sport clips/,/supercuts/,/laser hair/,/botox/,/medspa/]],
  ["Home & Living", [/home depot/,/lowe.s/,/menards/,/ace hardware/,/true value/,/harbor freight/,/ikea/,/wayfair/,/overstock/,/bed bath/,/crate & barrel/,/pottery barn/,/west elm/,/restoration hardware/,/rent payment/,/rent check/,/lease/,/property management/,/mortgage/,/hoa fee/,/cleaning service/,/maid service/,/pest control/,/exterminator/,/hvac/,/plumber/,/electrician/,/storage unit/,/extra space storage/,/u-haul/,/furniture/,/mattress/]],
  ["Insurance",     [/geico/,/progressive insurance/,/allstate/,/state farm/,/farmers insurance/,/liberty mutual/,/nationwide insurance/,/usaa/,/travelers insurance/,/aetna/,/cigna/,/humana/,/united health/,/anthem/,/blue cross/,/bcbs/,/kaiser permanente/,/metlife/,/prudential/,/new york life/,/auto insurance/,/car insurance/,/home insurance/,/renters insurance/,/life insurance/,/insurance premium/]],
  ["Shopping",      [/amazon/,/ebay/,/etsy/,/wish\.com/,/temu/,/shein/,/aliexpress/,/zara/,/h&m/,/gap/,/old navy/,/banana republic/,/j\.crew/,/nordstrom/,/macy.s/,/bloomingdale/,/saks/,/neiman marcus/,/tj maxx/,/marshalls/,/ross stores/,/burlington/,/best buy/,/apple store/,/apple\.com/,/microsoft store/,/chewy/,/petco/,/petsmart/,/lululemon/,/athleta/,/under armour/,/nike\.com/,/adidas\.com/,/autozone/,/advance auto/,/dollar tree/,/dollar general/,/family dollar/,/five below/,/victoria.s secret/]],
  ["Gifts & Donations",[/gofundme/,/charity/,/donation/,/nonprofit/,/red cross/,/salvation army/,/unicef/,/1-800-flowers/,/ftd flowers/,/teleflora/,/edible arrangements/,/hallmark/,/gift card/]],
  ["Finance & Fees",[/late fee/,/overdraft/,/nsf fee/,/atm fee/,/atm withdrawal/,/wire transfer/,/wire fee/,/foreign transaction/,/interest charge/,/finance charge/,/cash advance/,/account fee/,/service fee/,/paypal fee/,/venmo fee/,/bank transfer/,/ach transfer/]],
];

// Escapes a user-provided string so it can be safely embedded in a RegExp
// without any character being interpreted as a regex metacharacter.
// Use this whenever a custom rule keyword needs to participate in a regex context.
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Applies custom rules to a description using literal string matching (not regex),
// so characters like . ( ) * + have no special meaning in user keywords.
export function applyCustomRules(description, customRules) {
  const d = description.toLowerCase();
  for (const r of customRules) {
    if (d.includes(r.keyword.toLowerCase())) return r.category;
  }
  return null;
}

export function smartCategory(desc) {
  if (!desc) return "Other";
  const d = desc.toLowerCase().replace(/[^\w\s&.'/\-]/g, " ");
  for (const [cat, patterns] of RULES) {
    for (const p of patterns) {
      if (p.test(d)) return cat;
    }
  }
  return "Other";
}

import { categorizeWithAI, hasAIKey } from "../services/aiCategorizerService";

export async function smartCategoryAI(transactions, options = {}) {
  const others = transactions.filter((t) => t.category === "Other");
  if (!others.length || !hasAIKey()) return transactions;

  const descriptions = others.map((t) => t.description);
  const aiMap = await categorizeWithAI(descriptions, options);
  return transactions.map((t) =>
    t.category === "Other" && aiMap[t.description]
      ? { ...t, category: aiMap[t.description] }
      : t
  );
}
