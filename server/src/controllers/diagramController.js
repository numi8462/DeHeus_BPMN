const { pool } = require("../config/dbConfig");


// check the user's role in the current diagram
const getUserRole = async (req, res) => {
    const { projectId, diagramId, userEmail } = req.query;

    try {
        if (userEmail.includes('.pbmn@')) {
            // console.log('Admin account detected:', userEmail);
            return res.status(200).json({ role: 'admin' });
        } else {
            const userResult = await pool.query(
                `SELECT name
                FROM "user"
                WHERE email = $1;`,
                [userEmail]
            );

            const userName = userResult.rows.length > 0
                ? userResult.rows[0].name
                : 'Unknown User';

            const contributionResult = await pool.query(
                `SELECT editor
                FROM diagram_contribution
                WHERE user_email = $1 AND project_id = $2;`,
                [userEmail, projectId]
            );

            if (contributionResult.rows.length > 0) {
                const isEditor = contributionResult.rows[0].editor;

                if (!isEditor) {
                    return res.status(200).json({ role: 'read-only', userName });
                }

                const diagramResult = await pool.query(
                    `SELECT checkedout_by
                    FROM diagram
                    WHERE id = $1;`,
                    [diagramId]
                );

                if (diagramResult.rows.length > 0) {
                    const checkedOutBy = diagramResult.rows[0].checkedout_by;

                    if (checkedOutBy === null) {
                        return res.status(200).json({ role: 'contributor', userName });
                    } else if (checkedOutBy !== userEmail) {
                        return res.status(200).json({ role: 'read-only', userName });
                    } else {
                        return res.status(200).json({ role: 'editing', userName });
                    }
                }
            }
            res.status(200).json({ role: 'read-only', userName });
        }

    } catch (error) {
        console.error('Error fetching user role:', error.message);
        res.status(500).json({ message: 'Error fetching user role', error: error.message });
    }
};


// check diagram path for displaying on the checkout modal
const getDiagramPath = async (req, res) => {
    const { diagramId, projectId } = req.query;

    try {
        const projectResult = await pool.query(
            `SELECT name
            FROM project
            WHERE id = $1;`,
            [projectId]
        );
        const projectName = projectResult.rows.length > 0 ? projectResult.rows[0].name : 'Unknown Project';

        let currentDiagramId = diagramId;
        let pathStack = [];
        let currentDiagramName = '';

        while (currentDiagramId) {
            const diagramResult = await pool.query(
                `SELECT name
                FROM diagram
                WHERE id = $1;`,
                [currentDiagramId]
            );

            if (diagramResult.rows.length > 0) {
                currentDiagramName = diagramResult.rows[0].name;
                pathStack.unshift(`[ ${currentDiagramName} ]`);
            } else {
                break;
            }

            const relationResult = await pool.query(
                `SELECT parent_diagram_id
                FROM diagram_relation
                WHERE child_diagram_id = $1 AND project_id = $2;`,
                [currentDiagramId, projectId]
            );

            if (relationResult.rows.length > 0) {
                currentDiagramId = relationResult.rows[0].parent_diagram_id;
            } else {
                currentDiagramId = null;
            }
        }

        const fullPath = `[ ${projectName} ] - ${pathStack.join(' - ')}`;
        res.status(200).json({ path: fullPath, diagramName: currentDiagramName });

    } catch (error) {
        console.error('Error fetching diagram path:', error.message);
        res.status(500).json({ message: 'Error fetching diagram path', error: error.message });
    }
};

// get contributors for diagram
const getContributors = async (req, res) => {
    const { diagramId } = req.query;
    const contributors = [];
    let index = 0;

    try {
        // get published user email by date order
        const contributorResult = await pool.query(
            `SELECT published_by
            FROM diagram_published
            WHERE diagram_id = $1
            ORDER BY published_at;`,
            [diagramId]
        );

        for (const row of contributorResult.rows) {
            const userEmail = row.published_by.toLowerCase();
            const userResult = await pool.query(
                `SELECT email, name
                FROM "user"
                WHERE email = $1;`,
                [userEmail]
            );

            if (userResult.rows.length > 0) {
                const { email, name } = userResult.rows[0];
                index += 1;
                contributors.push({ email, name, index });
            }
        }

        const checkoutResult = await pool.query(
            `SELECT user_email, expiry_time
            FROM diagram_checkout
            WHERE diagram_id = $1 AND status = true;`,
            [diagramId]
        );

        let currentCheckOut = null;

        if (checkoutResult.rows.length > 0) {
            const { user_email, expiry_time } = checkoutResult.rows[0];
            const currentTime = new Date();
            const remainingTime = Math.ceil((new Date(expiry_time) - currentTime) / (1000 * 60 * 60 * 24));

            const userResult = await pool.query(
                `SELECT email, name
                FROM "user"
                WHERE email = $1;`,
                [user_email]
            );

            if (userResult.rows.length > 0) {
                const { email, name } = userResult.rows[0];
                currentCheckOut = {
                    checkoutUserEmail: email,
                    checkoutUserName: name,
                    remainingTime
                };
            }
        }

        res.status(200).json({ contributors, currentCheckOut });
    } catch (error) {
        console.error('Error fetching contributor:', error.message);
        res.status(500).json({ message: 'Error fetching contributor', error: error.message });
    }
};

// convert function for saving diagram
function convertXMLToBlob(xmlString) {
    // xml to blob
    return Buffer.from(xmlString, 'utf-8');
}

// convert function for loading diagram
function convertBlobtoXML(file_data) {
    // blob to xml
    return file_data.toString('utf-8');
}

const createSubProcess = async (req, res) => {
    try {
        const { projectId, diagramId, processName, elementId, userEmail } = req.body;

        const result = await getChildDiagram(diagramId, elementId);
        if (!result) {
            const insertResult = await pool.query(
                `WITH new_diagram AS (
                    INSERT INTO diagram (project_id, name, created_at)
                    VALUES ($1, $2, NOW())
                    RETURNING id
                )
                INSERT INTO diagram_relation (project_id, parent_diagram_id, parent_node_id, child_diagram_id)
                SELECT $1, $3, $4, id FROM new_diagram
                RETURNING child_diagram_id AS "lastDiagramId";`,
                [projectId, processName, diagramId, elementId]
            );

            const lastDiagramId = insertResult.rows[0].lastDiagramId;

            // Log the user activity as 'Created'
            try {
                await pool.query(
                    `INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
                    VALUES ($1, $2, NOW(), 'Created');`,
                    [lastDiagramId, userEmail]
                );
            } catch (err) {
                console.error("Error logging user activity:", err);
            }

            res.status(200).json({ message: "Diagram created successfully", data: { name: processName, id: lastDiagramId }, projectId: projectId });
        } else {
            if (result.name !== processName) {
                await updateDiagramName(result.id, processName);
            }
            res.status(200).json({ message: "Diagram already exists", data: result });
        }

    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Failed to create diagram draft");
    }
}

const getChildDiagram = async (diagramId, nodeId) => {
    try {
        const result = await pool.query(
            `SELECT dr.child_diagram_id as id, d.name
            FROM diagram_relation dr
            JOIN diagram d ON d.id = dr.child_diagram_id
            WHERE dr.parent_diagram_id = $1
            AND dr.parent_node_id = $2`,
            [diagramId, nodeId]
        );
        if (result.rows.length > 0) {
            return result.rows[0];
        } else {
            return null;
        }
    } catch (err) {
        console.error(err);
    }
}
const updateDiagramName = async (diagramId, newName) => {
    try {
        await pool.query(`UPDATE diagram SET name = $1 WHERE id = $2`, [newName, diagramId]);
        return;
    } catch (err) {
        console.error(err);
    }
}

const updateSubProcessName = async (req, res) => {
    const { name, nodeId, diagramId } = req.body;
    try {
        const subprocess = await getChildDiagram(diagramId, nodeId);
        if (subprocess) {
            await updateDiagramName(subprocess.id, name);
            res.status(200).json({ message: "Diagram updated successfully" });
        } else {
            res.status(500).json({ message: "Diagram doesn't exist" });
        }
    } catch (err) {
        console.error(err);
    }

}

const draftSave = async (req, res) => {
    try {
        const { xml, diagramId, userEmail } = req.body;
        const blobData = convertXMLToBlob(xml);

        await pool.query(
            `INSERT INTO diagram_draft (diagram_id, file_data, file_type, created_by, created_at)
            VALUES ($1, $2, 'application/bpmn+xml', $3, NOW())
            ON CONFLICT (diagram_id) DO UPDATE SET
                file_data = EXCLUDED.file_data,
                created_at = NOW(),
                created_by = EXCLUDED.created_by;`,
            [diagramId, blobData, userEmail]
        );

        // Log the user activity as 'Edited' only if the log not exists within the current minute
        const existingLog = await pool.query(
            `SELECT 1 FROM user_activity_log
            WHERE diagram_id = $1
            AND user_email = $2
            AND type = 'Edited'
            AND updated_time >= NOW() - INTERVAL '30 minutes';`,
            [diagramId, userEmail]
        );

        if (existingLog.rows.length === 0) {
            await pool.query(
                `INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
                VALUES ($1, $2, NOW(), 'Edited');`,
                [diagramId, userEmail]
            );
        }

        res.status(200).json({ message: "Diagram draft saved successfully", diagramId: diagramId });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Failed to save diagram draft");
    }
};

// Log the user activity as 'Requested to publish'
const requestPublish = async (req, res) => {
    const { diagramId, userEmail } = req.body;

    try {
        await pool.query(
            `INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
            VALUES ($1, $2, NOW(), 'Requested to publish');`,
            [diagramId, userEmail]
        );
        res.status(200).json({ message: 'Requested to publish successful' });
    } catch (error) {
        console.error('Error during requesting to publish:', error.message);
        res.status(500).json({ message: 'Requested to publish failed', error: error.message });
    }

}

const confirmPublish = async (req, res) => {
    try {
        const { xml, diagramId, userEmail: requesterEmail } = req.body;
        const blobData = convertXMLToBlob(xml);

        // Get user data first (falls back to the requester, e.g. an admin publishing without an active checkout)
        const result = await pool.query(
            `SELECT user_email
            FROM diagram_checkout
            WHERE diagram_id = $1
            AND status = true`,
            [diagramId]
        );
        const userEmail = result.rows[0]?.user_email || requesterEmail;
        if (!userEmail) {
            return res.status(400).json({ message: "Error: No user currently checked out this diagram" });
        }

        // Get current date before updating multiple tables!!
        const currentDate = new Date();

        // Insert publish data first
        await pool.query(
            `INSERT INTO diagram_published (diagram_id, file_data, file_type, published_by, published_at)
            VALUES ($1, $2, 'application/bpmn+xml', $3, $4);`,
            [diagramId, blobData, userEmail, currentDate]
        );

        // Update last_update in project table
        const projectResult = await pool.query(
            `SELECT project_id
            FROM diagram
            WHERE id = $1`,
            [diagramId]
        );
        const projectId = projectResult.rows[0]?.project_id;
        if (projectId) {
            await pool.query(
                `UPDATE project
                SET last_update = $1
                WHERE id = $2`,
                [currentDate, projectId]
            );
        }

        // Automatically checkout after publishing
        await pool.query(
            `DELETE FROM diagram_checkout
            WHERE diagram_id = $1
            AND user_email = $2`,
            [diagramId, userEmail]
        );

        // Automatically set checkedout_by to NULL after publishing
        await pool.query(
            `UPDATE diagram
            SET checkedout_by = NULL
            WHERE id = $1`,
            [diagramId]
        );

        // Log the user activity as 'Publish confirmed for'
        await pool.query(
            `INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
            VALUES ($1, $2, NOW(), 'Publish confirmed for');`,
            [diagramId, userEmail]
        );

        res.status(200).json({ message: "Diagram published and checkout info updated successfully", diagramId: diagramId });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Failed to publish diagram");
    }
};

// Log the user activity as 'Publish declined for'
const declinePublish = async (req, res) => {
    const { diagramId, userEmail: requesterEmail } = req.body;

    try {
        const result = await pool.query(
            `SELECT user_email
            FROM diagram_checkout
            WHERE diagram_id = $1 AND status = true;`,
            [diagramId]
        );

        const userEmail = result.rows[0]?.user_email || requesterEmail;

        if (userEmail) {
            await pool.query(
                `INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
                VALUES ($1, $2, NOW(), 'Publish declined for');`,
                [diagramId, userEmail]
            );
            res.status(200).json({ message: 'Logging publish declined successful' });
        } else {
            res.status(404).json({ message: 'No active checkout found for the specified diagram' });
        }
    } catch (error) {
        console.error('Error during logging publish declined:', error.message);
        res.status(500).json({ message: 'Requested to log publish declined failed', error: error.message });
    }
}

const addDiagram = async (req, res) => {
    const { projectId, diagramName, diagramId, userEmail } = req.body;
    try {
        const insertResult = await pool.query(
            `WITH new_diagram AS (
                INSERT INTO diagram (project_id, name, created_at)
                VALUES ($1, $2, NOW())
                RETURNING id
            )
            INSERT INTO diagram_relation (project_id, parent_diagram_id, child_diagram_id)
            SELECT $1, $3, id FROM new_diagram
            RETURNING child_diagram_id AS "newDiagramId";`,
            [projectId, diagramName, diagramId]
        );

        // Log the user activity as 'Created'
        const newDiagramId = insertResult.rows[0].newDiagramId;
        await pool.query(
            `INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
            VALUES ($1, $2, NOW(), 'Created');`,
            [newDiagramId, userEmail]
        );
        res.status(200).json({ message: "Diagram created successfully" });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Failed to create diagram");
    }
}

async function getLatestPublishedDiagram(projectId, diagramId) {
    try {
        const result = await pool.query(
            `SELECT
                dp.file_data,
                dp.file_type,
                dp.published_at,
                d.name AS "diagramName"
            FROM diagram_published dp
            JOIN diagram d ON dp.diagram_id = d.id
            WHERE d.project_id = $1
              AND d.id = $2
            ORDER BY dp.published_at DESC
            LIMIT 1`,
            [projectId, diagramId]
        );
        // console.log("Query Result:", result.rows);

        if (result.rows.length > 0) {
            const { file_data, file_type, published_at, diagramName } = result.rows[0];
            return {
                fileData: convertBlobtoXML(file_data),
                fileType: file_type,
                diagramName,
                publishDate: new Date(published_at).toISOString().split('T')[0]
            };
        } else {
            console.log("No diagram found for the given projectId and diagramId");
            return null;  // 해당 프로젝트 내에서 특정 다이어그램을 찾을 수 없는 경우
        }
    } catch (err) {
        console.error('Error executing query:', err.message); // 쿼리 실행 중 오류 발생, 데베 문제
        throw new Error('Error fetching diagram: ' + err.message);
    }
}

async function getDiagramData(req, res) {
    const { projectId, diagramId, userEmail } = req.params;

    try {
        // Log the user activity as 'Viewed'
        await pool.query(
            `INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
            VALUES ($1, $2, NOW(), 'Viewed');`,
            [diagramId, userEmail]
        );

        if (userEmail.includes('.pbmn@')) {
            const adminDraftData = await getLatestDraftDiagramForAdmin(diagramId);
            if (adminDraftData) {
                res.status(200).json(adminDraftData);
            } else {
                const adminDiagramData = await getLatestPublishedDiagram(projectId, diagramId);
                if (adminDiagramData) {
                    res.status(200).json(adminDiagramData);
                } else {
                    res.status(200).json({ message: "available", id: diagramId });
                }
            }
        } else {
            const draftData = await getLatestDraftDiagram(diagramId, userEmail);
            if (draftData) {
                res.status(200).json(draftData);
            } else {
                const diagramData = await getLatestPublishedDiagram(projectId, diagramId);
                if (diagramData) {
                    res.status(200).json(diagramData);
                } else {
                    const msg = await checkNewDiagram(diagramId, userEmail);
                    if (msg) {
                        res.status(200).json({ message: msg.message });
                    } else {
                        res.status(200).json({ message: 'Diagram already has been checked out by someone' });
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error in getDiagramData:", err.message);
        res.status(500).json({ message: 'Error fetching diagram', error: err.message });
    }
}

async function getLatestDraftDiagram(diagramId, userEmail) {
    try {
        const result = await pool.query(
            `SELECT
                dd.file_data,
                dd.file_type,
                d.name AS "diagramName"
            FROM diagram_draft dd
            JOIN diagram d ON dd.diagram_id = d.id
            JOIN diagram_checkout dc ON dd.diagram_id = dc.diagram_id
            WHERE dc.diagram_id = $1
              AND dc.user_email = $2
              AND dc.expiry_time > NOW()
              AND dc.status = true;`,
            [diagramId, userEmail]
        );
        // console.log("Query Result:", result.rows);

        if (result.rows.length > 0) {
            const { file_data, file_type, diagramName } = result.rows[0];
            return {
                fileData: convertBlobtoXML(file_data),
                fileType: file_type,
                diagramName
            };
        } else {
            console.log("No diagram found for the given projectId and diagramId");
            return null;
        }
    } catch (err) {
        console.error('Error executing query:', err.message);
        throw new Error('Error fetching diagram: ' + err.message);
    }
}

// function for admin to view draft version for publish request
async function getLatestDraftDiagramForAdmin(diagramId) {
    try {
        const result = await pool.query(
            `SELECT
                dd.file_data,
                dd.file_type,
                d.name AS "diagramName"
            FROM diagram_draft dd
            JOIN diagram d ON dd.diagram_id = d.id
            WHERE dd.diagram_id = $1
            ORDER BY dd.created_at DESC
            LIMIT 1;`,
            [diagramId]
        );
        // console.log("Admin Query Result:", result.rows);

        if (result.rows.length > 0) {
            const { file_data, file_type, diagramName } = result.rows[0];
            return {
                fileData: convertBlobtoXML(file_data),
                fileType: file_type,
                diagramName
            };
        } else {
            console.log("No diagram found for the given diagramId");
            return null;
        }
    } catch (err) {
        console.error('Error executing admin query:', err.message);
        throw new Error('Error fetching diagram for admin: ' + err.message);
    }
}


const checkNewDiagram = async (diagramId, userEmail) => {
    try {
        const result = await pool.query(
            `SELECT
                d.name AS "diagramName"
            FROM diagram d
            JOIN diagram_checkout dc ON d.id = dc.diagram_id
            WHERE dc.diagram_id = $1
              AND user_email NOT LIKE $2
              AND status = true;`,
            [diagramId, userEmail]
        );
        // console.log("Query Result:", result.rows);

        if (result.rows.length === 0) {
            return { message: "available", id: diagramId };
        } else {
            console.log("Already checked out by someone");
            return null;  // 이미 체크아웃 된 드래프트일 경우
        }
    } catch (err) {
        console.error('Error executing query:', err.message); // 쿼리 실행 중 오류 발생, 데베 문제
        throw new Error('Error fetching diagram: ' + err.message);
    }
}

const getDraftData = async (req, res) => {
    const { projectId, diagramId, userEmail } = req.query;
    try{
        const draftData = await getLatestDraftDiagram(diagramId, userEmail);
        if(draftData){
            res.status(200).json(draftData);
        }else{
            const publishData = await getLatestPublishedDiagram(projectId, diagramId);
            if(publishData){
                res.status(200).json(publishData);
            }else{
                res.status(500).json({message: "Failed to load latest draft of the user"});
            }
        }
    }catch(err){
        console.error("Error fetching draft data: ", err);
    }
}

// check if diagram is publish requested
const checkRequested = async (req, res) => {
    const { diagramId } = req.query;
    try {
        const result = await pool.query(
            `SELECT type
            FROM user_activity_log
            WHERE diagram_id = $1
              AND type NOT IN ('Edited', 'Viewed')
              AND type IS NOT NULL
            ORDER BY updated_time DESC
            LIMIT 1;`,
            [diagramId]
        );
        // console.log("Query Result:", result.rows);

        if (result.rows.length > 0 && result.rows[0].type === "Requested to publish") {
            res.status(200).json({ requestedToPublish: true });
        } else {
            res.status(200).json({ requestedToPublish: false });
        }
    } catch (error) {
        console.error('Error fetching check request:', error.message);
        res.status(500).json({ message: 'Error fetching check request', error: error.message });
    }
}

// return all diagrams
const getAllDiagrams = async (req, res) => {
    const { projectId } = req.query;
    try {
        const result = await pool.query(
            `SELECT id, name
            FROM diagram
            WHERE project_id = $1;`,
            [projectId]
        );
        // preserve the { result: { recordset } } shape the frontend (TopBar.js) already expects
        res.status(200).json({ result: { recordset: result.rows } });
    } catch (error) {
        console.error('Error fetching diagrams:', error.message);
        res.status(500).json({ message: 'Error fetching diagrams', error: error.message });
    }
}

const deleteDiagram = async (req, res) => {
    const { diagramId } = req.body;
    // console.log(`Start! diagramId: ${diagramId}`);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const deleteDiagramAndChildren = async (diagramId) => {
            const childResult = await client.query(
                `SELECT child_diagram_id
                FROM diagram_relation
                WHERE parent_diagram_id = $1`,
                [diagramId]
            );

            for (const row of childResult.rows) {
                // console.log(`Now deleting diagram: ${row.child_diagram_id}`);
                await deleteDiagramAndChildren(row.child_diagram_id);
            }

            await client.query(`DELETE FROM diagram_relation WHERE child_diagram_id = $1`, [diagramId]);
            await client.query(`DELETE FROM diagram_checkout WHERE diagram_id = $1`, [diagramId]);
            await client.query(`DELETE FROM diagram_draft WHERE diagram_id = $1`, [diagramId]);
            await client.query(`DELETE FROM diagram_published WHERE diagram_id = $1`, [diagramId]);
            await client.query(`DELETE FROM node_attachment WHERE diagram_id = $1`, [diagramId]);
            await client.query(`DELETE FROM diagram WHERE id = $1`, [diagramId]);
        };

        await deleteDiagramAndChildren(diagramId);

        await client.query('COMMIT');

        res.status(200).json({ message: "Diagram and its children deleted successfully!" });
    } catch (error) {
        console.error("Error deleting diagram:", error.message);
        await client.query('ROLLBACK');
        res.status(500).json({ message: "Error deleting diagram", error: error.message });
    } finally {
        client.release();
    }
};




module.exports = { getUserRole, getDiagramPath, getContributors, draftSave, requestPublish, confirmPublish, declinePublish, getDiagramData, getDraftData, createSubProcess, updateSubProcessName, addDiagram, checkRequested, getAllDiagrams, deleteDiagram };
