import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const fetchCounties = async () => {
  const response = await axios.get(`${API_BASE_URL}/counties`);
  return response.data; // backend returns List[str]
};
