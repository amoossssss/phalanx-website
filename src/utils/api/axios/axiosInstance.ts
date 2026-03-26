import axios from 'axios';
import { baseURL } from '../ApiConfig';

const axiosInstance = axios.create({ baseURL: baseURL });
axiosInstance.defaults.withCredentials = true;

export default axiosInstance;
