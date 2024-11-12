import React from "react";
import { Button, Card, Container } from "react-bootstrap";
import { FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function NoAuth() {
  const navigate = useNavigate();
  const goHome = () => {
    navigate("/");
  };

  return (
    <Container className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light text-dark">
      <Card className="text-center" style={{ minHeight: "50vh", width: "60%" }}>
        <Card.Body className="d-flex flex-column justify-content-center align-items-center">
          <FaLock size={100} className="text-warning mb-4" />
          <Card.Title className="display-4">Access Denied</Card.Title>
          <Card.Text className="lead">
            You need to be authenticated to access this page. Please sign in to
            continue. (Design to be edited.)
          </Card.Text>
          <Button variant="primary" size="lg" onClick={goHome} className="mt-4">
            Go to Home
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default NoAuth;
