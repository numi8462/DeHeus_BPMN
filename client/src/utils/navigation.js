import { useNavigate, useLocation } from "react-router-dom";

let navigationFunction;
let locationFunction

export const NavigationHelper = () => {
    navigationFunction = useNavigate();
    locationFunction = useLocation();
    return null;
}

export const getLocation = () => {
    if(locationFunction){
        const userName = locationFunction.state?.userName;
        const diagramId = locationFunction.state?.itemId;
        return {userName: userName, diagramId: diagramId};
    }else{
        console.error("Location function is not initialized");
    }
}

export const navigateTo = (path, diagramId, userName, data) => {
    if(navigationFunction){
        navigationFunction(path, {state: {itemId: diagramId, userName: userName, fileData: data}});
    }else{
        console.error("Navigate function is not initialized");
    }
}

