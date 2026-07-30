import axios from "axios";
import React, { useEffect, useState } from "react";
import {
    BsArrowBarLeft,
    BsChevronDown,
    BsChevronRight,
    BsDiagram3
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
        const isActive = process.id == diagramId;
        return (
            <React.Fragment key={process.id}>
                <div
                    className={`hierarchy-row${isActive ? ' active' : ''}`}
                    style={{ paddingLeft: 8 + level * 16 + "px" }}
                    onClick={() => handleOpenClick(process.id, process.name)}
                    title={process.name}
                >
                    <span
                        className="hierarchy-row-toggle"
                        onClick={(e) => {
                            e.stopPropagation();
                            hasChildren && toggleRow(process.id);
                        }}
                        style={{ visibility: hasChildren ? "visible" : "hidden" }}
                    >
                        {isExpanded ? <BsChevronDown size={12} /> : <BsChevronRight size={12} />}
                    </span>
                    <span className="hierarchy-row-icon">
                        <BsDiagram3 size={14} />
                    </span>
                    <span className="hierarchy-row-name">{process.name}</span>
                    {isActive && <span className="hierarchy-row-active-dot" title="Currently open" />}
                </div>
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
            <div className="hierarchy-header">
                <span>Hierarchy</span>
                <BsArrowBarLeft className='sidebar-btn' onClick={handleHidden} title="Hide sidebar" />
            </div>
            <div className="hierarchy-list">
                {processes && processes.map(process => renderRow(process))}
            </div>
        </div>
    )
}