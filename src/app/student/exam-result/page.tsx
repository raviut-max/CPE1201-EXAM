// src/app/student/exam-result/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ExamResultPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<any>({
    totalQuestions: 0,
    sessionName: "",
    submittedAt: ""
  })
  const [userName, setUserName] = useState("")

  useEffect(() => {
    fetchResult()
  }, [])

  const fetchResult = async () => {
    try {
      // ✅ แก้ไขการดึงข้อมูล user แบบปลอดภัย
      const result = await supabase.auth.getUser()
      const user = result.data?.user

      if (!user) {
        router.push("/student/login")
        return
      }

      // ✅ แก้ไขการดึงข้อมูล profile
      const profileResult = await supabase
        .from("profiles")
        .select("fullname, student_id")
        .eq("id", user.id)
        .single()
      
      if (profileResult.data) {
        setUserName(profileResult.data.fullname)
      }

      // ✅ แก้ไขการดึงข้อมูล record
      const recordResult = await supabase
        .from("exam_records")
        .select("*, exam_sessions(session_name)")
        .eq("user_id", user.id)
        .eq("status", "submitted")
        .order("end_time", { ascending: false })
        .limit(1)
        .single()

      if (!recordResult.data) {
        alert("ไม่พบข้อมูลการสอบ")
        router.push("/student/lobby")
        return
      }

      // ✅ แก้ไขการดึงข้อมูล answers
      const answersResult = await supabase
        .from("exam_answers")
        .select("*")
        .eq("record_id", recordResult.data.id)

      setResult({
        totalQuestions: answersResult.data?.length || 0,
        sessionName: recordResult.data.exam_sessions?.session_name || "การสอบ",
        submittedAt: new Date(recordResult.data.end_time).toLocaleString("th-TH")
      })

      setLoading(false)
    } catch (error) {
      console.error("Error fetching result:", error)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/student/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200">
        <div className="text-xl text-gray-700">กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-teal-600 mb-4">ส่งข้อสอบเรียบร้อยแล้ว!</h1>
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-6 mb-6">
            <p className="text-lg text-gray-700 mb-3">
              <span className="text-2xl">💪</span> ขอบคุณที่เข้าร่วมการสอบ
            </p>
            <p className="text-xl font-semibold text-teal-700 mb-2">
              ขอให้โชคดีในการเขียนโปรแกรมนะครับ!
            </p>
            <p className="text-gray-600">
              ขอให้ประสบความสำเร็จในการเรียน และนำความรู้ไปใช้พัฒนาตนเองต่อไป 🚀
            </p>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">ผู้สอบ</p>
              <p className="font-semibold text-gray-800">{userName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">การสอบ</p>
              <p className="font-semibold text-gray-800">{result.sessionName}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center bg-teal-100 rounded-full px-6 py-3 mb-4">
            <span className="text-teal-800 font-semibold">
              📝 ทำข้อสอบทั้งหมด {result.totalQuestions} ข้อ
            </span>
          </div>
          <p className="text-sm text-gray-500">
            ส่งข้อสอบเมื่อ: {result.submittedAt}
          </p>
        </div>

        {/* Quote */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mb-6 text-center">
          <p className="text-lg text-gray-700 italic mb-2">
            "ความสำเร็จไม่ได้เกิดขึ้นจากการสอบเพียงครั้งเดียว"
          </p>
          <p className="text-sm text-gray-600">
            แต่เกิดจากการเรียนรู้และฝึกฝนอย่างต่อเนื่อง 💻✨
          </p>
        </div>

        {/* Logout Button */}
        <div className="flex justify-center">
          <button
            onClick={handleLogout}
            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 shadow-lg transform hover:scale-[1.02] transition-all"
          >
            🚪 ออกจากระบบ
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <span>🍀</span>
            <span>ขอให้โชคดีในการเรียนและการเขียนโปรแกรม!</span>
            <span>🍀</span>
          </p>
          <p className="mt-2">วิชา CPE1201 การโปรแกรมเชิงวัตถุ</p>
        </div>
      </div>
    </div>
  )
}