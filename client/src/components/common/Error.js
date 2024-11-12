import React from "react";
import { Button } from "react-bootstrap";
import { FaExclamationTriangle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function Error() {
  const navigate = useNavigate();
  const goHome = () => {
    navigate("/");
  };

  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light text-dark">
      <FaExclamationTriangle size={100} className="text-warning mb-4" />
      <h1 className="display-1">404</h1>
      <p className="lead">Page Not Found. (Design to be edited further.)</p>
      <Button variant="primary" onClick={goHome} className="mt-4">
        Go to Home
      </Button>
    </div>
  );
}

export default Error;
