// Backend API configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Send Firebase ID token to backend
 * Backend returns: uid, email, name
 */
export const getCurrentUserFromBackend = async (idToken: string): Promise<any> => {
  try {
    const response = await fetch(`${BACKEND_URL}/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "ngrok-skip-browser-warning": "true",
      },
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Production-safe error logging (no sensitive data)
    console.error("Error verifying user with backend");
    if (process.env.NODE_ENV === "development") {
      console.error("Error details:", error);
    }
    throw error;
  }
};

/**
 * Send user UID to backend after sign-in
 */
export const sendUserToBackend = async (uid: string): Promise<any> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ uid }),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending user to backend");
    if (process.env.NODE_ENV === "development") {
      console.error("Error details:", error);
    }
    throw error;
  }
};

/**
 * Send Firebase ID token to backend for verification
 */
export const sendAuthTokenToBackend = async (idToken: string): Promise<any> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({ token: idToken }),
    });

    if (!response.ok) {
      throw new Error(`Backend auth verification failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error verifying token with backend");
    if (process.env.NODE_ENV === "development") {
      console.error("Error details:", error);
    }
    throw error;
  }
};

/**
 * Generic authenticated request to backend with user's ID token
 */
export const authenticatedRequest = async (
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any,
  idToken?: string,
): Promise<any> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    };

    if (idToken) {
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, options);

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error making authenticated request");
    if (process.env.NODE_ENV === "development") {
      console.error("Error details:", error);
    }
    throw error;
  }
};
