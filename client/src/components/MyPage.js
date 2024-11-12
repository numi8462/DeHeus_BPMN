import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Col, ListGroup, Row, Table } from "react-bootstrap";
import { BsClock, BsThreeDots } from "react-icons/bs";
import { FaSortDown, FaSortUp, FaUserCircle } from "react-icons/fa";
import { MdOpenInNew } from "react-icons/md";
import LeftNavBar from "./common/LeftNavBar";
import TopBar from "./common/TopBar";
import { useNavigate } from "react-router-dom";
import { convertUTCToLocal } from '../utils/utils';
import '../styles/MyPage.css';


function MyPage() {
  const API_URL = process.env.REACT_APP_API_URL;
  const isAuthenticated = useIsAuthenticated();
  const [userName, setUserName] = useState("");
  const { accounts } = useMsal();
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    position: "",
  });

  const [checkedOutDiagrams, setCheckedOutDiagrams] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  const handleOpenClick = async (event, item) => {
    event.stopPropagation();
    axios.get(`${API_URL}/api/diagram/getDraft`, {
      params: { diagramId: item.id, userEmail: userName }
    })
      .then((res) => {
        const fileData = res.data.fileData;
        const generatedUrl = `/project/${item.projectId}/${item.name.replace(/ /g, '-')}`;
        navigate(generatedUrl, { state: { itemId: item.id, userName: userName, fileData: fileData } });
      })
      .catch(err => {
        console.error(err);
      });
  };

  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      setUserName(accounts[0].username);

      const identifier = accounts[0].username.split('@')[0];

      axios.get(`${API_URL}/api/mypage/user/${identifier}`)
        .then(response => {
          const data = response.data;
          // Format user data
          setUserInfo({
            name: data.name || "N/A",
            email: data.email || "N/A",
            department: data.department || "N/A",
          });

          // Format diagram data that user checked out  
          setCheckedOutDiagrams(data.checkedOutDiagrams.map(diagram => ({
            id: diagram.id,
            projectId: diagram.projectId,
            name: diagram.name,
            time: diagram.time
          })));

          // Format activity log
          setActivityLog(data.activityLog.map(log => ({
            activity: `${log.activity} [${log.diagram_name}] in [${log.project_name}]`,
            date: convertUTCToLocal(log.date),
          })));

        })
        .catch(error => {
          console.error("Error fetching user info", error);
        });
    }
  }, [isAuthenticated, accounts]);

  const [isNavVisible, setIsNavVisible] = useState(false);
  const toggleNav = () => {
    setIsNavVisible(!isNavVisible);
  };

  const [sortAscending, setSortAscending] = useState(false);

  const sortActivities = () => {
    setSortAscending(!sortAscending);
  };

  activityLog.sort((a, b) => {
    if (sortAscending) {
      return new Date(a.date) - new Date(b.date);
    } else {
      return new Date(b.date) - new Date(a.date);
    }
  });

  return (
    <div className="myPage">
      <TopBar onLogoClick={toggleNav} userName={userName} />
      <div className="d-flex">
        {isNavVisible && <LeftNavBar />}
        <div style={{ flexGrow: 1 }}>
          <div className="d-flex flex-column align-items-center w-100 vh-100 bg-light text-dark">
            <div className="mt-4" style={{ width: "85%" }}>
              <Row style={{ height: "20vh", marginBottom: "20px" }}>
                <Col style={{ width: "100%" }}>
                  <h5>User Information</h5>
                  <ListGroup>
                    <ListGroup.Item
                      className="d-flex"
                      style={{ paddingTop: "15px", paddingBottom: "15px" }}
                    >
                      <Col
                        xs={2}
                        style={{
                          maxWidth: "10%",
                          marginRight: "10px",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <FaUserCircle size={60} />
                      </Col>
                      <Col className="d-flex flex-column">
                        <strong>Name: {userInfo.name}</strong>
                        <span>Email: {userInfo.email}</span>
                        <span>Department: {userInfo.department}</span>
                      </Col>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </Row>
              <Row style={{ height: "80vh" }}>
                <Col md={5}>
                  <h5>Checked Out Diagrams</h5>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <Table bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Diagram</th>
                          <th>Remaining Time</th>
                          <th>
                            <BsThreeDots />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkedOutDiagrams.map((diagram, index) => (
                          <tr key={index}>
                            <td>{diagram.name}</td>
                            <td>
                              <BsClock
                                style={{
                                  marginLeft: "3px",
                                  marginRight: "7px",
                                  color:
                                    diagram.time >= 7
                                      ? "#4CAF50"
                                      : diagram.time < 3
                                        ? "#F44336"
                                        : "#FFEB3B",
                                }}
                                size={19}
                              />{" "}
                              {diagram.time} days left
                            </td>
                            <td>
                              <MdOpenInNew style={{ cursor: "pointer" }} onClick={(event) => handleOpenClick(event, diagram)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                </Col>
                <Col md={7}>
                  <h5>Activity Log</h5>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <Table bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Activity</th>
                          <th style={{ cursor: "pointer" }} onClick={sortActivities}>
                            Date {sortAscending ? <FaSortUp /> : <FaSortDown />}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLog.map((log, index) => (
                          <tr key={index}>
                            <td>{log.activity}</td>
                            <td>{log.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                </Col>
              </Row>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyPage;