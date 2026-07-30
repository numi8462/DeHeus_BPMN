import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useIsAuthenticated, useMsal } from "../config/mockAuth";
import NoAuth from "./common/NoAuth";
import TopBar from './common/TopBar';
import LeftNavBar from './common/LeftNavBar';
import { formatProjectDates } from '../utils/utils';
import { Form, Button, Modal } from "react-bootstrap";
import { BsFillPlusCircleFill, BsFolder2, BsThreeDots, BsTrash } from "react-icons/bs";
import Loading from "./common/Loading";
import Swal from 'sweetalert2';

function Main() {
  const API_URL = process.env.REACT_APP_API_URL;
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  const [userName, setUserName] = useState("");
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();


  // listing the projects based on user role
  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      const userName = accounts[0].username;
      setUserName(userName);
      axios.get(`${API_URL}/api/projects`, {
        params: { userName }
      }).then(response => {
        const formattedProjects = formatProjectDates(response.data);
        setProjects(formattedProjects);
      }).catch(error => {
        console.error("Error fetching projects", error);
      });
    }
  }, [isAuthenticated, accounts]);


  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  // Loading page
  const [isLoading, setIsLoading] = useState(false);

  // Add project function
  const [showAddModal, setAddModal] = useState(false);
  // Delete project function
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleShowAddModal = () => setAddModal(true);
  const handleCloseAddModal = () => setAddModal(false);
  const handleShowDeleteModal = () => setShowDeleteModal(true);
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setIsLoading(false);
  }

  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);

  // Create a project
  const handleCreate = () => {
    if (projects) {
      setIsLoading(true);
      const duplicate = projects.filter((project) => project.name === newProjectName);
      if (duplicate.length > 0) {
        // alert(`Project, ${newProjectName}, already exists!`);
        Swal.fire({
          title: `Project [${newProjectName}] already exists!`,
          text: 'Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      } else {
        // axios.post(`${API_URL}/api/project/add`, { projectName: newProjectName })
        //   .then((res) => {
        //     alert(`Project, ${newProjectName}, has been successfully added!`);
        //   })
        //   .catch(err => console.error("Error creating new project: ", err))
        //   .finally(() => {
        //     window.location.reload();
        // });
        axios.post(`${API_URL}/api/project/add`, { projectName: newProjectName })
          .then((res) => {
            Swal.fire({
              title: `Project [${newProjectName}] has been successfully added!`,
              icon: 'success',
              confirmButtonText: 'OK'
            }).then((result) => {
              if (result.isConfirmed) {
                window.location.reload();
              }
            });
          })
          .catch(err => console.error("Error creating new project: ", err));
      }
    }
  }

  // Delete a project
  const handleDelete = () => {
    setIsLoading(true);
    if (selectedProject) {
      axios.post(`${API_URL}/api/project/delete`, { projectId: selectedProject.id })
        .then((res) => {
          // alert(res.data.message);
          Swal.fire({
            title: `${res.data.message}!`,
            icon: res.data.message.endsWith("successfully!") ? 'success' : 'info',
            confirmButtonText: 'OK'
        //   });
        //   if (res.data.message.endsWith("successfully!")) {
        //     window.location.reload()
        //   } else {
        //     handleCloseDeleteModal();
        //   }
        // })
          }).then((result) => {
            if (result.isConfirmed) {
              if (res.data.message.endsWith("successfully!")) {
                window.location.reload();
              } else {
                handleCloseDeleteModal();
              }
            }
          });
        })
        .catch(err => {
          console.error("Error deleting project: ", err);
        })
        .finally(() => setIsLoading(false));
    }
  }

  return (
    <div>
      {isLoading && <Loading />}
      <div className="app-shell-topbar">
        <TopBar onLogoClick={() => navigate("/main")} userName={userName} />
      </div>
      <div className="d-flex app-shell-body">
        <LeftNavBar isAdmin={userName === "vnapp.pbmn@deheus.com"} />
        <div style={{ flexGrow: 1, marginLeft: 64 }}>
          {userName == "vnapp.pbmn@deheus.com" && (
            <>
              <button
                onClick={handleShowAddModal}
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
              <Modal size="lg" show={showAddModal} onHide={handleCloseAddModal} centered>
                <Modal.Header closeButton>
                  <Modal.Title className="w-100 text-center">
                    Create New Project
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                  <Form.Group className="d-flex align-items-center">
                    <Form.Label style={{ width: "25%" }}>Project Name</Form.Label>
                    <Form.Control
                      style={{ width: "75%" }}
                      type="text"
                      placeholder="Enter the new project name here."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </Form.Group>
                </Modal.Body>
                <Modal.Footer className="justify-content-center">
                  <Button
                    style={{
                      color: "#fff",
                      width: "100px",
                      fontWeight: "550",
                      backgroundColor: "#5cb85c",
                      border: "none",
                    }}
                    onClick={handleCreate}
                  >
                    Create
                  </Button>
                </Modal.Footer>
              </Modal>
            </>
          )}
          {selectedProject &&
            <Modal size="lg" show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
              <Modal.Header closeButton>
                <Modal.Title style={{ textAlign: 'center', width: '100%' }}>Delete {selectedProject.name}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                  <p>
                    Please click Delete button if you wish to <strong>permanantly</strong> delete the project from the database.
                    <br />Make sure that there is <strong>no process</strong> left in the project.
                  </p>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="danger" onClick={handleDelete} style={{ fontWeight: "550", margin: "0 auto" }}>
                  Delete
                </Button>
              </Modal.Footer>
            </Modal>
          }
          <div className="d-flex flex-column align-items-center w-100 app-shell-content bg-light text-dark overflow-auto">
            <div className="my-4" style={{ width: "100%", maxWidth: "1200px" }}>
              <h3 className="mb-3">Accessible Projects</h3>
              {projects.length === 0 ? (
                <div className="empty-state">
                  <BsFolder2 size={32} />
                  <p>No projects yet.</p>
                </div>
              ) : (
                <Table className="process-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60%" }}>Project Name</th>
                      <th>Last Update</th>
                      {userName === "vnapp.pbmn@deheus.com" && <th style={{ width: "40px" }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="process-row" onClick={() => handleProjectClick(project.id)}>
                        <td>
                          <div className="process-name-cell">
                            <span className="process-name-icon"><BsFolder2 size={15} /></span>
                            <span className="process-name-text">{project.name}</span>
                          </div>
                        </td>
                        <td>{project.last_update}</td>
                        {userName === "vnapp.pbmn@deheus.com" && (
                          <td onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(project);
                            if (project) handleShowDeleteModal();
                          }}>
                            <BsTrash className="process-row-delete" title="Delete" />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
