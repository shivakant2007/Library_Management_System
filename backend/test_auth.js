const base = 'http://localhost:5000/api';
const testUser = {
  name: 'Test Librarian',
  userId: 'LIB001',
  email: 'testlib@example.com',
  password: 'password123',
  role: 'librarian'
};
const adminUser = {
  name: 'Test Admin',
  userId: 'ADM001',
  email: 'admin@example.com',
  password: 'admin123',
  role: 'admin'
};
function log(title, obj){ console.log(title, JSON.stringify(obj, null, 2)); }
async function test(){
  console.log('1) Health');
  let r = await fetch(base + '/health');
  log('Health', {status: r.status, body: await r.json()});

  console.log('\n2) Register librarian');
  r = await fetch(base + '/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(testUser)});
  let j = await r.json();
  log('Register lib', {status: r.status, body: j});
  if(j.token) console.log('Token received length:', j.token.length);
  const libToken = j.token;

  console.log('\n3) Register admin');
  r = await fetch(base + '/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(adminUser)});
  j = await r.json();
  log('Register admin', {status: r.status, body: j});
  const adminToken = j.token;

  console.log('\n4) Duplicate userId should fail');
  r = await fetch(base + '/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(testUser)});
  j = await r.json();
  log('Duplicate', {status: r.status, body: j});

  console.log('\n5) Duplicate email with different userId');
  r = await fetch(base + '/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...testUser, userId:'LIB002'})});
  j = await r.json();
  log('Duplicate email', {status: r.status, body: j});

  console.log('\n6) Invalid email format');
  r = await fetch(base + '/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...testUser, userId:'LIB003', email:'bademail'})});
  j = await r.json();
  log('Invalid email', {status: r.status, body: j});

  console.log('\n7) Short password');
  r = await fetch(base + '/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:'Short', userId:'LIB004', email:'short@example.com', password:'123'})});
  j = await r.json();
  log('Short pw', {status: r.status, body: j});

  console.log('\n8) Login with correct credentials');
  r = await fetch(base + '/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email: testUser.email, password: testUser.password})});
  j = await r.json();
  log('Login ok', {status: r.status, body: j});
  const loginToken = j.token;

  console.log('\n9) Login with wrong password should fail 401');
  r = await fetch(base + '/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email: testUser.email, password: 'wrong'})});
  j = await r.json();
  log('Login wrong', {status: r.status, body: j});

  console.log('\n10) Login with non-existent email should fail');
  r = await fetch(base + '/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'nonexistent@example.com', password:'123456'})});
  j = await r.json();
  log('Login nonexist', {status: r.status, body: j});

  console.log('\n11) GET /auth/me without token should fail 401');
  r = await fetch(base + '/auth/me');
  j = await r.json();
  log('Me no token', {status: r.status, body: j});

  console.log('\n12) GET /auth/me with invalid token should fail');
  r = await fetch(base + '/auth/me', {headers:{Authorization:'Bearer invalidtoken'}});
  j = await r.json();
  log('Me invalid token', {status: r.status, body: j});

  console.log('\n13) GET /auth/me with valid token');
  r = await fetch(base + '/auth/me', {headers:{Authorization:'Bearer '+loginToken}});
  j = await r.json();
  log('Me valid', {status: r.status, body: j});

  console.log('\n14) Verify password is hashed in DB');
  const mongoose = require('mongoose');
  require('dotenv').config();
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/library_management_system';
  // Close previous connection if open from server? Use separate connection
  // Check if already connected, disconnect and reconnect fresh
  if(mongoose.connection.readyState !== 0){
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
  const User = require('./src/models/User');
  const userInDb = await User.findOne({email:testUser.email});
  console.log('DB user found:', !!userInDb);
  if(userInDb){
    console.log('Password stored is hashed (not plain):', userInDb.password !== testUser.password);
    console.log('Password bcrypt check:', userInDb.password.startsWith('$2a$') || userInDb.password.startsWith('$2b$'));
    console.log('User role:', userInDb.role);
    console.log('CreatedAt:', userInDb.createdAt);
    console.log('userId:', userInDb.userId);
  }
  const adminInDb = await User.findOne({email:adminUser.email});
  console.log('Admin role correct:', adminInDb ? adminInDb.role : 'not found');
  await mongoose.disconnect();
  console.log('\nAll tests done');
}
test().catch(e=>{console.error('Test error', e); process.exit(1)});
