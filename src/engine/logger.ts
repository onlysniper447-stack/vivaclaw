import type { AgentLog, AgentLogLevel, AgentStatus } from "@/types/hettnet";
import { singleton } from "@/engine/singleton";

const MAX_LOGS = 500;
const logs = singleton("logs", () => [] as AgentLog[]);

export function pushLog(entry: Omit<AgentLog, "ts"> & { ts?: number }): AgentLog {
  const log: AgentLog = {
    ts: entry.ts ?? Date.now(),
    level: entry.level,
    status: entry.status,
    message: entry.message,
    signature: entry.signature,
    data: entry.data,
  };
  logs.push(log);
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }

  const line = `[hettnet:${log.status}] ${log.message}`;
  if (log.level === "error") console.error(line, log.data ?? "");
  else if (log.level === "warn") console.warn(line, log.data ?? "");
  else console.info(line, log.data ?? "");

  return log;
}

export function logInfo(status: AgentStatus, message: string, extra?: Partial<AgentLog>): AgentLog {
  return pushLog({ level: "info", status, message, ...extra });
}

export function logWarn(status: AgentStatus, message: string, extra?: Partial<AgentLog>): AgentLog {
  return pushLog({ level: "warn", status, message, ...extra });
}

export function logError(status: AgentStatus, message: string, extra?: Partial<AgentLog>): AgentLog {
  return pushLog({ level: "error", status, message, ...extra });
}

export function getAgentLogs(limit = 100): AgentLog[] {
  return logs.slice(-limit);
}

export function lastLog(): AgentLog | undefined {
  return logs.at(-1);
}

export type { AgentLogLevel };
