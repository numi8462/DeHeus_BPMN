import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Dropdown,
  Form,
  FormControl,
  InputGroup,
  Nav,
  Navbar,
} from "react-bootstrap";
import { FaSearch, FaUserCircle } from "react-icons/fa";
import logo from "../../assets/logos/logo_deheus.png";
import { useNavigate, useParams } from "react-router-dom";
import Swal from 'sweetalert2';

function TopBar({ onLogoClick, userName, projectId }) {
  const API_URL = process.env.REACT_APP_API_URL;
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const logout = () => {
    instance.logoutRedirect().catch((error) => {
      console.error("Logout error:", error);
    });
    localStorage.removeItem('msalToken');
    localStorage.removeItem('msalAccount');
  };

  useEffect(() => {
    if (isAuthenticated) {
      axios
        .get(`${API_URL}/api/diagrams/getAll`, {
          params: { projectId }
        })
        .then((response) => {
          setDiagrams(response.data.result.recordset);
        })
        .catch((error) => {
          console.error("Error fetching processes", error);
        });
    }

  }, [isAuthenticated, projectId]);

  const filteredDiagrams = diagrams.filter(diagram =>
    diagram.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenClick = async (event, item) => {
    event.stopPropagation();

    try {
      const response = await axios.get(`/api/diagrams/get-diagram-with-project/${projectId}/${item.id}/${userName}`);
      if (response.data.fileData) {
        const { diagramName, fileData } = response.data;

        // Replace white space with '-' in diagram name
        const generatedUrl = `/project/${projectId}/${diagramName.replace(/ /g, '-')}`;

        // Navigate to modeler
        navigate(generatedUrl, { state: { itemId: item.id, userName: userName, fileData: fileData } });
      } else {
        // Replace white space with '-' in diagram name
        const generatedUrl = `/project/${projectId}/${item.name.replace(/ /g, '-')}`;
        // Navigate to modeler
        navigate(generatedUrl, { state: { itemId: item.id, userName: userName } });
      }
    } catch (error) {
      console.error("Error fetching diagram data:", error);
      // alert('Failed to open the diagram.');
      Swal.fire({
        title: 'Failed to open the diagram!',
        text: 'Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  return (
    <Navbar style={{ backgroundColor: "#d3e0ea" }} variant="light" expand="lg">
      <Container fluid>
        <Navbar.Brand onClick={onLogoClick} style={{ cursor: "pointer" }}>
          <img
            src={logo}
            height="30"
            className="d-inline-block align-top"
            alt="Company Logo"
          />
        </Navbar.Brand>
        {projectId && (
          <Nav className="mx-auto">
            <Form className="d-flex" style={{ position: 'relative' }}>
              <InputGroup style={{ width: '400px' }}>
                <FormControl
                  type="search"
                  placeholder="Search diagrams"
                  aria-label="Search"
                  aria-describedby="search-addon"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <InputGroup.Text id="search-addon">
                  <FaSearch />
                </InputGroup.Text>
              </InputGroup>
              {searchQuery && (
                <Dropdown.Menu show style={{ position: 'absolute', top: '100%', left: 0, right: 0, width: '100%' }}>
                  {filteredDiagrams.length > 0 ? (
                    filteredDiagrams.map((diagram) => (
                      <Dropdown.Item key={diagram.id} onClick={(event) => handleOpenClick(event, diagram)}>
                        {diagram.name}
                      </Dropdown.Item>
                    ))
                  ) : (
                    <Dropdown.Item>No results found</Dropdown.Item>
                  )}
                </Dropdown.Menu>
              )}
            </Form>
          </Nav>
        )}
        <Nav>
          <Dropdown>
            <Dropdown.Toggle as={Nav.Item}>
              <span
                style={{
                  marginRight: "10px",
                  fontSize: "1rem",
                  color: "#6c757d",
                }}
              >
                {userName}
              </span>
              <FaUserCircle
                size={30}
                style={{ marginRight: "5px", color: "#fff" }}
              />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item href="/mypage">My Page</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={logout}>Logout</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Nav>
      </Container>
    </Navbar>
  );
}

export default TopBar;
