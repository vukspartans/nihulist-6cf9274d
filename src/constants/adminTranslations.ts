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
    entrepreneurs: "יזמים",
    advisors: "יועצים",
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

  // Entrepreneurs Management
  entrepreneurs: {
    title: "ניהול יזמים",
    searchPlaceholder: "חיפוש לפי שם, אימייל או חברה...",
    createButton: "צור יזם חדש",
    editButton: "ערוך",
    deleteButton: "מחק",
    toggleActiveButton: "שנה סטטוס",
    columns: {
      name: "שם",
      email: "אימייל",
      phone: "טלפון",
      company: "חברה",
      createdAt: "תאריך הרשמה",
      actions: "פעולות",
    },
    createDialog: {
      title: "צור יזם חדש",
      emailLabel: "אימייל",
      emailPlaceholder: "email@example.com",
      passwordLabel: "סיסמה",
      passwordPlaceholder: "הזן סיסמה",
      nameLabel: "שם מלא",
      namePlaceholder: "הזן שם מלא",
      phoneLabel: "טלפון",
      phonePlaceholder: "050-1234567",
      companyLabel: "שם חברה",
      companyPlaceholder: "הזן שם חברה",
      submitButton: "צור חשבון",
      cancelButton: "ביטול",
    },
    editDialog: {
      title: "ערוך יזם",
      submitButton: "שמור שינויים",
      cancelButton: "ביטול",
    },
    deleteConfirm: "האם אתה בטוח שברצונך למחוק יזם זה?",
    messages: {
      created: "יזם נוצר בהצלחה",
      updated: "יזם עודכן בהצלחה",
      deleted: "יזם נמחק בהצלחה",
      error: "אירעה שגיאה",
    },
  },

  // Advisors Management
  advisors: {
    title: "ניהול יועצים",
    searchPlaceholder: "חיפוש לפי שם משרד, איש קשר או אימייל...",
    createButton: "צור יועץ חדש",
    editButton: "ערוך",
    deleteButton: "מחק",
    toggleActiveButton: "שנה סטטוס פעילות",
    filters: {
      all: "הכל",
      pending: "ממתינים לאישור",
      approved: "מאושרים",
    },
    columns: {
      companyName: "שם המשרד",
      contactPerson: "איש קשר",
      email: "אימייל",
      phone: "טלפון",
      location: "מיקום",
      foundingYear: "שנת ייסוד",
      expertise: "התמחויות",
      approvalStatus: "סטטוס אישור",
      activeStatus: "חשבון פעיל",
      actions: "פעולות",
    },
    status: {
      approved: "מאושר",
      pending: "ממתין לאישור",
      active: "פעיל",
      inactive: "מושהה",
    },
    createDialog: {
      title: "צור יועץ חדש",
      emailLabel: "אימייל",
      emailPlaceholder: "email@example.com",
      passwordLabel: "סיסמה",
      passwordPlaceholder: "הזן סיסמה",
      nameLabel: "שם איש קשר",
      namePlaceholder: "הזן שם מלא",
      companyNameLabel: "שם המשרד",
      companyNamePlaceholder: "הזן שם משרד",
      phoneLabel: "טלפון",
      phonePlaceholder: "050-1234567",
      locationLabel: "מיקום",
      locationPlaceholder: "בחר עיר",
      foundingYearLabel: "שנת ייסוד",
      foundingYearPlaceholder: "2020",
      officeSizeLabel: "גודל משרד",
      officeSizePlaceholder: "בחר גודל משרד",
      positionLabel: "תפקיד במשרד",
      positionPlaceholder: "בחר תפקיד",
      expertiseLabel: "התמחויות",
      expertisePlaceholder: "בחר לפחות התמחות אחת",
      specialtiesLabel: "תחומי מומחיות נוספים",
      specialtiesPlaceholder: "בחר תחומי מומחיות",
      activityRegionsLabel: "אזורי פעילות",
      activityRegionsPlaceholder: "בחר אזורי פעילות",
      submitButton: "צור חשבון",
      cancelButton: "ביטול",
    },
    editDialog: {
      title: "ערוך יועץ",
      submitButton: "שמור שינויים",
      cancelButton: "ביטול",
    },
    approve: "אשר",
    reject: "דחה",
    deleteConfirm: "האם אתה בטוח שברצונך למחוק יועץ זה?",
    messages: {
      created: "יועץ נוצר בהצלחה",
      updated: "יועץ עודכן בהצלחה",
      deleted: "יועץ נמחק בהצלחה",
      approved: "יועץ אושר בהצלחה",
      rejected: "יועץ נדחה",
      toggled: "סטטוס פעילות עודכן",
      error: "אירעה שגיאה",
    },
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
    name: "שם הפרויקט",
    owner: "בעלים",
    type: "סוג",
    location: "מיקום",
    budget: "תקציב",
    status: "סטטוס",
    phase: "שלב",
    createdAt: "תאריך יצירה",
    actions: "פעולות",
    
    // Actions
    archive: "ארכב",
    restore: "שחזר",
    view: "צפה",
    edit: "ערוך",
    delete: "מחק",
    
    // Status values
    draft: "טיוטה",
    active: "פעיל",
    completed: "הושלם",
    cancelled: "בוטל",
  },

  // RFPs Management
  rfps: {
    title: "ניהול קריאות להצעות מחיר",
    description: "ניהול כל קריאות להצעות המחיר במערכת",
    searchPlaceholder: "חפש לפי נושא או פרויקט...",
    
    // Table columns
    subject: "נושא",
    project: "פרויקט",
    projectId: "מזהה פרויקט",
    sentBy: "נשלח על ידי",
    sentAt: "תאריך שליחה",
    invitesSent: "הזמנות שנשלחו",
    proposalsReceived: "הצעות שהתקבלו",
    actions: "פעולות",
    supplier: "ספק",
    price: "מחיר",
    timeline: "לוח זמנים",
    days: "ימים",
    status: "סטטוס",
    submitted: "תאריך הגשה",
    
    // Status
    received: "התקבלה",
    approved: "אושרה",
    rejected: "נדחתה",
    
    // Actions
    view: "צפה",
    delete: "מחק",
    approve: "אשר",
    reject: "דחה",
    
    // Tabs
    rfpsTab: "קריאות להצעות מחיר",
    proposalsTab: "הצעות מחיר",
    
    // Dialog
    deleteConfirm: "האם אתה בטוח שברצונך למחוק קריאה להצעות מחיר זו?",
    deleteRFPConfirm: "האם אתה בטוח שברצונך למחוק RFP זה?",
    deleteProposalConfirm: "האם אתה בטוח שברצונך למחוק הצעה זו?",
    deleted: "קריאה להצעות מחיר נמחקה בהצלחה",
    deleteFailed: "מחיקת קריאה להצעות מחיר נכשלה",
    statusUpdated: "סטטוס עודכן בהצלחה",
  },

  // Users Management
  users: {
    title: "ניהול משתמשים",
    description: "ניהול כל המשתמשים במערכת",
    searchPlaceholder: "חפש משתמשים...",
    
    // Table columns
    name: "שם",
    email: "אימייל",
    role: "תפקיד",
    createdAt: "תאריך רישום",
    created: "נוצר ב",
    actions: "פעולות",
    
    // Roles
    entrepreneur: "יזם",
    advisor: "יועץ",
    supplier: "ספק",
    admin: "מנהל",
    
    // Actions
    viewProfile: "צפה בפרופיל",
    manageRoles: "נהל תפקידים",
    manageUserRoles: "נהל הרשאות משתמש",
    suspend: "השעה",
    delete: "מחק",
    addUser: "הוסף משתמש",
    createUser: "צור משתמש חדש",
    createUserDesc: "צור משתמש חדש והגדר הרשאות",
    
    // Form labels
    password: "סיסמה",
    phone: "טלפון",
    assignRoles: "הקצה הרשאות",
    assignOrRemove: "הקצה או הסר הרשאות למשתמש זה",
    profileRole: "תפקיד בפרופיל",
    assignedRoles: "הרשאות מוקצות",
    noRoles: "אין הרשאות",
    
    // Validation
    emailRequired: "אימייל נדרש",
    passwordMinLength: "סיסמה חייבת להכיל לפחות 6 תווים",
    
    // Dialogs
    deleteConfirm: "האם למחוק משתמש זה?",
    cancel: "ביטול",
    saveChanges: "שמור שינויים",
    create: "צור",
    
    // Messages
    rolesUpdated: "הרשאות עודכנו בהצלחה",
    updateFailed: "עדכון נכשל",
    userCreated: "משתמש נוצר בהצלחה",
    createFailed: "יצירת משתמש נכשלה",
    userDeleted: "משתמש נמחק בהצלחה",
    cannotDeleteSelf: "לא ניתן למחוק את עצמך",
    deleteFailed: "מחיקה נכשלה",
  },

  // Audit Log
  auditLog: {
    title: "יומן ביקורת",
    description: "מעקב אחר כל הפעולות במערכת",
    searchPlaceholder: "חפש לפי פעולה או משתמש...",
    
    // Table columns
    timestamp: "זמן",
    admin: "מנהל",
    adminId: "מזהה מנהל",
    action: "פעולה",
    targetTable: "טבלה",
    table: "טבלה",
    targetId: "מזהה יעד",
    changes: "שינויים",
    
    // Actions
    viewDetails: "צפה בפרטים",
    details: "פרטים",
    detailsTitle: "פרטי פעולה",
    detailsDescription: "פרטים מלאים על הפעולה שבוצעה",
    actionDetails: "פרטי הפעולה",
    oldValues: "ערכים ישנים",
    newValues: "ערכים חדשים",
    userAgent: "דפדפן",
    
    // Action types
    create: "יצירה",
    update: "עדכון",
    delete: "מחיקה",
    archive: "ארכוב",
    restore: "שחזור",
    update_roles: "עדכון הרשאות",
    
    // Time format
    dateFormat: "dd/MM/yyyy HH:mm",
  },

  // Common
  common: {
    loading: "טוען...",
    error: "שגיאה",
    success: "הצלחה",
    cancel: "ביטול",
    save: "שמור",
    delete: "מחק",
    edit: "ערוך",
    view: "צפה",
    search: "חפש",
    filter: "סנן",
    export: "ייצא",
    import: "ייבא",
    noData: "אין נתונים להצגה",
    confirmDelete: "האם אתה בטוח?",
    yes: "כן",
    no: "לא",
    showing: "מציג",
    to: "עד",
    of: "מתוך",
    results: "תוצאות",
    page: "עמוד",
    na: "לא זמין",
  },
};
