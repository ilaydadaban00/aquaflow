const crypto = require('crypto');
const password = '1234';
const salt = crypto.randomBytes(16);
const saltB64 = salt.toString('base64');
crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) => {
  const hashB64 = key.toString('base64');
  const stored = 'pbkdf2$100000$' + saltB64 + '$' + hashB64;
  const ts = Date.now();
  console.log("-- D1 Console'a kopyala ve Execute et:");
  console.log("INSERT INTO users (id, email, password_hash, role, created_at) VALUES ('u-admin-1', 'ibrahimyesim10@gmail.com', '" + stored + "', 'admin', " + ts + ");");
});
