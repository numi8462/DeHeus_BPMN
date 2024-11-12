import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from "axios";
import BpmnModeler from 'bpmn-js/lib/Modeler';
import ColorPickerModule from 'bpmn-js-color-picker';
import minimapModule from 'diagram-js-minimap';
import ErrorPage from './ErrorPage';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import attachmentPropertiesProviderModule from '../providers';
import readOnlyAttachmentProviderModule from '../readOnlyProviders';
import attachmentModdleDescriptor from '../providers/descriptor/attachment.json';
import generateImage from '../utils/generateImage';
import generatePdf from '../utils/generatePdf';
import Swal from 'sweetalert2';
//custom properties module
import parameterPropertiesProviderModule from '../providers';
import parameterModdleDescriptor from '../providers/descriptor/parameter.json';
import readOnlyParameterProviderModule from '../readOnlyProviders';
import dropdownPropertiesProvider from '../providers';
import readOnlyDropdownProviderModule from '../readOnlyProviders';
import dropdownDescriptor from '../providers/descriptor/dropdown';
//search
import bpmnSearchModule from '../features/search/provider';
//subprocess
import DrilldownOverlayBehavior from '../features/subprocess';
//replace popup
import PopupMenuModule from '../features/popup';
import ReplaceModule from '../features/replace';
//palette
import PaletteModule from '../features/palette';

//publish
import emailjs from '@emailjs/browser';

//toolbar
import Toolbar from '../features/toolbar/toolbar';
import Topbar from './common/TopBar'
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import '../styles/bpmn-js.css';
import '../styles/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import Sidebar from '../features/sidebar/Sidebar';
import { BsArrowBarRight } from 'react-icons/bs';
import { navigateTo } from '../utils/navigation';


// Checkin
import { Form, Button, Modal } from "react-bootstrap";


function BpmnEditor() {
    const API_URL = process.env.REACT_APP_API_URL;
    const navigate = useNavigate();
    const location = useLocation();
    const diagramId = location.state?.itemId;
    const { projectId, itemName } = useParams();
    const fileData = location.state?.fileData;
    const container = useRef(null);
    const importFile = useRef(null);
    const [importXML, setImportXML] = useState(null);
    const [modeler, setModeler] = useState(null);
    const [userEmail, setUserEmail] = useState("");  // *
    const [userRole, setUserRole] = useState(null); // for toolbar view (read-only, contributor, editing)
    const [editor, setEditor] = useState(null);
    const [diagramPath, setDiagramPath] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isHidden, setIsHidden] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [diagramXML, setDiagramXML] = useState(fileData);
    const [isFileValid, setIsFileValid] = useState(true);
    const [hidePanel, setHidePanel] = useState(false);
    const saveKeys = ['s', 'S'];
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [contributors, setContributors] = useState([]);
    const [isRequested, setIsRequest] = useState(false);
    const [currentCheckoutUser, setCurrentCheckoutUser] = useState([]);
    let modelerInstance = null;
    const searchKeys = ['f', 'F'];
    let priority = 10000;

    const isAuthenticated = useIsAuthenticated();
    const [userName, setUserName] = useState("");
    const { accounts } = useMsal();

    // check-in
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const handleShowCheckInModal = () => setShowCheckInModal(true);
    const handleCloseCheckInModal = () => setShowCheckInModal(false);

    // publish
    const handleShowPublishModal = () => setShowPublishModal(true);
    const handleClosePublishModal = () => setShowPublishModal(false);

    // confirm publish
    const [showConfirmPublishModal, setShowConfirmPublishModal] = useState(false);
    const handleShowConfirmPublishModal = () => setShowConfirmPublishModal(true);
    const handleCloseConfirmPublishModal = () => setShowConfirmPublishModal(false);
    const [declineReason, setDeclineReason] = useState('');

    // delete and cancel modal
    const [showDeleteModal, setDeleteModal] = useState(false);
    const [showCancelModal, setCancelModal] = useState(false);
    const handleShowDeleteModal = () => setDeleteModal(true);
    const handleCloseDeleteModal = () => setDeleteModal(false);
    const handleShowCancelModal = () => setCancelModal(true);
    const handleCloseCancelModal = () => setCancelModal(false);

    // Publish variables
    const currentUrl = window.location.href;
    const [link] = useState(currentUrl);
    const [message, setMessage] = useState('');
    const [diagramName, setDiagramName] = useState('DiagramName');  // *

    // contributors
    const [showContributorsModal, setShowContributorsModal] = useState(false);
    const handleShowContributorsModal = () => setShowContributorsModal(true);
    const handleCloseContributorsModal = () => setShowContributorsModal(false);

    // fetches contribution. if the user is editor the user role will be set to contributor, if not read-only
    const fetchUserRole = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/fetch/user-role`, {
                params: { projectId, diagramId, userEmail }
            });
            const userName = response.data.userName;
            const userRole = response.data.role;
            if (userRole === 'editing') {
                setEditor(true);
                setUserName(userName);
                setUserRole('editing');
            } else if (userRole === 'contributor') {
                setUserName(userName);
                setUserRole('contributor');
            } else if (userRole === 'read-only') {
                setUserName(userName);
                setUserRole('read-only');
            } else if (userRole === 'admin') {
                setUserName(userName);
                setUserRole('admin');
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setError('No contribution found');
            } else {
                setError('Error fetching user role');
            }
        } finally {
            setLoading(false);
        }

    };

    const fetchDiagramPath = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/fetch/diagram`, {
                params: { diagramId, projectId }
            });

            if (response.status === 200 && response.data.path) {
                const diagramPath = response.data.path;
                const diagramName = response.data.diagramName;
                setDiagramPath(diagramPath);
                setDiagramName(diagramName);
                document.title = diagramPath.split('[').pop().split(']')[0];
            } else {
                console.error("Failed to fetch diagram path: Invalid response data.");
            }
        } catch (err) {
            console.error("An error occurred while fetching the diagram path:", err.message);
        }
    };

    const fetchContributors = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/diagrams/getContributors`, {
                params: { diagramId }
            });
            setContributors(response.data.contributors);
            setCurrentCheckoutUser(null);
            setCurrentCheckoutUser(response.data.currentCheckOut);
            // console.log(`current Checked out User: ${currentCheckoutUser.checkoutUserEmail}`);
        } catch (err) {
            console.error("An error occurred while fetching the contributors:", err.message);
        }
    };

    // fetch diagram publish isRequested
    const checkRequested = async () => {
        try {
            const response = await axios.get('/api/diagram/checkRequested', {
                params: { diagramId }
            });
            setIsRequest(response.data.requestedToPublish);
        } catch (err) {
            console.error("An error occurred while fetching isRequest:", err.message);
        }
    };

    useEffect(() => {
        if (isAuthenticated && accounts.length > 0) {
            const userName = accounts[0].username;
            setUserName(userName);
            setUserEmail(userName);
        }
        fetchUserRole();
        fetchDiagramPath();
        fetchContributors();
        checkRequested();
        if (modelerInstance) return;
        // If there's a modeler instance already, destroy it
        if (modeler) modeler.destroy();
        modelerInstance = new BpmnModeler({
            container: container.current,
            keyboard: { bindTo: document },
            propertiesPanel: {
                parent: "#properties-panel-parent"
            },
            additionalModules: [
                BpmnPropertiesPanelModule,
                BpmnPropertiesProviderModule,
                ColorPickerModule,
                minimapModule,
                userRole !== 'editing' ? readOnlyAttachmentProviderModule : attachmentPropertiesProviderModule,
                userRole !== 'editing' ? readOnlyParameterProviderModule : parameterPropertiesProviderModule,
                userRole !== 'editing' ? readOnlyDropdownProviderModule : dropdownPropertiesProvider,
                bpmnSearchModule,
                DrilldownOverlayBehavior,
                PaletteModule,
                PopupMenuModule,
                ReplaceModule,
                userRole !== 'editing' && {
                    dragging: ['value', { init: function () { } }],
                    create: ['value', {}]
                }
            ],
            moddleExtensions: {
                attachment: attachmentModdleDescriptor,
                extended: parameterModdleDescriptor,
                dropdown: dropdownDescriptor,
            }
        });

        window.addEventListener("message", (e) => {
            if (e.origin !== window.location.origin) return;
            const data = e.data;
            if (data) {
                const { id, url, userName } = data;
                if (id && url && userName) {
                    if (data.fileData) {
                        navigateTo(url, id, userName, data.fileData);
                    } else {
                        navigateTo(url, id, userName);
                    }
                }
            }
        });

        // Import file or create a new diagram
        if (importXML) {
            modelerInstance.importXML(importXML)
                .then(({ warnings }) => {
                    if (warnings.length) {
                        console.warn(warnings);
                    }
                    modelerInstance.get("canvas").zoom("fit-viewport");
                    modelerInstance.get('keyboard').bind(document);
                })
                .catch(err => {
                    console.error("Error rendering diagram:", err);
                    setIsFileValid(false);
                });
        } else if (diagramXML) {
            modelerInstance.importXML(diagramXML)
                .then(({ warnings }) => {
                    if (warnings.length) {
                        console.warn(warnings);
                    }
                    modelerInstance.get("canvas").zoom("fit-viewport");
                    modelerInstance.get('keyboard').bind(document);
                })
                .catch(err => {
                    console.error("Error rendering diagram:", err);
                    setIsFileValid(false);
                });
        } else {
            modelerInstance.createDiagram()
                .then(() => {
                    modelerInstance.get("canvas").zoom("fit-viewport");
                    modelerInstance.get('keyboard').bind(document);
                })
                .catch(err => {
                    console.error("Error generating diagram: ", err);
                    setIsFileValid(false);
                });
        }
        setModeler(modelerInstance);

        // Set eventlistener based on the user role
        if (modelerInstance) {
            // Disable 'tab' key
            document.addEventListener("keydown", (e) => {
                if (e.key === 'Tab') e.preventDefault();
            });
            const eventBus = modelerInstance.get('eventBus');
            const keyboard = modelerInstance.get('keyboard');
            if (userRole) {
                if (userRole !== 'editing') {
                    // Disable double click event
                    eventBus.on('element.dblclick', priority, () => {
                        return false;
                    });
                    // Disable all keyboard events
                    keyboard.addListener(priority, () => {
                        return false;
                    });

                    // Enable ctrl + f for search
                    keyboard.addListener(20000, function (context) {
                        var event = context.keyEvent;
                        if (event.ctrlKey || event.metaKey) {
                            if (searchKeys.indexOf(event.key) !== -1 || searchKeys.indexOf(event.code) !== -1) {
                                modelerInstance.get('editorActions').trigger('find');
                                return true;
                            }
                        }
                    });
                } else {
                    const eventBus = modelerInstance.get('eventBus');

                    // Update subprocess in DB on name changes
                    eventBus.on('commandStack.element.updateProperties.executed', ({ context }) => {
                        const { element, properties, oldProperties } = context;
                        const nodeId = element.businessObject.id;
                        if (element.businessObject.$type) {
                            if (element.businessObject.$type === "bpmn:SubProcess") {
                                if (oldProperties.name && properties.name) {
                                    updateSubProcessName(properties.name, nodeId, diagramId);
                                }
                            }
                        }
                    });
                    // Check file api availablitiy
                    if (!window.FileList || !window.FileReader) {
                        window.alert(
                            'Looks like you use an older browser that does not support drag and drop. ' +
                            'Try using Chrome, Firefox or the Internet Explorer > 10.');
                    } else {
                        registerFileDrop(document.getElementById('modeler-container'));
                    }
                    // Save diagram on every change
                    modelerInstance.on('commandStack.changed', saveDiagram);
                    // modelerInstance.on('commandStack.shape.delete.executed', (e) => onElementDelete(e.context.shape.id || undefined));

                    // Add Save shortcut (ctrl + s)
                    modelerInstance.get('editorActions').register('save', saveDiagram);
                    keyboard.addListener(function (context) {
                        var event = context.keyEvent;
                        if (event.ctrlKey || event.metaKey) {
                            if (saveKeys.indexOf(event.key) !== -1 || saveKeys.indexOf(event.code) !== -1) {
                                modelerInstance.get('editorActions').trigger('save');
                                return true;
                            }
                        }
                    });
                }
            }
        }
        updatePaletteVisibility();

        return () => {
            modeler?.destroy();
        }
    }, [importXML, diagramXML, editor, diagramId, projectId, userRole, diagramPath]);

    useEffect(() => {
        // Bring diagram data based on the user roles
        if (userRole) {
            if (userRole === 'editing') {
                axios.get(`${API_URL}/api/diagram/getDraft`, {
                    params: { projectId: projectId, diagramId: diagramId, userEmail: userEmail }
                })
                    .then((res) => {
                        setDiagramXML(res.data.fileData);
                    })
                    .catch(err => {
                        console.error(err);
                        setDiagramXML(null);
                    })
            } else {
                if (fileData) {
                    setDiagramXML(fileData);
                } else {
                    setDiagramXML(null);
                }
            }
        }
    }, [fileData, diagramXML, userRole]);

    useEffect(() => {
        const minimapElement = document.querySelector('.djs-minimap');
        if (minimapElement) {
            if (!hidePanel) {
                minimapElement.classList.remove('hidePanelFalse');
            } else {
                minimapElement.classList.add('hidePanelFalse');
            }
        }
    }, [hidePanel]);

    // Update subprocess name
    const updateSubProcessName = async (newName, nodeId) => {
        axios.post(`${API_URL}/api/diagram/updateSubProcess`, { name: newName, nodeId: nodeId, diagramId: diagramId })
            .catch(err => {
                console.error("Error updating diagram name: ", err);
            })
    }

    // hide hierarchy side bar
    const handleHidden = () => {
        setIsHidden(prev => !prev);
    }

    // File drag & drop
    const registerFileDrop = (container) => {
        const handleFileSelect = (e) => {
            e.stopPropagation();
            e.preventDefault();

            var files = e.dataTransfer.files;
            var file = files[0];
            var reader = new FileReader();
            if (file) {
                reader.onload = (e) => {
                    var xml = e.target.result;
                    setImportXML(xml);
                };
                reader.readAsText(file);
            } else {
                // alert("Invalid File");
                Swal.fire({
                    title: 'Invalid File!',
                    text: 'Please try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        }

        const handleDragOver = (e) => {
            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }

        if (userRole === 'editing') {
            container.addEventListener('dragover', handleDragOver, false);
            container.addEventListener('drop', handleFileSelect, false);
        } else {
            container.removeEventListener('dragover', container);
            container.removeEventListener('drop', container);
        }
    }

    // Download exported file (SVG, XML)
    const setEncoded = (link, name, data) => {
        var encodedData = encodeURIComponent(data);
        if (data) {
            link.setAttribute('href', 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData);
            link.setAttribute('download', name);
        }
        handleClose();
    }

    // Download exported image file (PNG, JPEG)
    const downloadImage = (link, name, url) => {
        link.setAttribute('href', url);
        link.setAttribute('download', name);
        handleClose();
    }

    // Export diagram as xml
    const exportXml = async (id) => {
        if (modeler) {
            const { xml } = await modeler.saveXML({ format: true }).catch(err => {
                console.error(err);
            });
            if (xml) {
                setEncoded(document.getElementById(id), diagramName + '.xml', xml);
            };
        }
    };

    // Export diagram as svg
    const exportSvg = async (id) => {
        if (modeler) {
            const { svg } = await modeler.saveSVG({ format: true }).catch(err => {
                console.error(err);
            });
            if (svg) {
                setEncoded(document.getElementById(id), diagramName + '.svg', svg);
            };
        }
    };

    // Export diagram as png
    const exportPng = async (id) => {
        if (modeler) {
            const { svg } = await modeler.saveSVG({ format: true }).catch(err => {
                console.error(err);
            });
            if (svg) {
                const url = await generateImage('png', svg);
                downloadImage(document.getElementById(id), diagramName + '.png', url);
            };
        }
    };

    // Export diagram as pdf
    const exportPdf = async (id) => {
        if (modeler) {
            const { svg } = await modeler.saveSVG({ format: true }).catch(err => {
                console.error(err);
            });
            if (svg) {
                const url = await generateImage('png', svg);
                generatePdf(url, diagramName);
            };
            handleClose();
        }
    }

    // Save diagram
    const saveDiagram = async () => {
        if (modelerInstance) {
            // save bpmn diagram as xml
            const { xml } = await modelerInstance.saveXML({ format: true }).catch(err => {
                console.error("Error saving XML:", err);
            });

            if (xml) {
                axios.post(`${API_URL}/api/diagram/save`, { xml: xml, diagramId: diagramId, userEmail: userEmail })
                    .catch(error => {
                        console.error("Error saving diagram to the database:", error);
                    });
            }
        }
    }

    // Delete attachments on element delete
    const onElementDelete = (nodeId) => {
        if (nodeId === undefined) {
            return;
        }
        axios.post(`${API_URL}/api/attachments/${diagramId}/${nodeId}`)
            .catch(err => console.error("Error fetching processes", err));
    }

    const onImportClick = () => {
        importFile.current.click();
    }

    const onFileChange = (e) => {
        e.stopPropagation();
        e.preventDefault();
        var file = e.target.files[0];
        var reader = new FileReader();
        if (file) {
            reader.onload = (e) => {
                var xml = e.target.result;
                setImportXML(xml);
            };

            reader.readAsText(file);
        } else {
            // alert("Invalid File");
            Swal.fire({
                title: 'Invalid File!',
                text: 'Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    // handle exports to files
    const handleExportXml = (e) => {
        e.stopPropagation();
        exportXml(e.target.id)
    }
    const handleExportSvg = (e) => {
        e.stopPropagation();
        exportSvg(e.target.id)
    }
    const handleExportPng = (e) => {
        e.stopPropagation();
        exportPng(e.target.id)
    }
    const handleExportPdf = (e) => {
        e.stopPropagation();
        exportPdf(e.target.id);
    }
    const handleClose = () => {
        setIsOpen(false);
    }

    // handle checkout function
    const handleCheckIn = async () => {
        try {
            const response = await axios.post(`${API_URL}/api/diagram/checkedout`, { diagramId, userEmail });

            if (response.status === 200) {
                // alert("Checked In!");
                Swal.fire({
                    title: 'Successfully Checked out!',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
                handleCloseCheckInModal();
                setUserRole("editing");
            } else {
                console.error("Checked out failed:", response.data.message);
                // alert("Checked out failed. Please try again.");
                Swal.fire({
                    title: 'Checked out failed!',
                    test: 'Please try again.',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error("Error during checked out:", error.message);
            // alert("Error during checked out. Please try again.");
            Swal.fire({
                title: 'Error during checked out!',
                test: 'Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    // send a request to publish
    const handleSubmit = (e) => {
        e.preventDefault();

        const serviceId = 'service_deheusvn_bpmnapp';
        const templateId = 'template_rfow6sk';
        const publicKey = 'oQHqsgvCGRFGdRGwg';

        const templateParams = {
            to_name: 'Admin',
            from_name: userName,
            from_email: userEmail,
            diagram_name: diagramName,  // *
            message: message,
            link: link + "/" + diagramId,
        };

        emailjs.send(serviceId, templateId, templateParams, publicKey)
            .then((response) => {
                // alert("Email sent successfully!");
                Swal.fire({
                    title: 'Email sent successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
                  
                // POST request to log request publish to backend
                axios.post(`${API_URL}/api/diagram/requestPublish`, {
                    diagramId: diagramId,
                    userEmail: userEmail,
                })
                    .catch((error) => {
                        console.error('Error sending publish request to backend:', error);
                    });

                setMessage('');
                handleClosePublishModal();
            })
            .catch((error) => {
                console.error('Error sending email:', error);
                // alert("Error sending email");
                Swal.fire({
                    title: 'Error sending email!',
                    text: 'Please try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            });
    }


    // Confirm Publish function
    const handleConfirmPublish = () => {
        if (diagramXML) {
            axios.post(`${API_URL}/api/diagram/publish`, { xml: diagramXML, diagramId: diagramId })
                .then(response => {
                    // window.location.reload();
                    Swal.fire({
                        title: 'Diagram Published!',
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.reload();
                        }
                    });
                })
                .catch(error => {
                    console.error("Error saving diagram to the database:", error);
                });
        }
        // alert("Diagram Published!");
        handleCloseConfirmPublishModal();
    }

    // Decline Publish function
    const handleDeclinePublish = async (e) => {
        // Email user about the decline result
        e.preventDefault();

        try {
            const response = await axios.get(`${API_URL}/api/admin/getRequestUser`, {
                params: { diagramId: diagramId }
            });

            if (response.status === 200) {
                const { userEmail, userName } = response.data;

                const serviceId = 'service_deheusvn_bpmnapp';
                const templateId = 'template_vyxsf68';
                const publicKey = 'oQHqsgvCGRFGdRGwg';

                const templateParams = {
                    to_email: userEmail,
                    to_name: userName,
                    diagram_name: diagramName,
                    decline_reason: declineReason,
                    link: link + "/" + diagramId,
                };

                emailjs.send(serviceId, templateId, templateParams, publicKey)
                    .then((response) => {
                    // // Commented out line 757 ~ 777 if needed
                    //     alert("Email sent successfully!");

                    //     // POST request to log decline publish to backend!!
                    //     axios.post(`${API_URL}/api/diagram/publish/decline`, {
                    //         diagramId: diagramId
                    //     })
                    //         .catch((error) => {
                    //             console.error('Error sending decline publish request to backend:', error);
                    //         });

                    //     setDeclineReason('');
                    //     handleCloseConfirmPublishModal();
                    //     window.location.reload();         
                    // })
                        Swal.fire({
                            title: 'Email sent successfully to the user!',
                            icon: 'success',
                            confirmButtonText: 'OK'
                        }).then((result) => {
                            if (result.isConfirmed) {
                            // POST request to log decline publish to backend
                            axios.post(`${API_URL}/api/diagram/publish/decline`, {
                                diagramId: diagramId
                            })
                            .catch((error) => {
                                console.error('Error sending decline publish request to backend:', error);
                            });
                    
                            setDeclineReason('');
                            handleCloseConfirmPublishModal();
                            
                            window.location.reload();
                            }
                        });
                    })
                    .catch((error) => {
                        console.error('Error sending email:', error);
                        // alert("Error sending email");
                        Swal.fire({
                            title: 'Error sending email!',
                            text: 'Please try again.',
                            icon: 'error',
                            confirmButtonText: 'OK'
                        });
                    });
            } else {
                // alert("Failed to retrieve requester information.");
                Swal.fire({
                    title: 'Failed to retrieve requester information!',
                    text: 'Please try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            // alert("Error during fetching request user.");
            Swal.fire({
                title: 'Error during fetching request user!',
                text: 'Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    /**Tool bar functions */
    // handle zoom in
    const handleZoomIn = () => {
        modeler?.get('zoomScroll').stepZoom(1);
    };
    // handle zoom out
    const handleZoomOut = () => {
        modeler?.get('zoomScroll').stepZoom(-1);
    };
    // handle undo
    const handleUndo = () => {
        modeler?.get('commandStack').undo();
    };
    // handle redo
    const handleRedo = () => {
        modeler?.get('commandStack').redo();
    };
    // handle save
    const handleSave = async () => {
        if (modeler) {
            // save bpmn diagram as xml
            const { xml } = await modeler.saveXML({ format: true }).catch(err => {
                console.error("Error saving XML:", err);
            });

            if (xml) {
                axios.post(`${API_URL}/api/diagram/save`, { xml: xml, diagramId: diagramId, userEmail: userEmail })
                    .catch(error => {
                        console.error("Error saving diagram to the database:", error);
                    });
            }
        }
    };

    // handle aligning elements
    const handleAlign = (alignment) => {
        const alignElements = modeler?.get('alignElements');
        const selection = modeler?.get('selection');
        const selectedElements = selection.get();

        if (selectedElements.length > 1) {
            alignElements.trigger(selectedElements, alignment);
        } else {
            // alert('Please select at least two elements to align.');
            Swal.fire({
                title: 'Please select at least two elements to align.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
        }
    };

    // handle distributing elements
    const handleDistribute = (direction) => {
        const distributeElements = modeler?.get('distributeElements');
        const selection = modeler?.get('selection');
        const selectedElements = selection.get();

        if (selectedElements.length > 2) {
            distributeElements.trigger(selectedElements, direction);
        } else {
            // alert('Please select at least three elements to distribute.');
            Swal.fire({
                title: 'Please select at least three elements to distribute.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
        }
    };

    // handle panel visibility
    const toggleVisibility = () => {
        setHidePanel(!hidePanel);
    };
    const toMain = () => {
        navigate("/main");
    }

    // Function to hide the element if the user is not editing
    function updatePaletteVisibility() {
        const palette = document.querySelector('.djs-palette.two-column.open');
        const columnPalette = document.querySelector('.djs-palette.open');
        if (palette) {
            if (userRole !== 'editing') {
                palette.style.display = 'none';
            }
        } else if (columnPalette) {
            if (userRole !== 'editing') {
                columnPalette.style.display = 'none';
            }
        } else {
            console.error('Element not found');
        }
    }

    // Diagram deletion
    const handleDelete = async () => {
        try {
            const response = await axios.post(`${API_URL}/api/diagram/delete`, { diagramId });
            if (response.status === 200) {
                // alert("Diagram successfully deleted!");
                Swal.fire({
                    title: 'Diagram successfully deleted!',
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then((result) => {
                    if (result.isConfirmed) {
                        handleCloseDeleteModal();
                        window.location.href = '/main';
                    }
                });
            } else {
                // alert("Failed to delete the diagram.")
                Swal.fire({
                    title: 'Failed to delete the diagram!',
                    text: 'Please try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error("Error deleting the diagram:", error.message);
            // alert("Error occurred while trying to delete the diagram.");
            Swal.fire({
                title: 'Error occurred while trying to delete the diagram!',
                text: 'Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    // Cancel check out
    const handleCancelCheckout = async () => {
        try {
            const response = await axios.post(`${API_URL}/api/diagram/cancelCheckout`, { diagramId, userEmail });

            if (response.status === 200) {
                // commented out line 932 ~ 941 if needed
                // alert("Checked-out canceled!");
                // });
                // handleCloseCancelModal();
                // window.location.reload();
                Swal.fire({
                    title: 'Checked out canceled successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then((result) => {
                    if (result.isConfirmed) {
                        handleCloseCancelModal();
                        window.location.reload();
                    }
                });
            } else {
                console.error("Cancel checked out failed:", response.data.message);
                // alert("Cancel Checked-out failed. Please try again.");
                Swal.fire({
                    title: 'Cancel checked out failed!',
                    text: 'Please try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error("Error during cancel checked-out:", error.message);
            // alert("Error during cancel checked-out. Please try again.");
            Swal.fire({
                title: 'Error during cancel checked out!',
                text: 'Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }


    if (!isFileValid) {
        return (
            <ErrorPage />
        )
    } else {
        return (
            <div className='main-container' onClick={handleClose} style={{ "--height": window.innerHeight }}>
                <div className='model-header'>
                    <Topbar onLogoClick={toMain} userName={userEmail} />
                    <Toolbar
                        mode={userRole} // "read-only" or "contributor" or "editing"
                        isOpen={isOpen}
                        setIsOpen={setIsOpen}
                        onSave={handleSave}
                        onImport={onImportClick}
                        onExportXml={handleExportXml}
                        onExportSvg={handleExportSvg}
                        onExportPng={handleExportPng}
                        onExportPdf={handleExportPdf}
                        // more export calls here
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        onAlignLeft={() => handleAlign('left')}
                        onAlignCenter={() => handleAlign('center')}
                        onAlignRight={() => handleAlign('right')}
                        onAlignTop={() => handleAlign('top')}
                        onAlignMiddle={() => handleAlign('middle')}
                        onAlignBottom={() => handleAlign('bottom')}
                        onDistributeHorizontally={() => handleDistribute('horizontal')}
                        onDistributeVertically={() => handleDistribute('vertical')}
                        importFile={importFile}
                        onFileChange={onFileChange}
                        onCheckIn={handleShowCheckInModal}
                        onContributor={handleShowContributorsModal}
                        onShare={handleShowPublishModal}
                        onPublish={handleShowConfirmPublishModal}
                        onCancel={handleShowCancelModal}
                        onDelete={handleShowDeleteModal}
                        isRequested={isRequested}
                    />
                </div>
                <div className={userRole === 'editing' ? 'model-body' : 'model-body disabled'}>
                    {isHidden ?
                        <BsArrowBarRight className='sidebar-btn hidden' onClick={handleHidden} />
                        :
                        <Sidebar handleHidden={handleHidden} diagramId={diagramId} userName={userEmail} onClick={setImportXML} />
                    }

                    <div
                        id='modeler-container'
                        className={"" + (isHidden ? 'sidebar-hidden' : '')}
                        ref={container}
                    />
                    <div className={hidePanel ? 'properties_panel_hidden' : 'properties_panel_open'}>
                        <button className='hide-panel' onClick={toggleVisibility}>
                            Details
                        </button>
                        <div id='properties-panel-parent' />

                    </div>
                </div>
                <div>
                    <Modal dialogClassName="contributor-modal" show={showContributorsModal} onHide={handleCloseContributorsModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title style={{ textAlign: 'center', width: '100%' }}>Contributors</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px', marginBottom: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px', fontWeight: 'bold' }}>
                                    <div style={{ textAlign: 'left' }}>Name</div>
                                    <div style={{ textAlign: 'left' }}>Email</div>
                                    <div style={{ textAlign: 'left' }}>Version</div>
                                </div>
                                {contributors.length > 0 ? contributors.map((contributor, index) => (
                                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px' }}>
                                        <div className="truncate" style={{ textAlign: 'left' }}>{contributor.name}</div>
                                        <div style={{ textAlign: 'left' }}>{contributor.email}</div>
                                        <div style={{ textAlign: 'left' }}>#{contributor.index}</div>
                                    </div>
                                )) : <div>No contributors found.</div>}
                            </div>

                            {/* Current Checked out User Section */}
                            <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                                <div style={{ fontWeight: 'bold' }}>Current Checked out User</div> {/* Title for the section */}
                                {currentCheckoutUser ?
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '7px' }}>
                                        <div className="truncate" style={{ textAlign: 'left' }}>{currentCheckoutUser.checkoutUserName}</div>
                                        <div style={{ textAlign: 'left' }}>{currentCheckoutUser.checkoutUserEmail}</div>
                                        <div style={{ textAlign: 'left' }}>{currentCheckoutUser.remainingTime} days left</div>
                                    </div>
                                : <div>Not checked out.</div>}
                            </div>
                        </Modal.Body>
                    </Modal>

                    <Modal show={showPublishModal} onHide={handleClosePublishModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title style={{ textAlign: 'center', width: '100%' }}>Publish Request Form</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div style={{ padding: '15px', marginBottom: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                                <h5>Diagram</h5>
                                <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#1C6091' }}>{diagramPath}</p>
                            </div>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="message">
                                    <Form.Control
                                        as="textarea"
                                        rows={5}
                                        placeholder="Enter a request message."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                </Form.Group>

                                <Button variant="primary" type="submit" style={{ color: "#fff", fontWeight: "550", backgroundColor: "#5cb85c", border: "none", display: "block", margin: "0 auto" }}>
                                    Send Request
                                </Button>
                            </Form>
                        </Modal.Body>
                    </Modal>

                    <Modal show={showCheckInModal} onHide={handleCloseCheckInModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title style={{ textAlign: 'center', width: '100%' }}>Check Out Confirm</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px', marginBottom: '15px' }}>
                                <h5>Diagram Path</h5>
                                <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#1C6091' }}>{diagramPath}</p>
                            </div>
                            <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                                <ul style={{ paddingLeft: '20px' }}>
                                    <li>Once you check out, you will have editing access to this diagram for the <strong>next 14 days</strong>.</li>
                                    <li>During this period, you can <strong>edit</strong> and <strong>save</strong> the draft, then <strong>request for publishing</strong> once completed.</li>
                                </ul>
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="success" onClick={handleCheckIn} style={{ color: "#fff", fontWeight: "550", backgroundColor: "#5cb85c", border: "none", display: "block", margin: "0 auto" }}>
                                Check out
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    <Modal show={showConfirmPublishModal} onHide={handleCloseConfirmPublishModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title style={{ textAlign: 'center', width: '100%' }}>Confirm Publish</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>
                                <p>If you agree to publish this diagram, please click <strong>Confirm</strong>. If not, please provide a reason and click <strong>Decline</strong>.</p>
                            </div>
                            <Form>
                                <Form.Group className="mb-3" controlId="declineReason">
                                    <Form.Label style={{ textAlign: 'center', width: '100%' }}>Decline Reason (Optional)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        placeholder="Type the reason for declining"
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                    />
                                </Form.Group>
                            </Form>
                        </Modal.Body>
                        <Modal.Footer style={{ justifyContent: 'space-around' }}>
                            <Button variant="success" onClick={handleConfirmPublish} style={{ color: "#fff", fontWeight: "550", backgroundColor: "#5cb85c", border: "none" }}>
                                Confirm
                            </Button>
                            <Button variant="danger" onClick={handleDeclinePublish} style={{ color: "#fff", fontWeight: "550", backgroundColor: "#d9534f", border: "none" }}>
                                Decline
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title style={{ textAlign: 'center', width: '100%' }}>Delete Diagram</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px', marginBottom: '15px' }}>
                                <h5>Diagram Path</h5>
                                <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#1C6091' }}>{diagramPath}</p>
                            </div>
                            <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                                <ul style={{ paddingLeft: '20px' }}>
                                    <li>Once you delete this diagram, <strong>ALL SUB DIAGRAMS</strong> under this will also be deleted.</li>
                                </ul>
                                <p>Are you sure? Please click Delete button if you wish to <strong>PERMANENTLY</strong> delete the diagram from the database.</p>
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="danger" onClick={handleDelete} style={{ fontWeight: "550", margin: "0 auto" }}>
                                Delete
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    <Modal show={showCancelModal} onHide={handleCloseCancelModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title style={{ textAlign: 'center', width: '100%' }}>Cancel Confirm</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px', marginBottom: '15px' }}>
                                <h5>Diagram Path</h5>
                                <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#1C6091' }}>{diagramPath}</p>
                            </div>
                            <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                                <ul style={{ paddingLeft: '20px' }}>
                                    <li>Once you cancel your check out, any changes you made in this draft version will be deleted.</li>
                                </ul>
                                <p>Please click Cancel button to cancel your check out to this diagram.</p>
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="danger" onClick={handleCancelCheckout} style={{ fontWeight: "550", margin: "0 auto" }}>
                                Cancel
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </div>
            </div>
        )
    }

}
export default BpmnEditor;
