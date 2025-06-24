import { useState, useEffect } from 'react';

export const useIntercomHash = (userEmail) => {
  const [userHash, setUserHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userEmail) return;

    const fetchUserHash = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/intercom-hash', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: userEmail }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user hash: ${response.status}`);
        }

        const data = await response.json();
        setUserHash(data.user_hash);
      } catch (err) {
        console.error('Error fetching Intercom user hash:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserHash();
  }, [userEmail]);

  return { userHash, loading, error };
}; 