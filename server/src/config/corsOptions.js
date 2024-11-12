const whitelist = [
  'http://localhost:3001', 'http://server:3001',
  'http://localhost:3000', 'http://client:3000',
  'http://localhost:8080', 'http://client:8080', 'http://client',
  'https://vn-app-sa-bpmn-stapp-p-01.azurewebsites.net', 
];

const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.includes(origin) || !origin) {
      // console.log(`Allowed CORS for ${origin}`);
      callback(null, true);
    } else {
      // console.warn(`Blocked CORS for ${origin}`);
      callback(new Error('Not allowed by CORS policy'), false);
    }
  },
  credentials: true,
  maxAge: 86400,  // 24 hours
  optionsSuccessStatus: 200
};

module.exports = corsOptions;
