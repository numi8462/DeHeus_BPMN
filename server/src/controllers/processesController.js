const { sql } = require("../config/dbConfig");


const listProcesses = async (req, res) => {
  const { projectId } = req.params;
  const { userName } = req.query;
  // console.log(projectId, userName);  // 디버깅 용도라서 주석 처리!!

  try {
    // check if editor in the current project before fetching processes
    const contributionQuery = `
      SELECT editor 
      FROM diagram_contribution 
      WHERE user_email = @userName AND project_id = @projectId;
    `;
    
    const request = new sql.Request();
    request.input('projectId', sql.Int, projectId);
    request.input('userName', sql.VarChar, userName);
    
    const contributionResult = await request.query(contributionQuery);
    // console.log('Contribution Query Result:', contributionResult.recordset);  // 디버깅 용도라서 주석 처리!!

    let role = '';
    if (contributionResult.recordset.length > 0) {
      const isEditor = contributionResult.recordset[0].editor;
      // console.log('isEditor Value:', isEditor);  // 디버깅 용도라서 주석 처리!!
      if (isEditor) {
        role = 'editor';
      } else {
        role = 'read-only';
      }
    }
    // console.log('Determined User Role:', role);  // 디버깅 용도라서 주석 처리!!

    const query = `
      SELECT 
        p.name AS projectName,
        d.id AS diagramId,
        d.name AS diagramName,
        dc.user_email,
        dc.expiry_time,
        dc.status,
        u.name AS userName,
        dp.lastUpdate,
        dr.parent_diagram_id,
        dr.child_diagram_id
      FROM 
        project p
        LEFT JOIN diagram d ON p.id = d.project_id
        LEFT JOIN diagram_checkout dc ON d.id = dc.diagram_id AND dc.status = 1
        LEFT JOIN [user] u ON dc.user_email = u.email
        LEFT JOIN diagram_relation dr ON d.id = dr.child_diagram_id
        LEFT JOIN (
          SELECT diagram_id, MAX(published_at) AS lastUpdate
          FROM diagram_published
          GROUP BY diagram_id
        ) dp ON d.id = dp.diagram_id
      WHERE 
        p.id = @projectId
      ORDER BY 
        d.id ASC;
    `;
    
    const result = await request.query(query);

    const projectName = result.recordset.length > 0 ? result.recordset[0].projectName : 'Unknown Project';

    const processMap = {};
    const rootProcesses = [];
    
    for (let row of result.recordset) {
      const { diagramId, diagramName, userName, expiry_time, lastUpdate, parent_diagram_id } = row;
      
      let remainingTime = null;
      if (userName && expiry_time) {
        remainingTime = Math.ceil((new Date(expiry_time) - new Date()) / (1000 * 60 * 60 * 24));
      }

      if (!processMap[diagramId]) {
        processMap[diagramId] = {
          id: diagramId,
          name: diagramName,
          userName: userName || null,
          remainingTime: remainingTime,
          last_update: lastUpdate,
          children: []
        };
      }

      if (parent_diagram_id) {
        if (!processMap[parent_diagram_id]) {
          processMap[parent_diagram_id] = { children: [] };
        }
        processMap[parent_diagram_id].children.push(processMap[diagramId]);
      } else if (!rootProcesses.includes(processMap[diagramId])) {
        rootProcesses.push(processMap[diagramId]);
      }
    }

    res.json({ projectName, processes: rootProcesses, role });
  } catch (err) {
    console.error("Error listing processes", err);
    res.status(500).send("Error listing processes");
  }
};


const addProcess = async (req, res) => {
  const { projectId, processName, userEmail } = req.body;
  try {
    const insertResult = await sql.query(`
      INSERT INTO diagram (project_id, name, created_at) 
      VALUES (${projectId}, ${"'" + processName + "'"}, GETDATE());
      
      SELECT SCOPE_IDENTITY() AS id;
    `);

    // Log the user activity as 'Created'
    const diagramId = insertResult.recordset[0].id;
    await sql.query`
      INSERT INTO user_activity_log (diagram_id, user_email, updated_time, type)
      VALUES (${diagramId}, ${userEmail}, GETDATE(), 'Created');
    `;
    
    res.status(200).json({ message: "Process created successfully", data: processName, projectId: projectId });
  } catch (err) {
    console.error("Error creating process", err);
    res.status(500).send("Error creating process");
  }
}

module.exports = { listProcesses, addProcess };
