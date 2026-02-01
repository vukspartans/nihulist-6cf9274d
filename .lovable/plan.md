

# תיקון 3 באגים: מיון, התראות דשבורד, ואישור הצעה

## סיכום הבעיות

| # | בעיה | מיקום |
|---|------|-------|
| 1 | מיון ההצעות משפיע על סדר קבוצות היועצים במקום רק על ההצעות בתוך כל קבוצה | `ProposalComparisonTable.tsx` |
| 2 | אין התראה על קבלת הצעה + פרויקטים עם הצעות חדשות לא מוקפצים לראש | `Dashboard.tsx` |
| 3 | לאחר אישור הצעה, הדיאלוג לא נסגר והסטטוס לא מתעדכן | `ProposalApprovalDialog.tsx` |

---

## באג 1: מיון לא נכון

### בעיה
המיון מופעל על **כל** ההצעות לפני הקיבוץ לפי סוג יועץ, מה שמשבש את סדר הקבוצות. המיון צריך להיות **בתוך** כל קבוצה בלבד.

### קוד נוכחי (`ProposalComparisonTable.tsx`, שורות 161-172):
```typescript
// Sort proposals based on selected criteria
const sortedProposals = useMemo(() => {
  return [...proposals].sort((a, b) => { ... });
}, [proposals, sortBy]);

// Group proposals by vendor type
const groupedProposals = useMemo(() => {
  const groups: Record<string, Proposal[]> = {};
  sortedProposals.forEach(proposal => { // ❌ משתמש בהצעות הממוינות
    const type = proposal.rfp_invite?.advisor_type || 'אחר';
    if (!groups[type]) groups[type] = [];
    groups[type].push(proposal);
  });
  return groups;
}, [sortedProposals]);
```

### פתרון
קודם קיבוץ לפי סוג יועץ, ואז מיון **בתוך כל קבוצה**:

```typescript
// Group proposals by vendor type first (without sorting)
const groupedProposals = useMemo(() => {
  const groups: Record<string, Proposal[]> = {};
  proposals.forEach(proposal => {
    const type = proposal.rfp_invite?.advisor_type || 'אחר';
    if (!groups[type]) groups[type] = [];
    groups[type].push(proposal);
  });
  return groups;
}, [proposals]);

// Sort function for proposals within a group
const sortProposals = (proposalList: Proposal[]) => {
  return [...proposalList].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      case 'status':
        const statusOrder: Record<string, number> = { 
          'accepted': 0, 'resubmitted': 1, 'submitted': 2, 
          'negotiation_requested': 3, 'rejected': 4 
        };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      default: return 0;
    }
  });
};
```

ובפונקציית הרינדור:
```typescript
const renderProposalTable = (typeProposals: Proposal[]) => {
  const sortedTypeProposals = sortProposals(typeProposals);
  const typeLowestPrice = Math.min(...sortedTypeProposals.map(p => p.price));
  // ... השאר עם sortedTypeProposals במקום typeProposals
};
```

---

## באג 2: דשבורד - התראות והקפצת פרויקטים

### בעיות:
א. **אין התראה ויזואלית** בולטת על הצעות חדשות
ב. **פרויקטים עם הצעות חדשות לא מוקפצים לראש** הרשימה

### פתרון א' - הקפצת פרויקטים לראש

עדכון `filteredProjects` ב-`Dashboard.tsx` (שורות 234-250):

```typescript
const filteredProjects = projects
  .filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase = phaseFilter === "all" || project.phase === phaseFilter;
    return matchesSearch && matchesPhase;
  })
  .sort((a, b) => {
    // Priority 1: Projects with unseen proposals come first
    const aHasUnseen = (unseenProposalCounts[a.id] || 0) > 0;
    const bHasUnseen = (unseenProposalCounts[b.id] || 0) > 0;
    if (aHasUnseen !== bHasUnseen) {
      return aHasUnseen ? -1 : 1; // Unseen first
    }
    
    // Priority 2: User's selected sort
    let aValue = a[sortBy as keyof ProjectSummary];
    let bValue = b[sortBy as keyof ProjectSummary];
    
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
```

### פתרון ב' - התראה ויזואלית בולטת יותר

עדכון ה-Badge בכרטיס הפרויקט:

```tsx
{(unseenProposalCounts[project.id] || 0) > 0 && (
  <div 
    className="relative animate-pulse"
    onClick={(e) => {
      e.stopPropagation();
      navigate(`/projects/${project.id}?tab=received`);
    }}
  >
    <FileText className="w-5 h-5 text-primary" />
    <Badge 
      variant="destructive"
      className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1.5 text-[11px] flex items-center justify-center animate-bounce"
    >
      {unseenProposalCounts[project.id] > 99 ? '99+' : unseenProposalCounts[project.id]}
    </Badge>
  </div>
)}
```

---

## באג 3: דיאלוג אישור לא נסגר

### בעיה
ב-`ProposalApprovalDialog.tsx`:
- הפרמטר `onSuccess` מוגדר ב-interface אך **לא מופק** מה-props
- לאחר אישור מוצלח, רק `onOpenChange(false)` נקרא, לא `onSuccess`

### קוד נוכחי:
```typescript
// שורה 70-75
export const ProposalApprovalDialog = ({
  open,
  onOpenChange,
  proposal,
  projectName,
}: ProposalApprovalDialogProps) => { // ❌ חסר onSuccess!

// שורה 141-150
if (result.success) {
  onOpenChange(false);
  // ❌ אין קריאה ל-onSuccess!
}
```

### פתרון
```typescript
// שורה 70-76 - הוספת onSuccess
export const ProposalApprovalDialog = ({
  open,
  onOpenChange,
  proposal,
  projectName,
  onSuccess, // ✅ הוספה
}: ProposalApprovalDialogProps) => {

// שורה 141-151 - קריאה ל-onSuccess
if (result.success) {
  onOpenChange(false);
  onSuccess?.(); // ✅ הוספה
  // Reset state...
}
```

---

## שינויים נדרשים

| קובץ | שינוי |
|------|-------|
| `src/components/ProposalComparisonTable.tsx` | שינוי סדר: קודם קיבוץ, אז מיון בתוך כל קבוצה |
| `src/pages/Dashboard.tsx` | הקפצת פרויקטים עם הצעות לראש + אנימציה לבאדג' |
| `src/components/ProposalApprovalDialog.tsx` | הוספת `onSuccess` לפרמטרים וקריאה אליו |

---

## בדיקות לאחר התיקון

1. **מיון**: לחיצה על כותרת עמודת המחיר ממיינת רק את ההצעות בתוך כל קבוצת יועצים, לא משנה סדר הקבוצות
2. **דשבורד**: פרויקט עם הצעה חדשה מופיע בראש הרשימה עם אנימציה
3. **אישור הצעה**: לאחר חתימה ואישור, שני הדיאלוגים נסגרים והסטטוס מתעדכן מיידית

