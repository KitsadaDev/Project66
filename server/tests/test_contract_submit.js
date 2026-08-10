const axios = require('axios');
const fs = require('fs');

async function testSubmit() {
  const FormData = require('form-data');
  const form = new FormData();

  // Add basic fields that the frontend would submit
  form.append('slot_id', '1');
  form.append('tenant_id', '1');
  form.append('startDate', '2026-02-28');
  form.append('endDate', '2030-02-28');
  form.append('securityDeposit', '1000');
  form.append('greaseTrapFee', '500');
  
  try {
    // Note: this will require auth token if the route is protected
    // Let's create a token first by calling the login endpoint
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      loginField: 'Admin',
      password: '123456'
    });
    
    if(!loginRes.data.token) {
        console.error("Login failed, cannot get token");
        return;
    }
    const token = loginRes.data.token;

    console.log("Got token, simulating contract submission...");
    const res = await axios.post('http://localhost:5000/api/contracts', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("Success:", res.data);
  } catch (err) {
    if (err.response) {
      console.error("Server Error Response:", err.response.data);
    } else {
      console.error("Request failed:", err.message);
    }
  }
}

testSubmit();
