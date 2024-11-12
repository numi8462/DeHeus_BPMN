const { sql } = require("../config/dbConfig");

const getAttachment = async (req, res) => {
    const { diagramId, nodeId, fileName } = req.params;
    try {
        const result = await sql.query(`
            SELECT file_data, file_type FROM node_attachment 
            WHERE diagram_id = ${diagramId} AND node_id = ${"'" + nodeId + "'"} AND file_name LIKE ${"'" + fileName + "'"}
        `);
        const data = Buffer.from(result.recordset[0].file_data).toString('utf-8'); // utf-8 encoding to prevent the value changes
        const buffer = Buffer.from(data, 'base64');
        const file = new Blob([buffer], { type: result.recordset[0].file_type }); // Convert buffer to blob
        // Send the Blob in the http response
        res.type(result.recordset[0].file_type);
        res.send(Buffer.from(await file.arrayBuffer()));
    } catch (err) {
        console.log("Error", err);
        res.status(500).send("Error");
    }
}

const deleteAttachments = async (req, res) => {
    const { diagramId, fileName, nodeId } = req.params;
    try {
        await sql.query(`
            DELETE FROM node_attachment 
            WHERE diagram_id = ${diagramId} AND file_name = ${"'" + fileName + "'"} AND node_id = ${"'" + nodeId + "'"}
        `);
        res.status(200).json({ message: "Attachment deleted successfully", file: fileName });
    } catch (err) {
        console.log("Error", err);
        res.status(500).send("Error");
    }
}

const deleteAllAttachments = async (req, res) => {
    const { diagramId, nodeId } = req.params;
    try {
        await sql.query(`
            DELETE FROM node_attachment 
            WHERE diagram_id = ${diagramId} AND node_id = ${"'" + nodeId + "'"}
        `);
        res.status(200).json({ message: "Attachments deleted successfully" });
    } catch (err) {
        console.log("Error", err);
        res.status(500).send("Error");
    }
}

const addAttachments = async (req, res) => {
    const { diagramId } = req.params;
    const { nodeId, file, type } = req.body;
    const fileData = file.data.slice(file.data.indexOf(",") + 1, file.data.length);
    const buffer = Buffer.from("'" + fileData + "'", 'utf-8'); // utf-8 encoding
    try {
        await sql.query(`
        INSERT INTO node_attachment 
        (diagram_id, node_id, file_name, file_data, file_type)  
        Values (${diagramId}, ${"'" + nodeId + "'"}, ${"'" + file.name + "'"}, cast(${buffer} as varbinary(max)), ${"'" + type + "'"})
    `);
        res.status(200).json({ message: "Attachment uploaded successfully", file: file.name });
    } catch (err) {
        console.log("Error", err);
        res.status(500).send("Error");
    }
}

module.exports = { getAttachment, deleteAttachments, addAttachments, deleteAllAttachments};