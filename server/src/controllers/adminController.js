const { pool } = require("../config/dbConfig");


const getUserList = async (req, res) => {
    try {
        const userResult = await pool.query(`SELECT email, name, department FROM "user" WHERE department != 'admin'`);

        const users = userResult.rows;

        for (let user of users) {
            const userDetailsResult = await pool.query(
                `SELECT updated_time
                FROM user_activity_log
                WHERE user_email = $1
                ORDER BY updated_time DESC
                LIMIT 1`,
                [user.email]
            );

            user.lastUpdate = userDetailsResult.rows.length > 0
                ? userDetailsResult.rows[0].updated_time
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
        const userEmailResult = await pool.query(
            `SELECT email, name, department
            FROM "user"
            WHERE split_part(email, '@', 1) = $1`,
            [identifier]
        );

        if (userEmailResult.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        const { email, name, department } = userEmailResult.rows[0];

        // projects with read only or editor role
        const accessibleProjectsResult = await pool.query(
            `SELECT DISTINCT
            p.id AS "projectId",
            p.name AS "projectName",
            CASE
                WHEN dc.editor = false THEN 'Read-only'
                WHEN dc.editor = true THEN 'Editor'
                ELSE 'Unknown'
            END AS role
            FROM project p
            LEFT JOIN diagram_contribution dc
            ON p.id = dc.project_id
            AND dc.user_email = $1
            WHERE p.id IN (
            SELECT project_id
            FROM diagram_contribution
            WHERE user_email = $1
            )`,
            [email]
        );

        // no access projects
        const availableProjectsResult = await pool.query(
            `SELECT p.id, p.name
            FROM project p
            WHERE p.id NOT IN (
            SELECT dc.project_id
            FROM diagram_contribution dc
            WHERE dc.user_email = $1
            )`,
            [email]
        );

        // checkout diagrams
        const checkedOutDiagramsResult = await pool.query(
            `SELECT d.name AS "diagramName",
                    p.name AS "projectName",
                    dc.checkout_time,
                    dc.expiry_time
            FROM diagram d
            INNER JOIN project p ON d.project_id = p.id
            INNER JOIN diagram_checkout dc ON d.id = dc.diagram_id
            WHERE dc.user_email = $1
                AND dc.status = true`,
            [email]
        );

        const checkedOutDiagrams = checkedOutDiagramsResult.rows.map((record) => {
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
            projects: accessibleProjectsResult.rows,
            availableProjects: availableProjectsResult.rows,
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
      const result = await pool.query(
        `SELECT p.id, p.name
        FROM project p
        WHERE p.id NOT IN (
          SELECT dc.project_id
          FROM diagram_contribution dc
          WHERE dc.user_email = $1
        )`,
        [userEmail]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error listing available projects", err);
      res.status(500).send("Error listing available projects");
    }
  };


const updateProjectRole = async (userEmail, projectId, role) => {
    const editor = role === "Editor";

    await pool.query(
        `INSERT INTO diagram_contribution (user_email, project_id, editor)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_email, project_id) DO UPDATE SET editor = EXCLUDED.editor;`,
        [userEmail, projectId, editor]
    );
    // console.log(`Project role updated for projectId ${projectId}`);  // debugging console log
};


const handleRoleChange = async (userEmail, projectId, role) => {
    try {
        const editorValue = role === 'Editor';

        const result = await pool.query(
            `UPDATE diagram_contribution
            SET editor = $1
            WHERE user_email = $2 AND project_id = $3`,
            [editorValue, userEmail, projectId]
        );
        // console.log(`Role change result for projectId ${projectId}: ${result.rowCount}`);  // debugging console log
    } catch (error) {
        console.error('Error updating role:', error);
    }
};


const removeProject = async (userEmail, projectId) => {
    const result = await pool.query(
        `DELETE FROM diagram_contribution
        WHERE user_email = $1 AND project_id = $2`,
        [userEmail, projectId]
    );
    // console.log(`Deleted rows: ${result.rowCount}`);  // debugging console log
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
        const emailResult = await pool.query(
            `SELECT created_by AS "userEmail"
            FROM diagram_draft
            WHERE diagram_id = $1;`,
            [diagramId]
        );

        if (emailResult.rows.length > 0) {
            const userEmail = emailResult.rows[0].userEmail;
            const nameResult = await pool.query(
                `SELECT name AS "userName"
                FROM "user"
                WHERE email = $1;`,
                [userEmail]
            );

            if (nameResult.rows.length > 0) {
                const userName = nameResult.rows[0].userName;
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
        const emailCheckResult = await pool.query(
            `SELECT COUNT(*) as count FROM "user" WHERE email = $1`,
            [email]
        );

        if (emailCheckResult.rows[0].count > 0) {
            return res.status(400).send({ message: 'Email already exists. Please try again.' });
        }

        // then, insert the new user infos
        await pool.query(
            `INSERT INTO "user" (
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
                $1,
                $2,
                'a',
                1,
                1,
                'a',
                'a',
                'a',
                'a',
                $3
            )`,
            [email, name, department]
        );

        // update project contribution infos
        for (const project of projects) {
            const editor = project.role === 'Editor';
            await pool.query(
                `INSERT INTO diagram_contribution (user_email, project_id, editor)
                VALUES ($1, $2, $3)`,
                [email, project.projectId, editor]
            );
        }

        res.status(201).send({ message: 'New user added successfully' });

    } catch (error) {
        console.error("Error adding new user:", error);
        res.status(500).send({ message: 'Failed to add new user' });
    }
};


module.exports = { getUserList, getUserData, listAvailableProjects, saveUserData, getRequestUser, addNewUser };
