// Language support: English (default) and Arabic (right-to-left).
//
// Every UI string is written in English in the code and passed through t().
// The English text is the key, so a missing translation simply shows English.
// {name} placeholders are filled from the second argument:
//   t('Delete {name}?', { name: 'Oats' })
//
// App sets the language once per render (setLanguage) before any screen
// renders, so components can call t() directly without props or context.
// Stored values (sex, activity, goal, food names) stay in English; only what
// is displayed is translated.

export const LANGUAGES = { en: 'English', ar: 'العربية' }

let current = 'en'

export const setLanguage = (lang) => { current = lang === 'ar' ? 'ar' : 'en' }
export const isRTL = () => current === 'ar'

/** Locale for dates: Arabic month/day names, but Western digits like the rest of the app. */
export const locale = () => (current === 'ar' ? 'ar-u-nu-latn' : undefined)

export const t = (text, vars) => {
  const out = (current === 'ar' && AR[text]) || text
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : out
}

const AR = {
  // ---- Units & macro initials ----
  kcal: 'سعرة',
  g: 'غ',
  kg: 'كغ',
  cm: 'سم',
  yrs: 'سنة',
  P: 'ب',
  C: 'ك',
  F: 'د',

  // ---- Tabs & common ----
  Home: 'الرئيسية',
  Analytics: 'الإحصائيات',
  Weight: 'الوزن',
  Profile: 'الملف الشخصي',
  'Log a meal': 'سجّل وجبة',
  Save: 'حفظ',
  Cancel: 'إلغاء',
  Close: 'إغلاق',
  Delete: 'حذف',
  Remove: 'إزالة',
  Protein: 'البروتين',
  Carbs: 'الكربوهيدرات',
  Fats: 'الدهون',
  Calories: 'السعرات',
  Goal: 'الهدف',
  'Goal {n}': 'الهدف {n}',
  'Edit {name}': 'تعديل {name}',
  'Delete {name}': 'حذف {name}',
  'Delete {name}?': 'حذف {name}؟',
  'Add {name}': 'إضافة {name}',
  'Remove {name}': 'إزالة {name}',
  'Less {name}': 'تقليل {name}',
  'More {name}': 'زيادة {name}',
  'Grams of {name}': 'غرامات {name}',
  'Template name': 'اسم القالب',
  'kcal left': 'سعرة متبقية',
  'kcal over': 'سعرة زائدة',

  // ---- Home ----
  'Open profile': 'فتح الملف الشخصي',
  'Current Day': 'اليوم الحالي',
  'Viewing': 'عرض',
  'Pick a date': 'اختر تاريخاً',
  'Back to current day': 'العودة لليوم الحالي',
  'Previous week': 'الأسبوع السابق',
  'Next week': 'الأسبوع التالي',
  'Editing a past day. Changes update your Analytics.': 'تعديل يوم سابق. تُحدَّث التحليلات بالتغييرات.',
  Eaten: 'المستهلك',
  Macros: 'المغذيات',
  'Recent Meals': 'الوجبات الأخيرة',
  'No meals logged for this day yet.': 'لم تسجّل أي وجبة لهذا اليوم بعد.',
  'Save {name} as a template': 'حفظ {name} كقالب',
  'Start New Day': 'ابدأ يوماً جديداً',
  'Meals keep counting towards {day} until you start a new day.':
    'تُحتسب الوجبات ضمن {day} حتى تبدأ يوماً جديداً.',
  'Save as meal template': 'حفظ كقالب وجبة',
  '1 item. Find it under My Items when you log a meal.': 'عنصر واحد. ستجده في «عناصري» عند تسجيل وجبة.',
  '{n} items. Find it under My Items when you log a meal.':
    'عدد العناصر: {n}. ستجده في «عناصري» عند تسجيل وجبة.',
  'Start a new day?': 'بدء يوم جديد؟',
  "This finishes {day} ({kcal} kcal, 1 meal) and clears the dashboard and meal list. It can't be undone.":
    'سيُنهي هذا {day} ({kcal} سعرة، وجبة واحدة) ويمسح لوحة المتابعة وقائمة الوجبات. لا يمكن التراجع عن ذلك.',
  "This finishes {day} ({kcal} kcal, {n} meals) and clears the dashboard and meal list. It can't be undone.":
    'سيُنهي هذا {day} ({kcal} سعرة، عدد الوجبات: {n}) ويمسح لوحة المتابعة وقائمة الوجبات. لا يمكن التراجع عن ذلك.',

  // ---- Analytics ----
  'Time interval': 'الفترة الزمنية',
  Week: 'أسبوع',
  Month: 'شهر',
  '6 Months': '6 أشهر',
  Year: 'سنة',
  'Weekly Total': 'مجموع الأسبوع',
  'Period Total': 'مجموع الفترة',
  'Calories Burned': 'السعرات المحروقة',
  'of {n} maintenance': 'من {n} للثبات',
  'No finished days yet': 'لا توجد أيام منتهية بعد',
  'Average Calories per Day, by Month': 'متوسط السعرات اليومية حسب الشهر',
  'Calories per Day': 'السعرات في اليوم',
  'Tap a day to see its details or delete it.': 'اضغط على يوم لعرض تفاصيله أو حذفه.',
  'No meals logged on this day.': 'لا توجد وجبات مسجّلة في هذا اليوم.',
  '1 meal': 'وجبة واحدة',
  '{n} meals': '{n} وجبات',
  'Delete Day': 'حذف اليوم',
  'Cheat Day': 'يوم حر',
  'Mark as Cheat Day': 'تحديد كيوم حر',
  'Unmark Cheat Day': 'إلغاء تحديد اليوم الحر',
  'Started a new day by mistake? Deleting this day takes you back to {prev}.':
    'بدأت يوماً جديداً بالخطأ؟ حذف هذا اليوم يعيدك إلى {prev}.',
  "This deletes {day} ({meals}) and makes {prev} your current day again, so you can keep logging there. It can't be undone.":
    'سيُحذف {day} ({meals}) ويعود {prev} ليكون يومك الحالي لتكمل التسجيل فيه. لا يمكن التراجع عن ذلك.',
  "This permanently deletes {day} and the {meals} logged on it. It can't be undone.":
    'سيُحذف {day} نهائياً مع الوجبات المسجّلة فيه ({meals}). لا يمكن التراجع عن ذلك.',

  // ---- Weight ----
  Current: 'الحالي',
  Change: 'التغيّر',
  'Log Weight': 'سجّل الوزن',
  Date: 'التاريخ',
  'Save Entry': 'حفظ الإدخال',
  Trend: 'المنحنى',
  'Your trend line appears after your first entry.': 'يظهر منحنى وزنك بعد أول إدخال.',
  History: 'السجل',
  'Delete entry': 'حذف الإدخال',
  'Weight trend': 'منحنى الوزن',

  // ---- Profile ----
  "That image couldn't be loaded. Try a JPEG or PNG.": 'تعذّر تحميل الصورة. جرّب صورة JPEG أو PNG.',
  'Change profile picture': 'تغيير صورة الملف الشخصي',
  'Your name': 'اسمك',
  'Change Photo': 'تغيير الصورة',
  'Add Photo': 'إضافة صورة',
  'Remove Photo': 'إزالة الصورة',
  'Personal Info': 'المعلومات الشخصية',
  Name: 'الاسم',
  Age: 'العمر',
  Appearance: 'المظهر',
  System: 'النظام',
  Dark: 'داكن',
  Light: 'فاتح',
  Language: 'اللغة',
  'Plan & Goals': 'الخطة والأهداف',
  'TDEE calculator · {kcal} kcal · {protein} g protein': 'حاسبة الاحتياج اليومي · {kcal} سعرة · {protein} غ بروتين',

  // ---- Backup & Restore ----
  'Backup & Restore': 'النسخ الاحتياطي والاستعادة',
  'Your data lives only on this device. Save a backup file to keep it safe.': 'بياناتك محفوظة على هذا الجهاز فقط. احفظ نسخة احتياطية للحفاظ عليها.',
  'Back Up Data': 'نسخ البيانات احتياطيًا',
  'Restore Data': 'استعادة البيانات',
  Restore: 'استعادة',
  'Backup saved.': 'تم حفظ النسخة الاحتياطية.',
  "The backup couldn't be created. Try again.": 'تعذّر إنشاء النسخة الاحتياطية. حاول مرة أخرى.',
  "The backup couldn't be restored. Your data was not changed.": 'تعذّرت استعادة النسخة الاحتياطية. لم تتغيّر بياناتك.',
  "This file isn't valid JSON.": 'هذا الملف ليس بصيغة JSON صالحة.',
  "This file isn't a KiBase backup.": 'هذا الملف ليس نسخة احتياطية من KiBase.',
  'This backup was made by a newer version of KiBase.': 'هذه النسخة الاحتياطية من إصدار أحدث من KiBase.',
  'This backup is damaged and cannot be restored.': 'هذه النسخة الاحتياطية تالفة ولا يمكن استعادتها.',
  'Restore From Backup?': 'الاستعادة من النسخة الاحتياطية؟',
  'This backup has {meals} meals, {weights} weight entries and {workouts} workouts.': 'تحتوي هذه النسخة على {meals} وجبة و{weights} قياس وزن و{workouts} تمرين.',
  'Saved on {date}.': 'حُفظت في {date}.',
  'Restoring will overwrite all data on this device. This cannot be undone.': 'ستؤدي الاستعادة إلى استبدال جميع البيانات على هذا الجهاز. لا يمكن التراجع عن ذلك.',

  // ---- Discard unsaved edits ----
  'Discard Changes?': 'تجاهل التغييرات؟',
  'Your changes will be lost.': 'ستفقد تغييراتك.',
  Discard: 'تجاهل',
  'Keep Editing': 'متابعة التعديل',

  // ---- Log Meal ----
  'Edit Meal': 'تعديل الوجبة',
  'Log Meal': 'تسجيل وجبة',
  'Meal name (optional)': 'اسم الوجبة (اختياري)',
  'Items in This Meal': 'عناصر هذه الوجبة',
  'In This Meal': 'في هذه الوجبة',
  'Meal Total': 'إجمالي الوجبة',
  'Add more items below. Totals update as you go.': 'أضف عناصر أخرى بالأسفل. يتحدّث المجموع تلقائياً.',
  'Create a custom meal': 'إنشاء وجبة مخصّصة',
  'Meal Divider': 'مقسّم الوجبات',

  // ---- Food picker ----
  Database: 'قاعدة البيانات',
  'My Items': 'عناصري',
  'Search foods': 'ابحث عن الأطعمة',
  'Search my items': 'ابحث في عناصري',
  'No foods match your search.': 'لا توجد أطعمة مطابقة لبحثك.',
  'Saved Meals': 'الوجبات المحفوظة',
  'No saved meals yet. Tap the bookmark next to a meal on the Home tab to save it.':
    'لا توجد وجبات محفوظة بعد. اضغط على أيقونة الحفظ بجانب أي وجبة في الرئيسية لحفظها.',
  'No saved meals match your search.': 'لا توجد وجبات محفوظة مطابقة لبحثك.',
  'Custom Items': 'العناصر المخصّصة',
  'No custom items yet. Add your own, like a specific protein bar.':
    'لا توجد عناصر مخصّصة بعد. أضف عناصرك الخاصة، مثل لوح بروتين معيّن.',
  'No custom items match your search.': 'لا توجد عناصر مخصّصة مطابقة لبحثك.',
  '{n} kcal / 100 g': '{n} سعرة / 100 غ',
  'Saved meal': 'وجبة محفوظة',
  '1 ingredient': 'مكوّن واحد',
  '{n} ingredients': '{n} مكوّنات',
  Done: 'تم',
  'No ingredients left. Tap Done to remove this meal.': 'لم يتبقَّ أي مكوّن. اضغط «تم» لإزالة هذه الوجبة.',
  'Changes apply to this meal only. To change the saved meal itself, use the arrow next to it in My Items.':
    'التعديلات تخص هذه الوجبة فقط. لتعديل الوجبة المحفوظة نفسها، استخدم السهم بجانبها في «عناصري».',
  '· 1 portion {n} g': '· حصة واحدة {n} غ',

  // ---- Custom item ----
  'Edit Custom Item': 'تعديل عنصر مخصّص',
  'Custom Meal': 'وجبة مخصّصة',
  'Enter the values for the amount below (100 g by default). When you log it later you only type the grams.':
    'أدخل القيم للكمية أدناه (100 غ افتراضياً). عند تسجيله لاحقاً تكتب الغرامات فقط.',
  'Amount': 'الكمية',
  'Name (e.g. Chicken Rice Bowl)': 'الاسم (مثلاً: صحن دجاج وأرز)',
  'Leave calories empty to calculate them from the macros.': 'اترك السعرات فارغة لحسابها من المغذيات.',
  'Portion size': 'حجم الحصة',
  'Optional. Logging this item starts at one portion instead of 100 g.':
    'اختياري. يبدأ تسجيل هذا العنصر بحصة واحدة بدلاً من 100 غ.',
  'Save Changes': 'حفظ التغييرات',
  'Save Custom Meal': 'حفظ الوجبة المخصّصة',
  'Delete item': 'حذف العنصر',
  'Meals you already logged with it are not affected.': 'لن تتأثر الوجبات التي سجّلتها به من قبل.',

  // ---- Meal divider ----
  'Batch Ingredients': 'مكوّنات الطبخة',
  'Add everything that went into the pot from the list below, with the weights you used. A saved meal adds all of its items.':
    'أضف كل ما وضعته في القدر من القائمة بالأسفل مع الأوزان التي استخدمتها. الوجبة المحفوظة تضيف جميع عناصرها.',
  'Whole batch · {n} g': 'الطبخة كاملة · {n} غ',
  'Divide By': 'قسّم على',
  'Fewer portions': 'حصص أقل',
  'Number of portions': 'عدد الحصص',
  portion: 'حصة',
  portions: 'حصص',
  'More portions': 'حصص أكثر',
  'Per Portion': 'لكل حصة',
  '≈ {n} g each': '≈ {n} غ لكل حصة',
  'Per 100 g: {kcal} kcal · P {p} · C {c} · F {f}': 'لكل 100 غ: {kcal} سعرة · ب {p} · ك {c} · د {f}',
  'Name, e.g. Chicken & Rice prep': 'الاسم، مثلاً: تحضير دجاج وأرز',
  'Saved to My Items ✓': 'حُفظت في عناصري ✓',
  'Save as New Custom Meal': 'حفظ كوجبة مخصّصة جديدة',
  'Add ingredients to see the macros per portion.': 'أضف المكوّنات لرؤية المغذيات لكل حصة.',
  'Enter at least 1 portion.': 'أدخل حصة واحدة على الأقل.',
  'Add Ingredients': 'إضافة مكوّنات',

  // ---- Plan & Goals ----
  'TDEE Calculator': 'حاسبة الاحتياج اليومي',
  Male: 'ذكر',
  Female: 'أنثى',
  Height: 'الطول',
  'Latest weigh-in, {date}. Log new weights in the Weight tab.': 'آخر وزن مسجّل، {date}. سجّل أوزاناً جديدة في تبويب الوزن.',
  'No weight logged yet. Log one in the Weight tab and it will appear here.':
    'لم يُسجَّل أي وزن بعد. سجّله في تبويب الوزن وسيظهر هنا.',
  Activity: 'النشاط',
  Sedentary: 'خامل',
  'Lightly active': 'نشاط خفيف',
  'Moderately active': 'نشاط متوسط',
  'Very active': 'نشاط عالٍ',
  Athlete: 'رياضي',
  Cut: 'تنشيف',
  Maintain: 'ثبات',
  Bulk: 'تضخيم',
  'Your Numbers': 'أرقامك',
  'kcal / day to cut': 'سعرة / يوم للتنشيف',
  'kcal / day to maintain': 'سعرة / يوم للثبات',
  'kcal / day to bulk': 'سعرة / يوم للتضخيم',
  BMR: 'معدل الأيض الأساسي',
  Maintenance: 'سعرات الثبات',
  'Goals Updated': 'تم تحديث الأهداف',
  'Use as My Daily Goals': 'استخدمها كأهدافي اليومية',
  'Current Daily Goals': 'الأهداف اليومية الحالية',
  'These drive the Home and Analytics tabs. Edit them directly or apply the calculator above.':
    'تعتمد عليها الرئيسية والإحصائيات. عدّلها مباشرة أو طبّق نتيجة الحاسبة أعلاه.',

  // ---- Saved meal editor ----
  'Edit Saved Meal': 'تعديل الوجبة المحفوظة',
  Ingredients: 'المكوّنات',
  'Add at least one ingredient to keep this meal.': 'أضف مكوّناً واحداً على الأقل للإبقاء على هذه الوجبة.',
  Total: 'الإجمالي',
  'Delete saved meal': 'حذف الوجبة المحفوظة',
  'Meals you already logged from it are not affected.': 'لن تتأثر الوجبات التي سجّلتها منها من قبل.',

  // ---- Workout ----
  Workout: 'التمرين',
  'Workout name (optional)': 'اسم التمرين (اختياري)',
  Exercises: 'التمارين',
  'Sets done': 'المجموعات المنجزة',
  'Volume (kg)': 'الحجم (كغ)',
  'Editing a past day. Pick another date on the Home tab.': 'تعديل يوم سابق. اختر تاريخاً آخر من الرئيسية.',
  'Add Exercise': 'إضافة تمرين',
  'No exercises logged for this day yet.': 'لم تسجّل أي تمرين لهذا اليوم بعد.',
  Set: '#', // column header; a word does not fit the narrow column
  Previous: 'السابق',
  Best: 'الأفضل',
  Reps: 'تكرار',
  'Set {n} weight': 'وزن المجموعة {n}',
  'Set {n} reps': 'تكرارات المجموعة {n}',
  'Set {n} done': 'تمت المجموعة {n}',
  'Remove set {n}': 'إزالة المجموعة {n}',
  'Add Set': 'إضافة مجموعة',
  'Swap {name}': 'استبدال {name}',
  'Save as Routine': 'حفظ كروتين',
  Saved: 'تم الحفظ',
  Volume: 'الحجم',
  'Total kg lifted per workout': 'مجموع الكيلوغرامات المرفوعة في كل تمرين',
  Routine: 'الروتين',
  'Volume trend': 'منحنى الحجم',
  'Finish a workout from this routine to see its volume trend.': 'أنهِ تمريناً من هذا الروتين لتظهر لك حركة الحجم.',
  Routines: 'الروتينات',
  'No routines yet. Build one and start it with one tap whenever you train.':
    'لا توجد روتينات بعد. أنشئ واحداً وابدأه بضغطة واحدة كلما تمرّنت.',
  'Add New Routine': 'إضافة روتين جديد',
  'New Routine': 'روتين جديد',
  'Edit Routine': 'تعديل الروتين',
  'Routine name': 'اسم الروتين',
  'Delete routine': 'حذف الروتين',
  'Add at least one exercise to save this routine.': 'أضف تمريناً واحداً على الأقل لحفظ هذا الروتين.',
  'In Progress': 'قيد التنفيذ',
  'Finish Routine': 'إنهاء الروتين',
  'Continue Routine': 'متابعة الروتين',
  "This removes the workout from your history. It can't be undone.": 'سيُزال التمرين من سجلّك. لا يمكن التراجع عن ذلك.',
  'No workout in progress. Start a routine below.': 'لا يوجد تمرين قيد التنفيذ. ابدأ روتيناً من الأسفل.',
  '1 exercise': 'تمرين واحد',
  '{n} exercises': '{n} تمارين',
  '1 set': 'مجموعة واحدة',
  '{n} sets': '{n} مجموعات',
  Start: 'ابدأ',
  'Workout History': 'سجل التمارين',
  'Repeat this workout': 'كرّر هذا التمرين',
  'Clear Workout': 'مسح التمرين',
  'Clear this workout?': 'مسح هذا التمرين؟',
  "This removes every exercise and set logged on {day}. It can't be undone.":
    'سيُزيل هذا كل التمارين والمجموعات المسجّلة في {day}. لا يمكن التراجع عن ذلك.',
  Clear: 'مسح',
  '1 exercise. Start it from Routines next time.': 'تمرين واحد. ابدأه من الروتينات في المرة القادمة.',
  '{n} exercises. Start it from Routines next time.': 'عدد التمارين: {n}. ابدأه من الروتينات في المرة القادمة.',
  'Workouts you already logged from it are not affected.': 'لن تتأثر التمارين التي سجّلتها منه من قبل.',

  // ---- Exercise picker ----
  'Add Exercises': 'إضافة تمارين',
  'Swap Exercise': 'استبدال التمرين',
  Add: 'إضافة',
  'Add ({n})': 'إضافة ({n})',
  Swap: 'استبدال',
  'Alternatives for {name}. Your sets are kept.': 'بدائل لـ {name}. ستبقى مجموعاتك كما هي.',
  'Search exercises': 'ابحث عن التمارين',
  Muscle: 'العضلة',
  All: 'الكل',
  'My Equipment': 'معداتي',
  'Show all': 'عرض الكل',
  'Only showing exercises for the equipment you picked.': 'تُعرض فقط التمارين الخاصة بالمعدات التي اخترتها.',
  'Pick the equipment your gym has to hide the rest.': 'اختر المعدات المتوفرة في ناديك لإخفاء الباقي.',
  'No exercises match your filters.': 'لا توجد تمارين مطابقة لاختياراتك.',

  // ---- Muscles & equipment (lib/exercisesDB.ts) ----
  Chest: 'الصدر',
  Back: 'الظهر',
  'Lower Back': 'أسفل الظهر',
  Traps: 'الترابيس',
  Shoulders: 'الأكتاف',
  Biceps: 'البايسبس',
  Triceps: 'الترايسبس',
  Forearms: 'الساعدان',
  Abs: 'البطن',
  Quads: 'الفخذ الأمامي',
  Hamstrings: 'الفخذ الخلفي',
  Glutes: 'الأرداف',
  Adductors: 'العضلات المقرّبة',
  Calves: 'السمانة',
  Barbell: 'بار حديد',
  Dumbbell: 'دمبل',
  Machine: 'جهاز',
  Cable: 'كابل',
  Bodyweight: 'وزن الجسم',
  'Smith Machine': 'جهاز سميث',
  Kettlebell: 'كيتلبل',

  // ---- Built-in food database (lib/foods.js) ----
  'Whole Eggs': 'بيض كامل',
  'Egg Whites': 'بياض البيض',
  'Chicken Breast (raw)': 'صدر دجاج (نيء)',
  'Chicken Breast (cooked)': 'صدر دجاج (مطبوخ)',
  'Lean Ground Beef 90% (raw)': 'لحم بقر مفروم قليل الدهن 90% (نيء)',
  'Salmon (raw)': 'سلمون (نيء)',
  'Tuna (canned in water)': 'تونة (معلّبة بالماء)',
  'Whey Protein Powder': 'بروتين واي (بودرة)',
  'Whole Milk': 'حليب كامل الدسم',
  'Greek Yogurt (non-fat)': 'زبادي يوناني (خالي الدسم)',
  'Cheddar Cheese': 'جبن شيدر',
  Butter: 'زبدة',
  'White Bread': 'خبز أبيض',
  Oats: 'شوفان',
  'White Rice (raw)': 'أرز أبيض (نيء)',
  'White Rice (cooked)': 'أرز أبيض (مطبوخ)',
  'Pasta (dry)': 'معكرونة (جافة)',
  'Potato (raw)': 'بطاطس (نيئة)',
  'Sweet Potato (raw)': 'بطاطا حلوة (نيئة)',
  'Lentils (cooked)': 'عدس (مطبوخ)',
  'Fava Beans (cooked)': 'فول (مطبوخ)',
  Honey: 'عسل',
  'Olive Oil': 'زيت زيتون',
  'Peanut Butter': 'زبدة الفول السوداني',
  Almonds: 'لوز',
  Avocado: 'أفوكادو',
  Banana: 'موز',
  Apple: 'تفاح',
  Broccoli: 'بروكلي',
}
