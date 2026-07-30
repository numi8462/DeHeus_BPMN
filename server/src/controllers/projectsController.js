const { pool } = require("../config/dbConfig");

const adminEmails = ['vnapp.pbmn@deheus.com'];

const listProjects = async (req, res) => {
  const { userName } = req.query;

  try {
    const isAdmin = adminEmails.includes(userName);

    if (isAdmin) {
      const allProjectsResult = await pool.query(`
        SELECT id, name, last_update
        FROM project;
      `);
      return res.json(allProjectsResult.rows);
    }

    // filtering readonly or no access user
    const contributionResult = await pool.query(
      `SELECT project_id FROM diagram_contribution WHERE user_email = $1;`,
      [userName]
    );

    if (contributionResult.rows.length > 0) {
      const projectIds = contributionResult.rows.map(row => row.project_id);

      const projectsResult = await pool.query(
        `SELECT id, name, last_update FROM project WHERE id = ANY($1::int[]);`,
        [projectIds]
      );

      res.json(projectsResult.rows);
    } else {
      // no project
      res.json([]);
    }
  } catch (err) {
    console.error("Error listing projects", err);
    res.status(500).send("Error listing projects");
  }
};


const addProject = async (req, res) => {
  const { projectName } = req.body;
  try {
    await pool.query(
      `INSERT INTO project (name, last_update)
       SELECT $1, NOW()
       WHERE NOT EXISTS (SELECT 1 FROM project WHERE name = $1)`,
      [projectName]
    );
    res.status(200).send("Project created succesfully");
  } catch (err) {
    console.error("Error creating project", err);
    res.status(500).send("Error creating projects");
  }
}

const deleteAllRelatives = async (projectId) => {
  try {
    await pool.query(`
      DELETE FROM diagram_relation dr
      USING diagram d
      WHERE dr.parent_diagram_id = d.id AND d.project_id = $1;
    `, [projectId]);
    await pool.query(`
      DELETE FROM diagram_checkout dc
      USING diagram d
      WHERE dc.diagram_id = d.id AND d.project_id = $1;
    `, [projectId]);
    await pool.query(`
      DELETE FROM diagram_draft dd
      USING diagram d
      WHERE dd.diagram_id = d.id AND d.project_id = $1;
    `, [projectId]);
    await pool.query(`
      DELETE FROM diagram_published dp
      USING diagram d
      WHERE dp.diagram_id = d.id AND d.project_id = $1;
    `, [projectId]);
    await pool.query(`
      DELETE FROM node_attachment na
      USING diagram d
      WHERE na.diagram_id = d.id AND d.project_id = $1;
    `, [projectId]);
    await pool.query(`
      DELETE FROM user_activity_log al
      USING diagram d
      WHERE al.diagram_id = d.id AND d.project_id = $1;
    `, [projectId]);
    await pool.query(`DELETE FROM diagram_contribution WHERE project_id = $1;`, [projectId]);
    const result = await pool.query(`DELETE FROM diagram WHERE project_id = $1`, [projectId]);
    return result.rowCount > 0;
  } catch (err) {
    console.error("Error deleting data: ", err);
  }
}

const deleteProject = async (req, res) => {
  const { projectId } = req.body;
  try {
    const diagramCheck = await pool.query(
      `SELECT 1 FROM diagram WHERE project_id = $1 LIMIT 1`,
      [projectId]
    );

    if (diagramCheck.rows.length > 0) {
      return res.status(200).json({ message: "Please remove all diagrams before deleting a project!" });
    }

    await pool.query(`DELETE FROM diagram_contribution WHERE project_id = $1;`, [projectId]);
    await pool.query(`DELETE FROM project WHERE id = $1`, [projectId]);
    res.status(200).json({ message: "Project deleted successfully!", id: projectId });
    // const response = await deleteAllRelatives(projectId);
    // if (response) {
    //   await pool.query(`DELETE FROM project WHERE id = $1`, [projectId]);
    //   res.status(200).json({ message: "Project deleted successfully!", id: projectId });
    // }else{
    //   res.status(500).json({ message: "Project deletion failed", id: projectId});
    // }
  } catch (err) {
    console.error("Error deleting project: ", err);
  }
}

module.exports = { listProjects, addProject, deleteProject };
