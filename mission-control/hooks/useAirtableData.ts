"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: AirtableField[];
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

export interface AirtableStatus {
  agentId: string;
  status: string;
  lastRun: string | null;
  lastResult: string | null;
  lastMessage: string;
  errorCount: number;
}

export function useAirtableData() {
  const [bases, setBases] = useState<AirtableBase[]>([]);
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [agentStatus, setAgentStatus] = useState<AirtableStatus | null>(null);

  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch bases on mount
  const fetchBases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/airtable?action=bases");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBases(data.bases || []);
      if (data.agentStatus) setAgentStatus(data.agentStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBases();
  }, [fetchBases]);

  // Fetch tables when base changes
  const fetchTables = useCallback(async (baseId: string) => {
    setTablesLoading(true);
    setTables([]);
    setRecords([]);
    setSelectedTableId(null);
    try {
      const res = await fetch(`/api/airtable?action=tables&baseId=${encodeURIComponent(baseId)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTables(data.tables || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBaseId) {
      fetchTables(selectedBaseId);
    } else {
      setTables([]);
      setRecords([]);
      setSelectedTableId(null);
    }
  }, [selectedBaseId, fetchTables]);

  // Fetch records when table changes or search query changes (debounced)
  const fetchRecords = useCallback(async (baseId: string, tableId: string, filter?: string) => {
    setRecordsLoading(true);
    try {
      let url = `/api/airtable?action=records&baseId=${encodeURIComponent(baseId)}&tableId=${encodeURIComponent(tableId)}&limit=100`;
      if (filter) url += `&filter=${encodeURIComponent(filter)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedBaseId || !selectedTableId) {
      setRecords([]);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);

    // Build search formula if query is set
    const doFetch = () => {
      const table = tables.find(t => t.id === selectedTableId);
      let filter: string | undefined;
      if (searchQuery && table) {
        const primaryField = table.fields.find(f => f.id === table.primaryFieldId);
        if (primaryField) {
          filter = `SEARCH("${searchQuery.replace(/"/g, '\\"')}",{${primaryField.name}})`;
        }
      }
      fetchRecords(selectedBaseId, selectedTableId, filter);
    };

    if (searchQuery) {
      searchTimer.current = setTimeout(doFetch, 300);
    } else {
      doFetch();
    }

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [selectedBaseId, selectedTableId, searchQuery, tables, fetchRecords]);

  const createRecord = async (baseId: string, tableId: string, fields: Record<string, unknown>) => {
    const res = await fetch("/api/airtable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", baseId, tableId, fields }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    // Refresh records
    if (selectedBaseId && selectedTableId) {
      await fetchRecords(selectedBaseId, selectedTableId);
    }
    return data;
  };

  const updateRecord = async (
    baseId: string,
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>
  ) => {
    const res = await fetch("/api/airtable", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", baseId, tableId, recordId, fields }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (selectedBaseId && selectedTableId) {
      await fetchRecords(selectedBaseId, selectedTableId);
    }
    return data;
  };

  return {
    bases,
    tables,
    records,
    agentStatus,
    selectedBaseId,
    setSelectedBaseId,
    selectedTableId,
    setSelectedTableId,
    searchQuery,
    setSearchQuery,
    loading,
    tablesLoading,
    recordsLoading,
    error,
    refresh: fetchBases,
    createRecord,
    updateRecord,
  };
}
