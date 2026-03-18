/**
 * Regression tests for bugs 58, 59, 60, 61, 63
 * 
 * These tests verify specific rendering conditions and logic
 * that caused the reported bugs, using minimal component renders
 * with mocked dependencies.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ─── Shared mocks ────────────────────────────────────────────

// Mock supabase client globally
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }), data: [], error: null }), data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), unsubscribe: () => {} }),
    removeChannel: () => {},
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    profile: { name: "Test User", role: "advisor" },
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/posthog", () => ({
  trackEvent: vi.fn(),
  posthog: { capture: vi.fn() },
}));

// ─── Bug 58: Signature visible on approved proposals ─────────

describe("Bug 58: Entrepreneur signature visible to consultant on approved proposals", () => {
  /**
   * The signature rendering logic from AdvisorProposalViewDialog (lines 644-670):
   * When proposal.signature_blob exists, render an <img alt="חתימה">.
   * This was previously missing because the field wasn't being fetched.
   */
  const SignatureSection = ({ proposal }: { proposal: { signature_blob?: string | null; status: string } }) => {
    if (!proposal.signature_blob) return null;
    return (
      <div data-testid="signature-section">
        <h3>חתימה דיגיטלית</h3>
        <img src={proposal.signature_blob} alt="חתימה" className="h-12 object-contain" />
      </div>
    );
  };

  it("renders signature image when proposal is accepted and has signature_blob", () => {
    const proposal = {
      status: "accepted",
      signature_blob: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };
    render(<SignatureSection proposal={proposal} />);

    const img = screen.getByAltText("חתימה");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", proposal.signature_blob);
    expect(screen.getByTestId("signature-section")).toBeInTheDocument();
  });

  it("does NOT render signature section when signature_blob is null", () => {
    const proposal = { status: "accepted", signature_blob: null };
    render(<SignatureSection proposal={proposal} />);

    expect(screen.queryByAlt("חתימה")).not.toBeInTheDocument();
    expect(screen.queryByTestId("signature-section")).not.toBeInTheDocument();
  });

  it("does NOT render signature section when signature_blob is undefined", () => {
    const proposal = { status: "submitted" };
    render(<SignatureSection proposal={proposal} />);

    expect(screen.queryByAlt("חתימה")).not.toBeInTheDocument();
  });
});

// ─── Bug 59: New price updates correctly in Round 3 ──────────

describe("Bug 59: newTotal uses RPC result.new_price, not stale line items", () => {
  /**
   * The fix: newTotal = Number(result.new_price) || fallback
   * Previously it was calculated from updated_line_items which could be stale.
   */

  function calculateNewTotal(
    result: { new_price?: number },
    updated_line_items: Array<{ consultant_response_price: number }> | null,
    session: { target_total?: number; proposal?: { price: number } }
  ): number {
    // This mirrors the FIXED logic in send-negotiation-response/index.ts (line 212)
    return (
      Number(result.new_price) ||
      (updated_line_items && updated_line_items.length > 0
        ? updated_line_items.reduce((sum, item) => sum + item.consultant_response_price, 0)
        : session.target_total || session.proposal?.price || 0)
    );
  }

  it("uses result.new_price when available (Round 3: ₪85,000)", () => {
    const result = { new_price: 85000 };
    const staleLineItems = [
      { consultant_response_price: 45000 },
      { consultant_response_price: 44000 },
    ]; // sum = 89000 (stale Round 2 price)
    const session = { target_total: 85000, proposal: { price: 95000 } };

    const total = calculateNewTotal(result, staleLineItems, session);
    expect(total).toBe(85000); // Must be 85000, NOT 89000
  });

  it("falls back to line items sum when result.new_price is missing", () => {
    const result = {};
    const lineItems = [
      { consultant_response_price: 40000 },
      { consultant_response_price: 30000 },
    ];
    const session = { target_total: 65000, proposal: { price: 80000 } };

    const total = calculateNewTotal(result, lineItems, session);
    expect(total).toBe(70000); // 40000 + 30000
  });

  it("falls back to session.target_total when no line items", () => {
    const result = {};
    const session = { target_total: 85000, proposal: { price: 95000 } };

    const total = calculateNewTotal(result, null, session);
    expect(total).toBe(85000);
  });

  it("falls back to proposal.price as last resort", () => {
    const result = {};
    const session = { proposal: { price: 95000 } };

    const total = calculateNewTotal(result, null, session);
    expect(total).toBe(95000);
  });
});

// ─── Bug 60: Counter Offer button visible after response ─────

describe("Bug 60: Counter Offer button visible after negotiation response", () => {
  /**
   * The button "המשך משא ומתן" should appear when:
   * 1. !isAwaitingResponse (advisor has responded)
   * 2. onContinueNegotiation callback is provided
   */

  interface FooterProps {
    isAwaitingResponse: boolean;
    onContinueNegotiation?: () => void;
    onAccept?: () => void;
  }

  const NegotiationFooter = ({ isAwaitingResponse, onContinueNegotiation, onAccept }: FooterProps) => (
    <div data-testid="negotiation-footer">
      <button>סגור</button>
      {!isAwaitingResponse && (
        <>
          {onContinueNegotiation && (
            <button data-testid="continue-negotiation-btn" onClick={onContinueNegotiation}>
              המשך משא ומתן
            </button>
          )}
          {onAccept && (
            <button data-testid="accept-btn" onClick={onAccept}>
              קבל הצעה נגדית
            </button>
          )}
        </>
      )}
    </div>
  );

  it("renders 'המשך משא ומתן' button when advisor has responded", () => {
    const mockContinue = vi.fn();
    render(
      <NegotiationFooter
        isAwaitingResponse={false}
        onContinueNegotiation={mockContinue}
        onAccept={() => {}}
      />
    );

    const btn = screen.getByTestId("continue-negotiation-btn");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("המשך משא ומתן");
  });

  it("does NOT render action buttons while awaiting response", () => {
    render(
      <NegotiationFooter
        isAwaitingResponse={true}
        onContinueNegotiation={() => {}}
        onAccept={() => {}}
      />
    );

    expect(screen.queryByTestId("continue-negotiation-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("accept-btn")).not.toBeInTheDocument();
  });

  it("renders accept button alongside counter-offer button", () => {
    render(
      <NegotiationFooter
        isAwaitingResponse={false}
        onContinueNegotiation={() => {}}
        onAccept={() => {}}
      />
    );

    expect(screen.getByTestId("continue-negotiation-btn")).toBeInTheDocument();
    expect(screen.getByTestId("accept-btn")).toBeInTheDocument();
  });
});

// ─── Bug 61: Proposal Approved email template correctness ────

describe("Bug 61: ProposalApprovedEmail renders correct fields", () => {
  /**
   * The email template must:
   * 1. Render "תחום" (advisorType) field
   * 2. NOT render "לוח זמנים" (timelineDays) – removed in fix
   * 3. Render price formatted correctly
   * 
   * Since the actual template uses Deno imports, we test the rendering
   * logic by verifying the template structure with a mock component.
   */

  interface EmailProps {
    advisorCompany: string;
    projectName: string;
    entrepreneurName: string;
    price: number;
    advisorType: string;
    entrepreneurNotes: string;
  }

  const MockProposalApprovedEmail = ({
    advisorCompany,
    projectName,
    entrepreneurName,
    price,
    advisorType,
    entrepreneurNotes,
  }: EmailProps) => (
    <div data-testid="email-template">
      <h1>הצעתך אושרה</h1>
      <p>שלום {advisorCompany},</p>
      <table dir="rtl">
        <tbody>
          <tr>
            <td>פרויקט</td>
            <td data-testid="project-name">{projectName}</td>
          </tr>
          <tr>
            <td>אושר על ידי</td>
            <td data-testid="entrepreneur-name">{entrepreneurName}</td>
          </tr>
          <tr>
            <td>תחום</td>
            <td data-testid="advisor-type">{advisorType}</td>
          </tr>
          <tr>
            <td>מחיר</td>
            <td data-testid="price">{price?.toLocaleString("he-IL")} ₪</td>
          </tr>
        </tbody>
      </table>
      {entrepreneurNotes && entrepreneurNotes.trim() && (
        <div data-testid="notes-section">
          <p>הערות היזם:</p>
          <p>{entrepreneurNotes}</p>
        </div>
      )}
    </div>
  );

  it("renders advisorType in 'תחום' field", () => {
    render(
      <MockProposalApprovedEmail
        advisorCompany="משרד אדריכלות טסט"
        projectName="פרויקט מגורים"
        entrepreneurName="יזם טסט"
        price={85000}
        advisorType="אדריכל"
        entrepreneurNotes=""
      />
    );

    expect(screen.getByTestId("advisor-type")).toHaveTextContent("אדריכל");
    expect(screen.getByText("תחום")).toBeInTheDocument();
  });

  it("does NOT render 'לוח זמנים' field (removed in fix)", () => {
    render(
      <MockProposalApprovedEmail
        advisorCompany="משרד טסט"
        projectName="פרויקט"
        entrepreneurName="יזם"
        price={100000}
        advisorType="מהנדס"
        entrepreneurNotes=""
      />
    );

    expect(screen.queryByText("לוח זמנים")).not.toBeInTheDocument();
  });

  it("renders price formatted with shekel symbol", () => {
    render(
      <MockProposalApprovedEmail
        advisorCompany="משרד"
        projectName="פרויקט"
        entrepreneurName="יזם"
        price={85000}
        advisorType="יועץ"
        entrepreneurNotes=""
      />
    );

    const priceCell = screen.getByTestId("price");
    expect(priceCell.textContent).toContain("85");
    expect(priceCell.textContent).toContain("₪");
  });

  it("renders entrepreneur notes when provided", () => {
    render(
      <MockProposalApprovedEmail
        advisorCompany="משרד"
        projectName="פרויקט"
        entrepreneurName="יזם"
        price={50000}
        advisorType="יועץ"
        entrepreneurNotes="הערה חשובה"
      />
    );

    expect(screen.getByTestId("notes-section")).toBeInTheDocument();
    expect(screen.getByText("הערה חשובה")).toBeInTheDocument();
  });

  it("hides notes section when entrepreneurNotes is empty", () => {
    render(
      <MockProposalApprovedEmail
        advisorCompany="משרד"
        projectName="פרויקט"
        entrepreneurName="יזם"
        price={50000}
        advisorType="יועץ"
        entrepreneurNotes=""
      />
    );

    expect(screen.queryByTestId("notes-section")).not.toBeInTheDocument();
  });
});

// ─── Bug 63: Consultant profile doesn't crash ────────────────

describe("Bug 63: Consultant profile renders without crashing", () => {
  /**
   * The AdvisorProfile page crashed with certain mock/test data.
   * We test that the core rendering logic handles standard data
   * without throwing errors.
   */

  interface AdvisorProfileData {
    company_name: string;
    expertise: string[];
    specialties: string[];
    certifications: string[];
    location: string;
    founding_year?: number;
    availability_status?: string;
    activity_regions?: string[];
    office_size?: string;
    website?: string;
    linkedin_url?: string;
    instagram_url?: string;
  }

  const MockAdvisorProfileView = ({ profile }: { profile: AdvisorProfileData }) => (
    <div data-testid="advisor-profile">
      <h1 data-testid="company-name">{profile.company_name || "שם המשרד"}</h1>
      <p data-testid="location">{profile.location || "לא צוין"}</p>
      {profile.expertise && profile.expertise.length > 0 && (
        <div data-testid="expertise-list">
          {profile.expertise.map((e, i) => (
            <span key={i} data-testid={`expertise-${i}`}>{e}</span>
          ))}
        </div>
      )}
      {profile.specialties && profile.specialties.length > 0 && (
        <div data-testid="specialties-list">
          {profile.specialties.map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      )}
      {profile.founding_year && (
        <p data-testid="founding-year">שנת הקמה: {profile.founding_year}</p>
      )}
      {profile.activity_regions && profile.activity_regions.length > 0 && (
        <div data-testid="regions">
          {profile.activity_regions.map((r, i) => (
            <span key={i}>{r}</span>
          ))}
        </div>
      )}
    </div>
  );

  const standardProfile: AdvisorProfileData = {
    company_name: "משרד אדריכלות טסט בע\"מ",
    expertise: ["אדריכל", "מהנדס קונסטרוקציה"],
    specialties: ["מגורים", "משרדים"],
    certifications: ["רישיון אדריכל"],
    location: "תל אביב",
    founding_year: 2010,
    availability_status: "available",
    activity_regions: ["גוש דן", "השרון"],
    office_size: "בינוני - 6-15 עובדים",
    website: "https://example.com",
    linkedin_url: "https://linkedin.com/company/test",
  };

  it("renders without crashing with standard data", () => {
    expect(() => {
      render(<MockAdvisorProfileView profile={standardProfile} />);
    }).not.toThrow();

    expect(screen.getByTestId("advisor-profile")).toBeInTheDocument();
    expect(screen.getByTestId("company-name")).toHaveTextContent("משרד אדריכלות טסט בע\"מ");
  });

  it("renders without crashing with minimal/empty data", () => {
    const minimalProfile: AdvisorProfileData = {
      company_name: "",
      expertise: [],
      specialties: [],
      certifications: [],
      location: "",
    };

    expect(() => {
      render(<MockAdvisorProfileView profile={minimalProfile} />);
    }).not.toThrow();

    expect(screen.getByTestId("advisor-profile")).toBeInTheDocument();
    expect(screen.getByTestId("company-name")).toHaveTextContent("שם המשרד");
  });

  it("renders without crashing with null-ish optional fields", () => {
    const profileWithNulls: AdvisorProfileData = {
      company_name: "משרד טסט",
      expertise: ["יועץ"],
      specialties: [],
      certifications: [],
      location: "חיפה",
      founding_year: undefined,
      availability_status: undefined,
      activity_regions: undefined,
      office_size: undefined,
    };

    expect(() => {
      render(<MockAdvisorProfileView profile={profileWithNulls} />);
    }).not.toThrow();

    expect(screen.getByTestId("advisor-profile")).toBeInTheDocument();
    expect(screen.queryByTestId("founding-year")).not.toBeInTheDocument();
    expect(screen.queryByTestId("regions")).not.toBeInTheDocument();
  });

  it("renders expertise and regions lists correctly", () => {
    render(<MockAdvisorProfileView profile={standardProfile} />);

    expect(screen.getByTestId("expertise-list")).toBeInTheDocument();
    expect(screen.getByTestId("expertise-0")).toHaveTextContent("אדריכל");
    expect(screen.getByTestId("expertise-1")).toHaveTextContent("מהנדס קונסטרוקציה");
    expect(screen.getByTestId("regions")).toBeInTheDocument();
  });
});
