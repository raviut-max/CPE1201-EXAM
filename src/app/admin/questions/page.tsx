// src/app/admin/questions/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Choice = {
  id?: string
  choice_text: string
  is_correct: boolean
}

type Question = {
  id?: string
  type: "theory" | "code"
  question_text: string
  code_snippet?: string | null
  choices: Choice[]
}

export default function AdminQuestionsPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  
  // Form state
  const [type, setType] = useState<"theory" | "code">("theory")
  const [questionText, setQuestionText] = useState("")
  const [codeSnippet, setCodeSnippet] = useState("")
  const [choices, setChoices] = useState<Choice[]>([
    { choice_text: "", is_correct: false },
    { choice_text: "", is_correct: false },
    { choice_text: "", is_correct: false },
    { choice_text: "", is_correct: false },
    { choice_text: "", is_correct: false },
    { choice_text: "", is_correct: false },
  ])

  useEffect(() => {
    checkAuthAndFetch()
  }, [])

  const checkAuthAndFetch = async () => {
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
      return
    }

    await fetchQuestions()
  }

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching questions:", error)
    } else {
      const questionsWithChoices = await Promise.all(
        (data || []).map(async (q) => {
          const { data: choices } = await supabase
            .from("choices")
            .select("*")
            .eq("question_id", q.id)
          
          return { ...q, choices: choices || [] }
        })
      )
      setQuestions(questionsWithChoices)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setType("theory")
    setQuestionText("")
    setCodeSnippet("")
    setChoices([
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
    ])
    setEditingQuestion(null)
    setShowModal(false)
  }

  const handleAddChoice = () => {
    if (choices.length < 6) {
      setChoices([...choices, { choice_text: "", is_correct: false }])
    }
  }

  const handleRemoveChoice = (index: number) => {
    if (choices.length > 2) {
      const newChoices = choices.filter((_, i) => i !== index)
      setChoices(newChoices)
    }
  }

  const handleChoiceChange = (index: number, field: keyof Choice, value: any) => {
    const newChoices = [...choices]
    if (field === "is_correct" && value === true) {
      newChoices.forEach((c, i) => {
        c.is_correct = i === index
      })
    } else {
      newChoices[index] = { ...newChoices[index], [field]: value }
    }
    setChoices(newChoices)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const correctChoices = choices.filter(c => c.is_correct)
    if (correctChoices.length === 0) {
      alert("ต้องระบุคำตอบที่ถูกต้องอย่างน้อย 1 ข้อ")
      return
    }

    const questionData = {
      type,
      question_text: questionText,
      code_snippet: type === "code" ? codeSnippet : null,
    }

    try {
      let questionId = editingQuestion?.id

      if (editingQuestion) {
        const { error } = await supabase
          .from("questions")
          .update(questionData)
          .eq("id", editingQuestion.id)
        if (error) throw error

        await supabase.from("choices").delete().eq("question_id", editingQuestion.id)
      } else {
        const { data: newQuestion, error } = await supabase
          .from("questions")
          .insert(questionData)
          .select("id")
          .single()
        if (error) throw error
        questionId = newQuestion.id
      }

      const choicesToInsert = choices.map(c => ({
        question_id: questionId,
        choice_text: c.choice_text,
        is_correct: c.is_correct
      }))

      const { error: choicesError } = await supabase
        .from("choices")
        .insert(choicesToInsert)

      if (choicesError) throw choicesError

      resetForm()
      fetchQuestions()
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message)
    }
  }

  const handleEdit = async (question: Question) => {
    const { data: choices } = await supabase
      .from("choices")
      .select("*")
      .eq("question_id", question.id)

    setEditingQuestion({ ...question, choices: choices || [] })
    setType(question.type)
    setQuestionText(question.question_text)
    setCodeSnippet(question.code_snippet || "")
    setChoices(choices || [])
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบข้อสอบนี้หรือไม่?")) return

    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id)

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message)
    } else {
      fetchQuestions()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  // คำนวณจำนวนข้อสอบแยกตามประเภท
  const totalQuestions = questions.length
  const codeQuestions = questions.filter(q => q.type === "code").length
  const theoryQuestions = questions.filter(q => q.type === "theory").length

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
          <h1 className="text-2xl font-bold text-gray-800">จัดการข้อสอบ</h1>
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
              <h2 className="text-xl font-bold text-gray-800">รายการข้อสอบ</h2>
              <p className="text-sm text-gray-600 mt-1">จัดการคำถามและตัวเลือก</p>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transform hover:scale-105 transition-all"
            >
              + เพิ่มข้อสอบใหม่
            </button>
          </div>

          {/* Stats Cards - เพิ่มส่วนนับจำนวนข้อสอบ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">ข้อสอบทั้งหมด</p>
                  <p className="text-3xl font-bold text-blue-800 mt-1">{totalQuestions}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">ข้อสอบโค้ด</p>
                  <p className="text-3xl font-bold text-purple-800 mt-1">{codeQuestions}</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">ข้อสอบทฤษฎี</p>
                  <p className="text-3xl font-bold text-green-800 mt-1">{theoryQuestions}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar แสดงสัดส่วน */}
          {totalQuestions > 0 && (
            <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">สัดส่วนข้อสอบ</span>
                <span className="text-gray-800 font-semibold">
                  โค้ด {((codeQuestions / totalQuestions) * 100).toFixed(0)}% / ทฤษฎี {((theoryQuestions / totalQuestions) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="flex h-full">
                  <div 
                    className="bg-purple-500 transition-all duration-500" 
                    style={{ width: `${(codeQuestions / totalQuestions) * 100}%` }}
                    title={`โค้ด: ${codeQuestions} ข้อ`}
                  ></div>
                  <div 
                    className="bg-green-500 transition-all duration-500" 
                    style={{ width: `${(theoryQuestions / totalQuestions) * 100}%` }}
                    title={`ทฤษฎี: ${theoryQuestions} ข้อ`}
                  ></div>
                </div>
              </div>
              <div className="flex justify-between text-xs mt-1 text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> โค้ด
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> ทฤษฎี
                </span>
              </div>
            </div>
          )}

          {questions.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">ยังไม่มีข้อสอบ</p>
              <p className="text-gray-400 text-sm mt-1">คลิกปุ่ม "เพิ่มข้อสอบใหม่" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        q.type === "code" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"
                      }`}>
                        {q.type === "code" ? "🖥️ โค้ด" : "📚 ทฤษฎี"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {q.choices?.filter(c => c.is_correct).length} คำตอบที่ถูกต้อง
                      </span>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleEdit(q)}
                        className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(q.id!)}
                        className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-800 font-medium mb-2">{q.question_text}</p>
                  {q.code_snippet && (
                    <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto mb-2 font-mono">
                      {q.code_snippet}
                    </pre>
                  )}
                  <div className="text-sm text-gray-600 mt-2">
                    <strong>{q.choices?.length || 0}</strong> ตัวเลือก
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal (เหมือนเดิม) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl my-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingQuestion ? "แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ประเภทข้อสอบ</label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="theory"
                      checked={type === "theory"}
                      onChange={(e) => setType(e.target.value as "theory" | "code")}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm">📚 ทฤษฎี</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="code"
                      checked={type === "code"}
                      onChange={(e) => setType(e.target.value as "theory" | "code")}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm">🖥️ โค้ดโปรแกรม</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">คำถาม <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="กรอกคำถาม"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                />
              </div>

              {type === "code" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">โค้ดโปรแกรม</label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={8}
                    placeholder={`public class Test {\n    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n}`}
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    * โค้ดจะแสดงผลแบบรักษาการเยื้องและเว้นวรรคตามต้นฉบับ
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ตัวเลือก (ต้องมีคำตอบที่ถูกต้อง 1 ข้อ) <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {choices.map((choice, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={choice.is_correct}
                        onChange={() => handleChoiceChange(index, "is_correct", true)}
                        className="mt-2 w-4 h-4"
                        title="เลือกเป็นคำตอบที่ถูกต้อง"
                      />
                      <input
                        type="text"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={`ตัวเลือกที่ ${index + 1}`}
                        value={choice.choice_text}
                        onChange={(e) => handleChoiceChange(index, "choice_text", e.target.value)}
                        required
                      />
                      {choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChoice(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {choices.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddChoice}
                    className="mt-2 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    + เพิ่มตัวเลือก
                  </button>
                )}
              </div>

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
                  {editingQuestion ? "บันทึกการแก้ไข" : "เพิ่มข้อสอบ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}