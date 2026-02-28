const axios = require('axios');

async function testAuthFlow() {
  const username = 'testuser_' + Date.now();
  const password = 'password123';
  
  try {
    console.log(`Registering user: ${username}`);
    const regRes = await axios.post('http://localhost:5000/api/auth/register', {
      username,
      password,
      first_name: 'Test',
      last_name: 'User',
      email: `${username}@example.com`,
      phone: '1234567890'
    });
    console.log('Register Success:', regRes.data.success);

    console.log(`Logging in with username: ${username}`);
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      login: username,
      password
    });
    console.log('Login Success:', loginRes.data.success);
    
  } catch (error) {
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

testAuthFlow();
