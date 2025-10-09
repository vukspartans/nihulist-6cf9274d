export const adminTranslations = {
  // Login Page
  login: {
    title: "כניסת מנהל",
    description: "הזן את פרטי הכניסה שלך כדי לגשת לפאנל הניהול",
    email: "אימייל",
    password: "סיסמה",
    emailPlaceholder: "admin@example.com",
    signIn: "התחבר",
    signingIn: "מתחבר...",
    invalidEmail: "כתובת אימייל לא תקינה",
    passwordTooShort: "הסיסמה חייבת להכיל לפחות 6 תווים",
    accessDenied: "גישה נדחתה. נדרשות הרשאות מנהל.",
    welcomeBack: "ברוך שובך, מנהל!",
    loginFailed: "ההתחברות נכשלה",
  },

  // Navigation
  navigation: {
    dashboard: "לוח בקרה",
    suppliers: "ספקים",
    projects: "פרויקטים",
    rfps: "קריאות להצעות מחיר",
    users: "משתמשים",
    auditLog: "יומן ביקורת",
    adminPanel: "פאנל ניהול",
    management: "ניהול",
    signOut: "התנתק",
  },

  // Dashboard
  dashboard: {
    title: "לוח בקרה",
    description: "סקירה כללית של המדדים העיקריים של הפלטפורמה",
    totalSuppliers: "סך ספקים",
    totalProjects: "סך פרויקטים",
    rfpsSent: "קריאות להצעות מחיר שנשלחו",
    proposalsReceived: "הצעות מחיר שהתקבלו",
    activeSuppliersDesc: "ספקים פעילים במערכת",
    projectsCreatedDesc: "פרויקטים שנוצרו",
    requestsForProposalsDesc: "בקשות להצעות מחיר",
    approvedCount: "אושרו",
  },

  // Suppliers Management
  suppliers: {
    title: "ניהול ספקים",
    description: "ניהול כל הספקים במערכת",
    searchPlaceholder: "חפש ספקים לפי שם או אימייל...",
    addSupplier: "הוסף ספק",
    editSupplier: "ערוך ספק",
    deleteConfirm: "האם אתה בטוח שברצונך למחוק את הספק הזה?",
    exportCSV: "ייצא CSV",
    uploadCSV: "ייבא CSV",
    created: "נוצר בהצלחה",
    updated: "עודכן בהצלחה",
    deleted: "נמחק בהצלחה",
    createFailed: "יצירת הספק נכשלה",
    updateFailed: "עדכון הספק נכשל",
    deleteFailed: "מחיקת הספק נכשלה",
    csvExported: "קובץ CSV יוצא בהצלחה",
    csvImported: "קובץ CSV יובא בהצלחה",
    
    // Form fields
    name: "שם",
    email: "אימייל",
    phone: "טלפון",
    field: "תחום / התמחות",
    region: "אזור",
    verified: "מאומת",
    rating: "דירוג",
    
    // Table columns
    actions: "פעולות",
    edit: "ערוך",
    delete: "מחק",
    yes: "כן",
    no: "לא",
    na: "לא זמין",
    
    // Dialog
    addNewSupplier: "הוסף ספק חדש למערכת",
    updateSupplierInfo: "עדכן את פרטי הספק",
    cancel: "ביטול",
    create: "צור",
    update: "עדכן",
    nameRequired: "שם הוא שדה חובה",
  },

  // Projects Management
  projects: {
    title: "ניהול פרויקטים",
    description: "ניהול כל הפרויקטים במערכת",
    searchPlaceholder: "חפש פרויקטים...",
    showArchived: "הצג מאורכבים",
    archived: "הפרויקט אורכב בהצלחה",
    restored: "הפרויקט שוחזר בהצלחה",
    operationFailed: "הפעולה נכשלה",
    
    // Table columns
    name: "שם",
    type: "סוג",
    location: "מיקום",
    budget: "תקציב",
    status: "סטטוס",
    phase: "שלב",
    actions: "פעולות",
    archive: "ארכב",
    restore: "שחזר",
    
    // Status
    draft: "טיוטה",
    active: "פעיל",
    completed: "הושלם",
    cancelled: "בוטל",
  },

  // RFPs Management
  rfps: {
    title: "קריאות להצעות מחיר והצעות",
    description: "ניהול קריאות להצעות מחיר והצעות שהוגשו",
    rfpsTab: "קריאות להצעות מחיר",
    proposalsTab: "הצעות מחיר",
    deleted: "נמחק בהצלחה",
    statusUpdated: "הסטטוס עודכן",
    deleteRFPConfirm: "למחוק את קריאת ההצעות הזו? הפעולה תמחק גם את ההזמנות הקשורות.",
    deleteProposalConfirm: "למחוק את ההצעה הזו?",
    
    // RFP columns
    subject: "נושא",
    sentAt: "נשלח ב",
    projectId: "מזהה פרויקט",
    
    // Proposal columns
    supplier: "ספק",
    price: "מחיר",
    timeline: "לוח זמנים",
    status: "סטטוס",
    submitted: "הוגש",
    actions: "פעולות",
    approve: "אשר",
    reject: "דחה",
    delete: "מחק",
    days: "ימים",
    
    // Status
    received: "התקבל",
    approved: "אושר",
    rejected: "נדחה",
  },

  // Users Management
  users: {
    title: "ניהול משתמשים",
    description: "ניהול תפקידי משתמשים והרשאות",
    searchPlaceholder: "חפש משתמשים לפי שם...",
    rolesUpdated: "תפקידי המשתמש עודכנו בהצלחה",
    updateFailed: "עדכון התפקידים נכשל",
    userCreated: "משתמש נוצר בהצלחה",
    userDeleted: "משתמש נמחק בהצלחה",
    createFailed: "יצירת המשתמש נכשלה",
    deleteFailed: "מחיקת המשתמש נכשלה",
    deleteConfirm: "האם אתה בטוח שברצונך למחוק את המשתמש הזה? פעולה זו אינה ניתנת לביטול.",
    cannotDeleteSelf: "לא ניתן למחוק את החשבון שלך",
    
    // Table columns
    name: "שם",
    email: "אימייל",
    profileRole: "תפקיד בפרופיל",
    assignedRoles: "תפקידים מוקצים",
    created: "נוצר",
    actions: "פעולות",
    manageRoles: "נהל תפקידים",
    noRoles: "אין תפקידים",
    addUser: "הוסף משתמש",
    delete: "מחק",
    
    // Roles
    admin: "מנהל",
    entrepreneur: "יזם",
    advisor: "יועץ",
    supplier: "ספק",
    
    // Dialog - Roles
    manageUserRoles: "ניהול תפקידי משתמש",
    assignOrRemove: "הקצה או הסר תפקידים עבור",
    cancel: "ביטול",
    saveChanges: "שמור שינויים",
    
    // Dialog - Create User
    createUser: "צור משתמש חדש",
    createUserDesc: "הוסף משתמש חדש למערכת והקצה לו תפקידים",
    password: "סיסמה",
    phone: "טלפון",
    assignRoles: "הקצה תפקידים",
    emailRequired: "אימייל הוא שדה חובה",
    passwordRequired: "סיסמה היא שדה חובה",
    passwordMinLength: "הסיסמה חייבת להכיל לפחות 6 תווים",
    create: "צור משתמש",
  },

  // Audit Log
  auditLog: {
    title: "יומן ביקורת",
    description: "מעקב מלא אחר כל פעולות המנהל (500 רשומות אחרונות)",
    viewDetails: "הצג פרטים",
    
    // Table columns
    timestamp: "חותמת זמן",
    action: "פעולה",
    targetTable: "טבלת יעד",
    targetId: "מזהה יעד",
    adminId: "מזהה מנהל",
    details: "פרטים",
    
    // Actions
    create: "יצירה",
    update: "עדכון",
    delete: "מחיקה",
    archive: "ארכוב",
    restore: "שחזור",
    update_roles: "עדכון תפקידים",
    
    // Dialog
    detailsTitle: "פרטי יומן ביקורת",
    detailsDescription: "מידע מלא על פעולה זו",
    actionDetails: "פרטי פעולה",
    table: "טבלה",
    oldValues: "ערכים ישנים",
    newValues: "ערכים חדשים",
    userAgent: "User Agent",
  },

  // Common/Shared
  common: {
    noData: "אין נתונים זמינים",
    showing: "מציג",
    to: "עד",
    of: "מתוך",
    results: "תוצאות",
    page: "עמוד",
    loading: "טוען...",
    search: "חיפוש...",
  },
};
