
## 🚨 PRODUCTION DEPLOYMENT SANITY CHECK REPORT

### ⚠️ CRITICAL ISSUES (Must Fix Before Deploy)

#### 1. **"Failed to Fetch" Network Errors** (SEVERITY: HIGH)
**Issue:** Console logs show repeated `TypeError: Failed to fetch` errors during previous sessions. This indicates:
- CORS issues with edge functions or external APIs
- Network connectivity problems in preview environment
- Possible fetch timeouts or unhandled promise rejections

**Action Required:**
- Test all API calls in production environment
- Check edge function deployments and CORS headers
- Verify all external service connectivity (Resend, Supabase, AI models)
- Monitor network tab during full user workflow (RFP creation → Proposal submission → Approval)

---

#### 2. **RLS Policy Security Issues** (SEVERITY: HIGH)
**Issue:** Database linter found overly permissive RLS policies with `USING (true)` or `WITH CHECK (true)` on UPDATE/DELETE operations
- Multiple tables have policies allowing unrestricted modifications
- This bypasses row-level security completely

**Action Required:**
- Review and fix all RLS policies with `USING (true)` on INSERT/UPDATE/DELETE
- Ensure all UPDATE/DELETE operations validate ownership (e.g., `user_id = auth.uid()`)
- Use `has_role()` function for admin-only operations instead of `true` checks

---

#### 3. **Exposed User Contact Information** (SEVERITY: HIGH)
**Issue:** The `auth.users` and `profiles` tables contain emails, phone numbers, and personal data but appear to have public read access
- Violates privacy regulations (GDPR, privacy laws)
- Could expose PII to unauthorized users

**Action Required:**
- Verify RLS policies on `profiles` table restrict SELECT to authenticated users only viewing their own records
- Add policies: `auth.uid() = id` for personal data access
- Create a `public_profiles` view without email/phone for public-facing features
- Review other tables with sensitive data (advisors, companies, etc.)

---

### ⚠️ CRITICAL WARNINGS (Address Before Deploy)

#### 4. **Function Search Path Not Set** (SEVERITY: MEDIUM)
**Issue:** Multiple database functions lack `search_path` configuration, creating injection vulnerability risks
- Affects ~4 functions based on linter warnings
- Could allow SQL injection through function parameter manipulation

**Action Required:**
- Verify all functions already have `set search_path = public` (they appear to based on agent_security findings)
- If not, add `set search_path = public` to function definitions
- Document all SECURITY DEFINER functions

---

#### 5. **Materialized View Accessible via API** (SEVERITY: MEDIUM)
**Issue:** Materialized views exposed through Supabase Data API may not have RLS policies applied
- Could expose aggregated/sensitive data without access control

**Action Required:**
- Identify which materialized view is accessible
- Either: add RLS policies or restrict API access via function wrapper

---

#### 6. **Auth Configuration Issues** (SEVERITY: MEDIUM)
**Issues Found:**
- OTP expiry exceeds recommended threshold (default 24h, should be ≤15 min)
- Leaked password protection is disabled
- PostgreSQL has available security patches

**Action Required:**
- Reduce OTP expiry in Supabase Auth settings (Project Settings → Authentication)
- Enable leaked password protection in Auth settings
- Schedule PostgreSQL version upgrade

---

### ✅ VERIFIED & SECURE

- ✅ SECURITY DEFINER functions reviewed - all have proper authorization checks
- ✅ Proposal submission token validation (though client-side validation noted)
- ✅ Admin role system uses `has_role()` function correctly
- ✅ Project ownership validation implemented in key functions
- ✅ Chart component CSS injection is safe (static content only)

---

### 📋 FUNCTIONAL CHECKLIST

**Critical Features to Test:**
- [ ] RFP Creation → Send Invitations → Proposal Submission flow (end-to-end)
- [ ] Proposal Approval workflow with signature requirement
- [ ] Task creation, assignment, and dependency blocking
- [ ] Advisor task view and filtering
- [ ] Payment milestone calculations and tracking
- [ ] Negotiation workflow (request → response → amendment)
- [ ] File uploads and retrieval
- [ ] Email notifications (RFP invites, proposal submissions, approvals)
- [ ] Role-based access (entrepreneur can't see other entrepreneur's data)
- [ ] Admin dashboard functionality

**Recent Changes to Verify:**
- [ ] Kanban board 5-column layout displays correctly
- [ ] Dependency indicators showing on task cards
- [ ] Comment counters on task detail dialog
- [ ] RTL alignment in all task views
- [ ] Advisor tasks tab visible in advisor dashboard
- [ ] Task progress/milestone color coding

---

### 🔐 SECURITY HARDENING RECOMMENDATIONS

**Before Production:**
1. Enable HTTPS enforcement (should be automatic on Lovable Cloud)
2. Set secure HTTP headers (CSP, X-Frame-Options, etc.)
3. Enable rate limiting on auth endpoints
4. Test CSRF protection
5. Verify all sensitive operations require re-authentication

**Post-Deployment Monitoring:**
1. Monitor database error logs for RLS policy violations
2. Track failed authentication attempts
3. Watch for unusual data access patterns
4. Set up email alerts for critical errors
5. Regular security audit of RLS policies

---

### 🔧 DEPLOYMENT BLOCKERS

| Issue | Status | Action |
|-------|--------|--------|
| Network fetch errors | INVESTIGATE | Test in production environment |
| RLS policies (`USING (true)` on UPDATE/DELETE) | FIX REQUIRED | Add proper ownership checks |
| PII exposure (emails, phone in profiles) | FIX REQUIRED | Add RLS policies restricting access |
| Function search_path | VERIFY | Confirm `set search_path = public` is set |
| Materialized view exposure | INVESTIGATE | Identify and secure |
| OTP expiry/password protection | CONFIGURE | Update auth settings |
| PostgreSQL patches | UPGRADE | Schedule upgrade |

---

### ✨ RECOMMENDATION

**Do NOT deploy to production until:**
1. RLS policies are fixed (especially UPDATE/DELETE with `true` checks)
2. User data exposure is mitigated (add `auth.uid()` checks on personal data)
3. Network fetch errors are diagnosed and resolved in staging
4. Auth settings are hardened (OTP expiry, password protection)

**Timeline Estimate:**
- Security fixes: 2-4 hours
- Testing: 1-2 hours
- Deployment: 30 minutes

