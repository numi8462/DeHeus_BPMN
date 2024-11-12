const { sql } = require("../config/dbConfig");

const adminEmails = ['vnapp.pbmn@deheus.com'];

const listProjects = async (req, res) => {
  const { userName } = req.query;

  try {
    const isAdmin = adminEmails.includes(userName);

    if (isAdmin) {
      const allProjectsQuery = `
        SELECT id, name, last_update 
        FROM project;
      `;
      const allProjectsResult = await sql.query(allProjectsQuery);
      return res.json(allProjectsResult.recordset);
    }

    // filtering readonly or no access user
    const request = new sql.Request();
    request.input('userName', sql.VarChar, userName);

    const contributionQuery = `
      SELECT project_id 
      FROM diagram_contribution 
      WHERE user_email = @userName;
    `;
    const contributionResult = await request.query(contributionQuery);

    if (contributionResult.recordset.length > 0) {
      const projectIds = contributionResult.recordset.map(row => row.project_id);

      const projectsQuery = `
        SELECT id, name, last_update 
        FROM project 
        WHERE id IN (${projectIds.join(',')});
      `;
      const projectsResult = await request.query(projectsQuery);

      res.json(projectsResult.recordset);
    } else {
      // no project
      res.json([]);
    }
  } catch (err) {
    console.error("Error listing projects", err);
    res.status(500).send("Error listing projects");
  }
};


const addProject = (req, res) => {
  const { projectName } = req.body;
  try {
    sql.query(`
      IF NOT EXISTS( 
      SELECT 1 FROM project 
      WHERE
      name = ${"'" + projectName + "'"}
      )
      BEGIN 
      INSERT INTO project
      (name, last_update)
      VALUES (${"'" + projectName + "'"}, GETDATE())
      END
    `)
      .then((result) => {
        res.status(200).send("Project created succesfully");
      })
      .catch(err => {
        console.error(err);
        res.status(500).send("Server error occurred");
      });
  } catch (err) {
    console.error("Error creating project", err);
    res.status(500).send("Error creating projects");
  }
}

const deleteAllRelatives = async (projectId) => {
  try {
    const request = new sql.Request();
    const query = `
    DELETE dr FROM diagram_relation dr
    LEFT JOIN diagram d
    ON dr.parent_diagram_id = d.id
    WHERE d.project_id = @projectId;
    DELETE dc FROM diagram_checkout dc
    INNER JOIN diagram d
    ON dc.diagram_id = d.id
    WHERE d.project_id = @projectId;
    DELETE dd FROM diagram_draft dd
    INNER JOIN diagram d
    ON dd.diagram_id = d.id
    WHERE d.project_id = @projectId;
    DELETE dp FROM diagram_published dp
    INNER JOIN diagram d
    ON dp.diagram_id = d.id
    WHERE d.project_id = @projectId;
    DELETE na FROM node_attachment na
    INNER JOIN diagram d
    ON na.diagram_id = d.id
    WHERE d.project_id = @projectId;
    DELETE al FROM user_activity_log al
    INNER JOIN diagram d
    ON al.diagram_id = d.id
    WHERE d.project_id = @projectId;
    DELETE FROM diagram_contribution WHERE project_id = @projectId;
    DELETE FROM diagram WHERE project_id = @projectId
  `;
    request.input("projectId", projectId);
    const result = await request.query(query);
    if (result.rowsAffected.length > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error("Error deleting data: ", err);
  }
}

const deleteProject = async (req, res) => {
  const { projectId } = req.body;
  try {
    const result = await sql.query(`
      IF NOT EXISTS (
        SELECT 1 FROM diagram 
        WHERE project_id = ${projectId}
      )
      BEGIN
        DELETE FROM diagram_contribution 
        WHERE project_id = ${projectId};
        DELETE FROM project 
        WHERE id = ${projectId}
      END  
    `);
    if(result.rowsAffected.length === 0){
      res.status(200).json({message: "Please remove all diagrams before deleting a project!"});
    }else{
      res.status(200).json({message: "Project deleted successfully!", id: projectId});
    }
    // const response = await deleteAllRelatives(projectId);
    // if (response) {
    //   await sql.query(`
    //     DELETE FROM project 
    //     WHERE 
    //     id = ${projectId}
    //   `);
    //   res.status(200).json({ message: "Project deleted successfully!", id: projectId });
    // }else{
    //   res.status(500).json({ message: "Project deletion failed", id: projectId});
    // }
  } catch (err) {
    console.error("Error deleting project: ", err);
  }
}

module.exports = { listProjects, addProject, deleteProject };
