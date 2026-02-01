

# תיקון קריטי: שינויי אבני דרך לא מועברים ליועץ

## אבחון הבעיה

### זרימת הנתונים הנוכחית (עם הבאג)

```
יזם → NegotiationDialog.tsx
       ↓
       milestoneAdjustments = [{ milestone_id, original_percentage, target_percentage }]
       ↓
Edge Function → נשמר ב-negotiation_sessions.milestone_adjustments ✅
       ↓
יועץ → NegotiationResponseView.tsx
       ↓
       קורא מ-proposal.milestone_adjustments (הערכים המקוריים!) ❌
       לא ממזג עם session.milestone_adjustments!
```

### הוכחה מהדאטאבייס

**`negotiation_sessions.milestone_adjustments`** (שינויי היזם - נשמרים נכון):
```json
[
  {"milestone_id": "ent-milestone-0", "original_percentage": 10, "target_percentage": 5},
  {"milestone_id": "ent-milestone-2", "original_percentage": 30, "target_percentage": 35}
]
```

**`proposals.milestone_adjustments`** (הנתונים המקוריים - לא מעודכנים):
```json
[
  {"id": "ent-milestone-0", "consultant_percentage": 10, "entrepreneur_percentage": 10},
  {"id": "ent-milestone-2", "consultant_percentage": 30, "entrepreneur_percentage": 30}
]
```

### הקוד הבעייתי (`NegotiationResponseView.tsx` שורות 155-176)

```typescript
// Initialize milestone responses from proposal milestones ❌
if (data.proposal?.milestone_adjustments) {
  const milestones = data.proposal.milestone_adjustments as any[];
  
  const responses = milestones.map((milestone) => {
    const originalPercentage = milestone.consultant_percentage ?? milestone.percentage ?? 0;
    // ❌ קורא entrepreneur_percentage מההצעה במקום target_percentage מהסשן!
    const entrepreneurPercentage = milestone.entrepreneur_percentage ?? originalPercentage;
    ...
  });
}
```

---

## פתרון

### 1. מיזוג נתוני הסשן עם נתוני ההצעה

```typescript
// Initialize milestone responses - MERGE session adjustments with proposal milestones
if (data.proposal?.milestone_adjustments) {
  const milestones = data.proposal.milestone_adjustments as any[];
  
  // Get entrepreneur's requested changes from SESSION (not proposal!)
  const sessionMilestoneAdjs = (data.milestone_adjustments as any[]) || [];
  const adjMap = new Map<string, any>();
  sessionMilestoneAdjs.forEach((adj: any) => {
    adjMap.set(adj.milestone_id, adj);
  });
  
  const responses: MilestoneResponse[] = milestones.map((milestone: any) => {
    const milestoneId = milestone.id || milestone.description;
    const originalPercentage = milestone.consultant_percentage ?? milestone.percentage ?? 0;
    
    // Check for session adjustment (entrepreneur's NEW requested change)
    const sessionAdj = adjMap.get(milestoneId);
    const entrepreneurPercentage = sessionAdj
      ? sessionAdj.target_percentage
      : (milestone.entrepreneur_percentage ?? originalPercentage);
    
    return {
      description: milestone.description || milestone.trigger || 'אבן דרך',
      originalPercentage: originalPercentage,
      entrepreneurPercentage: entrepreneurPercentage,  // Now uses session data!
      advisorResponsePercentage: originalPercentage,
      accepted: false,
    };
  });
  
  setMilestoneResponses(responses);
}
```

---

## שינויים נדרשים

### קובץ: `src/components/negotiation/NegotiationResponseView.tsx`

**שורות 155-177 - עדכון לוגיקת טעינת אבני הדרך:**

| לפני | אחרי |
|------|------|
| קריאה רק מ-`proposal.milestone_adjustments` | מיזוג עם `session.milestone_adjustments` |
| שימוש ב-`entrepreneur_percentage` מההצעה | שימוש ב-`target_percentage` מהסשן |

---

## בדיקות לאחר התיקון

1. **יזם** מבקש שינוי באבני דרך (למשל: 10% → 5%)
2. **יועץ** פותח את דף המשא ומתן
3. **וידוא**: היועץ רואה את הערכים המבוקשים (5% ולא 10%)
4. **וידוא**: טבלת ההשוואה מציגה נכון:
   - עמודת "יועץ (מקורי)": 10%
   - עמודת "יזם (מבוקש)": 5%
   - עמודת "שינוי": -5%

---

## סיכום הבאג

| מיקום | בעיה | תיקון |
|-------|------|-------|
| `NegotiationResponseView.tsx` | קורא `entrepreneur_percentage` מההצעה | למזג עם `target_percentage` מהסשן |
| שורות 155-177 | מתעלם מ-`session.milestone_adjustments` | לבנות map ולהשתמש בו |

