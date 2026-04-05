// src/app/student/view-profile/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ViewProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fullname, setFullname] = useState("")
  const [nickname, setNickname] = useState("")
  const [studentId, setStudentId] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
  // ✅ เพิ่ม state สำหรับ debug รูปภาพ
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      console.log("🔍 [DEBUG] Fetching profile...")
      
      const result = await supabase.auth.getUser()
      const user = result.data?.user

      if (!user) {
        console.log("⚠️ [DEBUG] No user found, redirecting to login")
        router.push("/student/login")
        return
      }

      console.log("✅ [DEBUG] User found:", user.id)
      setEmail(user.email || "")

      const profileResult = await supabase
        .from("profiles")
        .select("fullname, nickname, student_id, avatar_url")
        .eq("id", user.id)
        .single()

      console.log("📋 [DEBUG] Profile result:", profileResult)

      if (profileResult.data) {
        setFullname(profileResult.data.fullname || "")
        setNickname(profileResult.data.nickname || "")
        setStudentId(profileResult.data.student_id || "")
        setAvatarUrl(profileResult.data.avatar_url)
        
        console.log("🖼️ [DEBUG] Avatar URL:", profileResult.data.avatar_url)
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ ฟังก์ชันจัดการเมื่อโหลดรูปสำเร็จ
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    console.log("✅ [DEBUG] Image loaded successfully!")
    console.log("📏 [DEBUG] Image dimensions:", img.naturalWidth, "x", img.naturalHeight)
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    })
    setImageLoaded(true)
    setImageError(null)
  }

  // ✅ ฟังก์ชันจัดการเมื่อโหลดรูปผิดพลาด
  const handleImageError = () => {
    console.error("❌ [DEBUG] Failed to load image!")
    console.error("❌ [DEBUG] Image URL:", avatarUrl)
    setImageError("ไม่สามารถโหลดรูปภาพได้")
    setImageLoaded(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200">
        <div className="text-xl text-gray-700">กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center text-teal-600 mb-8">
          👤 ข้อมูลโปรไฟล์
        </h1>

        {/* รูปโปรไฟล์ - เปลี่ยนเป็นสี่เหลี่ยม */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {avatarUrl ? (
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt="Profile"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className="w-40 h-40 object-cover border-4 border-teal-500 shadow-xl rounded-lg"
                  crossOrigin="anonymous"
                />
                {/* ✅ แสดงสถานะโหลดรูป */}
                {imageLoaded && (
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded whitespace-nowrap">
                    ✅ โหลดสำเร็จ
                  </div>
                )}
                {imageError && (
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded whitespace-nowrap">
                    ❌ โหลดล้มเหลว
                  </div>
                )}
              </div>
            ) : (
              <div className="w-40 h-40 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-6xl font-bold border-4 border-teal-500 shadow-xl">
                {fullname.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>

        {/* ✅ แสดงรายละเอียดรูปภาพ (Debug) */}
        {avatarUrl && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">📊 รายละเอียดรูปภาพ</p>
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-gray-700">
                URL: <span className="text-teal-600 break-all">{avatarUrl.length > 50 ? avatarUrl.substring(0, 50) + "..." : avatarUrl}</span>
              </span>
            </div>
            {imageDimensions && (
              <div className="mt-2 text-sm text-gray-700">
                📏 ขนาด: <span className="font-semibold text-teal-600">{imageDimensions.width} x {imageDimensions.height} px</span>
              </div>
            )}
            {imageError && (
              <div className="mt-2 text-sm text-red-600">
                ⚠️ {imageError}
              </div>
            )}
          </div>
        )}

        {/* ข้อมูลส่วนตัว */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              รหัสนักศึกษา
            </label>
            <p className="text-lg font-semibold text-gray-800">{studentId}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              อีเมล
            </label>
            <p className="text-lg font-semibold text-gray-800">{email}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              ชื่อ-นามสกุล
            </label>
            <p className="text-lg font-semibold text-gray-800">{fullname}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              ชื่อเล่น
            </label>
            <p className="text-lg font-semibold text-gray-800">
              {nickname || "-"}
            </p>
          </div>
        </div>

        {/* ปุ่มนำทาง */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push("/student/profile")}
            className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-3 rounded-lg hover:from-teal-600 hover:to-cyan-700 shadow-lg transform hover:scale-[1.02] transition-all"
          >
            ✏️ แก้ไขโปรไฟล์
          </button>
          
          <button
            onClick={() => router.push("/student/lobby")}
            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-all"
          >
            🏠 กลับหน้าหลัก
          </button>
        </div>

        {/* ✅ Debug Panel (แสดงเฉพาะใน development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 bg-gray-900 text-green-400 rounded-xl p-4 text-xs font-mono">
            <p className="font-bold mb-2">🔧 Debug Information:</p>
            <p>User ID: {studentId}</p>
            <p>Avatar URL: {avatarUrl || "null"}</p>
            <p>Image Loaded: {imageLoaded ? "Yes" : "No"}</p>
            <p>Image Error: {imageError || "None"}</p>
            <p>Dimensions: {imageDimensions ? `${imageDimensions.width} x ${imageDimensions.height}` : "N/A"}</p>
          </div>
        )}
      </div>
    </div>
  )
}