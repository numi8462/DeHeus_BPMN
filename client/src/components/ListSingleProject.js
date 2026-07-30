import { useIsAuthenticated, useMsal } from "../config/mockAuth";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { BsClock } from "react-icons/bs";
import {
  Button,
  Form,
  Modal,
  Table,
  ToggleButton,
  ToggleButtonGroup,
} from "react-bootstrap";
import {
  BsChevronDown,
  BsChevronRight,
  BsDiagram3,
  BsFillPlusCircleFill,
} from "react-icons/bs";
import { useNavigate, useParams } from "react-router-dom";
import LeftNavBar from "./common/LeftNavBar";
import TopBar from "./common/TopBar";
import { formatProcessInfos } from '../utils/utils';
import Swal from 'sweetalert2';


function ListSingleProject() {
  const API_URL = process.env.REACT_APP_API_URL;
  const { projectId } = useParams();
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  const userName = accounts[0].username;
  const [processes, setProcesses] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const navigate = useNavigate();
  const [options, setOptions] = useState([{ id: "", name: "<None>" }]);
  const [projectName, setProjectName] = useState([]);
  const [userRole, setUserRole] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      axios
        .get(`${API_URL}/api/processes/${projectId}`, {
          params: { userName }
        })
        .then((response) => {
          const formattedProcesses = formatProcessInfos(response.data.processes);
          setProcesses(formattedProcesses);
          setProjectName(response.data.projectName);
          setOptions([...options, ...response.data.processes.map(process => ({
            id: process.id,
            name: process.name
          }))]);
          const userRole = response.data.role;
          setUserRole(userRole);  // set user role to show the add diagram button only to editors
        })
        .catch((error) => {
          console.error("Error fetching processes", error);
        });
    }
  }, [isAuthenticated, projectId]);

  const toggleRow = (id) => {
    setExpandedRows(
      expandedRows.includes(id)
        ? expandedRows.filter((rowId) => rowId !== id)
        : [...expandedRows, id]
    );
  };


  const handleOpenClick = async (event, item) => {
    event.stopPropagation();

    try {
      const response = await axios.get(`${API_URL}/api/diagrams/get-diagram-with-project/${projectId}/${item.id}/${userName}`);
      if (response.data.fileData) {
        const { diagramName, fileData } = response.data;

        const generatedUrl = `/project/${projectId}/${diagramName.replace(/ /g, '-')}`;

        // Navigate to modeler
        navigate(generatedUrl, { state: { itemId: item.id, userName: userName, fileData: fileData } });
      } else {
        if (response.data.message && response.data.message.startsWith("available")) {
          const generatedUrl = `/project/${projectId}/${item.name.replace(/ /g, '-')}`;
          navigate(generatedUrl, { state: { itemId: item.id, userName: userName, fileData: null } });
        } else {
          // alert("Publishing in progress");
          Swal.fire({
            title: 'Publishing in progress!',
            text: 'Please try again after the diagram is published.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
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


  const renderRow = (item, level = 0) => {
    if (level > 2) return;
    const isExpanded = expandedRows.includes(item.id);
    const hasChildren = level < 2 && item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.id}>
        <tr
          className={`process-row level-${level}`}
          onClick={(event) => handleOpenClick(event, item)}
        >
          <td style={{ paddingLeft: level * 20 + 16 + "px" }}>
            <div className="process-name-cell">
              <span
                className="process-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  hasChildren && toggleRow(item.id);
                }}
                style={{ visibility: hasChildren ? "visible" : "hidden" }}
              >
                {isExpanded ? <BsChevronDown size={12} /> : <BsChevronRight size={12} />}
              </span>
              <span className="process-name-icon">
                <BsDiagram3 size={15} />
              </span>
              <span className="process-name-text">{item.name}</span>
            </div>
          </td>
          <td>
            {item.status && item.status.trim() !== "" && (
              <span className="process-status-badge">
                <BsClock size={13} style={{ color: item.statusColor }} />
                {item.status}
              </span>
            )}
          </td>
          <td>{item.last_update}</td>
          <td>
            <BsChevronRight className="process-row-open-hint" size={14} title="Open" />
          </td>
        </tr>
        {isExpanded &&
          hasChildren &&
          item.children.map((child) => renderRow(child, level + 1))}
      </React.Fragment>
    );
  };

  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState("Process");
  const [processName, setProcessName] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("");
  const [diagramName, setDiagramName] = useState("");

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleCreate = () => {
    if (formType === "Process" && processName !== "") {
      axios.post(`${API_URL}/api/processes/add`, {
        projectId: projectId,
        processName: processName,
        userEmail: userName
      })
        .then(res => {
          window.location.reload();
        })
        .catch(err => {
          console.error(err);
        });
    } else {
      if (diagramName !== "" && selectedProcess !== "") {
        axios.post(`${API_URL}/api/diagram/add`, {
          projectId: projectId,
          diagramName: diagramName,
          diagramId: selectedProcess,
          userEmail: userName
        })
          .then(res => {
            window.location.reload();
          })
          .catch(err => {
            console.error(err);
          });
      }
    }
    handleCloseModal();
  };

  return (
    <div>
      <div className="app-shell-topbar">
        <TopBar onLogoClick={() => navigate("/main")} userName={userName} projectId={projectId} />
      </div>
      <div className="d-flex app-shell-body">
        <LeftNavBar isAdmin={userName === "vnapp.pbmn@deheus.com"} />
        <div style={{ flexGrow: 1, marginLeft: 64 }}>
          {(userRole === 'editor' || userRole === 'admin') && (
            <button
              onClick={handleShowModal}
              style={{
                background: "none",
                border: "none",
                position: "fixed",
                bottom: 25,
                right: 25,
                zIndex: 999,
              }}
            >
              <BsFillPlusCircleFill size={50} style={{ color: "#2A85E2" }} />
            </button>
          )}
          <Modal size="lg" show={showModal} onHide={handleCloseModal} centered>
            <Modal.Header closeButton>
              <Modal.Title className="w-100 text-center">
                Create New
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
              <ToggleButtonGroup
                className="mb-3"
                type="radio"
                name="formType"
                defaultValue={formType}
              >
                <ToggleButton
                  id="typeP"
                  value="Process"
                  style={{
                    backgroundColor:
                      formType === "Process" ? "#2A85E2" : "#d3e0ea",
                    border: "none",
                  }}
                  checked={formType === "Process"}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  Process
                </ToggleButton>
                <ToggleButton
                  id="typeD"
                  value="Diagram"
                  style={{
                    backgroundColor:
                      formType === "Diagram" ? "#2A85E2" : "#d3e0ea",
                    border: "none",
                  }}
                  checked={formType === "Diagram"}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  Diagram
                </ToggleButton>
              </ToggleButtonGroup>

              {formType === "Process" ? (
                <Form.Group className="d-flex align-items-center">
                  <Form.Label style={{ width: "25%" }}>Process Name</Form.Label>
                  <Form.Control
                    style={{ width: "75%" }}
                    type="text"
                    value={processName}
                    onChange={(e) => setProcessName(e.target.value)}
                  />
                </Form.Group>
              ) : (
                <>
                  <Form.Group className="d-flex align-items-center mb-3">
                    <Form.Label style={{ width: "25%" }}>
                      Select the Process
                    </Form.Label>
                    <Form.Control
                      style={{ width: "75%" }}
                      as="select"
                      value={selectedProcess}
                      onChange={(e) => setSelectedProcess(e.target.value)}
                    >
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                  <Form.Group className="d-flex align-items-center">
                    <Form.Label style={{ width: "25%" }}>
                      Diagram Name
                    </Form.Label>
                    <Form.Control
                      style={{ width: "75%" }}
                      type="text"
                      value={diagramName}
                      onChange={(e) => setDiagramName(e.target.value)}
                    />
                  </Form.Group>
                </>
              )}
            </Modal.Body>
            <Modal.Footer className="justify-content-center">
              <Button
                style={{
                  color: "#1C6091",
                  width: "100px",
                  fontWeight: "550",
                  backgroundColor: "#d2e0ea",
                  border: "none",
                }}
                onClick={handleCreate}
              >
                Create
              </Button>
            </Modal.Footer>
          </Modal>
          <div className="d-flex flex-column align-items-center w-100 app-shell-content bg-light text-dark overflow-auto">
            <div className="my-4" style={{ width: "85%" }}>
              <h3 className="mb-3">{projectName}</h3>
              <Table className="process-table">
                <thead>
                  <tr>
                    <th style={{ width: "55%" }}>Process Name</th>
                    <th>Status</th>
                    <th>Last Update</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>{processes.map((item) => renderRow(item))}</tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListSingleProject;
