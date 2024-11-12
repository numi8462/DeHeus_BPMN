const jwt = require('jsonwebtoken');
const sql = require('mssql');

const authenticateUser = async (req, res) => {
  // console.log("Received request:", req.body);
  const { token } = req.body;

  try {
    // token authentication & decoding
    const decodedToken = jwt.decode(token, { complete: true });
    // console.log(decodedToken);
    const email = decodedToken.payload.unique_name;
    // console.log(`User Email: ${email}`);  // 디버깅용 주석 처리

    const userResult = await sql.query`SELECT * FROM [user] WHERE email = ${email}`;
    if (userResult.recordset.length === 0) {
      console.log('User not found in the database')
      return res.status(401).json({ message: 'User not found in the database' });
    }

    // update in the database
    const userId = userResult.recordset[0].id;
    await sql.query`
      UPDATE [user] 
      SET 
        id = ${decodedToken.payload.oid},
        name = ${decodedToken.payload.name},
        tenant_id = ${decodedToken.payload.tid},
        token_issue_time = ${decodedToken.payload.iat},
        token_expiration_time = ${decodedToken.payload.exp},
        nonce = ${decodedToken.header.nonce},
        identity_provider = ${decodedToken.payload.idp},
        token_id = ${decodedToken.payload.uti},
        resource_id = ${decodedToken.payload.aud}
      WHERE id = ${userId}
    `;
    // console.log('Successfully Updated in the database')
    res.json({ isAuthenticated: true });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = { authenticateUser };
