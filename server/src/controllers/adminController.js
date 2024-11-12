const { sql } = require("../config/dbConfig");


const getUserList = async (req, res) => {
    try {
        const userQuery = "SELECT email, name, department FROM [user] WHERE department != 'admin'";
        const userResult = await sql.query(userQuery);

        const users = userResult.recordset;

        for (let user of users) {
            const request = new sql.Request();
            request.input('Email', sql.NVarChar, user.email);

            const userDetailsQuery = `
                SELECT TOP 1 updated_time 
                FROM user_activity_log 
                WHERE user_email = @Email 
                ORDER BY updated_time DESC
            `;

            const userDetailsResult = await request.query(userDetailsQuery);

            user.lastUpdate = userDetailsResult.recordset.length > 0 
                ? userDetailsResult.recordset[0].updated_time 
                : null;
        }

        res.json(users);
    } catch (err) {
        console.error("Error fetching user list", err);
        res.status(500).send("Error fetching user list");
    }
};


const getUserData = async (req, res) => {
    const identifier = req.params.identifier;
  
    try {
        // basic user info
        const userEmailQuery = `
            SELECT email, name, department 
            FROM [user]
            WHERE LEFT(email, CHARINDEX('@', email) - 1) = @Identifier
        `;
    
        const request = new sql.Request();
        request.input('Identifier', sql.NVarChar, identifier);
    
        const userEmailResult = await request.query(userEmailQuery);
    
        if (userEmailResult.recordset.length === 0) {
            return res.status(404).send("User not found");
        }
    
        const { email, name, department } = userEmailResult.recordset[0];

    
        // projects with read only or editor role
        const accessibleProjectsQuery = `
            SELECT DISTINCT 
            p.id AS projectId,
            p.name AS projectName,
            CASE 
                WHEN dc.editor = 0 THEN 'Read-only'
                WHEN dc.editor = 1 THEN 'Editor'
                ELSE 'Unknown'
            END AS role
            FROM project p
            LEFT JOIN diagram_contribution dc 
            ON p.id = dc.project_id 
            AND dc.user_email = @Email
            WHERE p.id IN (
            SELECT project_id 
            FROM diagram_contribution 
            WHERE user_email = @Email
            )
        `;
    
        // no access projects
        const availableProjectsQuery = `
            SELECT p.id, p.name
            FROM project p
            WHERE p.id NOT IN (
            SELECT dc.project_id
            FROM diagram_contribution dc
            WHERE dc.user_email = @Email
            )
        `;

        // checkout diagrams
        const checkedOutDiagramsQuery = `
        SELECT d.name AS diagramName, 
                p.name AS projectName, 
                dc.checkout_time, 
                dc.expiry_time
        FROM diagram d
        INNER JOIN project p ON d.project_id = p.id
        INNER JOIN diagram_checkout dc ON d.id = dc.diagram_id
        WHERE dc.user_email = @Email
            AND dc.status = 1
        `;
    
        request.input('Email', sql.NVarChar, email);
        const accessibleProjectsResult = await request.query(accessibleProjectsQuery);
        const availableProjectsResult = await request.query(availableProjectsQuery);

        const checkedOutDiagramsResult = await request.query(checkedOutDiagramsQuery);
        const checkedOutDiagrams = checkedOutDiagramsResult.recordset.map((record) => {
        const remainingTime = Math.ceil((new Date(record.expiry_time) - new Date()) / (1000 * 60 * 60 * 24));
        return {
            diagram: `[${record.projectName}] ${record.diagramName}`,
            remainingTime,
        };
    });
    
    res.json({
        email,
        name,
        department,
        projects: accessibleProjectsResult.recordset,
        availableProjects: availableProjectsResult.recordset,
        checkedOut: checkedOutDiagrams
    });
    } catch (err) {
        console.error("Error fetching user data", err);
        res.status(500).send("Error fetching user data");
    }
};


const listAvailableProjects = async (req, res) => {
    const userEmail = req.params.email;
  
    try {
      const availableProjectsQuery = `
        SELECT p.id, p.name
        FROM project p
        WHERE p.id NOT IN (
          SELECT dc.project_id
          FROM diagram_contribution dc
          WHERE dc.user_email = @UserEmail
        )
      `;
  
      const request = new sql.Request();
      request.input('UserEmail', sql.NVarChar, userEmail);
  
      const result = await request.query(availableProjectsQuery);
      res.json(result.recordset);
    } catch (err) {
      console.error("Error listing available projects", err);
      res.status(500).send("Error listing available projects");
    }
  };


const updateProjectRole = async (userEmail, projectId, role) => {
    const request = new sql.Request();
    request.input('UserEmail', sql.NVarChar, userEmail);
    request.input('ProjectId', sql.Int, projectId);
    request.input('Editor', sql.Bit, role === "Editor" ? 1 : 0);

    const mergeQuery = `
        MERGE diagram_contribution AS target
        USING (SELECT @UserEmail AS user_email, @ProjectId AS project_id) AS source
        ON (target.user_email = source.user_email AND target.project_id = source.project_id)
        WHEN MATCHED THEN 
            UPDATE SET target.editor = @Editor
        WHEN NOT MATCHED THEN
            INSERT (user_email, project_id, editor)
            VALUES (@UserEmail, @ProjectId, @Editor);
    `;

    const result = await request.query(mergeQuery);
    // console.log(`Project role updated for projectId ${projectId}: ${result.rowsAffected}`);  // debugging console log
};


const handleRoleChange = async (userEmail, projectId, role) => {
    try {
        const request = new sql.Request();
        request.input('UserEmail', sql.NVarChar, userEmail);
        request.input('ProjectId', sql.Int, projectId);
        request.input('EditorValue', sql.Bit, role === 'Editor' ? 1 : 0);

        const updateQuery = `
            UPDATE diagram_contribution
            SET editor = @EditorValue
            WHERE user_email = @UserEmail AND project_id = @ProjectId
        `;

        const result = await request.query(updateQuery);
        // console.log(`Role change result for projectId ${projectId}: ${result.rowsAffected}`);  // debugging console log
    } catch (error) {
        console.error('Error updating role:', error);
    }
};


const removeProject = async (userEmail, projectId) => {
    const request = new sql.Request();

    const deleteQuery = `
        DELETE FROM diagram_contribution
        WHERE user_email = @UserEmail AND project_id = @ProjectId
    `;

    request.input('UserEmail', sql.NVarChar, userEmail);
    request.input('ProjectId', sql.Int, projectId);

    const result = await request.query(deleteQuery);
    // console.log(`Deleted rows: ${result.rowsAffected}`);  // debugging console log
};


const saveUserData = async (req, res) => {
    const { userEmail, projectUpdates, removedProjects, roleChanges } = req.body;

    try {
        for (const project of projectUpdates) {
            await updateProjectRole(userEmail, project.projectId, project.role);
        }

        for (const roleChange of roleChanges) {
            await handleRoleChange(userEmail, roleChange.projectId, roleChange.role);
        }

        for (const projectId of removedProjects) {
            await removeProject(userEmail, projectId);
        }

        res.status(200).send("User data saved successfully");
    } catch (err) {
        console.error("Error saving user data", err);
        res.status(500).send("Error saving user data");
    }
};

const getRequestUser = async (req, res) => {
    const { diagramId } = req.query;
    console.log(diagramId);

    try {
        const request = new sql.Request();
        request.input('diagramId', sql.Int, diagramId);
        const emailQuery = `
            SELECT created_by AS userEmail
            FROM [diagram_draft]
            WHERE diagram_id = @diagramId;
        `;
        const emailResult = await request.query(emailQuery);

        if (emailResult.recordset.length > 0) {
            const userEmail = emailResult.recordset[0].userEmail;
            request.input('userEmail', sql.VarChar, userEmail);
            const nameQuery = `
                SELECT name AS userName
                FROM [user]
                WHERE email = @userEmail;
            `;
            const nameResult = await request.query(nameQuery);

            if (nameResult.recordset.length > 0) {
                const userName = nameResult.recordset[0].userName;
                res.status(200).json({ userEmail, userName });
            } else {
                res.status(404).json({ message: 'User not found in the user table' });
            }
        } else {
            res.status(404).json({ message: 'No draft found for the specified diagram' });
        }
    } catch (error) {
        console.error('Error fetching request user:', error.message);
        res.status(500).json({ message: 'Error fetching request user', error: error.message });
    }
};


const addNewUser = async (req, res) => {
    const { email, name, department, projects } = req.body;

    // email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send({ message: 'Invalid email format. Please try again.' });
    }

    try {
        // check email if exists
        const emailCheckRequest = new sql.Request();
        emailCheckRequest.input('Email', sql.VarChar, email);

        const checkEmailQuery = `
            SELECT COUNT(*) as count FROM [user] WHERE email = @Email
        `;
        const emailCheckResult = await emailCheckRequest.query(checkEmailQuery);

        if (emailCheckResult.recordset[0].count > 0) {
            return res.status(400).send({ message: 'Email already exists. Please try again.' });
        }

        // then, insert the new user infos
        const userInsertRequest = new sql.Request();
        userInsertRequest.input('Email', sql.VarChar, email);
        userInsertRequest.input('Name', sql.VarChar, name);
        userInsertRequest.input('Department', sql.VarChar, department);

        const insertUserQuery = `
            INSERT INTO [user] (
                id, 
                email, 
                name, 
                tenant_id, 
                token_issue_time, 
                token_expiration_time, 
                nonce, 
                identity_provider, 
                token_id, 
                resource_id, 
                department
            )
            VALUES (
                'a',
                @Email, 
                @Name, 
                'a',
                1,
                1,
                'a',
                'a',
                'a',
                'a',
                @Department
            )
        `;
        await userInsertRequest.query(insertUserQuery);

        // update project contribution infos
        for (const project of projects) {
            const contributionRequest = new sql.Request();
            contributionRequest.input('Email', sql.VarChar, email);
            contributionRequest.input('ProjectId', sql.Int, project.projectId);
            contributionRequest.input('Editor', sql.Bit, project.role === 'Editor' ? 1 : 0);

            const insertContributionQuery = `
                INSERT INTO diagram_contribution (user_email, project_id, editor)
                VALUES (@Email, @ProjectId, @Editor)
            `;

            await contributionRequest.query(insertContributionQuery);
        }

        res.status(201).send({ message: 'New user added successfully' });

    } catch (error) {
        console.error("Error adding new user:", error);
        res.status(500).send({ message: 'Failed to add new user' });
    }
};


module.exports = { getUserList, getUserData, listAvailableProjects, saveUserData, getRequestUser, addNewUser };
