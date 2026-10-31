// Famous restaurants and cafés in Egypt and the Middle East. Row: [item,
// Arabic item, portion in g, kcal, protein, carbs, fat for the whole item,
// diet] ('V' vegan, 'T' vegetarian, '' contains meat or fish).
//
// Chain menus differ by country and change often, and these are rounded
// figures from published nutrition guides: use them as a close estimate.
// lib/foods.js puts the restaurant's name in front of each item and converts
// the row to per-100 g values with the portion as the default amount.

export const BRANDS = [
  { name: "McDonald's", ar: 'ماكدونالدز', rows: [
    ['Big Mac', 'بيج ماك', 215, 550, 25, 45, 30],
    ['Big Tasty', 'بيج تيستي', 300, 839, 36, 50, 55],
    ['McChicken', 'ماك تشيكن', 143, 401, 14, 39, 21],
    ['McSpicy Chicken', 'ماك سبايسي', 190, 505, 22, 48, 25],
    ['Quarter Pounder with Cheese', 'كوارتر باوندر بالجبنة', 200, 522, 30, 42, 26],
    ['Cheeseburger', 'تشيز برجر', 119, 300, 15, 32, 13],
    ['Hamburger', 'هامبرجر', 100, 250, 12, 31, 9],
    ['Double Cheeseburger', 'دبل تشيز برجر', 165, 461, 25, 34, 25],
    ['Filet-O-Fish', 'فيليه أو فيش', 142, 391, 16, 39, 19],
    ['Chicken McNuggets (6 pieces)', 'ماك ناجتس (6 قطع)', 96, 251, 14, 15, 15],
    ['Chicken McNuggets (9 pieces)', 'ماك ناجتس (9 قطع)', 144, 383, 21, 23, 23],
    ['Fries (medium)', 'بطاطس (وسط)', 111, 327, 5, 43, 15, 'V'],
    ['Fries (large)', 'بطاطس (كبير)', 150, 432, 6, 57, 20, 'V'],
    ['Egg McMuffin', 'إيج ماك مافن', 138, 300, 17, 30, 12, 'T'],
    ['Apple Pie', 'فطيرة تفاح', 77, 235, 2, 32, 11, 'T'],
    ['McFlurry (Oreo)', 'ماك فلوري أوريو', 285, 521, 12, 80, 17, 'T'],
    ['Cola (medium, 500 ml)', 'كوكاكولا (وسط)', 500, 210, 0, 53, 0, 'V'],
  ] },

  { name: 'KFC', ar: 'كنتاكي', rows: [
    ['Original Recipe Chicken Breast', 'صدر دجاج أوريجينال', 161, 389, 39, 11, 21],
    ['Original Recipe Chicken Thigh', 'فخذ دجاج أوريجينال', 126, 283, 19, 9, 19],
    ['Hot Wings (5 pieces)', 'هوت وينجز (5 قطع)', 130, 391, 22, 15, 27],
    ['Zinger Sandwich', 'زنجر ساندويتش', 220, 530, 24, 50, 26],
    ['Mighty Zinger', 'مايتي زنجر', 300, 756, 37, 62, 40],
    ['Twister', 'تويستر', 250, 557, 26, 48, 29],
    ['Popcorn Chicken (regular)', 'بوب كورن تشيكن', 100, 366, 20, 22, 22],
    ['Chicken Strips (3 pieces)', 'ستربس دجاج (3 قطع)', 120, 330, 24, 18, 17],
    ['Fries (regular)', 'بطاطس (عادي)', 110, 320, 4, 40, 16, 'V'],
    ['Coleslaw', 'كول سلو', 100, 147, 1.5, 15, 9, 'T'],
    ['Mashed Potatoes with Gravy', 'بطاطس مهروسة بالجرافي', 100, 98, 1.5, 15, 3.5],
  ] },

  { name: 'Burger King', ar: 'برجر كينج', rows: [
    ['Whopper', 'ووبر', 270, 676, 28, 51, 40],
    ['Whopper Jr.', 'ووبر جونيور', 160, 334, 15, 28, 18],
    ['Double Whopper', 'دبل ووبر', 350, 922, 48, 52, 58],
    ['Chicken Whopper', 'تشيكن ووبر', 250, 590, 27, 53, 30],
    ['Cheeseburger', 'تشيز برجر', 128, 314, 16, 31, 14],
    ['Chicken Royale', 'تشيكن رويال', 230, 574, 21, 55, 30],
    ['Crispy Chicken Sandwich', 'ساندويتش دجاج مقرمش', 200, 501, 20, 49, 25],
    ['Long Chicken', 'لونج تشيكن', 220, 570, 16, 50, 34],
    ['Chicken Nuggets (8 pieces)', 'ناجتس دجاج (8 قطع)', 130, 346, 17, 20, 22],
    ['Onion Rings (medium)', 'حلقات بصل (وسط)', 120, 338, 4, 40, 18, 'V'],
    ['Fries (medium)', 'بطاطس (وسط)', 116, 380, 4, 43, 20, 'V'],
  ] },

  { name: "Hardee's", ar: 'هارديز', rows: [
    ['Famous Star', 'فيموس ستار', 250, 712, 29, 50, 44],
    ['Thickburger', 'ثيك برجر', 330, 805, 43, 48, 49],
    ['Chicken Fillet Sandwich', 'ساندويتش فيليه دجاج', 220, 474, 26, 52, 18],
    ['Roast Beef Sandwich', 'ساندويتش روست بيف', 190, 423, 25, 38, 19],
    ['Chicken Tenders (3 pieces)', 'تندرز دجاج (3 قطع)', 130, 332, 25, 22, 16],
    ['Crispy Curls (regular)', 'كريسبي كيرلز', 100, 329, 4, 40, 17, 'V'],
    ['Fries (medium)', 'بطاطس (وسط)', 130, 400, 5, 50, 20, 'V'],
  ] },

  { name: 'Pizza Hut', ar: 'بيتزا هت', rows: [
    ['Pan Pizza Cheese (slice)', 'بان بيتزا جبن (شريحة)', 110, 296, 13, 34, 12, 'T'],
    ['Pan Pizza Pepperoni (slice)', 'بان بيتزا بيبروني (شريحة)', 120, 336, 14, 34, 16],
    ['Pan Pizza Supreme (slice)', 'بان بيتزا سوبريم (شريحة)', 130, 345, 14, 34, 17],
    ['Thin Crust Cheese Pizza (slice)', 'بيتزا ثين كراست جبن (شريحة)', 90, 217, 10, 24, 9, 'T'],
    ['Stuffed Crust Cheese Pizza (slice)', 'بيتزا ستافد كراست جبن (شريحة)', 130, 338, 15, 38, 14, 'T'],
    ['Personal Pan Pizza (cheese)', 'بيتزا بان فردية جبن', 250, 692, 30, 80, 28, 'T'],
    ['Breadsticks (1 piece)', 'عصي الخبز (قطعة)', 45, 137, 4, 19, 5, 'T'],
    ['Chicken Alfredo Pasta', 'باستا ألفريدو دجاج', 350, 742, 30, 70, 38],
  ] },

  { name: "Domino's", ar: 'دومينوز', rows: [
    ['Cheese Pizza (slice)', 'بيتزا جبن (شريحة)', 105, 253, 11, 32, 9, 'T'],
    ['Pepperoni Pizza (slice)', 'بيتزا بيبروني (شريحة)', 115, 297, 13, 32, 13],
    ['BBQ Chicken Pizza (slice)', 'بيتزا دجاج باربكيو (شريحة)', 125, 285, 15, 36, 9],
    ['Veggie Pizza (slice)', 'بيتزا خضار (شريحة)', 120, 249, 10, 32, 9, 'T'],
    ['BBQ Chicken Wings (4 pieces)', 'أجنحة دجاج باربكيو (4 قطع)', 120, 298, 24, 10, 18],
    ['Cheesy Bread (slice)', 'خبز بالجبنة (شريحة)', 50, 146, 6, 17, 6, 'T'],
    ['Chocolate Lava Cake', 'لافا كيك شوكولاتة', 90, 349, 4, 45, 17, 'T'],
  ] },

  { name: "Papa John's", ar: 'بابا جونز', rows: [
    ['Original Crust Cheese Pizza (slice)', 'بيتزا جبن (شريحة)', 110, 283, 12, 34, 11, 'T'],
    ['Original Crust Pepperoni Pizza (slice)', 'بيتزا بيبروني (شريحة)', 115, 314, 13, 34, 14],
    ['Cheese Sticks (1 piece)', 'عصي الجبنة (قطعة)', 40, 117, 5, 13, 5, 'T'],
    ['Garlic Knots (1 piece)', 'عقد الثوم (قطعة)', 35, 110, 3, 16, 3.5, 'T'],
  ] },

  { name: 'Subway', ar: 'صب واي', rows: [
    ['Turkey Breast Sub (15 cm)', 'ساندويتش ديك رومي (15 سم)', 230, 288, 18, 46, 3.5],
    ['Chicken Teriyaki Sub (15 cm)', 'ساندويتش تيرياكي دجاج (15 سم)', 270, 385, 26, 59, 5],
    ['Roast Chicken Sub (15 cm)', 'ساندويتش دجاج مشوي (15 سم)', 250, 325, 24, 46, 5],
    ['Meatball Marinara Sub (15 cm)', 'ساندويتش كرات اللحم (15 سم)', 290, 483, 22, 56, 19],
    ['Tuna Sub (15 cm)', 'ساندويتش تونة (15 سم)', 250, 485, 20, 45, 25],
    ['Steak and Cheese Sub (15 cm)', 'ساندويتش ستيك وجبنة (15 سم)', 250, 382, 25, 48, 10],
    ['Veggie Delite Sub (15 cm)', 'ساندويتش خضار (15 سم)', 170, 234, 9, 44, 2.5, 'V'],
    ['Chocolate Chip Cookie', 'كوكيز بالشوكولاتة', 45, 210, 2, 30, 10, 'T'],
  ] },

  { name: 'Starbucks', ar: 'ستاربكس', rows: [
    ['Caffe Latte (grande, 2% milk)', 'لاتيه (جراندي)', 473, 191, 13, 19, 7, 'T'],
    ['Cappuccino (grande)', 'كابتشينو (جراندي)', 473, 143, 8, 12, 7, 'T'],
    ['Caramel Macchiato (grande)', 'كراميل ماكياتو (جراندي)', 473, 243, 10, 35, 7, 'T'],
    ['Caffe Mocha (grande)', 'موكا (جراندي)', 473, 359, 13, 43, 15, 'T'],
    ['Iced Americano (grande)', 'أيس أمريكانو (جراندي)', 473, 12, 1, 2, 0, 'V'],
    ['Caramel Frappuccino (grande)', 'فرابتشينو كراميل (جراندي)', 473, 395, 5, 60, 15, 'T'],
    ['Mocha Frappuccino (grande)', 'فرابتشينو موكا (جراندي)', 473, 382, 5, 58, 15, 'T'],
    ['Java Chip Frappuccino (grande)', 'فرابتشينو جافا تشيب (جراندي)', 473, 451, 6, 64, 19, 'T'],
    ['Hot Chocolate (grande)', 'هوت شوكولاتة (جراندي)', 473, 382, 14, 50, 14, 'T'],
    ['Chai Tea Latte (grande)', 'شاي لاتيه (جراندي)', 473, 240, 8, 42, 4.5, 'T'],
    ['Butter Croissant', 'كرواسون بالزبدة', 70, 258, 5, 28, 14, 'T'],
    ['Chocolate Chip Cookie', 'كوكيز بالشوكولاتة', 80, 369, 4, 50, 17, 'T'],
    ['Blueberry Muffin', 'مافن توت أزرق', 130, 411, 5, 55, 19, 'T'],
    ['Cheesecake (slice)', 'تشيز كيك (شريحة)', 110, 417, 7, 32, 29, 'T'],
  ] },

  { name: "Dunkin'", ar: 'دانكن', rows: [
    ['Glazed Donut', 'دونات جليز', 60, 262, 3, 31, 14, 'T'],
    ['Chocolate Frosted Donut', 'دونات شوكولاتة', 70, 278, 3, 35, 14, 'T'],
    ['Boston Kreme Donut', 'دونات بوسطن كريم', 100, 302, 4, 40, 14, 'T'],
    ['Munchkins (5 pieces)', 'مانشكنز (5 قطع)', 70, 258, 3, 30, 14, 'T'],
    ['Iced Coffee with Milk and Sugar (medium)', 'آيس كوفي بالحليب والسكر (وسط)', 500, 223, 4, 45, 3, 'T'],
    ['Bagel with Cream Cheese', 'بيجل بالجبنة الكريمي', 150, 418, 13, 60, 14, 'T'],
  ] },

  { name: 'Popeyes', ar: 'بوبايز', rows: [
    ['Spicy Chicken Sandwich', 'ساندويتش دجاج حار', 210, 690, 28, 50, 42],
    ['Chicken Tenders (3 pieces)', 'تندرز دجاج (3 قطع)', 130, 338, 24, 20, 18],
    ['Crispy Chicken Breast (1 piece)', 'صدر دجاج مقرمش (قطعة)', 160, 392, 32, 12, 24],
    ['Crispy Chicken Thigh (1 piece)', 'فخذ دجاج مقرمش (قطعة)', 140, 327, 20, 10, 23],
    ['Cajun Fries (regular)', 'بطاطس كاجون (عادي)', 110, 286, 4, 36, 14, 'V'],
    ['Biscuit', 'بسكويت', 70, 254, 4, 28, 14, 'T'],
  ] },

  { name: "Mo'men", ar: 'مؤمن', rows: [
    ['Fried Chicken (1 piece)', 'فراخ مقلية (قطعة)', 150, 350, 28, 10, 22],
    ['Grilled Chicken Sandwich', 'ساندويتش فراخ مشوية', 220, 442, 30, 40, 18],
    ['Chicken Shawarma Sandwich', 'ساندويتش شاورما فراخ', 250, 515, 32, 45, 23],
    ['Beef Burger', 'برجر لحم', 220, 550, 28, 42, 30],
    ['Kofta Sandwich', 'ساندويتش كفتة', 220, 515, 26, 42, 27],
    ['Taameya Sandwich', 'ساندويتش طعمية', 200, 447, 14, 55, 19, 'V'],
    ['Fries (medium)', 'بطاطس (وسط)', 120, 349, 4, 45, 17, 'V'],
  ] },

  { name: 'Gad', ar: 'جاد', rows: [
    ['Foul Sandwich', 'ساندويتش فول', 250, 426, 15, 60, 14, 'V'],
    ['Taameya Sandwich', 'ساندويتش طعمية', 250, 516, 15, 60, 24, 'V'],
    ['Feteer Meshaltet with Cheese', 'فطير مشلتت بالجبنة', 250, 792, 25, 65, 48, 'T'],
    ['Kofta Sandwich', 'ساندويتش كفتة', 250, 546, 28, 50, 26],
    ['Liver Sandwich', 'ساندويتش كبدة', 250, 520, 28, 50, 22],
    ['Hawawshi', 'حواوشي', 250, 694, 28, 60, 38],
    ['Koshari', 'كشري', 400, 609, 18, 105, 13, 'V'],
  ] },

  { name: 'Cook Door', ar: 'كوك دور', rows: [
    ['Beef Burger Sandwich', 'ساندويتش برجر لحم', 220, 537, 27, 42, 29],
    ['Chicken Burger Sandwich', 'ساندويتش برجر دجاج', 200, 472, 24, 40, 24],
    ['Chicken Shawarma Sandwich', 'ساندويتش شاورما دجاج', 250, 498, 30, 45, 22],
    ['Crispy Chicken Wrap', 'راب دجاج كريسبي', 240, 519, 25, 44, 27],
    ['Fries (medium)', 'بطاطس (وسط)', 120, 349, 4, 45, 17, 'V'],
  ] },

  { name: 'Zaatar w Zeit', ar: 'زعتر وزيت', rows: [
    ['Zaatar Manousheh', 'مناقيش زعتر', 120, 326, 8, 42, 14, 'V'],
    ['Cheese Manousheh', 'مناقيش جبنة', 160, 482, 20, 42, 26, 'T'],
    ['Halloumi Manousheh', 'مناقيش حلوم', 170, 520, 25, 42, 28, 'T'],
    ['Lahm Bi Ajeen', 'لحم بعجين', 180, 447, 20, 40, 23],
    ['Falafel Sandwich', 'ساندويتش فلافل', 220, 478, 14, 56, 22, 'V'],
    ['Chicken Shawarma Sandwich', 'ساندويتش شاورما دجاج', 240, 498, 30, 44, 22],
    ['Hummus Plate (small)', 'طبق حمص (صغير)', 150, 334, 12, 22, 22, 'V'],
  ] },

  { name: 'Cinnabon', ar: 'سينابون', rows: [
    ['Classic Roll', 'كلاسيك رول', 300, 868, 10, 126, 36, 'T'],
    ['MiniBon', 'ميني بون', 120, 342, 4, 50, 14, 'T'],
  ] },
]
