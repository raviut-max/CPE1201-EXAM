// src/app/admin/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AdminRegisterPage() {
  const [fullname, setFullname] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ type: "", text: "" })

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "รหัสผ่านไม่ตรงกัน" })
      return
    }

    if (password.length < 6) {
      setMessage({ type: "error", text: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" })
      return
    }

    // ตรวจสอบ Email ว่าเป็น Email สำหรับ Admin หรือไม่ (optional)
    if (!email.includes("@cpe1201admin.com") && !email.includes("@admin")) {
      setMessage({ type: "error", text: "ต้องใช้ Email สำหรับผู้ดูแลระบบ" })
      return
    }

    setLoading(true)

    try {
      // 1. สร้าง User ใน Supabase Auth
      const { error: authError, data } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        setMessage({ type: "error", text: "เกิดข้อผิดพลาด: " + authError.message })
        setLoading(false)
        return
      }

      if (data.user) {
        // 2. บันทึกข้อมูลในตาราง profiles พร้อม role = 'admin'
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id, // ใช้ ID ที่ Supabase สร้างให้
          student_id: "ADMIN-" + Date.now(), // สร้าง ID แบบ unique
          fullname,
          email,
          role: "admin" // กำหนดเป็น admin
        })

        if (profileError) {
          setMessage({ type: "error", text: "บันทึกข้อมูลไม่สำเร็จ: " + profileError.message })
        } else {
          setMessage({ type: "success", text: "สร้างผู้ดูแลระบบสำเร็จ! กำลังไปยังหน้าเข้าสู่ระบบ..." })
          setTimeout(() => {
            router.push("/admin/login")
          }, 1500)
        }
      }
    } catch (error) {
      setMessage({ type: "error", text: "เกิดข้อผิดพลาดที่ไม่คาดคิด" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Admin Registration</h1>
        <p className="text-center text-gray-600 mb-8">สร้างบัญชีผู้ดูแลระบบ</p>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm text-center mb-4 ${
            message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อ-นามสกุล</label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="ผู้ดูแลระบบ"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="admin@cpe1201exam.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">ยืนยันรหัสผ่าน</label>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
          >
            {loading ? "กำลังสร้าง..." : "สร้างผู้ดูแลระบบ"}
          </button>

          <p className="text-center text-sm text-gray-600 mt-4">
            มีบัญชีแล้ว?{" "}
            <a href="/admin/login" className="text-blue-600 hover:underline">
              เข้าสู่ระบบที่นี่
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}