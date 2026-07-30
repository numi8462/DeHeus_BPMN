import * as MsalReact from "@azure/msal-react";

// Temporary MSAL/SSO bypass for dev/demo use, per explicit request.
// Set REACT_APP_MOCK_AUTH=true to skip real Azure AD login entirely.
// Every file that used to import useIsAuthenticated/useMsal/useAccount/MsalProvider
// from "@azure/msal-react" now imports them from here instead; when the flag
// is off, this just re-exports the real msal-react hooks unchanged.
const MOCK_AUTH = process.env.REACT_APP_MOCK_AUTH === "true";
const MOCK_EMAIL = process.env.REACT_APP_MOCK_EMAIL || "dev.pbmn@deheus.com";
const MOCK_NAME = "Dev User";

function base64url(obj) {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// authController.authenticateUser only jwt.decode()s the token (no signature
// verification), so a syntactically valid unsigned JWT with the right claims
// is accepted as long as a matching row exists in the "user" table.
function createMockToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "none", typ: "JWT", nonce: "mock-nonce" };
  const payload = {
    unique_name: MOCK_EMAIL,
    name: MOCK_NAME,
    oid: "mock-oid",
    tid: "mock-tenant",
    iat: now,
    exp: now + 3600,
    idp: "mock",
    uti: "mock-uti",
    aud: "mock-aud",
  };
  return `${base64url(header)}.${base64url(payload)}.mocksignature`;
}

const mockAccount = { username: MOCK_EMAIL, name: MOCK_NAME };

const mockInstance = {
  loginPopup: async () => ({ account: mockAccount }),
  loginRedirect: async () => {},
  logoutRedirect: async () => {},
  logout: () => {},
  setActiveAccount: () => {},
  acquireTokenSilent: async () => ({ accessToken: createMockToken(), account: mockAccount }),
};

export const MsalProvider = MOCK_AUTH ? ({ children }) => children : MsalReact.MsalProvider;
export const useIsAuthenticated = MOCK_AUTH ? () => true : MsalReact.useIsAuthenticated;
export const useMsal = MOCK_AUTH ? () => ({ instance: mockInstance, accounts: [mockAccount] }) : MsalReact.useMsal;
export const useAccount = MOCK_AUTH ? () => mockAccount : MsalReact.useAccount;
