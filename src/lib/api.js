import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
export const API = `${BACKEND_URL}/api`;

export const formatPrice = (n) =>
  "₹" + Number(n).toLocaleString("en-IN");

export async function fetchProducts(params = {}) {
  const res = await axios.get(`${API}/products`, { params });
  return res.data;
}

export async function fetchProduct(slug) {
  const res = await axios.get(`${API}/products/${slug}`);
  return res.data;
}

export async function subscribeNewsletter(email) {
  const res = await axios.post(`${API}/newsletter`, { email });
  return res.data;
}
