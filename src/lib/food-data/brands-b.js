// More restaurants, and more items for restaurants already in brands.js
// (entries with the same name are merged). Same row format and the same
// caveat: rounded estimates, menus differ by country.

export const BRANDS_B = [
  { name: "McDonald's", ar: 'ماكدونالدز', rows: [
    ['Grand Chicken Special', 'جراند تشيكن سبيشال', 250, 600, 28, 50, 32],
    ['Chicken Big Mac', 'تشيكن بيج ماك', 230, 549, 24, 48, 29],
    ['McRoyale', 'ماك رويال', 220, 586, 30, 40, 34],
    ['McWrap Chicken', 'ماك راب دجاج', 220, 478, 25, 45, 22],
    ['Mozzarella Sticks (3 pieces)', 'أصابع موزاريلا (3 قطع)', 60, 182, 8, 15, 10, 'T'],
    ['Hot Fudge Sundae', 'صنداي هوت فدج', 170, 314, 6, 50, 10, 'T'],
  ] },
  { name: 'KFC', ar: 'كنتاكي', rows: [
    ['Boneless Chicken (3 pieces)', 'قطع دجاج بدون عظم (3 قطع)', 120, 297, 20, 16, 17],
    ['Fillet Burger', 'فيليه برجر', 200, 474, 24, 45, 22],
  ] },
  { name: 'Burger King', ar: 'برجر كينج', rows: [
    ['Chicken Tenders (5 pieces)', 'تندرز دجاج (5 قطع)', 150, 345, 24, 24, 17],
    ['Fish Sandwich', 'ساندويتش سمك', 200, 456, 18, 42, 24],
  ] },
  { name: 'Subway', ar: 'صب واي', rows: [
    ['Chicken Slice Sub (15 cm)', 'ساندويتش شرائح دجاج (15 سم)', 230, 296, 20, 45, 4],
    ['Turkey Breast Sub (30 cm)', 'ساندويتش ديك رومي (30 سم)', 460, 575, 36, 92, 7],
  ] },
  { name: 'Starbucks', ar: 'ستاربكس', rows: [
    ['Vanilla Latte (grande)', 'فانيلا لاتيه (جراندي)', 473, 250, 12, 37, 6, 'T'],
    ['Flat White (grande)', 'فلات وايت (جراندي)', 473, 210, 12, 18, 10, 'T'],
    ['Iced Latte (grande)', 'آيس لاتيه (جراندي)', 473, 129, 8, 13, 5, 'T'],
    ['Matcha Latte (grande)', 'ماتشا لاتيه (جراندي)', 473, 234, 11, 34, 6, 'T'],
    ['Cold Brew (grande)', 'كولد برو (جراندي)', 473, 5, 0, 0, 0, 'V'],
    ['Chocolate Croissant', 'كرواسون شوكولاتة', 90, 329, 6, 38, 17, 'T'],
  ] },
  { name: "Dunkin'", ar: 'دانكن', rows: [
    ['Chocolate Muffin', 'مافن شوكولاتة', 120, 427, 6, 58, 19, 'T'],
  ] },
  { name: 'Pizza Hut', ar: 'بيتزا هت', rows: [
    ['Veggie Lover Pan Pizza (slice)', 'بيتزا فيجي لافر (شريحة)', 125, 283, 12, 34, 11, 'T'],
    ['Chicken Supreme Pan Pizza (slice)', 'بيتزا تشيكن سوبريم (شريحة)', 130, 322, 15, 34, 14],
    ['Chicken Wings (6 pieces)', 'أجنحة دجاج (6 قطع)', 150, 376, 30, 10, 24],
    ['Cheesy Garlic Bread (1 piece)', 'خبز بالثوم والجبنة (قطعة)', 60, 189, 7, 20, 9, 'T'],
    ['Bolognese Pasta', 'باستا بولونيز', 350, 560, 25, 70, 20],
  ] },
  { name: "Domino's", ar: 'دومينوز', rows: [
    ['Supreme Pizza (slice)', 'بيتزا سوبريم (شريحة)', 130, 301, 13, 33, 13],
    ['Chicken Alfredo Pasta', 'باستا ألفريدو دجاج', 300, 560, 26, 60, 24],
    ['Garlic Bread Sticks (2 pieces)', 'أصابع الثوم (قطعتان)', 60, 187, 5, 26, 7, 'T'],
  ] },
  { name: "Mo'men", ar: 'مؤمن', rows: [
    ['Crispy Chicken Sandwich', 'ساندويتش دجاج كريسبي', 210, 480, 24, 42, 24],
    ['Chicken Nuggets (6 pieces)', 'ناجتس دجاج (6 قطع)', 100, 285, 15, 18, 17],
  ] },
  { name: 'Gad', ar: 'جاد', rows: [
    ['Chicken Shawarma Sandwich', 'ساندويتش شاورما فراخ', 250, 515, 32, 45, 23],
    ['Basbousa (1 piece)', 'بسبوسة (قطعة)', 80, 304, 4, 45, 12, 'T'],
    ['Feteer with Honey', 'فطير بالعسل', 200, 694, 8, 80, 38, 'T'],
  ] },

  { name: 'Baskin-Robbins', ar: 'باسكن روبنز', rows: [
    ['Vanilla Ice Cream (1 scoop)', 'آيس كريم فانيليا (سكوب)', 90, 205, 3.5, 23, 11, 'T'],
    ['Chocolate Ice Cream (1 scoop)', 'آيس كريم شوكولاتة (سكوب)', 90, 219, 4, 26, 11, 'T'],
    ['Cookies and Cream Ice Cream (1 scoop)', 'آيس كريم كوكيز وكريمة (سكوب)', 90, 236, 4, 28, 12, 'T'],
    ['Chocolate Milkshake (medium)', 'ميلك شيك شوكولاتة (وسط)', 450, 624, 14, 88, 24, 'T'],
    ['Waffle Cone', 'كون وافل', 20, 69, 1, 14, 1, 'T'],
  ] },

  { name: 'Costa Coffee', ar: 'كوستا كوفي', rows: [
    ['Latte (medium)', 'لاتيه (وسط)', 400, 177, 10, 14, 9, 'T'],
    ['Cappuccino (medium)', 'كابتشينو (وسط)', 400, 143, 8, 12, 7, 'T'],
    ['Flat White', 'فلات وايت', 300, 152, 9, 11, 8, 'T'],
    ['Mocha (medium)', 'موكا (وسط)', 400, 333, 12, 42, 13, 'T'],
    ['Hot Chocolate (medium)', 'هوت شوكولاتة (وسط)', 400, 382, 14, 50, 14, 'T'],
    ['Chocolate Muffin', 'مافن شوكولاتة', 130, 484, 7, 60, 24, 'T'],
    ['Butter Croissant', 'كرواسون بالزبدة', 70, 258, 5, 28, 14, 'T'],
  ] },

  { name: 'Krispy Kreme', ar: 'كريسبي كريم', rows: [
    ['Original Glazed Donut', 'دونات جليز أوريجينال', 49, 195, 2, 22, 11, 'T'],
    ['Chocolate Iced Glazed Donut', 'دونات جليز شوكولاتة', 63, 252, 2, 34, 12, 'T'],
    ['Kreme-Filled Donut', 'دونات محشي كريمة', 80, 303, 4, 38, 15, 'T'],
  ] },

  { name: 'Abou Tarek', ar: 'أبو طارق', rows: [
    ['Koshari (small)', 'كشري (صغير)', 250, 400, 11, 69, 8.5, 'V'],
    ['Koshari (medium)', 'كشري (وسط)', 350, 560, 16, 96, 12, 'V'],
    ['Koshari (large)', 'كشري (كبير)', 450, 720, 20, 124, 15, 'V'],
  ] },

  { name: "Nando's", ar: 'ناندوز', rows: [
    ['Peri-Peri Chicken (quarter)', 'ربع دجاج بيري بيري', 250, 368, 45, 2, 20],
    ['Peri-Peri Chicken (half)', 'نصف دجاج بيري بيري', 500, 732, 90, 3, 40],
    ['Chicken Wrap', 'راب دجاج', 300, 585, 40, 50, 25],
    ['Peri Chips (regular)', 'بطاطس بيري بيري (عادي)', 200, 462, 6, 60, 22, 'V'],
    ['Spicy Rice', 'أرز حار', 200, 295, 6, 52, 7, 'V'],
    ['Corn on the Cob', 'ذرة على الكوز', 150, 155, 4, 28, 3, 'V'],
  ] },
]
