import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {

  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
    redirectUri: `${process.env.REACT_APP_FRONTEND_URL}/main`,
    // postLogoutRedirectUri: "/",
    // navigateToLoginRequestUrl: false,
  },
  cache: {
      cacheLocation: "localStorage", // Use localStorage instead of sessionStorage
      storeAuthStateInCookie: true, // Recommended to use in browsers to prevent auth errors
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ["User.Read"],
};
