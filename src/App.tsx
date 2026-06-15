/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import AuthScreen from "./components/AuthScreen";
import VaultDashboard from "./components/VaultDashboard";

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);

  const handleAuthenticated = (user: string, key: CryptoKey) => {
    setUsername(user);
    setMasterKey(key);
  };

  const handleLock = () => {
    setUsername(null);
    setMasterKey(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-white">
      {username && masterKey ? (
        <VaultDashboard 
          username={username} 
          masterKey={masterKey} 
          onLock={handleLock} 
        />
      ) : (
        <AuthScreen 
          onAuthenticated={handleAuthenticated} 
        />
      )}
    </div>
  );
}
