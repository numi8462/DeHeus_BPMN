import { useMsal, useIsAuthenticated, useAccount } from "@azure/msal-react";
import React, { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../assets/backgrounds/home_background.png";
import logo from "../assets/logos/logo_deheus.png";
import { verifyUserRegistration, handleLoginRedirect, acquireToken, handleLogout } from '../utils/authUtils';


function Home() {
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0]);
  const [loginError, setLoginError] = useState('');
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    if (account && localStorage.getItem('msalAccount')) {
        verifyUserRegistration(localStorage.getItem('msalToken'), navigate, setLoginError, () => handleLogout(instance, navigate));
    }
  }, [account, isAuthenticated, accounts]);

  const handleLogin = async () => {
    await handleLoginRedirect(instance, accounts, account, navigate, setLoginError, acquireToken);
  };

  return (
    <div className="d-flex flex-column justify-content-center align-items-start vh-100" style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', minHeight: '100vh' }}>
      <div style={{ marginLeft: "15%", color: "#004085" }}>
        <img src={logo} alt="De Heus Logo" style={{ width: "120px", marginBottom: "25px" }} />
        <h1 className="display-1 mb-3">De Heus<span className="d-block">BPMN Tool</span></h1>
        <p className="lead">
        </p>
        <Button
          onClick={handleLogin}
          size="lg"
          className="mt-4"
          style={{ backgroundColor: "#2A85E2", width: "30%"}}
        >
          Start
        </Button>
        {loginError && <p className="text-danger mt-3">{loginError}</p>}
      </div>
    </div>
  );
}

export default Home;
