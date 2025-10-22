import axios from 'axios';

const axiosInstance = axios.create({
  // baseURL: "https://insurabackend-1.onrender.com" ,first push
   // baseURL: "https://insurabackend-s06q.onrender.com",  //docker
   baseURL: "https://insurabackend-1-55o6.onrender.com",  //hosted
  
  // baseURL: "http://127.0.0.1:8000",  
});

export const baseURL = axiosInstance.defaults.baseURL;
export default axiosInstance;


