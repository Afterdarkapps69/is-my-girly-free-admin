"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = "https://is-my-girly-free-app.onrender.com";

type AdminUser = {
  id: string;
  email?: string;
  name?: string;
  role?: string;
};

type Report = {
  id: string;
  reporterId?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterRole?: string;
  targetUserId?: string;
  targetName?: string;
  targetEmail?: string;
  targetRole?: string;
  reason?: string;
  reasonLabel?: string;
  details?: string;
  status?: "open" | "reviewed" | "resolved";
  delivered?: boolean;
  createdAt?: string;
};

type Worker = {
  id: string;
  userId?: string;
  name?: string;
  age?: number;
  workplace?: string;
  googlePlaceId?: string;
  isAvailableTonight?: boolean;
  photos?: string[];
  videos?: string[];
  bio?: string;
  specialties?: string[];
  languages?: string[];
  email?: string;
  role?: string;
};

export default function Home() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"users" | "workers" | "reports">("users");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [deletingPhoto, setDeletingPhoto] = useState<number | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("adminToken");
    if (saved) {
      setToken(saved);
      loadAll(saved);
    }
  }, []);

  async function loadAll(adminToken: string) {
    await Promise.all([
      loadUsers(adminToken),
      loadWorkers(adminToken),
      loadReports(adminToken),
    ]);
  }

  async function signIn() {
    if (!password.trim()) return;

    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Login failed");
      }

      localStorage.setItem("adminToken", data.token);
      setToken(data.token);
      setPassword("");
      await loadAll(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadUsers(adminToken: string) {
    const res = await fetch(
      `${API_URL}/api/admin/users?admin_token=${encodeURIComponent(adminToken)}`
    );

    if (!res.ok) throw new Error("Could not load users");

    setUsers(await res.json());
  }

  async function loadWorkers(adminToken: string) {
    const res = await fetch(
      `${API_URL}/api/admin/workers?admin_token=${encodeURIComponent(adminToken)}`
    );

    if (!res.ok) throw new Error("Could not load staff profiles");

    setWorkers(await res.json());
  }

  async function loadReports(adminToken: string) {
    const res = await fetch(
      `${API_URL}/api/admin/reports?admin_token=${encodeURIComponent(adminToken)}`
    );

    if (!res.ok) throw new Error("Could not load reports");

    setReports(await res.json());
  }

  async function updateReportStatus(
    reportId: string,
    status: "open" | "reviewed" | "resolved"
  ) {
    if (!token) return;

    const res = await fetch(
      `${API_URL}/api/admin/reports/${reportId}?admin_token=${encodeURIComponent(token)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );

    if (!res.ok) {
      setError("Could not update report status");
      return;
    }

    setReports((current) =>
      current.map((report) =>
        report.id === reportId ? { ...report, status } : report
      )
    );
  }

  async function toggleShift(worker: Worker) {
    if (!token) return;

    const newValue = !worker.isAvailableTonight;

    const res = await fetch(
      `${API_URL}/api/admin/workers/${worker.id}/availability?admin_token=${encodeURIComponent(token)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailableTonight: newValue }),
      }
    );

    if (!res.ok) {
      setError("Could not update shift status");
      return;
    }

    setWorkers((current) =>
      current.map((w) =>
        w.id === worker.id ? { ...w, isAvailableTonight: newValue } : w
      )
    );

    setSelectedWorker((current) =>
      current?.id === worker.id
        ? { ...current, isAvailableTonight: newValue }
        : current
    );
  }

  async function deleteUser(user: AdminUser) {
    if (!token) return;

    const label = user.name || user.email || "this user";

    if (!window.confirm(`Delete ${label}?`)) return;

    setDeletingId(user.id);

    try {
      const res = await fetch(
        `${API_URL}/api/admin/users/${user.id}?admin_token=${encodeURIComponent(token)}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Could not delete user");

      setUsers((current) => current.filter((u) => u.id !== user.id));
      await loadWorkers(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete user");
    } finally {
      setDeletingId("");
    }
  }

  async function deletePhoto(worker: Worker, index: number) {
    if (!token) return;

    if (!window.confirm("Remove this photo from the staff profile?")) return;

    setDeletingPhoto(index);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/api/admin/workers/${worker.id}/photos/${index}?admin_token=${encodeURIComponent(token)}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Could not remove photo");
      }

      const newPhotos = data.photos || [];

      setWorkers((current) =>
        current.map((w) =>
          w.id === worker.id ? { ...w, photos: newPhotos } : w
        )
      );

      setSelectedWorker((current) =>
        current?.id === worker.id
          ? { ...current, photos: newPhotos }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setDeletingPhoto(null);
    }
  }

  async function deleteVideo(worker: Worker, index: number) {
    if (!token) return;

    if (!window.confirm("Remove this video from the staff profile?")) return;

    setDeletingVideo(index);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/api/admin/workers/${worker.id}/videos/${index}?admin_token=${encodeURIComponent(token)}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Could not remove video");
      }

      const newVideos = data.videos || [];

      setWorkers((current) =>
        current.map((w) =>
          w.id === worker.id ? { ...w, videos: newVideos } : w
        )
      );

      setSelectedWorker((current) =>
        current?.id === worker.id
          ? { ...current, videos: newVideos }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove video");
    } finally {
      setDeletingVideo(null);
    }
  }

  function logout() {
    localStorage.removeItem("adminToken");
    setToken("");
    setUsers([]);
    setWorkers([]);
    setReports([]);
    setSelectedWorker(null);
  }

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;

    return users.filter((u) =>
      [u.name, u.email, u.role]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [users, search]);

  const filteredWorkers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return workers;

    return workers.filter((w) =>
      [w.name, w.email, w.workplace]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [workers, search]);

  if (!token) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <p className="text-pink-500 text-sm font-semibold tracking-[0.25em] uppercase">
            Is My Girly Free?
          </p>

          <h1 className="text-3xl font-bold mt-2">Admin Panel</h1>

          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
              placeholder="Enter admin password"
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-pink-500"
            />

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <button
              onClick={signIn}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-pink-600 px-4 py-3 font-semibold"
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-pink-500 text-sm font-semibold tracking-[0.25em] uppercase">
              Is My Girly Free?
            </p>
            <h1 className="text-3xl font-bold mt-2">Admin Dashboard</h1>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-zinc-700 px-4 py-2"
          >
            Log out
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mt-8">
          <Card title="Total Users" value={users.length} />
          <Card
            title="Customers"
            value={users.filter((u) => u.role === "customer").length}
          />
          <Card title="Staff Members" value={workers.length} />
          <Card
            title="On Shift"
            value={workers.filter((w) => w.isAvailableTonight).length}
          />
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => {
              setTab("users");
              setSelectedWorker(null);
            }}
            className={`rounded-xl px-4 py-2 ${
              tab === "users"
                ? "bg-pink-600"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            Users
          </button>

          <button
            onClick={() => setTab("workers")}
            className={`rounded-xl px-4 py-2 ${
              tab === "workers"
                ? "bg-pink-600"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            Staff Profiles
          </button>
          <button
            onClick={() => setTab("reports")}
            className={`rounded-xl px-4 py-2 ${
              tab === "reports"
                ? "bg-pink-600"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            Reports
          </button>
        </div>

        {tab === "workers" && selectedWorker ? (
          <div className="mt-6">
            <button
              onClick={() => setSelectedWorker(null)}
              className="mb-4 text-sm text-zinc-400 hover:text-white"
            >
              ← Back to staff profiles
            </button>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedWorker.name || "Unnamed Staff Member"}
                  </h2>

                  <p className="mt-1 text-zinc-400">
                    {selectedWorker.email || "No email"}
                  </p>

                  <p className="mt-1 text-zinc-500">
                    {selectedWorker.workplace || "No workplace"}
                  </p>
                </div>

                <button
                  onClick={() => toggleShift(selectedWorker)}
                  className={`rounded-full px-4 py-2 text-sm ${
                    selectedWorker.isAvailableTonight
                      ? "bg-green-950 text-green-400"
                      : "bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {selectedWorker.isAvailableTonight ? "On Shift" : "Off Shift"}
                </button>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold">Profile Information</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Info label="Bio" value={selectedWorker.bio || "None"} />
                  <Info
                    label="Languages"
                    value={
                      selectedWorker.languages?.length
                        ? selectedWorker.languages.join(", ")
                        : "None"
                    }
                  />
                  <Info
                    label="Specialties"
                    value={
                      selectedWorker.specialties?.length
                        ? selectedWorker.specialties.join(", ")
                        : "None"
                    }
                  />
                  <Info
                    label="Photos"
                    value={String(selectedWorker.photos?.length || 0)}
                  />
                  <Info
                    label="Videos"
                    value={String(selectedWorker.videos?.length || 0)}
                  />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold">Profile Videos</h3>

                {selectedWorker.videos?.length ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {selectedWorker.videos.map((video, index) => {
                      const src = video.startsWith("http")
                        ? video
                        : `${API_URL}${video}`;

                      return (
                        <div
                          key={`${video}-${index}`}
                          className="overflow-hidden rounded-xl border border-zinc-800 bg-black"
                        >
                          <video
                            src={src}
                            controls
                            className="w-full bg-black"
                          />

                          <button
                            onClick={() => deleteVideo(selectedWorker, index)}
                            disabled={deletingVideo === index}
                            className="w-full border-t border-zinc-800 px-3 py-3 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50"
                          >
                            {deletingVideo === index
                              ? "Removing..."
                              : "Remove video"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-zinc-500">No profile videos.</p>
                )}
              </div>

              <div className="mt-8">
                <h3 className="font-semibold">Profile Photos</h3>

                {selectedWorker.photos?.length ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {selectedWorker.photos.map((photo, index) => (
                      <div
                        key={`${photo}-${index}`}
                        className="overflow-hidden rounded-xl border border-zinc-800 bg-black"
                      >
                        <img
                          src={photo}
                          alt={`Profile photo ${index + 1}`}
                          className="h-64 w-full object-cover"
                        />

                        <button
                          onClick={() => deletePhoto(selectedWorker, index)}
                          disabled={deletingPhoto === index}
                          className="w-full border-t border-zinc-800 px-3 py-3 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50"
                        >
                          {deletingPhoto === index
                            ? "Removing..."
                            : "Remove photo"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-zinc-500">No profile photos.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-pink-500"
            />

            {error && <p className="mt-4 text-red-400">{error}</p>}

            {tab === "reports" ? (
              <div className="mt-6 space-y-4">
                {reports.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-10 text-center text-zinc-500">
                    No reports.
                  </div>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-pink-400">
                            {report.reasonLabel || report.reason || "Report"}
                          </p>

                          <h2 className="mt-2 text-lg font-semibold">
                            {report.targetName || "Unknown user"}
                          </h2>

                          <p className="text-sm text-zinc-400">
                            {report.targetEmail || "No email"}
                          </p>

                          <p className="mt-3 text-sm text-zinc-300">
                            {report.details || "No additional details."}
                          </p>

                          <div className="mt-4 text-xs text-zinc-500">
                            Reported by: {report.reporterName || "Unknown"}{" "}
                            {report.reporterEmail
                              ? `(${report.reporterEmail})`
                              : ""}
                          </div>

                          {report.createdAt && (
                            <div className="mt-1 text-xs text-zinc-600">
                              {new Date(report.createdAt).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              updateReportStatus(report.id, "open")
                            }
                            className={`rounded-lg px-3 py-1.5 text-sm ${
                              report.status === "open"
                                ? "bg-red-950 text-red-400"
                                : "bg-zinc-900 text-zinc-400"
                            }`}
                          >
                            Open
                          </button>

                          <button
                            onClick={() =>
                              updateReportStatus(report.id, "reviewed")
                            }
                            className={`rounded-lg px-3 py-1.5 text-sm ${
                              report.status === "reviewed"
                                ? "bg-yellow-950 text-yellow-400"
                                : "bg-zinc-900 text-zinc-400"
                            }`}
                          >
                            Reviewed
                          </button>

                          <button
                            onClick={() =>
                              updateReportStatus(report.id, "resolved")
                            }
                            className={`rounded-lg px-3 py-1.5 text-sm ${
                              report.status === "resolved"
                                ? "bg-green-950 text-green-400"
                                : "bg-zinc-900 text-zinc-400"
                            }`}
                          >
                            Resolved
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : tab === "users" ? (
              <div className="mt-6 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-950">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="font-medium">
                        {user.name || "Unnamed User"}
                      </p>
                      <p className="text-sm text-zinc-400">{user.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400">
                        {user.role === "worker"
                          ? "Staff Member"
                          : "Customer"}
                      </span>

                      <button
                        onClick={() => deleteUser(user)}
                        disabled={deletingId === user.id}
                        className="rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-400"
                      >
                        {deletingId === user.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {filteredWorkers.map((worker) => (
                  <button
                    key={worker.id}
                    onClick={() => setSelectedWorker(worker)}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-left hover:border-zinc-600"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold">
                          {worker.name || "Unnamed Staff Member"}
                        </h2>

                        <p className="mt-1 text-sm text-zinc-400">
                          {worker.email || "No email"}
                        </p>

                        <p className="mt-1 text-sm text-zinc-500">
                          {worker.workplace || "No workplace"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-sm ${
                          worker.isAvailableTonight
                            ? "bg-green-950 text-green-400"
                            : "bg-zinc-900 text-zinc-400"
                        }`}
                      >
                        {worker.isAvailableTonight ? "On Shift" : "Off Shift"}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2 text-xs text-zinc-500">
                      <span>{worker.photos?.length || 0} photos</span>
                      <span>•</span>
                      <span>{worker.videos?.length || 0} videos</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-sm text-zinc-200">{value}</p>
    </div>
  );
}
