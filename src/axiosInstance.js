import axios from 'axios';

const axiosInstance = axios.create({
  // baseURL: "https://insurabackend-1.onrender.com" ,first push
  baseURL: "https://insurabackend-s06q.onrender.com",  //docker
});

export const baseURL = axiosInstance.defaults.baseURL;
export default axiosInstance;


