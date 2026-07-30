const { pool } = require("../config/dbConfig");

const getAttachment = async (req, res) => {
    const { diagramId, nodeId, fileName } = req.params;
    try {
        const result = await pool.query(
            `SELECT file_data, file_type FROM node_attachment
            WHERE diagram_id = $1 AND node_id = $2 AND file_name LIKE $3`,
            [diagramId, nodeId, fileName]
        );
        const { file_data, file_type } = result.rows[0];
        // pg returns bytea columns as a Buffer already
        res.type(file_type);
        res.send(file_data);
    } catch (err) {
        console.log("Error", err);
        res.status(500).send("Error");
    }
}

const deleteAttachments = async (req, res) => {
    const { diagramId, fileName, nodeId } = req.params;
    try {
        await pool.query(
            `DELETE FROM node_attachment
            WHERE diagram_id = $1 AND file_name = $2 AND node_id = $3`,
            [diagramId, fileName, nodeId]
        );
        res.status(200).json({ message: "Attachment deleted successfully", file: fileName });
    } catch (err) {
        console.log("Error", err);
        res.status(500).send("Error");
    }
}

const deleteAllAttachments = async (req, res) => {
    const { diagramId, nodeId } = req.params;
    try {
        await pool.query(
            `DELETE FROM node_attachment
            WHERE diagram_id = $1 AND node_id = $2`,
            [diagramId, nodeId]
        );
        res.status(200).json({ message: "Attachments deleted successfully" });
    } catch (err) {
        console.log("Error", err);
        res.status(500).send("Error");
    }
}

const addAttachments = async (req, res) => {
    const { diagramId } = req.params;
    const { nodeId, file, type } = req.body;
    const base64Data = file.data.slice(file.data.indexOf(",") + 1, file.data.length);
    const buffer = Buffer.from(base64Data, 'base64');
    try {
        await pool.query(
            `INSERT INTO node_attachment
            (diagram_id, node_id, file_name, file_data, file_type)
            VALUES ($1, $2, $3, $4, $5)`,
            [diagramId, nodeId, file.name, buffer, type]
        );
        res.status(200).json({ message: "Attachment uploaded successfully", file: file.name });
    } catch (err) {
        console.log("Error", err);
        res.status(500).send("Error");
    }
}

module.exports = { getAttachment, deleteAttachments, addAttachments, deleteAllAttachments};
