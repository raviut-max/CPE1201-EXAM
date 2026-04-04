// src/app/student/login/page.tsx
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🔴 [LOGIN DEBUG] เริ่มกระบวนการเข้าสู่ระบบ")
    console.log("🔵 [LOGIN DEBUG] ข้อมูลที่กรอก:", { loginId, passwordLength: password.length })
    
    setMessage({ type: "", text: "" })
    setLoading(true)

    let emailToUse = loginId

    try {
      // ตรวจสอบว่าเป็นรหัสนักศึกษา (ตัวเลขล้วน) หรือไม่
      if (/^\d+$/.test(loginId)) {
        console.log("🟢 [LOGIN DEBUG] ตรวจพบว่าเป็นรหัสนักศึกษา:", loginId)
        
        // ค้นหา email จากตาราง profiles
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("student_id", loginId)
          .single()

        console.log("🟣 [LOGIN DEBUG] ผลการค้นหา profile:", { profile, profileError })

        if (profileError || !profile || !profile.email) {
          console.log("🔴 [LOGIN DEBUG] ไม่พบรหัสนักศึกษาในระบบ")
          setMessage({ type: "error", text: "ไม่พบรหัสนักศึกษา \"" + loginId + "\" ในระบบ กรุณาตรวจสอบหรือลงทะเบียนก่อน" })
          setLoading(false)
          return
        }

        // ใช้ email ที่เก็บใน profiles
        emailToUse = profile.email
        console.log("🟢 [LOGIN DEBUG] พบ Email:", emailToUse)
      } else {
        console.log("🟢 [LOGIN DEBUG] ใช้ Email โดยตรง:", emailToUse)
      }

      // ทำการ Login
      console.log("🟢 [LOGIN DEBUG] กำลังเข้าสู่ระบบ Supabase Auth...")
      const { error, data } = await supabase.auth.signInWithPassword({ 
        email: emailToUse,
        password 
      })

      console.log("🟣 [LOGIN DEBUG] ผลลัพธ์จาก Auth:", { error, userId: data?.user?.id })

      if (error) {
        console.log("🔴 [LOGIN DEBUG] Login Error:", error.message)
        setMessage({ type: "error", text: "เข้าสู่ระบบไม่สำเร็จ: " + error.message + "\n\nEmail ที่ใช้: " + emailToUse })
        setLoading(false)
        return
      }

      // Login สำเร็จ
      console.log("✅ [LOGIN DEBUG] เข้าสู่ระบบสำเร็จ! Redirecting to lobby...")
      setMessage({ type: "success", text: "เข้าสู่ระบบสำเร็จ! กำลังไปยังห้องสอบ..." })
      
      // ใช้ window.location.href เพื่อบังคับเปลี่ยนหน้า
      setTimeout(() => {
        window.location.href = "/student/lobby"
      }, 1000)

    } catch (error) {
      console.log("🔴 [LOGIN DEBUG] เกิด Error ที่ไม่คาดคิด:", error)
      setMessage({ type: "error", text: "เกิดข้อผิดพลาดที่ไม่คาดคิด: " + error })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200 p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-8 py-6 text-center">
            <div className="mb-3">
              <svg className="w-16 h-16 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">เข้าสู่ระบบ</h1>
            <p className="text-teal-100 text-sm mt-1">วิชา CPE1201 การโปรแกรมเชิงวัตถุ</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {message.text && (
              <div className={`p-3 rounded-lg text-sm text-center font-medium whitespace-pre-line ${
                message.type === "error" ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"
              }`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  รหัสนักศึกษา หรือ Email
                </span>
              </label>
              <input 
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                placeholder="กรอกรหัสนักศึกษา หรือ Email"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required 
              />
              <p className="text-xs text-gray-500 mt-1">* สามารถกรอกได้ทั้งรหัสนักศึกษา (เช่น 123456) หรือ Email</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  รหัสผ่าน
                </span>
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-gray-50 focus:bg-white pr-12"
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>

            <p className="text-center text-sm text-gray-600">
              ยังไม่มีบัญชี?{" "}
              <a href="/student/register" className="text-teal-600 hover:text-teal-700 font-semibold hover:underline transition-colors">
                ลงทะเบียนที่นี่
              </a>
            </p>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          © 2026 วิชา CPE1201 การโปรแกรมเชิงวัตถุ
        </p>
      </div>
    </div>
  )
}