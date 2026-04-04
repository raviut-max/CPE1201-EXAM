// src/app/admin/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalStudents: 0,
    activeSessions: 0
  })

  useEffect(() => {
    checkAuth()
    fetchStats()
  }, [])

  // 1. ตรวจสอบสิทธิ์ Admin
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

  // 2. ดึงข้อมูลสรุป
  const fetchStats = async () => {
    try {
      const { count: qCount } = await supabase.from("questions").select("*", { count: "exact", head: true })
      const { count: sCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student")
      const { count: activeCount } = await supabase.from("exam_sessions").select("*", { count: "exact", head: true }).eq("status", "active")

      setStats({
        totalQuestions: qCount || 0,
        totalStudents: sCount || 0,
        activeSessions: activeCount || 0
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">กำลังโหลดข้อมูล...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-10">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-400">ระบบจัดการการสอบ CPE1201</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">ข้อสอบทั้งหมด</p>
                <p className="text-3xl font-bold text-blue-400 mt-1">{stats.totalQuestions}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">นักศึกษาที่ลงทะเบียน</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{stats.totalStudents}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">ตารางสอบที่กำลังเปิด</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{stats.activeSessions}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <h2 className="text-xl font-bold text-white mb-6 border-l-4 border-blue-500 pl-3">เมนูจัดการระบบ</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Manage Sessions */}
          <button
            onClick={() => router.push("/admin/sessions")}
            className="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 p-6 rounded-xl text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/30">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400">จัดการตารางสอบ</h3>
            <p className="text-sm text-gray-400">สร้าง กำหนดเวลาเริ่ม-สิ้นสุด และเปิด/ปิดการสอบ</p>
          </button>

          {/* 2. Manage Questions */}
          <button
            onClick={() => router.push("/admin/questions")}
            className="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-purple-500 p-6 rounded-xl text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/30">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-400">จัดการข้อสอบ</h3>
            <p className="text-sm text-gray-400">เพิ่ม แก้ไข ลบ ข้อสอบโค้ดและทฤษฎี (สุ่มตัวเลือก)</p>
          </button>

          {/* 3. View Results */}
          <button
            onClick={() => router.push("/admin/results")}
            className="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-green-500 p-6 rounded-xl text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/30">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-green-400">ดูผลสอบ & สถิติ</h3>
            <p className="text-sm text-gray-400">ตรวจสอบคะแนนนักศึกษา และรายละเอียดการตอบ</p>
          </button>
        </div>
      </div>
    </div>
  )
}