const https = require('https');
const fs = require('fs');
const express = require("express");
require('dotenv').config();
const { connectDB, getDBConnection } = require('./src/config/dbConfig');
const cors = require("cors");
const corsOptions = require('./src/config/corsOptions');
const bodyParser = require('body-parser');
const authController = require('./src/controllers/authController');
const projectsController = require('./src/controllers/projectsController');
const processesController = require('./src/controllers/processesController');
const diagramController = require('./src/controllers/diagramController');
const attachmentsController = require('./src/controllers/attachmentsController');
const adminController = require('./src/controllers/adminController');
const userController = require('./src/controllers/userController');

const options = {
    key: fs.readFileSync('/etc/ssl/key.pem'),
    cert: fs.readFileSync('/etc/ssl/cert.pem'),
    passphrase: process.env.PASSPHRASE
};

const app = express();
const PORT = process.env.PORT;

connectDB();  // when the server starts, automatically connect to the database

app.use(cors(corsOptions));
app.use(bodyParser.json({limit: '50mb'}));

app.post('/api/authenticate', authController.authenticateUser);
app.post('/api/project/add', projectsController.addProject);
app.post('/api/project/delete', projectsController.deleteProject);
app.post('/api/processes/add', processesController.addProcess);
app.post('/api/diagram/add', diagramController.addDiagram);
app.post('/api/diagram/save', diagramController.draftSave);
app.post('/api/diagram/requestPublish', diagramController.requestPublish);
app.post('/api/diagram/publish', diagramController.confirmPublish);
app.post('/api/diagram/publish/decline', diagramController.declinePublish);
app.post('/api/diagram/createSub', diagramController.createSubProcess);
app.post('/api/diagram/updateSubProcess', diagramController.updateSubProcessName);
app.post('/api/diagram/checkedout', userController.confirmCheckOut);
app.post('/api/diagram/cancelCheckout', userController.cancelCheckOut);
app.post('/api/diagram/delete', diagramController.deleteDiagram);
app.post('/api/attachments/:diagramId', attachmentsController.addAttachments);
app.post('/api/attachments/:diagramId/:nodeId', attachmentsController.deleteAllAttachments);
app.post('/api/attachments/:diagramId/:nodeId/:fileName', attachmentsController.deleteAttachments);

app.get('/api/projects', projectsController.listProjects);
app.get('/api/processes/:projectId', processesController.listProcesses);

app.get('/api/fetch/user-role', diagramController.getUserRole);
app.get('/api/fetch/diagram', diagramController.getDiagramPath);
app.get('/api/diagrams/get-diagram-with-project/:projectId/:diagramId/:userEmail', diagramController.getDiagramData);
app.get('/api/attachments/:diagramId/:nodeId/:fileName', attachmentsController.getAttachment);
app.get('/api/diagrams/getContributors', diagramController.getContributors);
app.get('/api/diagram/getDraft', diagramController.getDraftData);
app.get('/api/diagram/checkRequested', diagramController.checkRequested);
app.get('/api/diagrams/getAll', diagramController.getAllDiagrams);


app.get('/api/mypage/user/:identifier', userController.getUserInfo);
app.get('/api/admin/users', adminController.getUserList);
app.get('/api/admin/users/:identifier', adminController.getUserData);
app.get('/api/admin/getRequestUser', adminController.getRequestUser);
app.post('/api/admin/saveUserData', adminController.saveUserData);
app.post('/api/admin/addNewUser', adminController.addNewUser);

// checking database connection after deployment
app.get('/health', async (req, res) => {
  const pool = getDBConnection();
  if (!pool) {
      return res.status(500).send('Database connection failed');
  }

  try {
      const result = await pool.request().query('SELECT 1');
      if (result) {
          res.status(200).send('Database connected');
      } else {
          res.status(500).send('Database query failed');
      }
  } catch (error) {
      console.error('Database Error: ', error);
      res.status(500).send('Database connection failed');
  }
});

// app.listen(PORT, () => {
//   console.log(`Server listening on ${PORT}`);
// });

https.createServer(options, app).listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });