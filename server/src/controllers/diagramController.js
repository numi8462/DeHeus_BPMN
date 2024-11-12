const { MAX } = require("mssql");
const { sql } = require("../config/dbConfig");


// check the user's role in the current diagram
const getUserRole = async (req, res) => {
    const { projectId, diagramId, userEmail } = req.query;

    try {
        if (userEmail.includes('.pbmn@')) {
            // console.log('Admin account detected:', userEmail);
            return res.status(200).json({ role: 'admin' });
        } else {
            const request = new sql.Request();

            const userQuery = `
                SELECT name 
                FROM [user] 
                WHERE email = @userEmail;
            `;
            request.input('userEmail', sql.VarChar, userEmail);
            const userResult = await request.query(userQuery);

            const userName = userResult.recordset.length > 0
                ? userResult.recordset[0].name
                : 'Unknown User';

            const contributionQuery = `
                SELECT editor 
                FROM diagram_contribution 
                WHERE user_email = @userEmail AND project_id = @projectId;
            `;
            request.input('projectId', sql.Int, projectId);
            const contributionResult = await request.query(contributionQuery);

            if (contributionResult.recordset.length > 0) {
                const isEditor = contributionResult.recordset[0].editor;

                if (!isEditor) {
                    return res.status(200).json({ role: 'read-only', userName });
                }

                const diagramQuery = `
                    SELECT checkedout_by 
                    FROM diagram 
                    WHERE id = @diagramId;
                `;
                request.input('diagramId', sql.Int, diagramId);
                const diagramResult = await request.query(diagramQuery);

                if (diagramResult.recordset.length > 0) {
                    const checkedOutBy = diagramResult.recordset[0].checkedout_by;

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
        const projectQuery = `
            SELECT name
            FROM project
            WHERE id = @projectId;
        `;

        const request = new sql.Request();
        request.input('projectId', sql.Int, projectId);
        const projectResult = await request.query(projectQuery);
        const projectName = projectResult.recordset.length > 0 ? projectResult.recordset[0].name : 'Unknown Project';

        let currentDiagramId = diagramId;
        let pathStack = [];
        let currentDiagramName = '';

        while (currentDiagramId) {
            const diagramQuery = `
                SELECT name 
                FROM diagram 
                WHERE id = @diagramId;
            `;
            const diagramRequest = new sql.Request();
            diagramRequest.input('diagramId', sql.Int, currentDiagramId);
            const diagramResult = await diagramRequest.query(diagramQuery);

            if (diagramResult.recordset.length > 0) {
                currentDiagramName = diagramResult.recordset[0].name;
                pathStack.unshift(`[ ${currentDiagramName} ]`);
            } else {
                break;
            }

            const relationQuery = `
                SELECT parent_diagram_id 
                FROM diagram_relation 
                WHERE child_diagram_id = @diagramId AND project_id = @projectId;
            `;
            const relationRequest = new sql.Request();
            relationRequest.input('diagramId', sql.Int, currentDiagramId);
            relationRequest.input('projectId', sql.Int, projectId);
            const relationResult = await relationRequest.query(relationQuery);

            if (relationResult.recordset.length > 0) {
                currentDiagramId = relationResult.recordset[0].parent_diagram_id;
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
        const request = new sql.Request();
        // get published user email by date order
        const contributorQuery = `
            SELECT published_by 
            FROM diagram_published
            WHERE diagram_id = @diagramId
            ORDER BY published_at;
        `;
        request.input('diagramId', sql.Int, diagramId);
        const contributorResult = await request.query(contributorQuery);

        for (const row of contributorResult.recordset) {
            const userEmail = row.published_by.toLowerCase();
            const userRequest = new sql.Request();
            const userQuery = `
                SELECT email, name
                FROM [user]
                WHERE email = @userEmailAddress;
            `;
            userRequest.input('userEmailAddress', sql.VarChar, userEmail);
            const userResult = await userRequest.query(userQuery);

            if (userResult.recordset.length > 0) {
                const { email, name } = userResult.recordset[0];
                index += 1;
                contributors.push({ email, name, index });
            }
        }
        const checkoutRequest = new sql.Request();
        const checkoutQuery = `
            SELECT user_email, expiry_time
            FROM diagram_checkout
            WHERE diagram_id = @diagramId AND status = 1;
        `;
        checkoutRequest.input('diagramId', sql.Int, diagramId);
        const checkoutResult = await checkoutRequest.query(checkoutQuery);

        let currentCheckOut = null;

        if (checkoutResult.recordset.length > 0) {
            const { user_email, expiry_time } = checkoutResult.recordset[0];
            const currentTime = new Date();
            const remainingTime = Math.ceil((new Date(expiry_time) - currentTime) / (1000 * 60 * 60 * 24));

            const userQuery = `
                SELECT email, name
                FROM [user]
                WHERE email = @userEmail;
            `;
            const userRequest = new sql.Request();
            userRequest.input('userEmail', sql.VarChar, user_email);
            const userResult = await userRequest.query(userQuery);

            if (userResult.recordset.length > 0) {
                const { email, name } = userResult.recordset[0];
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
            sql.query(`
                DECLARE @NewValue INT;
                INSERT INTO diagram (project_id, name, created_at) 
                VALUES (${projectId}, ${"'" + processName + "'"}, GETDATE());
                SET @NewValue = SCOPE_IDENTITY();
                INSERT INTO diagram_relation (project_id, parent_diagram_id, parent_node_id, child_diagram_id)
                VALUES (${projectId},  ${diagramId}, ${"'" + elementId + "'"}, @NewValue);
                SELECT @NewValue as lastDiagramId
            `, (err, results) => {
                if (err) throw err;

                // Log the user activity as 'Created'
                const lastDiagramId = results.recordset[0].lastDiagramId;
                sql.query(`
                    INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
                    VALUES (${lastDiagramId}, ${"'" + userEmail + "'"}, GETDATE(), 'Created');
                `, (err) => {
                    if (err) {
                        console.error("Error logging user activity:", err);
                    }
                });

                res.status(200).json({ message: "Diagram created successfully", data: { name: processName, id: results.recordset[0].lastDiagramId }, projectId: projectId });
            });
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
        const request = new sql.Request();
        const query = `
            SELECT child_diagram_id as id
            FROM diagram_relation
            WHERE parent_diagram_id = @diagramId
            AND
            parent_node_id = @nodeId
        `;
        request.input("diagramId", diagramId);
        request.input("nodeId", sql.VarChar, nodeId);
        const result = await request.query(query);
        if (result.recordset.length > 0) {
            const subProcess = result.recordset[0];
            return subProcess;
        } else {
            return null;
        }
    } catch (err) {
        console.error(err);
    }
}
const updateDiagramName = async (diagramId, newName) => {
    try {
        const request = new sql.Request();
        const query = `UPDATE diagram SET name = @newName WHERE id = @diagramId`;
        request.input("newName", sql.VarChar, newName);
        request.input("diagramId", diagramId);
        await request.query(query);
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

        await sql.query`
            MERGE INTO diagram_draft AS target
            USING (SELECT 1 AS dummy) AS source
            ON target.diagram_id = ${diagramId}
            WHEN MATCHED THEN
                UPDATE SET 
                    file_data = ${blobData}, 
                    created_at = GETDATE(),
                    created_by = ${userEmail}
            WHEN NOT MATCHED THEN
                INSERT (diagram_id, file_data, file_type, created_by, created_at)
                VALUES (${diagramId}, ${blobData}, 'application/bpmn+xml', ${userEmail}, GETDATE());
        `;

        // Log the user activity as 'Edited' only if the log not exists within the current minute
        const existingLog = await sql.query`
            SELECT 1 FROM user_activity_log 
            WHERE diagram_id = ${diagramId} 
            AND user_email = ${userEmail} 
            AND type = 'Edited' 
            AND DATEDIFF(MINUTE, updated_time, GETDATE()) <= 30;
        `;

        if (existingLog.recordset.length === 0) {
            await sql.query`
                INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
                VALUES (${diagramId}, ${userEmail}, GETDATE(), 'Edited');
            `;
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
        await sql.query`
            INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
            VALUES (${diagramId}, ${userEmail}, GETDATE(), 'Requested to publish');
        `;
        res.status(200).json({ message: 'Requested to publish successful' });
    } catch (error) {
        console.error('Error during requesting to publish:', error.message);
        res.status(500).json({ message: 'Requested to publish failed', error: error.message });
    }

}

const confirmPublish = async (req, res) => {
    try {
        const { xml, diagramId } = req.body;
        const blobData = convertXMLToBlob(xml);

        // Get user data first
        const result = await sql.query`
            SELECT user_email 
            FROM diagram_checkout 
            WHERE diagram_id = ${diagramId} 
            AND status = 1
        `;
        const userEmail = result.recordset[0]?.user_email;
        if (!userEmail) {
            return res.status(400).json({ message: "Error: No user currently checked out this diagram" });
        }

        // Get current date before updating multiple tables!!
        const currentDate = new Date();

        // Insert publish data first
        await sql.query`
            INSERT INTO diagram_published (diagram_id, file_data, file_type, published_by, published_at)
            VALUES (${diagramId}, ${blobData}, 'application/bpmn+xml', ${userEmail}, ${currentDate});
        `;

        // Update last_update in project table
        const projectResult = await sql.query`
            SELECT project_id 
            FROM diagram 
            WHERE id = ${diagramId}
        `;
        const projectId = projectResult.recordset[0]?.project_id;
        if (projectId) {
            await sql.query`
                UPDATE project
                SET last_update = ${currentDate}
                WHERE id = ${projectId}
            `;
        }

        // Automatically checkout after publishing
        await sql.query`
            DELETE FROM diagram_checkout
            WHERE diagram_id = ${diagramId}
            AND user_email = ${userEmail}
        `;

        // Automatically set checkedout_by to NULL after publishing
        await sql.query`
            UPDATE diagram
            SET checkedout_by = NULL
            WHERE id = ${diagramId}
        `;

        // Log the user activity as 'Publish confirmed for'
        await sql.query`
            INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
            VALUES (${diagramId}, ${userEmail}, GETDATE(), 'Publish confirmed for');
        `;

        res.status(200).json({ message: "Diagram published and checkout info updated successfully", diagramId: diagramId });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Failed to publish diagram");
    }
};

// Log the user activity as 'Publish declined for'
const declinePublish = async (req, res) => {
    const { diagramId } = req.body;

    try {
        const result = await sql.query`
            SELECT user_email
            FROM diagram_checkout
            WHERE diagram_id = ${diagramId} AND status = 1;
        `;

        const userEmail = result.recordset[0]?.user_email;

        if (userEmail) {
            await sql.query`
                INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
                VALUES (${diagramId}, ${userEmail}, GETDATE(), 'Publish declined for');
            `;
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
        const result = await sql.query(`
            DECLARE @NewValue INT;
            INSERT INTO diagram (project_id, name, created_at) 
            VALUES (${projectId}, ${"'" + diagramName + "'"}, GETDATE());
            SET @NewValue = SCOPE_IDENTITY();
            INSERT INTO diagram_relation (project_id, parent_diagram_id, child_diagram_id)
            VALUES (${projectId}, ${diagramId}, @NewValue);
            
            SELECT @NewValue AS newDiagramId;
        `);

        // Log the user activity as 'Created'
        const newDiagramId = result.recordset[0].newDiagramId;
        await sql.query`
            INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
            VALUES (${newDiagramId}, ${userEmail}, GETDATE(), 'Created');
        `;
        res.status(200).json({ message: "Diagram created successfully" });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Failed to create diagram");
    }
}

async function getLatestPublishedDiagram(projectId, diagramId) {
    try {
        const request = new sql.Request();
        const query = `
            SELECT TOP 1
    dp.file_data,
        dp.file_type,
        dp.published_at,
        d.name AS diagramName
            FROM diagram_published dp
            JOIN diagram d ON dp.diagram_id = d.id
            WHERE d.project_id = @projectId 
              AND d.id = @diagramId
            ORDER BY dp.published_at DESC
        `;
        request.input('projectId', sql.Int, projectId);
        request.input('diagramId', sql.Int, diagramId);

        const result = await request.query(query);
        // console.log("Query Result:", result.recordset);

        if (result.recordset.length > 0) {
            const { file_data, file_type, published_at, diagramName } = result.recordset[0];
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

    // Log the user activity as 'Viewed'
    await sql.query`
        INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
        VALUES (${diagramId}, ${userEmail}, GETDATE(), 'Viewed');
    `;

    try {
        if (userEmail.includes('.pbmn@')) {
            const adminDraftData = await getLatestDraftDiagramForAdmin(diagramId);
            if (adminDraftData) {
                res.status(200).json(adminDraftData);
            } else {
                const adminDiagramData = await getLatestPublishedDiagram(projectId, diagramId);
                if (adminDiagramData) {
                    res.status(200).json(adminDiagramData);
                } else {
                    res.status(200).json(diagramId);
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
        const request = new sql.Request();
        const query = `
            SELECT TOP 1
        dd.file_data,
        dd.file_type,
        d.name AS diagramName
            FROM diagram_draft dd
            JOIN diagram d ON dd.diagram_id = d.id
            JOIN diagram_checkout dc ON dd.diagram_id = dc.diagram_id
            WHERE dc.diagram_id = @diagramId 
              AND dc.user_email = @userEmail
              ANd DATEDIFF(second, GETDATE(), dc.expiry_time) >= 1
              AND status = 1;
        `;
        request.input('diagramId', sql.Int, diagramId);
        request.input('userEmail', sql.VarChar(MAX), userEmail);

        const result = await request.query(query);
        // console.log("Query Result:", result.recordset);

        if (result.recordset.length > 0) {
            const { file_data, file_type, diagramName } = result.recordset[0];
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
        const request = new sql.Request();
        const query = `
            SELECT TOP 1
                dd.file_data,
                dd.file_type,
                d.name AS diagramName
            FROM diagram_draft dd
            JOIN diagram d ON dd.diagram_id = d.id
            WHERE dd.diagram_id = @diagramId
            ORDER BY dd.created_at DESC;
        `;
        request.input('diagramId', sql.Int, diagramId);

        const result = await request.query(query);
        // console.log("Admin Query Result:", result.recordset);

        if (result.recordset.length > 0) {
            const { file_data, file_type, diagramName } = result.recordset[0];
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
        const request = new sql.Request();
        const query = `
            SELECT 
        d.name AS diagramName
            FROM diagram d 
            JOIN diagram_checkout dc ON d.id = dc.diagram_id
            WHERE dc.diagram_id = @diagramId
              AND user_email NOT LIKE @userEmail
              AND status = 1;
        `;
        request.input('diagramId', sql.Int, diagramId);
        request.input('userEmail', sql.VarChar, userEmail);

        const result = await request.query(query);
        // console.log("Query Result:", result.recordset);

        if (result.recordset.length === 0) {
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
        const request = new sql.Request();
        const query = `
            SELECT TOP 1 type
            FROM user_activity_log
            WHERE diagram_id = @diagramId
              AND type NOT IN ('Edited', 'Viewed')
              AND type IS NOT NULL
            ORDER BY updated_time DESC;
        `;
        request.input('diagramId', sql.Int, diagramId);

        const result = await request.query(query);
        // console.log("Query Result:", result.recordset);

        if (result.recordset.length > 0 && result.recordset[0].type === "Requested to publish") {
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
        const request = new sql.Request();
        const diagramQuery = `
            SELECT id, name 
            FROM diagram
            WHERE project_id = @projectId;
        `;
        request.input('projectId', sql.VarChar, projectId);
        const result = await request.query(diagramQuery);
        res.status(200).json({ result });
    } catch (error) {
        console.error('Error fetching diagrams:', error.message);
        res.status(500).json({ message: 'Error fetching diagrams', error: error.message });
    }
}

const deleteDiagram = async (req, res) => {
    const { diagramId } = req.body;
    // console.log(`Start! diagramId: ${diagramId}`);

    let transaction;

    try {
        transaction = new sql.Transaction();
        await transaction.begin();

        const deleteDiagramAndChildren = async (diagramId, transaction) => {
            const request = new sql.Request(transaction);

            const childDiagramsQuery = `
                SELECT child_diagram_id
                FROM diagram_relation
                WHERE parent_diagram_id = @diagramId
            `;
            request.input("diagramId", sql.Int, diagramId);
            const childResult = await request.query(childDiagramsQuery);

            for (const row of childResult.recordset) {
                // console.log(`Now deleting diagram: ${row.child_diagram_id}`);
                await deleteDiagramAndChildren(row.child_diagram_id, transaction);
            }

            await transaction.request()
                .input("diagramId", sql.Int, diagramId)
                .query(`DELETE FROM diagram_relation WHERE child_diagram_id = @diagramId`);
            await transaction.request()
                .input("diagramId", sql.Int, diagramId)
                .query(`DELETE FROM diagram_checkout WHERE diagram_id = @diagramId`);
            await transaction.request()
                .input("diagramId", sql.Int, diagramId)
                .query(`DELETE FROM diagram_draft WHERE diagram_id = @diagramId`);
            await transaction.request()
                .input("diagramId", sql.Int, diagramId)
                .query(`DELETE FROM diagram_published WHERE diagram_id = @diagramId`);
            await transaction.request()
                .input("diagramId", sql.Int, diagramId)
                .query(`DELETE FROM node_attachment WHERE diagram_id = @diagramId`);
            await transaction.request()
                .input("diagramId", sql.Int, diagramId)
                .query(`DELETE FROM diagram WHERE id = @diagramId`);
        };

        await deleteDiagramAndChildren(diagramId, transaction);

        await transaction.commit();

        res.status(200).json({ message: "Diagram and its children deleted successfully!" });
    } catch (error) {
        console.error("Error deleting diagram:", error.message);

        if (transaction) {
            await transaction.rollback();
        }

        res.status(500).json({ message: "Error deleting diagram", error: error.message });
    }
};




module.exports = { getUserRole, getDiagramPath, getContributors, draftSave, requestPublish, confirmPublish, declinePublish, getDiagramData, getDraftData, createSubProcess, updateSubProcessName, addDiagram, checkRequested, getAllDiagrams, deleteDiagram };

