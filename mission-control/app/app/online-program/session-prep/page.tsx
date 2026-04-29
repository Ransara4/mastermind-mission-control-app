"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  Users,
  HelpCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Mic,
} from "lucide-react";

interface Participant {
  id: number;
  full_name: string;
  first_name: string;
  photo_url: string | null;
  cohort_number: number | null;
  role: string;
}

interface AttendanceRecord {
  id?: number;
  participant_id: number;
  session_number: number;
  cohort_number: number;
  attended: number;
  arrived_late: number;
  hot_seat: number;
  notes: string | null;
}

interface Question {
  id: number;
  question: string;
  answer: string | null;
  asked_by: number | null;
  answered: number;
  participant_name: string | null;
  participant_photo_url: string | null;
  created_at: string;
}

interface AttendanceMap {
  [participantId: number]: AttendanceRecord;
}

function Avatar({
  src,
  name,
  size = 36,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover border border-dark-border shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-cm-purple/20 text-cm-purple font-bold flex items-center justify-center shrink-0 text-xs"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  activeClass,
}: {
  active: boolean;
  onClick: () => void;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
        active ? activeClass : "border-dark-border hover:border-cm-purple"
      }`}
    >
      {active && <Check size={11} />}
    </button>
  );
}

export default function SessionPrepPage() {
  const [sessionNumber, setSessionNumber] = useState(1);
  const cohortNumber = 1;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(
    async (session: number) => {
      try {
        setLoading(true);
        setError(null);

        const [pRes, aRes, qRes] = await Promise.all([
          fetch("/api/online-program/participants"),
          fetch(
            `/api/online-program/attendance?session_number=${session}&cohort_number=${cohortNumber}`
          ),
          fetch("/api/online-program/questions"),
        ]);

        if (!pRes.ok) throw new Error(await pRes.text());
        if (!aRes.ok) throw new Error(await aRes.text());
        if (!qRes.ok) throw new Error(await qRes.text());

        const pData = await pRes.json();
        const aData = await aRes.json();
        const qData = await qRes.json();

        const allParticipants: Participant[] = (pData.participants ?? []).filter(
          (p: Participant) => p.cohort_number === cohortNumber
        );

        const map: AttendanceMap = {};
        for (const record of aData.attendance ?? []) {
          map[record.participant_id] = record;
        }

        setParticipants(allParticipants);
        setAttendanceMap(map);
        setQuestions(
          (qData.questions ?? []).filter((q: Question) => !q.answered)
        );
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [cohortNumber]
  );

  useEffect(() => {
    load(sessionNumber);
  }, [load, sessionNumber]);

  const upsertAttendance = async (
    participantId: number,
    field: "attended" | "arrived_late" | "hot_seat",
    value: number
  ) => {
    setSavingId(participantId);
    const existing = attendanceMap[participantId] ?? {
      participant_id: participantId,
      session_number: sessionNumber,
      cohort_number: cohortNumber,
      attended: 0,
      arrived_late: 0,
      hot_seat: 0,
      notes: null,
    };

    const updated = { ...existing, [field]: value };
    setAttendanceMap((prev) => ({ ...prev, [participantId]: updated }));

    try {
      const res = await fetch("/api/online-program/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participantId,
          session_number: sessionNumber,
          cohort_number: cohortNumber,
          attended: updated.attended,
          arrived_late: updated.arrived_late,
          hot_seat: updated.hot_seat,
          notes: updated.notes,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAttendanceMap((prev) => ({
        ...prev,
        [participantId]: data.attendance,
      }));
    } catch {
      setAttendanceMap((prev) => ({ ...prev, [participantId]: existing }));
    } finally {
      setSavingId(null);
    }
  };

  const attendingCount = participants.filter(
    (p) => attendanceMap[p.id]?.attended === 1
  ).length;

  const hotSeatParticipant = participants.find(
    (p) => attendanceMap[p.id]?.hot_seat === 1
  );

  const unansweredCount = questions.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mr-3" size={28} />
        <span className="text-dark-muted">Loading session prep...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="text-dark-danger" size={32} />
        <p className="text-dark-muted">{error}</p>
        <button
          onClick={() => load(sessionNumber)}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-cm-purple/15 rounded-lg p-2">
              <CalendarCheck size={20} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-dark-text">
                Session Prep
              </h1>
              <p className="text-sm text-dark-muted">
                Cohort {cohortNumber} — track attendance and hot seat
              </p>
            </div>
          </div>

          {/* Session selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSessionNumber((n) => Math.max(1, n - 1))}
              disabled={sessionNumber <= 1}
              className="p-1.5 rounded-lg border border-dark-border hover:bg-dark-panel2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-dark-muted"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-dark-text min-w-[90px] text-center">
              Session {sessionNumber}
            </span>
            <button
              onClick={() => setSessionNumber((n) => n + 1)}
              className="p-1.5 rounded-lg border border-dark-border hover:bg-dark-panel2 transition-colors text-dark-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-muted">Attending</span>
            <div className="bg-cm-purple/15 p-1.5 rounded-lg">
              <Users size={14} className="text-cm-purple" />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-text">
            {attendingCount}
            <span className="text-sm text-dark-muted font-normal ml-1">
              / {participants.length}
            </span>
          </p>
        </div>

        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-muted">Hot Seat</span>
            <div className="bg-cm-purple/15 p-1.5 rounded-lg">
              <Mic size={14} className="text-cm-purple" />
            </div>
          </div>
          <p className="text-sm font-semibold text-dark-text truncate">
            {hotSeatParticipant ? (
              hotSeatParticipant.first_name
            ) : (
              <span className="text-dark-muted font-normal">None set</span>
            )}
          </p>
        </div>

        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-muted">Open Questions</span>
            <div className="bg-cm-purple/15 p-1.5 rounded-lg">
              <HelpCircle size={14} className="text-cm-purple" />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-text">{unansweredCount}</p>
        </div>
      </div>

      {/* Attendance roster */}
      <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-border flex items-center gap-2">
          <Users size={16} className="text-cm-purple" />
          <h2 className="font-semibold text-dark-text">Attendance Roster</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-bg">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted">
                  Participant
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted text-center">
                  Attended
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted text-center">
                  Late
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted text-center">
                  Hot Seat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {participants.map((p) => {
                const rec = attendanceMap[p.id];
                const attended = rec?.attended === 1;
                const late = rec?.arrived_late === 1;
                const hotSeat = rec?.hot_seat === 1;
                const isSaving = savingId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-cm-purple/5 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar src={p.photo_url} name={p.full_name} size={32} />
                          {isSaving && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-dark-bg/70">
                              <Loader2 size={12} className="animate-spin text-cm-purple" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-dark-text">{p.full_name}</p>
                          {p.role === "facilitator" && (
                            <span className="text-xs text-cm-purple">facilitator</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <ToggleButton
                          active={attended}
                          activeClass="bg-cm-purple border-cm-purple text-white"
                          onClick={() =>
                            upsertAttendance(p.id, "attended", attended ? 0 : 1)
                          }
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <ToggleButton
                          active={late}
                          activeClass="bg-dark-warn/80 border-dark-warn text-dark-bg"
                          onClick={() =>
                            upsertAttendance(p.id, "arrived_late", late ? 0 : 1)
                          }
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <ToggleButton
                          active={hotSeat}
                          activeClass="bg-cm-pink border-cm-pink text-dark-bg"
                          onClick={() =>
                            upsertAttendance(p.id, "hot_seat", hotSeat ? 0 : 1)
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {participants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-dark-muted">
                    No participants found for cohort {cohortNumber}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open questions */}
      {unansweredCount > 0 && (
        <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-cm-purple" />
              <h2 className="font-semibold text-dark-text">Open Questions</h2>
            </div>
            <span className="text-xs text-dark-muted bg-dark-panel2 border border-dark-border px-2 py-0.5 rounded-full">
              {unansweredCount} unanswered
            </span>
          </div>

          <div className="divide-y divide-dark-border">
            {questions.map((q) => (
              <div key={q.id} className="px-5 py-4 flex items-start gap-3">
                <Avatar
                  src={q.participant_photo_url}
                  name={q.participant_name ?? "?"}
                  size={30}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-text mb-0.5">
                    {q.question}
                  </p>
                  <p className="text-xs text-dark-muted">
                    {q.participant_name ?? "Unknown"} &middot;{" "}
                    {new Date(q.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
