const jwt = require('jsonwebtoken');
const { pool } = require('../config/dbConfig');

const authenticateUser = async (req, res) => {
  // console.log("Received request:", req.body);
  const { token } = req.body;

  try {
    // token authentication & decoding
    const decodedToken = jwt.decode(token, { complete: true });
    // console.log(decodedToken);
    const email = decodedToken.payload.unique_name;
    // console.log(`User Email: ${email}`);  // 디버깅용 주석 처리

    const userResult = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      console.log('User not found in the database')
      return res.status(401).json({ message: 'User not found in the database' });
    }

    // update in the database
    const userId = userResult.rows[0].id;
    await pool.query(
      `UPDATE "user"
      SET
        id = $1,
        name = $2,
        tenant_id = $3,
        token_issue_time = $4,
        token_expiration_time = $5,
        nonce = $6,
        identity_provider = $7,
        token_id = $8,
        resource_id = $9
      WHERE id = $10`,
      [
        decodedToken.payload.oid,
        decodedToken.payload.name,
        decodedToken.payload.tid,
        decodedToken.payload.iat,
        decodedToken.payload.exp,
        decodedToken.header.nonce,
        decodedToken.payload.idp,
        decodedToken.payload.uti,
        decodedToken.payload.aud,
        userId
      ]
    );
    // console.log('Successfully Updated in the database')
    res.json({ isAuthenticated: true });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = { authenticateUser };
