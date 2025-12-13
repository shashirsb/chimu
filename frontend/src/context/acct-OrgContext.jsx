// src/context/acct-OrgContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { OrgAPI } from "../api/acct-org";

const OrgContext = createContext(null);

export function useOrg() {
  return useContext(OrgContext);
}

export function OrgProvider({ accountId, children }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [undoQueue, setUndoQueue] = useState([]);

  // Load org chart using OrgAPI
  const loadOrg = useCallback(async () => {
    setLoading(true);

    const res = await OrgAPI.load(accountId);
    if (res.ok) {
      setNodes(res.data);
    } else {
      console.error("Org load failed:", res.error);
    }

    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  // Update node (title)
  const updateNode = async (email, title) => {
    const res = await OrgAPI.updateTitle(accountId, email, title);
    if (!res.ok) {
      alert("Title update failed: " + (res.error || ""));
      return false;
    }

    await loadOrg();
    return true;
  };

  // Reparent a user
  const reparent = async (childEmail, newManagerEmail) => {
    const dry = await OrgAPI.reparentDryRun(
      accountId,
      childEmail,
      newManagerEmail
    );

    if (!dry.ok) {
      alert("Invalid move: " + dry.error);
      return false;
    }

    const commit = await OrgAPI.reparentCommit(
      accountId,
      childEmail,
      newManagerEmail
    );

    if (!commit.ok) {
      alert("Reparent failed: " + (commit.error || ""));
      return false;
    }

    if (commit.auditId) {
      setUndoQueue((q) => [commit.auditId, ...q]);
    }

    await loadOrg();
    return true;
  };

  return (
    <OrgContext.Provider
      value={{
        nodes,
        loading,
        reload: loadOrg,
        updateNode,
        reparent,
        undoQueue,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
