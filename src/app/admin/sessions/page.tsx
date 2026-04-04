// src/app/admin/sessions/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Session = {
  id: string
  session_name: string
  start_time: string
  duration_minutes: number
  end_time: string
  status: "upcoming" | "active" | "finished"
  created_at: string
}

export default function AdminSessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  
  // Form state
  const [sessionName, setSessionName] = useState("")
  const [startTime, setStartTime] = useState("")
  const [duration, setDuration] = useState(60)

  useEffect(() => {
    checkAuth()
    fetchSessions()
    
    // อัปเดตสถานะทุก 1 นาที
    const interval = setInterval(fetchSessions, 60000)
    return () => clearInterval(interval)
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/admin/login")
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      router.push("/student/login")
    }
  }

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .order("start_time", { ascending: false })

    if (error) {
      console.error("Error fetching sessions:", error)
    } else {
      setSessions(data || [])
    }
    setLoading(false)
  }

  const resetForm = () => {
    setSessionName("")
    setStartTime("")
    setDuration(60)
    setEditingSession(null)
    setShowModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // คำนวณเวลาสิ้นสุดอัตโนมัติ
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 60000) // duration เป็นนาที

    const sessionData = {
      session_name: sessionName,
      start_time: start.toISOString(),
      duration_minutes: duration,
      end_time: end.toISOString(),
      status: "upcoming" as const
    }

    try {
      if (editingSession) {
        // อัปเดต
        const { error } = await supabase
          .from("exam_sessions")
          .update(sessionData)
          .eq("id", editingSession.id)
        if (error) throw error
      } else {
        // สร้างใหม่
        const { error } = await supabase
          .from("exam_sessions")
          .insert(sessionData)
        if (error) throw error
      }

      resetForm()
      fetchSessions()
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message)
    }
  }

  const handleEdit = (session: Session) => {
    setEditingSession(session)
    setSessionName(session.session_name)
    setStartTime(session.start_time.slice(0, 16)) // Format สำหรับ datetime-local
    setDuration(session.duration_minutes)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบตารางสอบนี้หรือไม่?\n\nคำเตือน: การลบจะส่งผลต่อข้อมูลการสอบที่เกี่ยวข้อง")) return

    const { error } = await supabase
      .from("exam_sessions")
      .delete()
      .eq("id", id)

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message)
    } else {
      fetchSessions()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusBadge = (status: string, startTime: string, endTime: string) => {
    const now = new Date().getTime()
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    
    let currentStatus = status
    if (now < start) currentStatus = "upcoming"
    else if (now >= start && now <= end) currentStatus = "active"
    else currentStatus = "finished"

    const badges: Record<string, string> = {
      upcoming: "bg-yellow-100 text-yellow-800 border-yellow-300",
      active: "bg-green-100 text-green-800 border-green-300 animate-pulse",
      finished: "bg-gray-100 text-gray-800 border-gray-300"
    }
    
    const labels: Record<string, string> = {
      upcoming: "⏳ รอเริ่ม",
      active: "🔴 กำลังสอบ",
      finished: "✅ สิ้นสุด"
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badges[currentStatus]}`}>
        {labels[currentStatus]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">จัดการตารางสอบ</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">รายการตารางสอบ</h2>
              <p className="text-sm text-gray-600 mt-1">กำหนดเวลาการสอบและระยะเวลา</p>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transform hover:scale-105 transition-all"
            >
              + สร้างตารางสอบใหม่
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">ยังไม่มีตารางสอบ</p>
              <p className="text-gray-400 text-sm mt-1">คลิกปุ่ม "สร้างตารางสอบใหม่" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ชื่อการสอบ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">เวลาเริ่ม</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ระยะเวลา</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">เวลาสิ้นสุด</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">สถานะ</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{session.session_name}</div>
                        <div className="text-xs text-gray-500">ID: {session.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDateTime(session.start_time)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {session.duration_minutes} นาที
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDateTime(session.end_time)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getStatusBadge(session.status, session.start_time, session.end_time)}
                      </td>
                      <td className="px-4 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(session)}
                          className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg my-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingSession ? "แก้ไขตารางสอบ" : "สร้างตารางสอบใหม่"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ชื่อการสอบ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="เช่น สอบกลางภาค CPE1201"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  เวลาเริ่มสอบ <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">กำหนดวันและเวลาเริ่มสอบ</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ระยะเวลาสอบ (นาที) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  min="1"
                  max="300"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">ระบบจะคำนวณเวลาสิ้นสุดอัตโนมัติ</p>
              </div>

              {startTime && duration > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">📅 เวลาสิ้นสุดที่คำนวณได้:</span>
                    <br />
                    {formatDateTime(new Date(new Date(startTime).getTime() + duration * 60000).toISOString())}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all"
                >
                  {editingSession ? "บันทึกการแก้ไข" : "สร้างตารางสอบ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}