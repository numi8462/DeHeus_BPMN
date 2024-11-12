import axios from 'axios';
import { loginRequest } from "../config/authConfig";
const API_URL = process.env.REACT_APP_API_URL;

export const verifyUserRegistration = async (accessToken, navigate, setLoginError, handleLogout) => {
  try {
    const response = await axios.post(`${API_URL}/api/authenticate`, {
      token: accessToken,
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.status === 200 && response.data.isAuthenticated) {
      navigate("/main");
    } else {
      setLoginError('Email is not registered.');
      handleLogout();
    }
  } catch (error) {
    console.error('Server error:', error);
    setLoginError('Server error occurred.');
  }
};

export const handleLoginRedirect = async (instance, accounts, account, navigate, setLoginError, acquireToken) => {
  if (!accounts.length) {
    try {
      const loginResponse = await instance.loginPopup(loginRequest);
      instance.setActiveAccount(loginResponse.account);
      localStorage.setItem('msalAccount', loginResponse.account.username);
      await acquireToken(instance, loginResponse.account, navigate, setLoginError);
    } catch (error) {
      console.error('Login popup error:', error);
      setLoginError('Login failed with popup.');
    }
  } else {
    await acquireToken(instance, account, navigate, setLoginError);
  }
};

export const acquireToken = async (instance, account, navigate, setLoginError) => {
  try {
    const loginResponse = await instance.acquireTokenSilent({
      ...loginRequest,
      account: account
    });
    localStorage.setItem('msalToken', loginResponse.accessToken);
    await verifyUserRegistration(loginResponse.accessToken, navigate, setLoginError, handleLogout);
  } catch (error) {
    console.error('Error acquiring token:', error);
    setLoginError('Login failed.');
    localStorage.removeItem('msalToken');
    localStorage.removeItem('msalAccount');
  }
};

export const handleLogout = (instance, navigate) => {
  instance.logout();
  localStorage.removeItem('msalToken');
  localStorage.removeItem('msalAccount');
  navigate("/");
};
