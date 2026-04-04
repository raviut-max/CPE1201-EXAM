// src/app/admin/login/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🔴 [ADMIN LOGIN] เริ่มเข้าสู่ระบบ")
    console.log("🔵 [ADMIN LOGIN] Email:", email)
    console.log("🔵 [ADMIN LOGIN] Password:", password)
    
    setError("")
    setLoading(true)

    try {
      // 1. Login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log("🟣 [ADMIN LOGIN] Auth Result:", { authData, authError })

      if (authError) {
        console.log("🔴 [ADMIN LOGIN] Auth Error:", authError.message)
        setError("เข้าสู่ระบบไม่สำเร็จ: " + authError.message)
        setLoading(false)
        return
      }

      // 2. ตรวจสอบว่าเป็น Admin หรือไม่
      if (authData.user) {
        console.log("🟢 [ADMIN LOGIN] User ID:", authData.user.id)
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, student_id, fullname, email")
          .eq("id", authData.user.id)
          .single()

        console.log("🟣 [ADMIN LOGIN] Profile Result:", { profile, profileError })

        if (profileError) {
          console.log("🔴 [ADMIN LOGIN] Profile Error:", profileError.message)
          setError("ไม่พบข้อมูลโปรไฟล์: " + profileError.message)
          setLoading(false)
          return
        }

        if (profile?.role !== "admin") {
          console.log("🔴 [ADMIN LOGIN] Not an admin! Role:", profile?.role)
          setError("คุณไม่มีสิทธิ์เข้าถึงระบบนี้ (Role: " + profile?.role + ")")
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // 3. Login สำเร็จ
        console.log("✅ [ADMIN LOGIN] Success! Redirecting to dashboard...")
        router.push("/admin/dashboard")
      }
    } catch (err) {
      console.log("🔴 [ADMIN LOGIN] Unexpected Error:", err)
      setError("เกิดข้อผิดพลาดที่ไม่คาดคิด: " + err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Login</h1>
          <p className="text-gray-600 text-sm">ระบบจัดการการสอบ CPE1201</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="admin@cpe1201exam.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              รหัสผ่าน
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all shadow-lg"
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
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>สำหรับระบบผู้ดูแลระบบเท่านั้น</p>
        </div>
      </div>
    </div>
  )
}