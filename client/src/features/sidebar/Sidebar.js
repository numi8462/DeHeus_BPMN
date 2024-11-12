import axios from "axios";
import React, { useEffect, useState } from "react";
import { Table } from "react-bootstrap";
import {
    BsArrowBarLeft,
    BsChevronDown,
    BsChevronUp
} from "react-icons/bs";
import { useNavigate, useParams } from "react-router-dom";
import Swal from 'sweetalert2';

export default function Sidebar(props) {
    const API_URL = process.env.REACT_APP_API_URL;
    const { handleHidden, diagramId, userName, onClick } = props;
    const { projectId } = useParams();
    const [processes, setProcesses] = useState(null);
    const [expandedRows, setExpandedRows] = useState([]);
    const navigate = useNavigate();

    const toggleRow = (id) => {
        setExpandedRows(
            expandedRows.includes(id) ?
                expandedRows.filter(r => r !== id) : [...expandedRows, id]
        );
    }

    // Get current diagram
    const getCurrentDiagram = (processList) => {
        const current = processList?.filter(process => process.id === diagramId);
        if (current.length === 0) {
            const list = [];
            findDiagram(processList, list);
            if (list.length > 0) {
                const newRows = list.filter(p => !expandedRows.includes(p));
                setExpandedRows([...expandedRows, ...newRows]);
            }
        }
    }
    const findDiagram = (process, list) => {
        process.forEach(p => {
            if (p.id == diagramId) {
                !list.includes(p.id) &&
                    list.push(p.id);
            } else {
                p.children && p.children.length > 0 && findDiagram(p.children, list);
            }
        });
        if (list.length > 0) {
            process && process.forEach(p => {
                p.children && p.children.forEach(ch => {
                    if (list.includes(ch.id)) {
                        !list.includes(p.id) && list.push(p.id);
                    }
                })
            });
        }
    }

    const handleOpenClick = async (id, name) => {
        onClick();
        try {
            const response = await axios.get(`${API_URL}/api/diagrams/get-diagram-with-project/${projectId}/${id}/${userName}`);
            if (response.data.fileData) {
                const { diagramName, fileData } = response.data;

                const generatedUrl = `/project/${projectId}/${diagramName.replace(/ /g, '-')}`;
                // Navigate to modeler
                navigate(generatedUrl, { state: { itemId: id, userName: userName, fileData: fileData } });
            } else {
                if (response.data.message && response.data.message.startsWith("available")) {
                    const generatedUrl = `/project/${projectId}/${name.replace(/ /g, '-')}`;
                    // Navigate to modeler
                    navigate(generatedUrl, { state: { itemId: id, userName: userName, fileData: null } });
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
    }

    const renderRow = (process, level = 0) => {
        const isExpanded = expandedRows.includes(process.id);
        const hasChildren = process.children && process.children.length > 0;
        return (
            <React.Fragment key={process.id}>
                <tr>
                    <td className="process-list-item" style={{
                        paddingLeft: (level + 1) * 5 + "px",
                        backgroundColor: process.id == diagramId ? "rgb(211, 224, 234)" : "white",
                        display: "flex", justifyContent: "space-between", cursor: "pointer", width: "100%"
                    }}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenClick(process.id, process.name);
                        }}
                    >
                        <span className="mx-1" style={{overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", width: "200px"}}>{process.name}</span>
                        <span onClick={(e) => {
                            e.stopPropagation();
                            hasChildren && toggleRow(process.id);
                        }}
                            style={{ cursor: hasChildren ? "pointer" : "default" }}
                        >
                            {hasChildren ? (
                                isExpanded ? (
                                    <BsChevronUp />
                                ) : (
                                    <BsChevronDown />
                                )
                            ) : (
                                <span>&nbsp;&nbsp;</span>
                            )}
                        </span>
                    </td>
                </tr>
                {isExpanded && hasChildren
                    &&
                    process.children.map(child => renderRow(child, level + 1))
                }
            </React.Fragment>
        )
    }
    useEffect(() => {
        axios.get(`${API_URL}/api/processes/${projectId}`, {
            params: { userName }
        })
            .then((res) => {
                setProcesses(res.data.processes);
                getCurrentDiagram(res.data.processes);
            })
            .catch((err) => console.error(err));
    }, [diagramId]);
    return (
        <div className='hierarchy-sidebar'>
            <div className="d-flex justify-content-between align-items-center p-2" style={{ backgroundColor: "hsl(225, 10%, 95%)", width: "100%" }}>
                <span style={{ fontWeight: "600" }}>Hierarchy</span>
                <BsArrowBarLeft className='sidebar-btn' onClick={handleHidden} />
            </div>
            <Table style={{ overflow: "auto", width: "100%", height: "20px", tableLayout: "fixed" }}>
                <tbody style={{ width: "100%" }}>
                    {processes && processes.map(process => renderRow(process))}
                </tbody>
            </Table>
        </div>
    )
}