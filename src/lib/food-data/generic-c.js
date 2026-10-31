// Generic foods, part 3: more cuts, cooking variants and regional foods.
// Same row format as generic-a.js (values per 100 g).

export const GENERIC_C = [
  { type: 'meat', diet: '', rows: [
    ['Chicken Drumstick (cooked, with skin)', 'ورك دجاج (مطبوخ، بالجلد)', 216, 27, 0, 11.2, 0],
    ['Chicken Hearts (cooked)', 'قلوب دجاج (مطبوخة)', 185, 26.4, 0.1, 8, 0],
    ['Chicken Breast (fried, breaded)', 'صدر دجاج بانيه (مقلي)', 260, 24, 12, 13, 150],
    ['Chicken Sausage', 'نقانق دجاج', 200, 14, 4, 14, 0],
    ['Chicken Mortadella', 'مرتديلا دجاج', 200, 12, 6, 14, 30],
    ['Chicken Luncheon Meat', 'لانشون دجاج', 190, 12, 5, 13, 30],
    ['Beef Hot Dog Sausage', 'سجق هوت دوج (بقري)', 290, 11, 3, 26, 50],
    ['Beef Salami', 'سلامي بقري', 336, 20, 2, 28, 0],
    ['Beef Short Ribs (cooked)', 'ضلوع بقري (مطبوخة)', 333, 26, 0, 25, 0],
    ['Beef Brisket (cooked)', 'صدر بقري (مطبوخ)', 253, 29, 0, 14, 0],
    ['Beef Shank (cooked)', 'مفصلة بقري (مطبوخة)', 210, 31, 0, 9, 0],
    ['Lamb Ribs (cooked)', 'ريش وضلوع ضأن (مطبوخة)', 310, 25, 0, 23, 0],
    ['Beef Meatballs (cooked)', 'كرات لحم بقري (مطبوخة)', 221, 18, 8, 13, 0],
    ['Chicken Broth', 'مرق دجاج', 7, 0.6, 0.4, 0.2, 240],
    ['Beef Bone Broth', 'مرق عظام بقري', 15, 3, 0, 0.5, 240],
  ] },

  { type: 'seafood', diet: '', rows: [
    ['Sardines (grilled)', 'سردين مشوي', 185, 24, 0, 9.5, 0],
    ['White Fish Fillet (raw)', 'فيليه سمك أبيض (نيء)', 82, 18, 0, 0.7, 0],
    ['Tuna Steak (cooked)', 'ستيك تونة (مطبوخ)', 184, 29.9, 0, 6.3, 0],
    ['Trout (cooked)', 'سمك الترويت (مطبوخ)', 168, 24, 0, 7.2, 0],
    ['Herring (cooked)', 'رنجة طازجة (مطبوخة)', 203, 23, 0, 11.6, 0],
    ['Shrimp (fried, breaded)', 'جمبري مقرمش (مقلي)', 233, 12, 17, 13, 0],
    ['Crab Meat (canned)', 'لحم سلطعون (معلب)', 84, 18, 0.1, 0.7, 0],
    ['Clams (cooked)', 'بلح بحر صدفي (مطبوخ)', 148, 25.6, 5.1, 2, 0],
    ['Salted Dried Fish (Moleha)', 'سمك مملح مجفف (ملوحة)', 290, 62.8, 0, 2.4, 0],
  ] },

  { type: 'dairy', diet: 'T', rows: [
    ['Poached Egg', 'بيض بشوت', 143, 12.5, 0.7, 9.5, 50],
    ['Low-Salt White Cheese', 'جبنة بيضاء قليلة الملح', 240, 16, 3, 18, 30],
    ['Istanbuli Cheese', 'جبنة اسطنبولي', 305, 18, 2, 25, 30],
    ['Blue Cheese (Roquefort)', 'جبنة زرقاء (روكفورد)', 353, 21.4, 2.3, 28.7, 30],
    ['Goat Cheese', 'جبنة ماعز', 364, 21.6, 0.1, 29.8, 30],
    ['Camembert Cheese', 'جبنة كممبير', 300, 19.8, 0.5, 24.3, 30],
    ['String Cheese', 'جبنة مجدولة (سترينج)', 292, 25, 3, 20, 28],
    ['Ayran (yogurt drink)', 'عيران', 34, 1.7, 2.1, 2.1, 250],
    ['Strained Yogurt (Zabadi Mazboot)', 'زبادي مصفى', 115, 8, 5, 7, 150],
  ] },

  { type: 'grains', diet: 'V', rows: [
    ['Toast Bread (toasted)', 'توست (محمص)', 308, 10, 58, 4, 25],
    ['Eish Shamsi', 'عيش شمسي', 245, 8, 50, 1.5, 80],
    ['Bread Roll', 'عيش رولز', 281, 9, 50, 5, 45],
    ['Pita Chips', 'شيبس عيش شامي', 460, 10, 60, 20, 0],
    ['Egyptian Rice (cooked with oil)', 'أرز مصري (مطبوخ بالزيت)', 152, 3, 25, 4.5, 180],
    ['Corn Tortilla', 'تورتيلا ذرة', 233, 5.7, 45.9, 2.9, 25],
    ['Millet (cooked)', 'دخن (مطبوخ)', 118, 3.5, 23.7, 1, 0],
    ['Buckwheat (cooked)', 'قمح أسود (مطبوخ)', 92, 3.4, 19.9, 0.6, 0],
  ] },

  { type: 'legumes', diet: 'V', rows: [
    ['Lentils (canned)', 'عدس (معلب)', 96, 7, 16, 0.4, 0],
    ['Green Peas (canned)', 'بسلة (معلبة)', 68, 4, 12, 0.4, 0],
  ] },

  { type: 'veg', diet: 'V', rows: [
    ['Crispy Fried Onions', 'بصل مقرمش مقلي', 501, 6, 45, 33, 0],
    ['Caramelized Onions', 'بصل مكرمل', 115, 1.5, 16, 5, 0],
    ['Mixed Vegetables (cooked)', 'خضار مشكل (مطبوخ)', 70, 3.3, 13, 0.5, 0],
    ['Bean Sprouts', 'براعم الفول (سوجا)', 30, 3, 5.9, 0.2, 0],
    ['Seaweed (Nori)', 'عشب البحر (نوري)', 35, 5.8, 5.1, 0.3, 0],
    ['Pumpkin (cooked)', 'قرع عسلي (مطبوخ)', 20, 0.7, 4.9, 0.1, 0],
    ['Sweet Potato (boiled)', 'بطاطا حلوة (مسلوقة)', 76, 1.4, 17.7, 0.1, 130],
    ['French Fries (frozen, oven-baked)', 'بطاطس مجمدة (في الفرن)', 160, 2.7, 26, 5, 0],
  ] },

  { type: 'fruit', diet: 'V', rows: [
    ['Lime', 'ليمون أخضر (لايم)', 30, 0.7, 10.5, 0.2, 0],
    ['Dragon Fruit', 'دراجون فروت', 60, 1.2, 13, 0.4, 0],
    ['Cranberries (fresh)', 'توت بري (كرانبيري)', 46, 0.4, 12, 0.1, 0],
    ['Dried Mango', 'مانجو مجففة', 319, 2.5, 78, 1.2, 0],
    ['Ajwa Dates', 'تمر عجوة', 280, 2.5, 75, 0.4, 24],
    ['Banana Chips', 'شيبس موز', 519, 2.3, 58, 34, 0],
    ['Mixed Berries (frozen)', 'توت مشكل (مجمد)', 50, 0.8, 12, 0.3, 0],
    ['Starfruit (Carambola)', 'كارامبولا', 31, 1, 6.7, 0.3, 0],
    ['Custard Apple (Ashta fruit)', 'قشطة (فاكهة)', 94, 2.1, 23.6, 0.3, 0],
  ] },

  { type: 'nuts', diet: 'V', rows: [
    ['Cashew Butter', 'زبدة الكاجو', 587, 17.6, 27.6, 49.4, 16],
  ] },

  { type: 'fats', diet: 'V', rows: [
    ['Garlic Mayonnaise', 'مايونيز بالثوم', 650, 1.2, 3, 70, 14, 'T'],
    ['Cheese Sauce', 'صلصة جبنة', 146, 6, 8, 10, 30, 'T'],
    ['Chocolate Syrup', 'شراب شوكولاتة', 255, 1.5, 60, 1, 20],
    ['Caramel Sauce', 'صلصة كراميل', 329, 1, 70, 5, 20, 'T'],
  ] },

  { type: 'sweets', diet: 'T', rows: [
    ['Vanilla Sponge Cake', 'كيك إسفنجي (فانيليا)', 295, 4.1, 45, 11, 70],
    ['Carrot Cake', 'كيك جزر', 423, 4.3, 52, 22, 90],
    ['Red Velvet Cake', 'ريد فيلفت كيك', 378, 4, 50, 18, 90],
    ['Tiramisu', 'تيراميسو', 275, 5, 30, 15, 120],
    ['Chocolate Mousse', 'موس شوكولاتة', 229, 4, 24, 13, 100],
    ['Eclair', 'إكلير', 264, 6, 24, 16, 80],
    ['Profiteroles', 'بروفيترول', 321, 5, 28, 21, 60],
    ['Fruit Tart', 'تارت فواكه', 249, 3, 30, 13, 100],
    ['Macarons', 'ماكرون', 412, 7, 60, 16, 0],
    ['Biscoff Cookie Spread', 'لوتس بسكويت (للدهن)', 549, 3, 60, 33, 15],
    ['Chocolate Croissant', 'كرواسون شوكولاتة', 415, 7, 45, 23, 70],
  ] },

  { type: 'drinks', diet: 'V', rows: [
    ['Sparkling Water', 'مياه غازية (بدون سعرات)', 0, 0, 0, 0, 330],
    ['Iced Tea (sweetened)', 'شاي مثلج (محلى)', 30, 0, 7.5, 0, 330],
    ['Sports Drink', 'مشروب رياضي', 26, 0, 6.5, 0, 500],
    ['Hot Milk with Honey', 'حليب ساخن بالعسل', 91, 3.2, 14, 2.5, 250, 'T'],
    ['Karak Tea (spiced milk tea)', 'شاي كرك', 71, 2, 9, 3, 200, 'T'],
    ['Mango Smoothie', 'سموذي مانجو', 72, 1, 16, 0.5, 350, 'T'],
    ['Date Smoothie (dates and milk)', 'عصير تمر بالحليب', 106, 3, 19, 2, 300, 'T'],
  ] },

  { type: 'snacks', diet: 'T', rows: [
    ['Cheese Crackers', 'بسكويت بالجبنة', 493, 10, 57, 25, 30],
    ['Swiss Roll Cake', 'سويس رول', 346, 5, 50, 14, 40],
    ['Chocolate-Filled Croissant Snack', 'كرواسون محشي شوكولاتة (جاهز)', 400, 7, 48, 20, 50],
    ['Date-Filled Cookies', 'بسكويت محشي بالتمر', 380, 4, 65, 11, 0],
  ] },
]
