
# Billding -- Full Product Architecture Review

## Product Overview

Billding is a Hebrew-first (RTL) B2B SaaS platform for the Israeli construction and urban renewal industry. It connects **entrepreneurs** (real estate developers) with **professional advisors** (architects, engineers, lawyers, etc.) through a structured procurement workflow.

## Core Pipelines (End-to-End Flows)

### Pipeline 1: Project Creation (Entrepreneur)
```text
ProjectWizard --> Create Project in DB --> Upload Files --> Auto-create Tasks from Templates
```
- Entrepreneur fills project details (type, location, municipality, budget)
- Files uploaded to Supabase Storage with metadata
- Task templates auto-resolved based on project type via `useTemplateResolver` + `useBulkTaskCreation`

### Pipeline 2: RFP Creation and Sending (Entrepreneur)
```text
ProjectDetail --> RFPWizard
  Step 1: Select project type
  Step 2: PhasedAdvisorSelection (advisors grouped by phase priority)
  Step 3: AdvisorRecommendationsCard --> RequestEditorDialog (per advisor type)
    - ServiceDetailsTab (services checklist from admin templates)
    - FeeItemsTable (fee structure from admin templates)
    - PaymentTermsTab (milestones, index type)
    - Files/Info tab
  Step 4: Review and send
  --> useRFP.sendRFPInvitations()
    --> Creates RFP record + rfp_invites per advisor
    --> send-rfp-with-deadline Edge Function
    --> send-rfp-email Edge Function (Resend)
```

### Pipeline 3: Proposal Submission (Advisor)
```text
AdvisorDashboard --> RFP Invite Card --> SubmitProposal page
  - ConsultantServicesSelection (responds to entrepreneur's service checklist)
  - ConsultantFeeTable (fills prices for fee items)
  - ConsultantPaymentTerms (milestones)
  - File uploads + Signature
  --> useProposalSubmit --> DB insert
  --> notify-proposal-submitted Edge Function (email to entrepreneur)
```

### Pipeline 4: Proposal Review and Approval (Entrepreneur)
```text
ProjectDetail (received proposals tab)
  --> ProposalComparisonTable (side-by-side)
  --> ProposalDetailDialog (single proposal view)
  --> AI Evaluation (evaluate-proposals-batch Edge Function)
  --> ProposalApprovalDialog
    - Review fee line items (toggle optional items)
    - Signature + Authorization checkbox
    --> useProposalApproval (atomic DB function)
    --> notify-proposal-approved Edge Function
  OR
  --> RejectProposalDialog --> reject-proposal Edge Function
```

### Pipeline 5: Negotiation (Entrepreneur <-> Advisor)
```text
Entrepreneur: NegotiationDialog --> useNegotiation.createNegotiationSession()
  --> send-negotiation-request Edge Function (email to advisor)

Advisor: AdvisorDashboard (negotiations tab) --> NegotiationResponse page
  --> NegotiationResponseView --> respond with adjustments
  --> send-negotiation-response Edge Function (email to entrepreneur)

Entrepreneur: EntrepreneurNegotiationView --> Accept or Continue negotiating
```

### Pipeline 6: Payment Management (Post-Approval)
```text
ProjectDetail (payments tab) --> PaymentDashboard
  - Create milestones
  - Create payment requests against milestones
  - Approve/Reject payment requests
```

### Pipeline 7: Task Management (Post-Approval)
```text
ProjectDetail (tasks tab) --> TaskBoard (Kanban)
  - DraggableTaskCards with drag-and-drop
  - Task assignment to team members
  - Status tracking (todo/in_progress/done)
```

### Pipeline 8: Admin Management
```text
AdminDashboard --> Multiple management pages:
  - Users, Advisors, Entrepreneurs
  - Projects, RFPs
  - Fee Template Hierarchy (5-level):
    Advisor Type --> Project Type --> Category --> Submission Method --> Items
  - Milestones, Task Templates
  - Licensing Phases, Municipalities
  - Payment Categories/Statuses
  - Audit Log, Feedback
```

---

## Architecture Assessment

### Strengths
1. **Robust RBAC**: Server-side role hierarchy (admin > advisor > entrepreneur > supplier) with `RoleBasedRoute` guards and `useAuth` hook
2. **Template Hierarchy**: Well-designed 5-level admin template system that cascades to entrepreneur RFP creation
3. **Session Resilience**: Tab-return handling, token refresh, session sync checks before RLS-dependent queries
4. **Atomic Operations**: Proposal approval uses database functions for transaction safety
5. **Email Pipeline**: Comprehensive notification system with 12+ edge functions for different events
6. **AI Integration**: Dual-model approach (OpenAI for text analysis, Gemini for document analysis)

### Areas of Concern (No Changes Needed Now, For Awareness)

1. **Large Component Files**: Several files exceed 1000 lines (SubmitProposal: 1479, AdvisorDashboard: 1644, RequestEditorDialog: 1241). These are functional but harder to maintain.

2. **Direct Supabase Queries in Components**: Dashboard.tsx and AdvisorDashboard.tsx contain complex multi-table fetches directly in `useEffect`. These work correctly but could benefit from custom hooks for testability.

3. **Evaluate-proposals-batch Has Dead Files**: The edge function directory contains multiple legacy/alternative implementations (`COMBINED_FOR_DASHBOARD.ts`, `COMPLETE_INDEX_FOR_DASHBOARD.ts`, `index_COMPLETE_WITH_FALLBACK.ts`, `index_FIXED.ts`) that are not imported anywhere. These are dead code.

4. **DEFAULT_FEE_CATEGORIES Still Exported**: The `DEFAULT_FEE_CATEGORIES` array in `src/types/rfpRequest.ts` (lines 118-127) is still exported even though we just removed its usage from the service scope dialogs. It may still be imported elsewhere.

5. **Password Sent in Plain Text via Email**: The `manage-users` edge function sends the user's password in the welcome email HTML body (line 163: `<p>סיסמה: ${password}</p>`). While this is an admin-created user flow with forced password change, sending passwords via email is a security anti-pattern.

---

## Current State Summary

The product is **production-ready** with a complete lifecycle:
- Project creation with file management
- Structured RFP creation using admin-configured templates
- Advisor proposal submission with fee tables and services
- AI-powered proposal evaluation
- Negotiation workflow with version tracking
- Proposal approval with digital signatures
- Payment milestone management
- Task board for project execution

The recent fixes (projectType propagation, Hebrew labels, optional service handling, header cleanup) have tightened the template-to-RFP pipeline. The system is stable and the architecture is sound for its current scale.
