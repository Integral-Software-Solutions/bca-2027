const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Helper function
const getToken = () => localStorage.getItem("token");

// REGISTER
export const registerUser = async (data) => {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.message || "Register failed");

    return result;
};

// LOGIN
export const loginUser = async (data) => {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.message || "Login failed");

    return result;
};

// CREATE REPORT
export const createReport = async (reportData) => {
    const res = await fetch(`${API_URL}/reports`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(reportData),
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.message || "Create report failed");

    return result;
};

// GET MY REPORTS
export const getMyReports = async () => {
    const res = await fetch(`${API_URL}/reports/myreports`, {
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.message || "Fetch failed");

    return result;
};
