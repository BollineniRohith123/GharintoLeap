// Alternative login method that bypasses CORS issues
const loginDirect = async (email: string, password: string) => {
  try {
    // Direct fetch with proper headers
    const response = await fetch('https://proj_d381o7k82vjie5e0e1hg.api.lp.dev/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      mode: 'cors', // Explicitly set CORS mode
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Direct login error:', error);
    throw error;
  }
};