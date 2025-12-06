import axios from 'axios';

const API_URL = 'http://192.168.1.2:3000/api';

export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/user/login`, { email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};