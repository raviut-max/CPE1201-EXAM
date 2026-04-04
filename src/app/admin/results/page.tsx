// src/app/admin/results/page.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type ExamResult = {
  id: string
  student_name: string
  student_id: string
  email: string
  score: number
  total_questions: number
  correct_answers: number
  submitted_at: string
  duration: string
}

type SortConfig = {
  key: keyof ExamResult
  direction: 'asc' | 'desc'
}

export default function AdminResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<ExamResult[]>([])
  const [selectedSession, setSelectedSession] = useState<string>("")
  const [sessions, setSessions] = useState<any[]>([])
  const [viewingDetail, setViewingDetail] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'score', direction: 'desc' })
  
  // ✅ เพิ่ม State สำหรับ Progress Bar
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingCount, setProcessingCount] = useState({ current: 0, total: 0 })
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchSessions()
  }, [])

  useEffect(() => {
    if (selectedSession) {
      fetchResults()
    }
  }, [selectedSession])

  const checkAuth = async () => {
    const result = await supabase.auth.getUser()
    const user = result.data?.user
    
    if (!user) {
      router.push("/admin/login")
      return
    }

    const profileResult = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileResult.data?.role !== "admin") {
      router.push("/student/login")
    }
  }

  const fetchSessions = async () => {
    const sessionResult = await supabase
      .from("exam_sessions")
      .select("*")
      .order("start_time", { ascending: false })

    if (sessionResult.data) {
      setSessions(sessionResult.data)
      if (sessionResult.data.length > 0) {
        setSelectedSession(sessionResult.data[0].id)
      }
    }
    setLoading(false)
  }

  const fetchResults = async () => {
    if (!selectedSession) return

    setIsProcessing(true)
    setProcessingProgress(0)
    setResults([])

    try {
      const recordsResult = await supabase
        .from("exam_records")
        .select("*")
        .eq("session_id", selectedSession)
        .eq("status", "submitted")

      const records = recordsResult.data || []
      const total = records.length

      setProcessingCount({ current: 0, total })
      if (total === 0) {
        setResults([])
        setIsProcessing(false)
        return
      }

      const resultsWithDetails: ExamResult[] = []

      for (let i = 0; i < total; i++) {
        const record = records[i]
        
        // ดึงข้อมูลนักศึกษา
        const profileResult = await supabase
          .from("profiles")
          .select("fullname, student_id, email")
          .eq("id", record.user_id)
          .single()

        // ดึงคำตอบ
        const answersResult = await supabase
          .from("exam_answers")
          .select("*")
          .eq("record_id", record.id)

        const totalQuestions = answersResult.data?.length || 0
        let correctAnswers = 0
        
        if (answersResult.data) {
          for (const answer of answersResult.data) {
            const choiceResult = await supabase
              .from("choices")
              .select("is_correct")
              .eq("id", answer.selected_choice_id)
              .single()
            
            if (choiceResult.data?.is_correct) correctAnswers++
          }
        }

        const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
        const startTime = new Date(record.start_time).getTime()
        const endTime = new Date(record.end_time).getTime()
        const durationMinutes = Math.floor((endTime - startTime) / 60000)
        const durationSeconds = Math.floor(((endTime - startTime) % 60000) / 1000)

        resultsWithDetails.push({
          id: record.id,
          student_name: profileResult.data?.fullname || "ไม่ทราบชื่อ",
          student_id: profileResult.data?.student_id || "N/A",
          email: profileResult.data?.email || "N/A",
          score: parseFloat(score.toFixed(2)),
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          submitted_at: new Date(record.end_time).toLocaleString("th-TH"),
          duration: `${durationMinutes} นาที ${durationSeconds} วินาที`
        })

        // ✅ อัปเดต Progress Bar
        const current = i + 1
        const percent = Math.round((current / total) * 100)
        setProcessingCount({ current, total })
        setProcessingProgress(percent)

        // ✅ Yield ให้ UI อัปเดต Progress Bar แบบลื่นไหล
        await new Promise(resolve => setTimeout(resolve, 15))
      }

      // เรียงคะแนนจากมากไปน้อย
      resultsWithDetails.sort((a, b) => b.score - a.score)
      setResults(resultsWithDetails)

    } catch (error) {
      console.error("Error fetching results:", error)
      alert("เกิดข้อผิดพลาดในการโหลดผลสอบ")
    } finally {
      setIsProcessing(false)
      setProcessingProgress(100)
    }
  }

  const handleExportExcel = () => {
    if (!sortedResults.length) {
      alert("ไม่มีข้อมูลสำหรับส่งออก")
      return
    }

    const headers = ["อันดับ", "ชื่อ-นามสกุล", "รหัสนักศึกษา", "Email", "คะแนน (%)", "ตอบถูก (ข้อ)", "ข้อทั้งหมด", "เวลาที่ใช้", "วันที่สอบ"]
    const rows = sortedResults.map((r, index) => [
      index + 1,
      `"${r.student_name}"`,
      `"${r.student_id}"`,
      `"${r.email}"`,
      r.score,
      r.correct_answers,
      r.total_questions,
      `"${r.duration}"`,
      `"${r.submitted_at}"`
    ])

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `ผลการสอบ_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const requestSort = (key: keyof ExamResult) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedResults = useMemo(() => {
    let sortableItems = [...results]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [results, sortConfig])

  const viewDetail = async (recordId: string) => {
    setViewingDetail(recordId)
    const answersResult = await supabase
      .from("exam_answers")
      .select("question_id, selected_choice_id")
      .eq("record_id", recordId)

    const details: any[] = []
    if (answersResult.data) {
      for (const answer of answersResult.data) {
        const questionResult = await supabase
          .from("questions")
          .select("*")
          .eq("id", answer.question_id)
          .single()
        const selectedChoiceResult = await supabase
          .from("choices")
          .select("choice_text")
          .eq("id", answer.selected_choice_id)
          .single()
        const correctChoiceResult = await supabase
          .from("choices")
          .select("choice_text")
          .eq("question_id", answer.question_id)
          .eq("is_correct", true)
          .single()

        details.push({
          question: questionResult.data,
          selected_answer: selectedChoiceResult.data?.choice_text,
          correct_answer: correctChoiceResult.data?.choice_text,
          is_correct: selectedChoiceResult.data?.choice_text === correctChoiceResult.data?.choice_text
        })
      }
    }
    setDetailData(details)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50"
    if (score >= 60) return "text-blue-600 bg-blue-50"
    if (score >= 50) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const getRankBadgeClass = (rank: number) => {
    switch(rank) {
      case 1: return "bg-yellow-400 text-white shadow-yellow-200"
      case 2: return "bg-gray-300 text-white shadow-gray-200"
      case 3: return "bg-orange-400 text-white shadow-orange-200"
      default: return "bg-gray-100 text-gray-600"
    }
  }

  const getSortIcon = (columnKey: keyof ExamResult) => {
    if (sortConfig.key !== columnKey) return "↕️"
    return sortConfig.direction === 'asc' ? "↑" : "↓"
  }

  const selectedSessionObj = sessions.find(s => s.id === selectedSession)
  const examTotalQuestions = sortedResults.length > 0 ? sortedResults[0].total_questions : 0

  if (loading && !isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">กำลังโหลดระบบ...</div>
      </div>
    )
  }

  // ✅ UI แสดง Progress Bar ขณะรวบรวมข้อมูล
  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-blue-100">
          <div className="mb-6 text-blue-600">
            <svg className="animate-spin h-12 w-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">กำลังรวบรวมผลสอบ...</h3>
          <p className="text-sm text-gray-500 mb-6">
            ประมวลผลข้อมูลผู้สอบ <span className="font-bold text-blue-600">{processingCount.current} / {processingCount.total}</span> คน
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2" 
              style={{ width: `${processingProgress}%` }}
            >
              {processingProgress > 10 && (
                <span className="text-xs font-bold text-white drop-shadow-md">{processingProgress}%</span>
              )}
            </div>
          </div>
          
          <p className="text-xs text-gray-400 mt-4">กรุณารอสักครู่ ระบบกำลังคำนวณคะแนนทีละคน</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">ผลการสอบ</h1>
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
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="w-full md:w-96">
              <label className="block text-sm font-semibold text-gray-700 mb-2">เลือกการสอบ</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_name} ({new Date(session.start_time).toLocaleDateString("th-TH")})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportExcel}
              disabled={sortedResults.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ส่งออกรายงาน (Excel)
            </button>
          </div>

          {selectedSessionObj && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">📝 ชื่อการสอบ</p>
                  <p className="font-bold text-gray-900 text-lg">{selectedSessionObj.session_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">📅 วันที่/เวลาสอบ</p>
                  <p className="font-medium text-gray-800">{new Date(selectedSessionObj.start_time).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">⏱️ ระยะเวลา</p>
                  <p className="font-medium text-gray-800">{selectedSessionObj.duration_minutes} นาที</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">📊 จำนวนข้อสอบ</p>
                  <p className="font-medium text-gray-800">{examTotalQuestions} ข้อ</p>
                </div>
              </div>
            </div>
          )}

          {sortedResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700">จำนวนผู้สอบ</p>
                <p className="text-3xl font-bold text-blue-800">{sortedResults.length} คน</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-700">คะแนนสูงสุด</p>
                <p className="text-3xl font-bold text-green-800">
                  {Math.max(...sortedResults.map(r => r.score)).toFixed(1)}%
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-sm text-purple-700">คะแนนเฉลี่ย</p>
                <p className="text-3xl font-bold text-purple-800">
                  {(sortedResults.reduce((acc, r) => acc + r.score, 0) / sortedResults.length).toFixed(1)}%
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-700">คะแนนต่ำสุด</p>
                <p className="text-3xl font-bold text-orange-800">
                  {Math.min(...sortedResults.map(r => r.score)).toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {sortedResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              ยังไม่มีผู้ส่งข้อสอบใน Session นี้
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">อันดับ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('student_name')}>
                      ชื่อ-นามสกุล {getSortIcon('student_name')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('student_id')}>
                      รหัสนักศึกษา {getSortIcon('student_id')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('score')}>
                      คะแนน {getSortIcon('score')}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ตอบถูก</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ทั้งหมด</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">เวลาที่ใช้</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedResults.map((result, index) => (
                    <tr key={result.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold shadow-sm ${getRankBadgeClass(index + 1)}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{result.student_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{result.student_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{result.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(result.score)}`}>
                          {result.score}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-green-600">{result.correct_answers}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">{result.total_questions}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{result.duration}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => viewDetail(result.id)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm">
                          ดูรายละเอียด
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

      {viewingDetail && detailData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">รายละเอียดคำตอบ</h2>
              <button onClick={() => { setViewingDetail(null); setDetailData(null) }} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {detailData.map((item: any, index: number) => (
                <div key={index} className={`border-2 rounded-xl p-4 ${item.is_correct ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${item.is_correct ? "bg-green-500" : "bg-red-500"}`}>
                      {item.is_correct ? "✓" : "✕"}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 mb-2">ข้อที่ {index + 1}: {item.question.question_text}</p>
                      {item.question.code_snippet && (
                        <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm mb-3 overflow-x-auto">{item.question.code_snippet}</pre>
                      )}
                    </div>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-600">คำตอบที่เลือก: </span>
                      <span className={`font-semibold ${item.is_correct ? "text-green-700" : "text-red-700"}`}>{item.selected_answer}</span>
                    </div>
                    {!item.is_correct && (
                      <div className="text-sm">
                        <span className="text-gray-600">คำตอบที่ถูกต้อง: </span>
                        <span className="font-semibold text-green-700">{item.correct_answer}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => { setViewingDetail(null); setDetailData(null) }} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}