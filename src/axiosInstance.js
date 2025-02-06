import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: "https://insurabackend-1.onrender.com",
});

export const baseURL = axiosInstance.defaults.baseURL;
export default axiosInstance;


