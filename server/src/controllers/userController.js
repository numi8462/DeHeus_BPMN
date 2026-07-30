const { pool } = require("../config/dbConfig");


// For Diagram Checkout
const confirmCheckOut = async (req, res) => {
    const { diagramId, userEmail } = req.body;
    // console.log(diagramId);  // 디버깅용 주석 처리
    // console.log(userEmail);  // 디버깅용 주석 처리

    try {
        const checkoutTime = new Date();
        const expiryTime = new Date(checkoutTime);
        expiryTime.setDate(checkoutTime.getDate() + 14);

        // update diagram_checkout table
        await pool.query(
            `INSERT INTO diagram_checkout (diagram_id, user_email, checkout_time, expiry_time, status)
            VALUES ($1, $2, $3, $4, true);`,
            [diagramId, userEmail, checkoutTime, expiryTime]
        );

        // update diagram table
        await pool.query(
            `UPDATE diagram
            SET checkedout_by = $1
            WHERE id = $2 AND (checkedout_by IS NULL OR checkedout_by = $1);`,
            [userEmail, diagramId]
        );

        // Log the user activity as 'Checked out'
        await pool.query(
            `INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
            VALUES ($1, $2, NOW(), 'Checked out');`,
            [diagramId, userEmail]
        );

        res.status(200).json({ message: 'Check-in successful' });
    } catch (error) {
        console.error('Error during check-in:', error.message);
        res.status(500).json({ message: 'Check-in failed', error: error.message });
    }
}


const cancelCheckOut = async (req, res) => {
    const { diagramId, userEmail } = req.body;
    // console.log(diagramId);  // 디버깅용 주석 처리
    // console.log(userEmail);  // 디버깅용 주석 처리

    try {
        // Delete current draft version if exists
        await pool.query(
            `DELETE FROM diagram_draft
            WHERE diagram_id = $1
            AND created_by = $2`,
            [diagramId, userEmail]
        );

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

        // Log the user activity as 'Checkout cancelled for'
        await pool.query(
            `INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
            VALUES ($1, $2, NOW(), 'Checkout cancelled for');`,
            [diagramId, userEmail]
        );

        res.status(200).json({ message: 'Cancel checked-out successful' });
    } catch (error) {
        console.error('Error during cancel checked-out:', error.message);
        res.status(500).json({ message: 'Cancel checked-out failed', error: error.message });
    }
}



// For My Page Listing
const getUserBasicInfo = async (identifier) => {
    const result = await pool.query(
        `SELECT name, department AS department, email
        FROM "user"
        WHERE split_part(email, '@', 1) = $1`,
        [identifier]
    );

    if (result.rows.length === 0) {
        throw new Error("User not found");
    }

    return result.rows[0];
};

const getCheckedOutDiagrams = async (identifier) => {
    const result = await pool.query(
        `SELECT d.id AS "diagramId",
               d.name AS "diagramName",
               d.project_id AS "projectId",
               dc.checkout_time,
               dc.expiry_time
        FROM diagram_checkout dc
        INNER JOIN diagram d ON dc.diagram_id = d.id
        WHERE dc.user_email = (
            SELECT email FROM "user"
            WHERE split_part(email, '@', 1) = $1
        )`,
        [identifier]
    );

    return result.rows.map(record => ({
        id: record.diagramId,
        projectId: record.projectId,
        name: record.diagramName,
        time: Math.ceil((new Date(record.expiry_time) - new Date()) / (1000 * 60 * 60 * 24))
    }));
};

const getActivityLog = async (identifier) => {
    const result = await pool.query(
        `SELECT ual.type AS activity,
               ual.updated_time AS date,
               d.name AS diagram_name,
               p.name AS project_name
        FROM user_activity_log ual
        LEFT JOIN diagram d ON ual.diagram_id = d.id
        LEFT JOIN project p ON d.project_id = p.id
        WHERE ual.user_email = (
            SELECT email FROM "user"
            WHERE split_part(email, '@', 1) = $1
        )
        ORDER BY ual.updated_time DESC`,
        [identifier]
    );

    return result.rows.map(record => ({
        activity: record.activity,
        date: record.date,
        diagram_name: record.diagram_name || "N/A",
        project_name: record.project_name || "N/A"
    }));
};



const getUserInfo = async (req, res) => {
    const identifier = req.params.identifier;

    try {
        const userInfo = await getUserBasicInfo(identifier);
        const checkedOutDiagrams = await getCheckedOutDiagrams(identifier);
        const activityLog = await getActivityLog(identifier);

        const responseData = {
            ...userInfo,
            checkedOutDiagrams,
            activityLog
        };

        res.json(responseData);
    } catch (err) {
        console.error("Error fetching user info", err);
        res.status(500).send("Error fetching user info");
    }
};


module.exports = { getUserInfo, confirmCheckOut, cancelCheckOut };
