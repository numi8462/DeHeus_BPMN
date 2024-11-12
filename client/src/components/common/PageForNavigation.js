import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import axios from "axios";
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function PageForNav() {
    const API_URL = process.env.REACT_APP_API_URL;
    const { projectId, diagramName, diagramId } = useParams();
    const isAuthenticated = useIsAuthenticated();
    const { accounts } = useMsal();
    const navigate = useNavigate();

    // Fetch diagram from DB
    const getDiagramXML = async (name) => {
        try{
            const response = await axios.get(`${API_URL}/api/diagrams/get-diagram-with-project/${projectId}/${diagramId}/${name}`)
            if (response.data && response.data.fileData) {
                const url = `/project/${projectId}/${diagramName}`;
                
                navigate(url, {state: { itemId: diagramId, userName: name, fileData: response.data.fileData }});
            }
        }catch(err){
            console.error("Error fetching diagram: ", err);
        }
    }

    // Admin redirection to diagram draft
    useEffect(() => {
        if (isAuthenticated && accounts.length > 0) {
            const userName = accounts[0].username;
            if (userName.includes('.pbmn@')) {
                getDiagramXML(userName);
            }
        }
    }, [isAuthenticated])
    return (
        <div></div>
    )
}