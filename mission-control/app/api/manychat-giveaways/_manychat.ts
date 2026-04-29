import { getEnvVar } from "./_db";

const API_BASE = "https://api.manychat.com/fb";

interface ManyChatResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function getHeaders(): Record<string, string> {
  const apiKey = getEnvVar("MANYCHAT_API_KEY");
  if (!apiKey) throw new Error("MANYCHAT_API_KEY not configured");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function request<T = unknown>(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<ManyChatResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json?.message || json?.error || `HTTP ${res.status}`,
      };
    }
    return { success: true, data: json?.data ?? json };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function cloneFlow(
  masterFlowId: string
): Promise<ManyChatResult<{ flow_id: string }>> {
  return request("POST", "/page/cloneFlow", {
    flow_ns: masterFlowId,
  });
}

export async function setFlowKeyword(
  flowId: string,
  keyword: string
): Promise<ManyChatResult> {
  return request("POST", "/page/setFlowKeyword", {
    flow_ns: flowId,
    keyword,
  });
}

export async function pushCustomFields(
  flowId: string,
  fields: {
    giveaway_name: string;
    giveaway_description: string | null;
    giveaway_link: string;
    dynamic_tag: string;
  }
): Promise<ManyChatResult> {
  return request("POST", "/page/setFlowCustomFields", {
    flow_ns: flowId,
    fields: [
      { field_name: "giveaway_name", value: fields.giveaway_name },
      { field_name: "giveaway_description", value: fields.giveaway_description ?? "" },
      { field_name: "giveaway_link", value: fields.giveaway_link },
      { field_name: "dynamic_tag", value: fields.dynamic_tag },
    ],
  });
}

export async function activateFlow(flowId: string): Promise<ManyChatResult> {
  return request("POST", "/page/activateFlow", {
    flow_ns: flowId,
  });
}

export async function deactivateFlow(flowId: string): Promise<ManyChatResult> {
  return request("POST", "/page/deactivateFlow", {
    flow_ns: flowId,
  });
}

export async function getFlowStatus(
  flowId: string
): Promise<ManyChatResult<{ status: string }>> {
  return request("GET", `/page/getFlow?flow_ns=${flowId}`);
}
