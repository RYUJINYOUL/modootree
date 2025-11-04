"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot, User as UserIcon, Loader2, Menu, ExternalLink, Save, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import useAuth from '@/hooks/useAuth'
import { auth, db } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"


interface Message {
    role: "user" | "assistant"
    content: string
    timestamp: Date
    needsConfirmation?: boolean
    hasSearchResults?: boolean
    searchSources?: SourceItem[]
}

interface SourceItem {
    title: string
    link: string
    snippet: string
    source: string
}

type ChatAction = "EXECUTE_MEMO" | "GENERAL_CHAT" | undefined

const CONFIRMATION_MESSAGE = "말씀하신 내용을 메모로 저장할까요? 아니면 다른 질문을 도와드릴까요?"

// --- ConfirmationPrompt 컴포넌트 ---
interface ConfirmationPromptProps {
    onConfirm: (action: ChatAction) => void
    lastMessageContent: string
}

const ConfirmationPrompt: React.FC<ConfirmationPromptProps> = ({ onConfirm, lastMessageContent }) => {
    if (lastMessageContent !== CONFIRMATION_MESSAGE) return null

    return (
        <div className="flex w-full justify-center">
            <div className="flex gap-3">
                <button
                    onClick={() => onConfirm("EXECUTE_MEMO")}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                    📝 메모로 저장
                </button>
                <button
                    onClick={() => onConfirm("GENERAL_CHAT")}
                    className="px-4 py-2 text-sm bg-gray-700 text-gray-200 rounded-full hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                    💬 다시 알아봐 드릴까요?
                </button>
            </div>
        </div>
    )
}

// --- SearchSourcesCard 컴포넌트 (개별 저장 기능 포함) ---
interface SearchSourcesCardProps {
    sources: SourceItem[]
    summary: string
    onSave: () => void
    onResearch: () => void
    onSaveIndividual: (source: SourceItem, index: number) => void
    isSaving?: boolean
    isResearching?: boolean
    savingIndividualIndex?: number
}

const SearchSourcesCard: React.FC<SearchSourcesCardProps> = ({ 
    sources, 
    summary, 
    onSave, 
    onResearch,
    onSaveIndividual,
    isSaving = false,
    isResearching = false,
    savingIndividualIndex
}) => {
    const [showSources, setShowSources] = useState(false)

    return (
        <div className="w-full max-w-4xl mx-auto mt-4">
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
                {/* 요약 섹션 */}
                <div className="mb-3">
                    <h3 className="text-base font-semibold text-blue-400 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                        검색 요약
                    </h3>
                    <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>

                {/* 출처 토글 버튼 */}
                <button
                    onClick={() => setShowSources(!showSources)}
                    className="w-full text-left text-sm font-semibold text-blue-400 mb-3 hover:text-blue-300 transition-colors duration-200 flex items-center gap-2"
                >
                    <ExternalLink className="w-3 h-3" />
                    참고 출처 ({sources.length}개) {showSources ? '▲' : '▼'}
                </button>

                {/* 출처 리스트 (접기/펼치기) - 개별 저장 버튼 포함 */}
                {showSources && (
                    <div className="space-y-2 mb-3">
                        {sources.slice(0, 5).map((source, index) => (
                            <div key={index} className="relative">
                                <a
                                    href={source.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-3 bg-gray-800/80 hover:bg-gray-700/80 rounded-xl border border-gray-600/50 transition-all duration-200 text-sm pr-20 backdrop-blur-sm"
                                >
                                    <p className="font-semibold text-gray-100 line-clamp-1 mb-2">
                                        {source.title}
                                    </p>
                                    <p className="text-gray-300 line-clamp-2 mb-2 text-sm">
                                        {source.snippet}
                                    </p>
                                    <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                                        {source.source}
                                    </span>
                                </a>
                                {/* 개별 저장 버튼 */}
                                <button
                                    onClick={() => onSaveIndividual(source, index)}
                                    disabled={savingIndividualIndex === index}
                                    className="absolute top-3 right-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transform hover:scale-105"
                                >
                                    {savingIndividualIndex === index ? (
                                        <>
                                            <Loader2 className="w-2 h-2 animate-spin" />
                                            저장중
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-2 h-2" />
                                            저장
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 액션 버튼들 */}
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                저장 중...
                            </>
                        ) : (
                            <>
                                <Save className="w-3 h-3" />
                                전체 저장
                            </>
                        )}
                    </button>
                    <button
                        onClick={onResearch}
                        disabled={isResearching}
                        className="px-4 py-2 text-sm bg-gray-700 text-gray-200 rounded-full hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105"
                    >
                        {isResearching ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                검색 중...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-3 h-3" />
                                다시 알아봐 드릴까요?
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// --- Chatbotpage 컴포넌트 ---
export default function SearchChatPage() {
    const { user, loading } = useAuth()
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "안녕하세요! 모두AI 검색 상담사입니다. 궁금한 것을 물어보세요!",
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isResearching, setIsResearching] = useState(false)
    const [savingIndividualIndex, setSavingIndividualIndex] = useState<number | undefined>(undefined)
    const [remainingChats, setRemainingChats] = useState<number | null>(null)
    const [originalMessageToSave, setOriginalMessageToSave] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const showConfirmation = messages.length > 0
        && messages[messages.length - 1].content === CONFIRMATION_MESSAGE
        && messages[messages.length - 1].needsConfirmation === true

    const sendMessage = useCallback(async (action: ChatAction = undefined, messageToSend: string = input) => {
        if (!messageToSend.trim() || isLoading || !user) return

        let userMessage: Message

        // ✅ action이 없을 때만 사용자 메시지 추가 (최초 전송)
        if (action === undefined) {
            userMessage = {
                role: "user",
                content: messageToSend,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, userMessage])
            setOriginalMessageToSave(messageToSend)
        }

        const currentInput = messageToSend
        if (action === undefined) setInput("")
        setIsLoading(true)

        // ✅ needsConfirmation 플래그 제거
        setMessages(prev => prev.map(msg => ({ ...msg, needsConfirmation: false })))

        try {
            const currentUser = auth.currentUser
            if (!currentUser) {
                throw new Error("사용자 인증 정보를 찾을 수 없습니다.")
            }

            const idToken = await currentUser.getIdToken()

            const conversationHistory = messages.map(msg => ({
                role: msg.role === "assistant" ? "model" : "user",
                content: msg.content
            }))

            console.log("전송 데이터:", {
                message: currentInput,
                token: !!idToken,
                conversationHistory,
                action
            })

            const response = await fetch("https://aijob-server-712740047046.asia-northeast3.run.app/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: currentInput,
                    token: idToken,
                    conversationHistory: conversationHistory,
                    action: action
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error("서버 응답 에러:", response.status, errorText)
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            console.log("서버 응답:", data)

            if (data.success) {
                const assistantMessage: Message = {
                    role: "assistant",
                    content: data.response,
                    timestamp: new Date(),
                    needsConfirmation: data.needsConfirmation || false,
                    hasSearchResults: data.hasSearchResults || false,
                    searchSources: data.searchSources || []
                }
                setMessages(prev => [...prev, assistantMessage])

                if (data.remainingChats !== undefined) {
                    setRemainingChats(data.remainingChats)
                }
            } else {
                throw new Error(data.response || "응답을 받지 못했습니다.")
            }
        } catch (error) {
            console.error("Error:", error)
            const errorMessage: Message = {
                role: "assistant",
                content: "죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
            inputRef.current?.focus()
        }
    }, [input, isLoading, user, messages])

    const handleConfirmationAction = (action: ChatAction) => {
        if (!originalMessageToSave) return
        sendMessage(action, originalMessageToSave)
        setOriginalMessageToSave(null)
    }

    const handleSaveSearchResult = async (message: Message) => {
        if (!user || !message.searchSources || message.searchSources.length === 0) return
    
        setIsSaving(true)
    
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("인증 오류");
            
            const searchResultRef = collection(db, "search_results");
            await addDoc(searchResultRef, {
                userId: currentUser.uid,
                summary: message.content,
                sources: message.searchSources.map(s => ({
                    title: s.title,
                    link: s.link,
                    snippet: s.snippet,
                    source: s.source
                })),
                createdAt: serverTimestamp()
            });

            // 성공 메시지
            const successMessage: Message = {
                role: "assistant",
                content: "✅ 검색 결과가 저장되었습니다!",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, successMessage])

        } catch (error) {
            console.error("저장 오류:", error)
            const errorMessage: Message = {
                role: "assistant",
                content: "❌ 저장 중 오류가 발생했습니다. 다시 시도해 주세요.",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsSaving(false)
        }
    }

    // 🆕 개별 출처 저장
    const handleSaveIndividualSource = async (source: SourceItem, index: number) => {
        if (!user) return
    
        setSavingIndividualIndex(index)
    
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("인증 오류");
            
            const searchResultRef = collection(db, "search_results");
            await addDoc(searchResultRef, {
                userId: currentUser.uid,
                summary: `출처: ${source.title}`,
                sources: [{
                    title: source.title,
                    link: source.link,
                    snippet: source.snippet,
                    source: source.source
                }],
                createdAt: serverTimestamp(),
                isIndividualSource: true
            });

            // 성공 메시지
            const successMessage: Message = {
                role: "assistant",
                content: `✅ "${source.title}" 출처가 저장되었습니다!`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, successMessage])

        } catch (error) {
            console.error("개별 저장 오류:", error)
            const errorMessage: Message = {
                role: "assistant",
                content: "❌ 출처 저장 중 오류가 발생했습니다. 다시 시도해 주세요.",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setSavingIndividualIndex(undefined)
        }
    }

    // 🔥 재검색 (캐시 무시를 위한 타임스탬프 추가)
    // 재검색 함수 수정
const handleResearch = async (originalQuery: string) => {
    setIsResearching(true)
    
    const researchMessage: Message = {
        role: "assistant",
        content: "🔍 새로운 정보로 다시 검색하고 있습니다...",
        timestamp: new Date()
    }
    setMessages(prev => [...prev, researchMessage])

    // ✅ 깔끔한 원본 쿼리만 표시
    const userMessage: Message = {
        role: "user",
        content: originalQuery,
        timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    
    try {
        const currentUser = auth.currentUser
        if (!currentUser) throw new Error("인증 오류")
        
        const idToken = await currentUser.getIdToken()
        
        // ✅ 쿼리는 그대로, 헤더에만 플래그 추가
        const response = await fetch("https://aijob-server-712740047046.asia-northeast3.run.app/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Force-Refresh": "true",  // 백엔드에서 캐시 무시
                "X-Refresh-Timestamp": Date.now().toString()
            },
            body: JSON.stringify({
                message: originalQuery,  // ✅ 태그 없이 전송
                token: idToken,
                conversationHistory: messages.map(msg => ({
                    role: msg.role === "assistant" ? "model" : "user",
                    content: msg.content
                })),
                action: undefined
            })
        })
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        
        const data = await response.json()
        
        if (data.success) {
            const assistantMessage: Message = {
                role: "assistant",
                content: data.response,
                timestamp: new Date(),
                hasSearchResults: data.hasSearchResults || false,
                searchSources: data.searchSources || []
            }
            setMessages(prev => [...prev, assistantMessage])
        }
        
    } catch (error) {
        console.error("재검색 실패:", error)
        const errorMessage: Message = {
            role: "assistant",
            content: "❌ 재검색 중 오류가 발생했습니다.",
            timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
    } finally {
        setIsResearching(false)
    }
}

    const handleInitialSend = () => {
        sendMessage(undefined, input)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleInitialSend()
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black">
                <Bot className="w-16 h-16 mb-4 text-primary" />
                <h1 className="text-2xl font-bold mb-2 text-white">로그인이 필요합니다</h1>
                <p className="text-gray-400">AI 챗봇을 사용하려면 로그인해주세요.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-900">
            {/* Header */}
            <div className="bg-gray-900/95 backdrop-blur-sm w-full shadow-xl border-b border-blue-500/20">
            <div className="w-full bg-transparent px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl text-white">모두AI 검색</h1>
                        {remainingChats !== null && (
                            <p className="text-sm text-blue-400">
                                💬 남은 대화: {remainingChats}회
                            </p>
                        )}
                    </div>
                </div>
                {/* <button
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="메뉴"
                >
                    <Menu className="w-4 h-4" />
                </button> */}
            </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
                {messages.map((message, index) => (
                    <div key={`${message.role}-${index}-${message.timestamp.getTime()}`}>
                        <div
                            className={cn(
                                "flex gap-4 w-full max-w-4xl mx-auto",
                                message.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "flex gap-3 max-w-2xl",
                                message.role === "user" ? "flex-row-reverse" : "flex-row"
                            )}>
                                <div
                                    className={cn(
                                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                                        message.role === "user"
                                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                                            : "bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 border border-gray-600"
                                    )}
                                >
                                    {message.role === "user" ? (
                                        <UserIcon className="w-5 h-5" />
                                    ) : (
                                        <Bot className="w-5 h-5" />
                                    )}
                                </div>
                                <div
                                    className={cn(
                                        "px-4 py-3 rounded-2xl text-sm shadow-lg backdrop-blur-sm",
                                        message.role === "user"
                                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                                            : "bg-gray-800/90 text-gray-100 border border-gray-700/50"
                                    )}
                                >
                                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                                        {message.content}
                                    </p>
                                    <p
                                        className={cn(
                                            "text-xs mt-2 opacity-70",
                                            message.role === "user" ? "text-blue-100" : "text-gray-400"
                                        )}
                                    >
                                        {message.timestamp.toLocaleTimeString("ko-KR", {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 검색 결과 카드 표시 */}
                        {message.role === "assistant" && message.hasSearchResults && message.searchSources && message.searchSources.length > 0 && (
                            <SearchSourcesCard
                                sources={message.searchSources}
                                summary={message.content}
                                onSave={() => handleSaveSearchResult(message)}
                                onResearch={() => {
                                    // 바로 이전 사용자 메시지 찾기
                                    let userQuery = ""
                                    for (let i = index - 1; i >= 0; i--) {
                                        if (messages[i].role === "user") {
                                            userQuery = messages[i].content
                                            break
                                        }
                                    }
                                    if (userQuery) {
                                        handleResearch(userQuery)
                                    }
                                }}
                                onSaveIndividual={handleSaveIndividualSource}
                                isSaving={isSaving}
                                isResearching={isResearching}
                                savingIndividualIndex={savingIndividualIndex}
                            />
                        )}
                    </div>
                ))}

                {showConfirmation && messages.length > 0 && (
                    <ConfirmationPrompt
                        onConfirm={handleConfirmationAction}
                        lastMessageContent={messages[messages.length - 1].content}
                    />
                )}

                {isLoading && (
                    <div className="flex gap-4 w-full max-w-4xl mx-auto justify-start">
                        <div className="flex gap-3 max-w-2xl">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-gray-700 to-gray-800 flex items-center justify-center shadow-lg border border-gray-600">
                                <Bot className="w-5 h-5 text-gray-200" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-gray-800/90 border border-gray-700/50 shadow-lg backdrop-blur-sm">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input - Fixed Bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-blue-500/20 p-6 shadow-2xl">
                <div className="w-full max-w-4xl mx-auto">
                    <div className="flex gap-4">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="💬 검색어를 입력하세요..."
                            disabled={isLoading}
                            className="flex-1 px-6 py-4 text-base border border-gray-600/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-800/50 bg-gray-800/80 text-white placeholder-gray-400 shadow-lg backdrop-blur-sm transition-all duration-200"
                        />
                        <button
                            onClick={handleInitialSend}
                            disabled={isLoading || !input.trim()}
                            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg transform hover:scale-105"
                            aria-label="메시지 전송"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-center text-sm text-blue-400/80 mt-3">
                        ✨ AI 검색은 실시간 정보를 수집하여 답변합니다
                    </p>
                </div>
            </div>
        </div>
    )
}
