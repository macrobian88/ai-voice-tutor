'use client';

import { useState, useRef, useEffect } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';
import { Mic, MicOff, Send, Volume2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  inScope?: boolean;
}

interface TutorSessionProps {
  chapterId: string;
  chapterTitle: string;
  onSessionEnd?: () => void;
}

/**
 * Audio Queue Manager for seamless playback
 */
class AudioQueueManager {
  private queue: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;

  enqueue(audioBuffer: ArrayBuffer) {
    console.log('🎵 Enqueueing audio chunk, size:', audioBuffer.byteLength);
    this.queue.push(audioBuffer);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private playNext() {
    if (this.queue.length === 0) {
      console.log('✅ Audio queue empty, playback complete');
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.queue.shift()!;
    
    const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    
    console.log('▶️ Playing audio chunk, queue remaining:', this.queue.length);
    this.currentAudio = new Audio(url);
    this.currentAudio.play();

    this.currentAudio.onended = () => {
      console.log('✅ Audio chunk finished');
      URL.revokeObjectURL(url);
      this.playNext(); // Play next chunk seamlessly
    };

    this.currentAudio.onerror = (error) => {
      console.error('❌ Audio playback error:', error);
      URL.revokeObjectURL(url);
      this.playNext(); // Try next chunk
    };
  }

  stop() {
    console.log('⏹️ Stopping audio playback');
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.queue = [];
    this.isPlaying = false;
  }

  clear() {
    this.stop();
  }
}

export default function TutorSession({
  chapterId,
  chapterTitle,
  onSessionEnd,
}: TutorSessionProps) {
  const { token } = useAuth();
  const {
    isRecording,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [enableStreaming] = useState(false); // DISABLED for debugging - change to true once working
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef(new AudioQueueManager());

  // Debug logging
  useEffect(() => {
    console.log('🎬 TutorSession mounted');
    console.log('Chapter ID:', chapterId);
    console.log('Chapter Title:', chapterTitle);
    console.log('Auth token exists:', !!token);
    console.log('Streaming enabled:', enableStreaming);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAssistantMessage]);

  // Handle recording
  const handleStartRecording = async () => {
    console.log('🎤 Start recording button clicked');
    await startRecording();
  };

  const handleStopRecording = async () => {
    console.log('⏹️ Stop recording button clicked');
    stopRecording();
  };

  // Send audio to backend
  useEffect(() => {
    if (audioBlob && !isRecording) {
      console.log('📦 Audio blob ready:', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      sendAudioMessage(audioBlob);
    }
  }, [audioBlob, isRecording]);

  /**
   * Send audio message with streaming support
   */
  const sendAudioMessage = async (blob: Blob) => {
    console.log('📤 sendAudioMessage called');
    
    if (!token) {
      console.error('❌ No auth token!');
      alert('Not authenticated. Please log in.');
      return;
    }

    if (!chapterId) {
      console.error('❌ No chapter ID!');
      alert('No chapter selected.');
      return;
    }

    console.log('✅ Prerequisites check passed');
    setIsProcessing(true);
    setCurrentAssistantMessage('');

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('chapterId', chapterId);
      formData.append('stream', enableStreaming.toString());
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      console.log('📋 FormData prepared:', {
        chapterId,
        sessionId,
        streaming: enableStreaming,
        audioSize: blob.size
      });

      // Add user message immediately
      const userMessage: Message = {
        role: 'user',
        content: '🎤 Voice message',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      console.log('✅ User message added to UI');

      console.log('🌐 Sending request to /api/chat...');
      const startTime = Date.now();

      if (enableStreaming) {
        console.log('📡 Using streaming mode');
        await handleStreamingResponse(formData, startTime);
      } else {
        console.log('📨 Using non-streaming mode');
        await handleNonStreamingResponse(formData, startTime);
      }
    } catch (error) {
      console.error('❌ Error in sendAudioMessage:', error);
      alert(`Failed to send message: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
      clearRecording();
      console.log('🏁 sendAudioMessage complete');
    }
  };

  /**
   * Handle streaming response (OPTIMIZED)
   */
  const handleStreamingResponse = async (formData: FormData, startTime: number) => {
    console.log('📡 Starting streaming request...');
    
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    console.log('📥 Response received:', {
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get('content-type')
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ API error response:', errorText);
      throw new Error(`API error: ${res.status} ${errorText}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response reader');
    }

    let buffer = '';
    let assistantMessageText = '';

    console.log('📖 Reading SSE stream...');

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('✅ Stream complete');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          console.log('📨 SSE data received:', dataStr.substring(0, 100) + '...');
          
          try {
            const data = JSON.parse(dataStr);

            switch (data.type) {
              case 'text':
                assistantMessageText += data.data;
                setCurrentAssistantMessage(assistantMessageText);
                console.log('📝 Text chunk added, total length:', assistantMessageText.length);
                break;

              case 'audio':
                const audioBuffer = base64ToArrayBuffer(data.data);
                audioQueueRef.current.enqueue(audioBuffer);
                console.log('🎵 Audio chunk queued');
                break;

              case 'complete':
                console.log('✅ Stream complete event received');
                const assistantMessage: Message = {
                  role: 'assistant',
                  content: assistantMessageText,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setCurrentAssistantMessage('');

                if (!sessionId) {
                  setSessionId(data.sessionId);
                  console.log('💾 Session ID saved:', data.sessionId);
                }

                console.log('⏱️ Response latency:', data.latency, 'ms');
                console.log('💰 Costs:', data.costs);
                break;

              case 'error':
                console.error('❌ Stream error:', data.error);
                throw new Error(data.error);
            }
          } catch (parseError) {
            console.error('❌ Failed to parse SSE data:', parseError, dataStr);
          }
        }
      }
    }
  };

  /**
   * Handle non-streaming response (FALLBACK)
   */
  const handleNonStreamingResponse = async (formData: FormData, startTime: number) => {
    console.log('📨 Sending non-streaming request...');
    
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    console.log('📥 Response received:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ API error response:', errorText);
      throw new Error(`API error: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    console.log('📦 Response data:', {
      hasMessage: !!data.message,
      messageLength: data.message?.length,
      hasAudio: !!data.audioBuffer,
      sessionId: data.sessionId,
      latency: data.latency
    });

    // Set session ID if first message
    if (!sessionId) {
      setSessionId(data.sessionId);
      console.log('💾 Session ID saved:', data.sessionId);
    }

    const assistantMessage: Message = {
      role: 'assistant',
      content: data.message,
      timestamp: new Date(),
      inScope: data.inScope,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    console.log('✅ Assistant message added to UI');

    // Play audio response
    if (data.audioBuffer) {
      console.log('🎵 Playing audio response');
      playAudioResponse(data.audioBuffer);
    } else {
      console.log('⚠️ No audio buffer in response');
    }

    console.log('⏱️ Response latency:', data.latency, 'ms');
    console.log('💰 Costs:', data.costs);
  };

  /**
   * Play audio response (non-streaming fallback)
   */
  const playAudioResponse = (base64Audio: string) => {
    console.log('🎵 Converting base64 to audio, length:', base64Audio.length);
    const audioBuffer = base64ToArrayBuffer(base64Audio);
    audioQueueRef.current.enqueue(audioBuffer);
  };

  /**
   * Convert base64 to ArrayBuffer
   */
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const handleEndSession = async () => {
    console.log('🛑 Ending session');
    audioQueueRef.current.stop();

    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ completionReason: 'user_ended' }),
        });
        console.log('✅ Session ended successfully');
      } catch (error) {
        console.error('❌ Error ending session:', error);
      }
    }
    onSessionEnd?.();
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{chapterTitle}</h1>
          <p className="text-sm text-gray-600">
            AI Voice Tutor Session {enableStreaming ? '⚡ (Streaming)' : '📨 (Non-Streaming)'}
          </p>
        </div>
        <Button variant="outline" onClick={handleEndSession}>
          End Session
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-y-auto p-4 mb-4 space-y-4">
        {messages.length === 0 && !currentAssistantMessage ? (
          <div className="text-center text-gray-500 py-12">
            <Mic className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Press the microphone button to start your tutoring session</p>
            <p className="text-xs mt-2">
              {enableStreaming ? '⚡ Streaming mode' : '📨 Non-streaming mode (stable)'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : msg.inScope === false
                      ? 'bg-yellow-100 text-gray-900 border-2 border-yellow-400'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.inScope === false && (
                    <p className="text-xs mt-2 font-semibold">Off-topic question</p>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming assistant message */}
            {currentAssistantMessage && (
              <div className="flex justify-start">
                <div className="max-w-[70%] rounded-lg p-3 bg-gray-100 text-gray-900">
                  <p className="text-sm whitespace-pre-wrap">{currentAssistantMessage}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Streaming...
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* Recording Controls */}
      <div className="flex items-center justify-center space-x-4">
        {!isRecording && !isProcessing && (
          <Button
            size="lg"
            className="w-20 h-20 rounded-full"
            onClick={handleStartRecording}
          >
            <Mic className="w-8 h-8" />
          </Button>
        )}

        {isRecording && (
          <>
            <div className="text-center">
              <div className="text-2xl font-mono mb-2">
                {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
              </div>
              <div className="flex space-x-2">
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-20 h-20 rounded-full"
                  onClick={handleStopRecording}
                >
                  <MicOff className="w-8 h-8" />
                </Button>
              </div>
            </div>
          </>
        )}

        {isProcessing && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Processing your question...</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 text-center text-xs text-gray-500">
        {isRecording && 'Recording... Press stop when done'}
        {!isRecording && !isProcessing && 'Press and hold to speak'}
        {isProcessing && 'Check browser console (F12) for detailed logs'}
      </div>
    </div>
  );
}
